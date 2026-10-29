// Copyright 2026 IOTA Stiftung.
// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import {
	type IncomingMessage,
	request as httpRequest,
	validateHeaderName,
	validateHeaderValue
} from "node:http";
import { request as httpsRequest } from "node:https";
import { BlockList, isIP } from "node:net";
import {
	HeaderTypesExtended,
	type HealthApplicationCallback,
	HealthCategory,
	HealthStatus,
	HttpBodyLimit,
	HttpContextIdKeys,
	HttpErrorHelper,
	type IHealth,
	type IHealthProviderComponent,
	type IHttpRequestPathParams,
	type IHttpRequestQuery,
	type IHttpResponse,
	type IHttpServerRequest,
	type IMimeTypeProcessor,
	type IRestRoute,
	type IRestRouteProcessor,
	type ISocketRoute,
	type ISocketRouteProcessor,
	type ISocketServerRequest,
	type IWebServer,
	type IWebServerOptions
} from "@3sixty/api-models";
import { JsonLdMimeTypeProcessor } from "@3sixty/api-processors";
import { ContextIdStore, type IContextIds } from "@3sixty/context";
import { BaseError, ComponentFactory, GeneralError, Is, RandomHelper, Url } from "@3sixty/core";
import type { ILoggingComponent } from "@3sixty/logging-models";
import { nameof } from "@3sixty/nameof";
import {
	HeaderHelper,
	HeaderTypes,
	HttpMethod,
	HttpStatusCode,
	type IHttpHeaders,
	MimeTypes
} from "@3sixty/web";
import type { IBaseServerConstructorOptions } from "./models/IBaseServerConstructorOptions.js";
import type { IRestProcessorChains } from "./models/IRestProcessorChains.js";
import type { IServerCorsOptions } from "./models/IServerCorsOptions.js";
import type { IServerCorsResponse } from "./models/IServerCorsResponse.js";
import type { ISocketProcessorChains } from "./models/ISocketProcessorChains.js";

/**
 * Base class for web servers, containing the transport agnostic route processing.
 * Derived classes supply the transport specific behaviour through the abstract server methods.
 */
export abstract class BaseServer<T> implements IWebServer<T>, IHealthProviderComponent {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<BaseServer<unknown>>();

	/**
	 * Default port for running the server.
	 * @internal
	 */
	private static readonly _DEFAULT_PORT: number = 3000;

	/**
	 * Default host for running the server.
	 * @internal
	 */
	private static readonly _DEFAULT_HOST: string = "localhost";

	/**
	 * Default named body size limits for routes.
	 * @internal
	 */
	private static readonly _DEFAULT_BODY_LIMITS: { [name: string]: number } = {
		[HttpBodyLimit.Default]: 1048576,
		[HttpBodyLimit.Large]: 26214400
	};

	/**
	 * The logging component type.
	 */
	protected readonly _loggingComponentType?: string;

	/**
	 * The logging component.
	 */
	protected readonly _logging?: ILoggingComponent;

	/**
	 * The options for the server.
	 */
	protected _options?: IWebServerOptions;

	/**
	 * Whether the server has been started.
	 */
	protected _started: boolean;

	/**
	 * The mime type processors.
	 */
	protected readonly _mimeTypeProcessors: IMimeTypeProcessor[];

	/**
	 * Include the stack with errors.
	 */
	protected readonly _includeErrorStack: boolean;

	/**
	 * The public origin of the server, used for constructing the request URL and for CORS.
	 */
	protected _publicOrigin?: string;

	/**
	 * The local origin of the server, used for constructing the request URL and for CORS.
	 */
	protected _localOrigin?: string;

	/**
	 * The REST processor chains resolved when the server is built.
	 */
	protected _restChains: IRestProcessorChains;

	/**
	 * The socket processor chains resolved when the server is built.
	 */
	protected _socketChains: ISocketProcessorChains;

	/**
	 * The proxies trusted to set the forwarding headers.
	 */
	protected _trustedProxies?: BlockList;

	/**
	 * Whether any proxy is trusted to set the forwarding headers.
	 */
	protected _trustAllProxies: boolean;

	/**
	 * Create a new instance of BaseServer.
	 * @param options The options for the server.
	 */
	constructor(options?: IBaseServerConstructorOptions) {
		this._loggingComponentType = options?.loggingComponentType;
		this._logging = ComponentFactory.getIfExists(options?.loggingComponentType);
		this._started = false;
		this._restChains = { pre: [], process: [], post: [] };
		this._socketChains = { connected: [], disconnected: [], pre: [], process: [], post: [] };
		this._mimeTypeProcessors = options?.mimeTypeProcessors ?? [];
		this._includeErrorStack = options?.includeErrorStack ?? false;
		this._trustAllProxies = false;

		const hasJsonLd = this._mimeTypeProcessors.some(processor =>
			processor.getTypes().includes(MimeTypes.JsonLd)
		);
		if (!hasJsonLd) {
			this._mimeTypeProcessors.push(new JsonLdMimeTypeProcessor());
		}
	}

	/**
	 * Start the server.
	 * @returns A promise that resolves when the server is listening for connections.
	 */
	public async start(): Promise<void> {
		const host = this._options?.host ?? BaseServer._DEFAULT_HOST;
		const port = this._options?.port ?? BaseServer._DEFAULT_PORT;

		await this._logging?.log({
			level: "info",
			ts: Date.now(),
			source: BaseServer.CLASS_NAME,
			message: "starting",
			data: {
				host,
				port
			}
		});

		if (!this._started) {
			try {
				await this.serverListen(host, port);
				const addresses = this.serverAddresses();

				const protocol = this.serverIsSecure() ? "https://" : "http://";
				const normalizeAnyHost = (address: string): string => {
					if (address === "0.0.0.0") {
						return "127.0.0.1";
					}
					if (address === "::") {
						return "::1";
					}

					return address;
				};

				const formatAddress = (
					address: string,
					family?: string,
					forceProtocol?: string
				): string => {
					const displayAddress = normalizeAnyHost(address);
					const isIPv6 =
						family === "IPv6" || (Is.stringValue(displayAddress) && displayAddress.includes(":"));

					return `${forceProtocol ?? protocol}${isIPv6 ? "[" : ""}${displayAddress}${isIPv6 ? "]" : ""}`;
				};

				const startupAddresses = addresses.map(a => {
					const formatted = formatAddress(a.address, a.family, protocol);

					return `${formatted}:${a.port}`;
				});

				for (const origin of [this._localOrigin, this._publicOrigin]) {
					if (Is.stringValue(origin)) {
						const originUrl = Url.tryParseExact(origin);
						if (!Is.empty(originUrl)) {
							const originParts = originUrl.parts();
							const formatted = formatAddress(
								originParts.host,
								undefined,
								`${originParts.schema}://`
							);
							startupAddresses.push(
								`${formatted}${Is.integer(originParts.port) ? `:${originParts.port}` : ""}`
							);
						} else {
							startupAddresses.push(origin);
						}
					}
				}

				const distinctStartupAddresses = [...new Set(startupAddresses)];

				await this._logging?.log({
					level: "info",
					ts: Date.now(),
					source: BaseServer.CLASS_NAME,
					message: "started",
					data: {
						addresses: distinctStartupAddresses.join(", ")
					}
				});
				this._started = true;
			} catch (err) {
				await this._logging?.log({
					level: "error",
					ts: Date.now(),
					source: BaseServer.CLASS_NAME,
					message: "startFailed",
					error: BaseError.fromError(err)
				});
			}
		}
	}

	/**
	 * Stop the server.
	 * @returns A promise that resolves when the server has shut down all connections.
	 */
	public async stop(): Promise<void> {
		if (this._started) {
			this._started = false;

			await this.serverClose();

			await this._logging?.log({
				level: "info",
				ts: Date.now(),
				source: BaseServer.CLASS_NAME,
				message: "stopped"
			});
		}
	}

	/**
	 * Returns the health status of the component.
	 * @returns The health status of the component, can return multiple entries for elements within the component.
	 */
	public async health(): Promise<IHealth[]> {
		let healthCheck: IHealth | undefined;
		if (this.serverIsListening()) {
			healthCheck = {
				source: BaseServer.CLASS_NAME,
				status: HealthStatus.Ok,
				category: HealthCategory.Connectivity,
				description: "healthConnectivityDescription",
				message: "reachable"
			};
		} else {
			healthCheck = {
				source: BaseServer.CLASS_NAME,
				status: HealthStatus.Error,
				category: HealthCategory.Connectivity,
				description: "healthConnectivityDescription",
				message: "unreachable"
			};
		}

		return [healthCheck];
	}

	/**
	 * Verify the root endpoint is reachable and returns a body by making a real HTTP request.
	 * Skipped when GET / is not registered on this server instance.
	 * @param callback The callback to invoke when a deferred health result is ready.
	 * @returns The application health status of the component.
	 */
	public async healthApplication(
		callback: HealthApplicationCallback
	): Promise<IHealth[] | undefined> {
		if (!this.serverHasRootRoute()) {
			return [];
		}

		if (!Is.stringValue(this._localOrigin)) {
			return [
				{
					source: BaseServer.CLASS_NAME,
					status: HealthStatus.Error,
					category: HealthCategory.Application,
					description: "healthApplicationDescription",
					message: "serverNotBuilt"
				}
			];
		}

		try {
			const response = await this.requestLocalRoot(`${this._localOrigin}/`);

			if (response.ok && Is.stringValue(response.body)) {
				return [
					{
						source: BaseServer.CLASS_NAME,
						status: HealthStatus.Ok,
						category: HealthCategory.Application,
						description: "healthApplicationDescription",
						message: "rootEndpointReachable"
					}
				];
			}

			return [
				{
					source: BaseServer.CLASS_NAME,
					status: HealthStatus.Error,
					category: HealthCategory.Application,
					description: "healthApplicationDescription",
					message: "rootEndpointError"
				}
			];
		} catch (error) {
			return [
				{
					source: BaseServer.CLASS_NAME,
					status: HealthStatus.Error,
					category: HealthCategory.Application,
					description: "healthApplicationDescription",
					error: BaseError.fromError(error)
				}
			];
		}
	}

	/**
	 * Request the root endpoint of this server over the loopback address.
	 * @param url The url of the root endpoint.
	 * @returns Whether the response was successful and its body.
	 */
	protected async requestLocalRoot(url: string): Promise<{ ok: boolean; body: string }> {
		const isSecure = url.startsWith("https:");
		return new Promise((resolve, reject) => {
			const callback = (response: IncomingMessage): void => {
				const chunks: Buffer[] = [];
				response.on("data", (chunk: Buffer) => chunks.push(chunk));
				response.on("error", reject);
				response.on("end", () => {
					const statusCode = response.statusCode ?? 0;
					resolve({
						ok: statusCode >= HttpStatusCode.ok && statusCode < HttpStatusCode.multipleChoices,
						body: Buffer.concat(chunks).toString("utf8")
					});
				});
			};
			// The certificate is issued for the public host name rather than the loopback
			// address, and this only checks the server can reach its own listener, so it
			// is not verified
			const request = isSecure
				? httpsRequest(url, { rejectUnauthorized: false }, callback)
				: httpRequest(url, callback);
			request.on("error", reject);
			request.end();
		});
	}

	/**
	 * Perform the transport agnostic part of building the server, validating the routes and
	 * processors, resolving the origins and resolving the processor chains.
	 * @param restRouteProcessors The processors for incoming requests over REST.
	 * @param restRoutes The REST routes.
	 * @param socketRouteProcessors The processors for incoming requests over Sockets.
	 * @param socketRoutes The socket routes.
	 * @param options Options for building the server.
	 * @returns A promise that resolves when the shared build steps are complete.
	 */
	protected async prepareBuild(
		restRouteProcessors?: IRestRouteProcessor[],
		restRoutes?: IRestRoute[],
		socketRouteProcessors?: ISocketRouteProcessor[],
		socketRoutes?: ISocketRoute[],
		options?: IWebServerOptions
	): Promise<void> {
		if (Is.arrayValue(restRoutes) && !Is.arrayValue(restRouteProcessors)) {
			throw new GeneralError(BaseServer.CLASS_NAME, "noRestProcessors");
		}
		if (Is.arrayValue(socketRoutes) && !Is.arrayValue(socketRouteProcessors)) {
			throw new GeneralError(BaseServer.CLASS_NAME, "noSocketProcessors");
		}
		await this._logging?.log({
			level: "info",
			ts: Date.now(),
			source: BaseServer.CLASS_NAME,
			message: "building"
		});

		let localHost = options?.host ?? "127.0.0.1";
		if (localHost === "0.0.0.0") {
			localHost = "127.0.0.1";
		}

		this._localOrigin = `${this.serverIsSecure() ? "https" : "http"}://${localHost}:${options?.port ?? 3000}`;

		if (Is.stringValue(options?.publicOrigin)) {
			const publicUrl = Url.tryParseExact(options.publicOrigin);
			if (!Is.empty(publicUrl)) {
				const urlParts = publicUrl.parts();
				this._publicOrigin = `${urlParts.schema}://${urlParts.host}${Is.integer(urlParts.port) ? `:${urlParts.port}` : ""}`;
			} else {
				throw new GeneralError(BaseServer.CLASS_NAME, "invalidPublicOrigin", {
					publicOrigin: options.publicOrigin
				});
			}
		}

		this._options = options;

		this.resolveTrustedProxies(options?.trustedProxies);

		this.buildProcessorChains(restRouteProcessors, socketRouteProcessors);
	}

	/**
	 * Resolve the route processors in to per phase chains, so that the lookups and bindings
	 * are performed once when the server is built instead of on every request.
	 * @param restRouteProcessors The processors for the incoming REST requests.
	 * @param socketRouteProcessors The processors for the incoming socket requests.
	 */
	protected buildProcessorChains(
		restRouteProcessors?: IRestRouteProcessor[],
		socketRouteProcessors?: ISocketRouteProcessor[]
	): void {
		const restChains: IRestProcessorChains = { pre: [], process: [], post: [] };

		for (const routeProcessor of restRouteProcessors ?? []) {
			const pre = routeProcessor.pre?.bind(routeProcessor);
			if (Is.function(pre)) {
				restChains.pre.push(pre);
			}
			const process = routeProcessor.process?.bind(routeProcessor);
			if (Is.function(process)) {
				restChains.process.push(process);
			}
			const post = routeProcessor.post?.bind(routeProcessor);
			if (Is.function(post)) {
				restChains.post.push(post);
			}
		}

		const socketChains: ISocketProcessorChains = {
			connected: [],
			disconnected: [],
			pre: [],
			process: [],
			post: []
		};

		for (const routeProcessor of socketRouteProcessors ?? []) {
			const connected = routeProcessor.connected?.bind(routeProcessor);
			if (Is.function(connected)) {
				socketChains.connected.push(connected);
			}
			const disconnected = routeProcessor.disconnected?.bind(routeProcessor);
			if (Is.function(disconnected)) {
				socketChains.disconnected.push(disconnected);
			}
			const pre = routeProcessor.pre?.bind(routeProcessor);
			if (Is.function(pre)) {
				socketChains.pre.push(pre);
			}
			const process = routeProcessor.process?.bind(routeProcessor);
			if (Is.function(process)) {
				socketChains.process.push(process);
			}
			const post = routeProcessor.post?.bind(routeProcessor);
			if (Is.function(post)) {
				socketChains.post.push(post);
			}
		}

		this._restChains = restChains;
		this._socketChains = socketChains;
	}

	/**
	 * Merge the configured body limits over the built-in ones and validate them.
	 * @returns The named body limits in bytes.
	 * @throws GeneralError If a limit is not a positive integer.
	 */
	protected resolveBodyLimits(): { [name: string]: number } {
		const bodyLimits = {
			...BaseServer._DEFAULT_BODY_LIMITS,
			...this._options?.bodyLimits
		};
		for (const name of Object.keys(bodyLimits)) {
			const bodyLimit = bodyLimits[name];
			if (!Is.integer(bodyLimit) || bodyLimit <= 0) {
				throw new GeneralError(BaseServer.CLASS_NAME, "invalidBodyLimit", {
					bodyLimit: name,
					value: bodyLimit
				});
			}
		}
		return bodyLimits;
	}

	/**
	 * Resolve the CORS options from the web server options, merging in the defaults.
	 * @param options The web server options.
	 * @returns The resolved CORS options.
	 */
	protected resolveCorsOptions(options?: IWebServerOptions): IServerCorsOptions {
		let origins: string[] = ["*"];

		if (Is.arrayValue(options?.corsOrigins)) {
			origins = options?.corsOrigins;
		} else if (Is.stringValue(options?.corsOrigins)) {
			origins = [options?.corsOrigins];
		}

		const hasWildcardOrigin = origins.includes("*");

		const methods = options?.methods ?? [
			HttpMethod.GET,
			HttpMethod.PUT,
			HttpMethod.POST,
			HttpMethod.PATCH,
			HttpMethod.DELETE,
			HttpMethod.OPTIONS
		];
		const allowedHeaders: string[] = [
			HeaderTypes.AccessControlAllowOrigin,
			HeaderTypes.ContentEncoding,
			HeaderTypes.AcceptEncoding,
			HeaderTypes.ContentType,
			HeaderTypes.Authorization,
			HeaderTypes.Accept
		];
		const exposedHeaders: string[] = [HeaderTypes.ContentDisposition, HeaderTypes.Location];

		if (Is.arrayValue(options?.allowedHeaders)) {
			allowedHeaders.push(...options.allowedHeaders);
		}
		if (Is.arrayValue(options?.exposedHeaders)) {
			exposedHeaders.push(...options.exposedHeaders);
		}

		return {
			origins,
			hasWildcardOrigin,
			wildcardCredentials: options?.corsWildcardCredentials ?? true,
			methods,
			allowedHeaders,
			exposedHeaders
		};
	}

	/**
	 * Resolve the CORS response for a request origin, a wildcard is only combined with credentials
	 * while wildcard credentials are enabled.
	 * @param corsOptions The resolved CORS options.
	 * @param origin The request origin.
	 * @returns The CORS response, or undefined if the origin is not allowed.
	 */
	protected resolveCorsResponse(
		corsOptions: IServerCorsOptions,
		origin?: string
	): IServerCorsResponse | undefined {
		if (Is.stringValue(origin) && origin !== "*" && corsOptions.origins.includes(origin)) {
			return { allowOrigin: origin, credentials: true };
		}
		if (corsOptions.hasWildcardOrigin) {
			if (corsOptions.wildcardCredentials ?? true) {
				return { allowOrigin: Is.stringValue(origin) ? origin : undefined, credentials: true };
			}
			return { allowOrigin: "*", credentials: false };
		}
	}

	/**
	 * Resolve the trusted proxies from the configuration.
	 * @param trustedProxies The trusted proxy addresses or CIDR ranges.
	 * @throws GeneralError If an entry is not a valid address or range.
	 */
	protected resolveTrustedProxies(trustedProxies?: string | string[]): void {
		const entries = (Is.string(trustedProxies) ? trustedProxies.split(",") : (trustedProxies ?? []))
			.map(entry => entry.trim())
			.filter(entry => entry.length > 0);

		this._trustAllProxies = false;
		this._trustedProxies = undefined;

		for (const entry of entries) {
			if (entry === "*") {
				this._trustAllProxies = true;
			} else {
				this.addTrustedProxy(entry);
			}
		}
	}

	/**
	 * Resolve the client IP address, the socket address is used unless it is a trusted proxy, in
	 * which case the right-most untrusted X-Forwarded-For hop, or X-Real-IP, is used.
	 * @param remoteAddress The address of the immediate peer.
	 * @param headers The request headers.
	 * @returns The client IP address.
	 */
	protected resolveClientIp(remoteAddress?: string, headers?: IHttpHeaders): string | undefined {
		let clientIp = this.normaliseIp(remoteAddress);
		if (!Is.stringValue(clientIp) || !this.isTrustedProxy(clientIp)) {
			return clientIp;
		}

		const hops: string[] = [];
		for (const value of this.getHeaderValues(headers?.[HeaderTypesExtended.XForwardedFor])) {
			hops.push(...value.split(","));
		}

		if (hops.length === 0) {
			const realIps = this.getHeaderValues(headers?.[HeaderTypesExtended.XRealIp]);
			const realIp = this.normaliseIp(realIps[realIps.length - 1]);
			return Is.undefined(this.ipFamily(realIp)) ? clientIp : realIp;
		}

		for (let i = hops.length - 1; i >= 0; i--) {
			const hop = this.normaliseIp(hops[i]);
			if (!Is.stringValue(hop) || Is.undefined(this.ipFamily(hop))) {
				// A malformed hop cannot be trusted, so stop at the last trusted proxy
				return clientIp;
			}
			clientIp = hop;
			if (!this.isTrustedProxy(hop)) {
				return hop;
			}
		}

		return clientIp;
	}

	/**
	 * Build the server request from the transport values, the path params and query must already
	 * have been decoded by the transport, as decoding them again corrupts values containing %.
	 * @param method The request method.
	 * @param url The full request url, including the origin.
	 * @param body The request body.
	 * @param query The request query params.
	 * @param pathParams The request path params.
	 * @param headers The request headers.
	 * @returns The server request.
	 */
	protected buildServerRequest(
		method: HttpMethod,
		url: string,
		body: unknown,
		query?: IHttpRequestQuery,
		pathParams?: IHttpRequestPathParams,
		headers?: IHttpHeaders
	): IHttpServerRequest {
		return {
			method,
			url,
			body,
			query,
			pathParams,
			headers
		};
	}

	/**
	 * Validate the processed response before it is sent, so that every transport fails an invalid
	 * response in the same way rather than with its own transport specific error.
	 * @param httpResponse The processed response.
	 * @throws GeneralError If the status code or a header is invalid.
	 */
	protected validateResponse(httpResponse: IHttpResponse): void {
		const statusCode = httpResponse.statusCode;
		if (
			!Is.empty(statusCode) &&
			(!Is.integer(statusCode) || statusCode < 100 || statusCode > 599)
		) {
			throw new GeneralError(BaseServer.CLASS_NAME, "invalidStatusCode", { statusCode });
		}
		if (!Is.empty(httpResponse.headers)) {
			for (const header of Object.keys(httpResponse.headers)) {
				const value = httpResponse.headers[header];
				try {
					validateHeaderName(header);
					for (const item of Is.array(value) ? value : [value]) {
						if (!Is.empty(item)) {
							validateHeaderValue(header, item);
						}
					}
				} catch (err) {
					throw new GeneralError(BaseServer.CLASS_NAME, "invalidHeader", { header }, err);
				}
			}
		}
	}

	/**
	 * Build the context ids for an incoming request.
	 * @param requestOrigin The origin the request was received on.
	 * @param headers The request headers.
	 * @param remoteAddress The address of the immediate peer.
	 * @returns The context ids.
	 */
	protected buildContextIds(
		requestOrigin: string,
		headers?: IHttpHeaders,
		remoteAddress?: string
	): IContextIds {
		return {
			[HttpContextIdKeys.IpAddress]: this.resolveClientIp(remoteAddress, headers),
			[HttpContextIdKeys.UserAgent]: HeaderHelper.extractUserAgent(headers),
			[HttpContextIdKeys.CorrelationId]: HeaderHelper.extractCorrelationId(headers),
			[HttpContextIdKeys.RemoteRequest]: RandomHelper.generateUuidV7("compact"),
			[HttpContextIdKeys.LocalOrigin]: this._localOrigin,
			// This can be overridden by a processor if needed, for example a tenant processor
			[HttpContextIdKeys.PublicOrigin]: this._publicOrigin ?? requestOrigin ?? this._localOrigin
		};
	}

	/**
	 * Run the REST processors for the route.
	 * @param restRoute The route to process.
	 * @param httpServerRequest The incoming request.
	 * @param httpResponse The outgoing response.
	 * @param contextIds The context IDs of the request.
	 * @param processorState The state handed through the processors.
	 */
	protected async runProcessorsRest(
		restRoute: IRestRoute | undefined,
		httpServerRequest: IHttpServerRequest,
		httpResponse: IHttpResponse,
		contextIds: IContextIds,
		processorState: {
			[id: string]: unknown;
		}
	): Promise<void> {
		let hasPreError = false;

		try {
			// Run inside ContextIdStore.run so pre-processors can do tenant-scoped storage lookups.
			await ContextIdStore.run(contextIds, async () => {
				for (const pre of this._restChains.pre) {
					await pre(httpServerRequest, httpResponse, restRoute, contextIds, processorState, {
						loggingComponentType: this._loggingComponentType
					});
				}
			});
		} catch (err) {
			const { error, httpStatusCode } = HttpErrorHelper.processError(err, this._includeErrorStack);
			HttpErrorHelper.buildResponse(httpResponse, error, httpStatusCode, this._includeErrorStack);
			hasPreError = true;
		}

		// A pre-processor may set an error response without throwing; treat that as halt.
		if (
			!hasPreError &&
			Is.integer(httpResponse.statusCode) &&
			httpResponse.statusCode >= HttpStatusCode.badRequest
		) {
			hasPreError = true;
		}

		// Don't run the main processing if there was an error in the pre processing
		// As this is likely to perform tasks such as authentication which may have failed
		if (!hasPreError) {
			try {
				// Run the processors within an async context
				// so that any services can access the context ids
				await ContextIdStore.run(contextIds, async () => {
					for (const process of this._restChains.process) {
						await process(httpServerRequest, httpResponse, restRoute, processorState, {
							loggingComponentType: this._loggingComponentType
						});
					}
				});
			} catch (err) {
				const { error, httpStatusCode } = HttpErrorHelper.processError(
					err,
					this._includeErrorStack
				);
				HttpErrorHelper.buildResponse(httpResponse, error, httpStatusCode, this._includeErrorStack);
			}
		}

		try {
			// Always run the post processors, even if there was an error earlier
			// as they may perform cleanup tasks, or logging etc
			await ContextIdStore.run(contextIds, async () => {
				for (const post of this._restChains.post) {
					await post(httpServerRequest, httpResponse, restRoute, contextIds, processorState, {
						loggingComponentType: this._loggingComponentType
					});
				}
			});
		} catch (err) {
			// Just log post processor errors
			await this._logging?.log({
				level: "error",
				ts: Date.now(),
				source: BaseServer.CLASS_NAME,
				message: "postProcessorError",
				error: BaseError.fromError(err),
				data: {
					route: restRoute?.path ?? ""
				}
			});
		}
	}

	/**
	 * Run the socket processors for the route.
	 * @param socketRoute The route to process.
	 * @param socketServerRequest The incoming request.
	 * @param httpResponse The outgoing response.
	 * @param contextIds The context IDs of the request.
	 * @param processorState The state handed through the processors.
	 * @param requestTopic The topic of the request.
	 * @param responseEmitter The emitter to send the response on.
	 */
	protected async runProcessorsSocket(
		socketRoute: ISocketRoute,
		socketServerRequest: ISocketServerRequest,
		httpResponse: IHttpResponse,
		contextIds: IContextIds,
		processorState: {
			[id: string]: unknown;
		},
		requestTopic: string,
		responseEmitter: (topic: string, response: IHttpResponse) => Promise<void>
	): Promise<void> {
		// Custom emit method which will also call the post processors
		const postProcessEmit = async (
			topic: string,
			response: IHttpResponse,
			responseProcessorState: {
				[id: string]: unknown;
			}
		): Promise<void> => {
			await responseEmitter(topic, response);

			try {
				// The post processors are called after the response has been emitted
				for (const post of this._socketChains.post) {
					await post(
						socketServerRequest,
						response,
						socketRoute,
						contextIds,
						responseProcessorState,
						{
							loggingComponentType: this._loggingComponentType
						}
					);
				}
			} catch (err) {
				await this._logging?.log({
					level: "error",
					ts: Date.now(),
					source: BaseServer.CLASS_NAME,
					message: "postProcessorError",
					error: BaseError.fromError(err),
					data: {
						route: socketRoute.path
					}
				});
			}
		};

		try {
			for (const pre of this._socketChains.pre) {
				await pre(socketServerRequest, httpResponse, socketRoute, contextIds, processorState, {
					loggingComponentType: this._loggingComponentType
				});
			}

			// We always call all the processors regardless of any response set by a previous processor.
			// But if a pre processor sets a status code, we will emit the response manually, as the pre
			// and post processors do not receive the emit method, they just populate the response object.
			if (!Is.empty(httpResponse.statusCode)) {
				await postProcessEmit(requestTopic, httpResponse, processorState);
			}

			await ContextIdStore.run(contextIds, async () => {
				for (const process of this._socketChains.process) {
					await process(
						socketServerRequest,
						httpResponse,
						socketRoute,
						processorState,
						async (topic: string, processResponse: IHttpResponse) => {
							await postProcessEmit(topic, processResponse, processorState);
						},
						this._loggingComponentType
					);
				}
			});

			// If the processors set the status to any kind of error then we should emit this manually
			if (
				Is.integer(httpResponse.statusCode) &&
				httpResponse.statusCode >= HttpStatusCode.badRequest
			) {
				await postProcessEmit(requestTopic, httpResponse, processorState);
			}
		} catch (err) {
			// Emit any unhandled errors manually
			const { error, httpStatusCode } = HttpErrorHelper.processError(err, this._includeErrorStack);
			HttpErrorHelper.buildResponse(httpResponse, error, httpStatusCode, this._includeErrorStack);
			await postProcessEmit(requestTopic, httpResponse, processorState);
		}
	}

	/**
	 * Add a trusted proxy address or CIDR range.
	 * @param entry The address or range.
	 * @throws GeneralError If the entry is not a valid address or range.
	 * @internal
	 */
	private addTrustedProxy(entry: string): void {
		const parts = entry.split("/");
		const [address, prefix] = parts;
		const family = this.ipFamily(address);
		const prefixLength = Is.stringValue(prefix) ? Number(prefix) : undefined;
		if (
			Is.undefined(family) ||
			parts.length > 2 ||
			(!Is.undefined(prefix) && !/^\d{1,3}$/.test(prefix)) ||
			(!Is.undefined(prefix) &&
				(!Is.integer(prefixLength) ||
					prefixLength < 0 ||
					prefixLength > (family === "ipv4" ? 32 : 128)))
		) {
			throw new GeneralError(BaseServer.CLASS_NAME, "invalidTrustedProxy", {
				trustedProxy: entry
			});
		}
		this._trustedProxies ??= new BlockList();
		if (Is.integer(prefixLength)) {
			this._trustedProxies.addSubnet(address, prefixLength, family);
		} else {
			this._trustedProxies.addAddress(address, family);
		}
	}

	/**
	 * Get the family of an IP address.
	 * @param address The address.
	 * @returns The family, or undefined when it is not an IP address.
	 * @internal
	 */
	private ipFamily(address?: string): "ipv4" | "ipv6" | undefined {
		if (!Is.stringValue(address)) {
			return undefined;
		}
		if (isIP(address) === 4) {
			return "ipv4";
		}
		return isIP(address) === 6 ? "ipv6" : undefined;
	}

	/**
	 * Whether the address is a trusted proxy.
	 * @param address The address to check.
	 * @returns True if the address is trusted.
	 * @internal
	 */
	private isTrustedProxy(address: string): boolean {
		if (this._trustAllProxies) {
			return true;
		}
		const family = this.ipFamily(address);
		return !Is.undefined(family) && (this._trustedProxies?.check(address, family) ?? false);
	}

	/**
	 * Normalise an IP address, removing the IPv4 mapped IPv6 prefix.
	 * @param address The address to normalise.
	 * @returns The normalised address.
	 * @internal
	 */
	private normaliseIp(address?: string): string | undefined {
		const trimmed = address?.trim();
		if (Is.stringValue(trimmed) && trimmed.toLowerCase().startsWith("::ffff:")) {
			const ipv4 = trimmed.slice(7);
			if (isIP(ipv4) === 4) {
				return ipv4;
			}
		}
		return trimmed;
	}

	/**
	 * Get the values of a header as an array.
	 * @param value The header value.
	 * @returns The header values.
	 * @internal
	 */
	private getHeaderValues(value?: string | string[]): string[] {
		if (Is.array(value)) {
			return value;
		}
		return Is.stringValue(value) ? [value] : [];
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public abstract className(): string;

	/**
	 * Get the web server instance.
	 * @returns The web server instance.
	 */
	public abstract getInstance(): T;

	/**
	 * Build the server.
	 * @param restRouteProcessors The processors for incoming requests over REST.
	 * @param restRoutes The REST routes.
	 * @param socketRouteProcessors The processors for incoming requests over Sockets.
	 * @param socketRoutes The socket routes.
	 * @param options Options for building the server.
	 * @returns A promise that resolves when the server is fully built and ready to start.
	 */
	public abstract build(
		restRouteProcessors?: IRestRouteProcessor[],
		restRoutes?: IRestRoute[],
		socketRouteProcessors?: ISocketRouteProcessor[],
		socketRoutes?: ISocketRoute[],
		options?: IWebServerOptions
	): Promise<void>;

	/**
	 * Start listening for connections on the transport.
	 * @param host The host to bind to.
	 * @param port The port to bind to.
	 * @returns A promise that resolves when the transport is listening.
	 */
	protected abstract serverListen(host: string, port: number): Promise<void>;

	/**
	 * Close the transport and all of its connections.
	 * @returns A promise that resolves when the transport has closed.
	 */
	protected abstract serverClose(): Promise<void>;

	/**
	 * Get the addresses the transport is bound to.
	 * @returns The bound addresses.
	 */
	protected abstract serverAddresses(): { address: string; family?: string; port: number }[];

	/**
	 * Whether the transport is serving over TLS.
	 * @returns True if the transport is secure.
	 */
	protected abstract serverIsSecure(): boolean;

	/**
	 * Whether the transport is currently listening for connections.
	 * @returns True if the transport is listening.
	 */
	protected abstract serverIsListening(): boolean;

	/**
	 * Whether a GET route is registered for the root path.
	 * @returns True if the root route is registered.
	 */
	protected abstract serverHasRootRoute(): boolean;
}
