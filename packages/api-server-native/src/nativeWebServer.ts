// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { lookup } from "node:dns/promises";
import { once } from "node:events";
import {
	createServer as createHttpServer,
	type IncomingMessage,
	type OutgoingHttpHeaders,
	type Server as HttpServer,
	type ServerResponse
} from "node:http";
import { createServer as createHttpsServer, type Server as HttpsServer } from "node:https";
import {
	createConnection,
	createServer as createNetServer,
	type Server as NetServer,
	type Socket as NetSocket
} from "node:net";
import { parse as parseQuery } from "node:querystring";
import { Readable, type Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import type { TLSSocket } from "node:tls";
import { promisify } from "node:util";
import zlib from "node:zlib";
import { BaseServer, type IServerCorsOptions } from "@3sixty/api-core-server";
import {
	HttpBodyLimit,
	HttpErrorHelper,
	type IHttpRequest,
	type IHttpRequestPathParams,
	type IHttpRequestQuery,
	type IHttpResponse,
	type IMimeTypeProcessor,
	type IRestRoute,
	type IRestRouteProcessor,
	type ISocketRoute,
	type ISocketRouteProcessor,
	type ISocketServerRequest,
	type IWebServerOptions
} from "@3sixty/api-models";
import type { IContextIds } from "@3sixty/context";
import { BaseError, Converter, GeneralError, type IError, Is, StringHelper } from "@3sixty/core";
import { nameof } from "@3sixty/nameof";
import { HeaderTypes, HttpMethod, HttpStatusCode, type IHttpHeaders, MimeTypes } from "@3sixty/web";
import Router from "find-my-way";
import { Server, type ServerOptions, type Socket } from "socket.io";
import type { INativeWebServerConfig } from "./models/INativeWebServerConfig.js";
import type { INativeWebServerConstructorOptions } from "./models/INativeWebServerConstructorOptions.js";

/**
 * Implementation of the web server using the Node.js HTTP server and the find-my-way router.
 */
export class NativeWebServer extends BaseServer<Router.Instance<Router.HTTPVersion.V1>> {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<NativeWebServer>();

	/**
	 * Matches the content types which are worth compressing.
	 * @internal
	 */
	private static readonly _COMPRESSIBLE_TYPES: RegExp =
		/^\s*(?:text\/(?!event-stream)|application\/(?:json|javascript|xml|x-www-form-urlencoded)|[^;\s]+\+(?:json|xml|text|yaml))/i;

	/**
	 * The minimum size in bytes of a response body before it is compressed.
	 * @internal
	 */
	private static readonly _COMPRESS_THRESHOLD: number = 1024;

	/**
	 * The supported response encodings in order of preference, matching the Fastify defaults.
	 * @internal
	 */
	private static readonly _ENCODINGS: string[] = ["zstd", "br", "gzip", "deflate"];

	/**
	 * The Brotli options, matching the Fastify defaults as the zlib defaults are very slow.
	 * @internal
	 */
	private static readonly _BROTLI_OPTIONS: zlib.BrotliOptions = {
		params: {
			[zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
			[zlib.constants.BROTLI_PARAM_QUALITY]: 4
		}
	};

	/**
	 * The compressors for each encoding.
	 * @internal
	 */
	private static readonly _COMPRESSORS: {
		[encoding: string]: (body: Uint8Array) => Promise<Buffer>;
	} = {
		zstd: promisify(zlib.zstdCompress),
		br: async body => promisify(zlib.brotliCompress)(body, NativeWebServer._BROTLI_OPTIONS),
		gzip: promisify(zlib.gzip),
		deflate: promisify(zlib.deflate)
	};

	/**
	 * The stream compressors for each encoding.
	 * @internal
	 */
	private static readonly _STREAM_COMPRESSORS: { [encoding: string]: () => Transform } = {
		zstd: () => zlib.createZstdCompress(),
		br: () => zlib.createBrotliCompress(NativeWebServer._BROTLI_OPTIONS),
		gzip: () => zlib.createGzip(),
		deflate: () => zlib.createDeflate()
	};

	/**
	 * The HTTP status codes for the errors raised by the transport.
	 * @internal
	 */
	private static readonly _ERROR_STATUS_CODES = new WeakMap<object, HttpStatusCode>();

	/**
	 * The router.
	 * @internal
	 */
	private readonly _router: Router.Instance<Router.HTTPVersion.V1>;

	/**
	 * The maximum length of a path param.
	 * @internal
	 */
	private readonly _maxParamLength: number;

	/**
	 * The options for the node web server.
	 * @internal
	 */
	private readonly _webConfig: INativeWebServerConfig["web"];

	/**
	 * The options for the socket server.
	 * @internal
	 */
	private readonly _socketConfig: Partial<ServerOptions>;

	/**
	 * The mime type processors keyed by the media type they handle.
	 * @internal
	 */
	private readonly _mimeTypeProcessorMap: { [mediaType: string]: IMimeTypeProcessor };

	/**
	 * The body limit for requests which do not match a route.
	 * @internal
	 */
	private _defaultBodyLimit: number;

	/**
	 * The resolved CORS settings, available once built.
	 * @internal
	 */
	private _cors?: {
		options: IServerCorsOptions;
		allowMethods: string;
		allowHeaders: string;
		exposeHeaders: string;
	};

	/**
	 * The node server, available once listening.
	 * @internal
	 */
	private _server?: HttpServer | HttpsServer;

	/**
	 * Listeners for additional bound addresses, which forward connections to the main server.
	 * @internal
	 */
	private _additionalServers: NetServer[];

	/**
	 * The socket server, available once built with socket routes.
	 * @internal
	 */
	private _socketServer?: Server;

	/**
	 * Create a new instance of NativeWebServer.
	 * @param options The options for the server.
	 */
	constructor(options?: INativeWebServerConstructorOptions) {
		super({
			loggingComponentType: options?.loggingComponentType,
			mimeTypeProcessors: options?.mimeTypeProcessors,
			includeErrorStack: options?.config?.includeErrorStack
		});

		this._webConfig = options?.config?.web;
		this._maxParamLength = this._webConfig?.maxParamLength ?? 2000;
		// The router does not match a route with a param over its limit, so the limit is checked
		// once matched, to respond like Fastify rather than as not found
		this._router = Router({ maxParamLength: Number.MAX_SAFE_INTEGER });
		this._socketConfig = {
			path: "/socket",
			...options?.config?.socket
		};
		this._mimeTypeProcessorMap = {};
		this._defaultBodyLimit = 0;
		this._additionalServers = [];
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return NativeWebServer.CLASS_NAME;
	}

	/**
	 * Get the web server instance.
	 * @returns The web server instance.
	 */
	public getInstance(): Router.Instance<Router.HTTPVersion.V1> {
		return this._router;
	}

	/**
	 * Build the server.
	 * @param restRouteProcessors The processors for incoming requests over REST.
	 * @param restRoutes The REST routes.
	 * @param socketRouteProcessors The processors for incoming requests over Sockets.
	 * @param socketRoutes The socket routes.
	 * @param options Options for building the server.
	 * @returns A promise that resolves when the server is fully built and ready to start.
	 */
	public async build(
		restRouteProcessors?: IRestRouteProcessor[],
		restRoutes?: IRestRoute[],
		socketRouteProcessors?: ISocketRouteProcessor[],
		socketRoutes?: ISocketRoute[],
		options?: IWebServerOptions
	): Promise<void> {
		await this.prepareBuild(
			restRouteProcessors,
			restRoutes,
			socketRouteProcessors,
			socketRoutes,
			options
		);

		if (Is.arrayValue(socketRoutes)) {
			this._socketServer = new Server(this._socketConfig);
		}

		// Processors supplied first take precedence for a media type
		for (const mimeTypeProcessor of [...this._mimeTypeProcessors].reverse()) {
			for (const mediaType of mimeTypeProcessor.getTypes()) {
				this._mimeTypeProcessorMap[mediaType.toLowerCase()] = mimeTypeProcessor;
			}
		}

		const corsOptions = this.resolveCorsOptions(options);
		this._cors = {
			options: corsOptions,
			allowMethods: corsOptions.methods.join(", "),
			allowHeaders: corsOptions.allowedHeaders.join(", "),
			exposeHeaders: corsOptions.exposedHeaders.join(", ")
		};

		const bodyLimits = this.resolveBodyLimits();
		this._defaultBodyLimit = bodyLimits[HttpBodyLimit.Default];

		await this.addRoutesRest(bodyLimits, restRouteProcessors, restRoutes);
		await this.addRoutesSocket(socketRouteProcessors, socketRoutes);
	}

	/**
	 * Start listening for connections on the transport.
	 * @param host The host to bind to.
	 * @param port The port to bind to.
	 * @returns A promise that resolves when the transport is listening.
	 */
	protected async serverListen(host: string, port: number): Promise<void> {
		const listener = async (req: IncomingMessage, res: ServerResponse): Promise<void> =>
			this.handleRequest(req, res);

		const server = Is.object(this._webConfig?.https)
			? createHttpsServer({ ...this._webConfig.serverOptions, ...this._webConfig.https }, listener)
			: createHttpServer(this._webConfig?.serverOptions ?? {}, listener);
		this._socketServer?.attach(server);

		// Generate the optimised lookups now that all the routes are registered
		this._router.compile();

		// Like Fastify, bind every address localhost resolves to, so both IPv4 and IPv6 clients connect
		const hosts =
			host === "localhost"
				? [...new Set((await lookup(host, { all: true })).map(a => a.address))]
				: [host];

		await this.listenOn(server, hosts[0], port);
		this._server = server;

		// Bun does not apply TLS to connections emitted on a secure server, so secure
		// connections are proxied to the primary address instead
		const isSecure = this.serverIsSecure();
		for (const additionalHost of hosts.slice(1)) {
			const additionalServer = createNetServer(socket => {
				if (isSecure) {
					this.proxyConnection(socket, hosts[0], port);
				} else {
					server.emit("connection", socket);
				}
			});
			try {
				await this.listenOn(additionalServer, additionalHost, port);
				this._additionalServers.push(additionalServer);
			} catch (err) {
				// An additional address failing to bind does not stop the server
				await this._logging?.log({
					level: "warn",
					ts: Date.now(),
					source: NativeWebServer.CLASS_NAME,
					message: "additionalBindingFailed",
					data: { host: additionalHost, port },
					error: BaseError.fromError(err)
				});
			}
		}
	}

	/**
	 * Close the transport and all of its connections.
	 * @returns A promise that resolves when the transport has closed.
	 */
	protected async serverClose(): Promise<void> {
		const server = this._server;
		const additionalServers = this._additionalServers;
		this._server = undefined;
		this._additionalServers = [];

		// The forwarded connections are only released when the main server closes its idle
		// connections, so all the servers must be closed together
		const closing: Promise<void>[] = additionalServers.map(async s => this.closeServer(s));

		if (!Is.empty(this._socketServer)) {
			closing.push(this.closeSocketServer(this._socketServer, server));
		} else if (!Is.empty(server)) {
			closing.push(this.closeServer(server));
		}

		await Promise.all(closing);
	}

	/**
	 * Get the addresses the transport is bound to.
	 * @returns The bound addresses.
	 */
	protected serverAddresses(): { address: string; family?: string; port: number }[] {
		const addresses: { address: string; family?: string; port: number }[] = [];
		for (const server of [this._server, ...this._additionalServers]) {
			const address = server?.address();
			if (Is.object<{ address: string; family: string; port: number }>(address)) {
				addresses.push({ address: address.address, family: address.family, port: address.port });
			}
		}
		return addresses;
	}

	/**
	 * Whether the transport is serving over TLS.
	 * @returns True if the transport is secure.
	 */
	protected serverIsSecure(): boolean {
		return Is.object(this._webConfig?.https);
	}

	/**
	 * Whether the transport is currently listening for connections.
	 * @returns True if the transport is listening.
	 */
	protected serverIsListening(): boolean {
		return this._server?.listening ?? false;
	}

	/**
	 * Whether a GET route is registered for the root path.
	 * @returns True if the root route is registered.
	 */
	protected serverHasRootRoute(): boolean {
		return this._router.hasRoute(HttpMethod.GET, "/");
	}

	/**
	 * Add the REST routes to the server.
	 * @param bodyLimits The named body limits in bytes.
	 * @param restRouteProcessors The processors for the incoming requests.
	 * @param restRoutes The REST routes to add.
	 * @internal
	 */
	private async addRoutesRest(
		bodyLimits: { [name: string]: number },
		restRouteProcessors?: IRestRouteProcessor[],
		restRoutes?: IRestRoute[]
	): Promise<void> {
		if (Is.arrayValue(restRouteProcessors) && Is.arrayValue(restRoutes)) {
			for (const restRoute of restRoutes) {
				let path = StringHelper.trimTrailingSlashes(restRoute.path);
				if (!path.startsWith("/")) {
					path = `/${path}`;
				}
				await this._logging?.log({
					level: "info",
					ts: Date.now(),
					source: NativeWebServer.CLASS_NAME,
					message: "restRouteAdded",
					data: { route: path, method: restRoute.method }
				});

				const bodyLimitKey = Is.stringValue(restRoute.bodyLimit)
					? restRoute.bodyLimit
					: HttpBodyLimit.Default;
				const bodyLimit = bodyLimits[bodyLimitKey];
				if (Is.empty(bodyLimit)) {
					throw new GeneralError(NativeWebServer.CLASS_NAME, "unknownBodyLimit", {
						route: path,
						bodyLimit: bodyLimitKey
					});
				}

				this._router.on(restRoute.method, path, async (req, res, params, store, searchParams) =>
					this.handleRequestRest(
						req,
						res,
						bodyLimit,
						params as IHttpRequestPathParams,
						searchParams,
						restRoute
					)
				);
			}
		}
	}

	/**
	 * Add the socket routes to the server.
	 * @param socketRouteProcessors The processors for the incoming requests.
	 * @param socketRoutes The socket routes to add.
	 * @internal
	 */
	private async addRoutesSocket(
		socketRouteProcessors?: ISocketRouteProcessor[],
		socketRoutes?: ISocketRoute[]
	): Promise<void> {
		const io = this._socketServer;
		if (Is.arrayValue(socketRouteProcessors) && Is.arrayValue(socketRoutes) && !Is.empty(io)) {
			for (const socketRoute of socketRoutes) {
				const path = StringHelper.trimLeadingSlashes(
					StringHelper.trimTrailingSlashes(socketRoute.path)
				);
				const pathParts = path.split("/");

				const namespace = `/${pathParts[0]}`;
				const topic = pathParts.slice(1).join("/");

				await this._logging?.log({
					level: "info",
					ts: Date.now(),
					source: NativeWebServer.CLASS_NAME,
					message: "socketRouteAdded",
					data: {
						handshakePath: this._socketConfig.path,
						namespace,
						eventName: topic
					}
				});

				const socketNamespace = io.of(namespace);

				socketNamespace.on("connection", async socket => {
					const socketServerRequest: ISocketServerRequest = {
						method: HttpMethod.GET,
						url: socket.handshake.url,
						query: socket.handshake.query as IHttpRequestQuery,
						headers: socket.handshake.headers as IHttpHeaders,
						socketId: socket.id
					};

					// Pass the connected information on to any processors
					try {
						for (const connected of this._socketChains.connected) {
							await connected(socketServerRequest, socketRoute, this._loggingComponentType);
						}
					} catch (err) {
						const { error, httpStatusCode } = HttpErrorHelper.processError(
							err,
							this._includeErrorStack
						);
						const response: IHttpResponse = {};
						HttpErrorHelper.buildResponse(response, error, httpStatusCode, this._includeErrorStack);
						socket.emit(topic, response);
					}

					socket.on("disconnect", async () => {
						try {
							// The socket disconnected so notify any processors
							for (const disconnected of this._socketChains.disconnected) {
								await disconnected(socketServerRequest, socketRoute, this._loggingComponentType);
							}
						} catch {
							// If something fails on a disconnect there is not much we can do with it
						}
					});

					// Handle any incoming messages
					socket.on(topic, async data => {
						// The listener is async, so anything escaping it would surface as an unhandled
						// rejection and terminate the process, emit it on the topic instead
						try {
							await this.handleRequestSocket(
								socketRoute,
								socket,
								`/${pathParts.join("/")}`,
								topic,
								data
							);
						} catch (err) {
							const { error, httpStatusCode } = HttpErrorHelper.processError(
								err,
								this._includeErrorStack
							);
							const response: IHttpResponse = {};
							HttpErrorHelper.buildResponse(
								response,
								error,
								httpStatusCode,
								this._includeErrorStack
							);
							socket.emit(topic, response);
						}
					});
				});
			}
		}
	}

	/**
	 * Handle an incoming HTTP request, routing it to its handler.
	 * @param req The incoming request.
	 * @param res The outgoing response.
	 * @internal
	 */
	private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
		try {
			if (this.applyCors(req, res)) {
				return;
			}

			const method = (req.method ?? HttpMethod.GET) as Router.HTTPMethod;
			const url = req.url ?? "/";
			const queryStart = url.indexOf("?");

			// Like Fastify, a path which is not valid percent encoding is rejected
			const path = queryStart === -1 ? url : url.slice(0, queryStart);
			if (path.includes("%")) {
				try {
					decodeURIComponent(path);
				} catch (err) {
					throw this.createTransportError(
						HttpStatusCode.badRequest,
						new GeneralError(NativeWebServer.CLASS_NAME, "invalidUrl", { path }, err)
					);
				}
			}

			let found = this._router.find(method, url);
			// Like Fastify, HEAD requests are served by the GET route when there is no HEAD route
			if (Is.empty(found) && method === HttpMethod.HEAD) {
				found = this._router.find(HttpMethod.GET, url);
			}

			if (Is.empty(found)) {
				const query =
					queryStart === -1 ? {} : (parseQuery(url.slice(queryStart + 1)) as IHttpRequestQuery);
				await this.handleRequestRest(req, res, this._defaultBodyLimit, {}, query);
			} else {
				for (const param of Object.keys(found.params)) {
					if ((found.params[param]?.length ?? 0) > this._maxParamLength) {
						throw this.createTransportError(
							HttpStatusCode.uriTooLong,
							new GeneralError(NativeWebServer.CLASS_NAME, "paramTooLong", {
								param,
								maxParamLength: this._maxParamLength
							})
						);
					}
				}
				await found.handler(req, res, found.params, found.store, found.searchParams);
			}
		} catch (err) {
			await this.sendError(res, err);
		}
	}

	/**
	 * Handle the incoming REST request.
	 * @param req The incoming request.
	 * @param res The outgoing response.
	 * @param bodyLimit The maximum size of the request body in bytes.
	 * @param pathParams The request path params.
	 * @param query The request query params.
	 * @param restRoute The REST route to handle.
	 * @internal
	 */
	private async handleRequestRest(
		req: IncomingMessage,
		res: ServerResponse,
		bodyLimit: number,
		pathParams: IHttpRequestPathParams,
		query: IHttpRequestQuery,
		restRoute?: IRestRoute
	): Promise<void> {
		const isSecure = (req.socket as Partial<TLSSocket>).encrypted === true;
		let host = req.headers.host ?? "localhost";
		// Like Fastify, the default port for the protocol is omitted from the origin
		if ((isSecure && host.endsWith(":443")) || (!isSecure && host.endsWith(":80"))) {
			host = host.slice(0, host.lastIndexOf(":"));
		}
		const requestOrigin = `${isSecure ? "https" : "http"}://${host}`;
		const headers = req.headers as IHttpHeaders;

		const httpServerRequest = this.buildServerRequest(
			(req.method ?? HttpMethod.GET).toUpperCase() as HttpMethod,
			`${requestOrigin}${req.url ?? "/"}`,
			await this.parseBody(req, headers, bodyLimit),
			query,
			pathParams,
			headers
		);

		const httpResponse: IHttpResponse = {};
		const contextIds = this.buildContextIds(
			requestOrigin,
			httpServerRequest.headers,
			req.socket.remoteAddress
		);
		const processorState = {};

		await this.runProcessorsRest(
			restRoute,
			httpServerRequest,
			httpResponse,
			contextIds,
			processorState
		);

		await this.sendResponse(req, res, httpResponse);
	}

	/**
	 * Handle the incoming socket request.
	 * @param socketRoute The socket route to handle.
	 * @param socket The socket to handle.
	 * @param fullPath The full path of the socket route.
	 * @param emitTopic The topic to emit the response on.
	 * @param request The incoming request.
	 * @internal
	 */
	private async handleRequestSocket(
		socketRoute: ISocketRoute,
		socket: Socket,
		fullPath: string,
		emitTopic: string,
		request: IHttpRequest | undefined
	): Promise<void> {
		const socketServerRequest: ISocketServerRequest = {
			method: HttpMethod.GET,
			url: fullPath,
			query: socket.handshake.query as IHttpRequestQuery,
			headers: socket.handshake.headers as IHttpHeaders,
			// The payload arrives straight off the wire, so it can be missing or any shape
			body: Is.object(request) ? request.body : undefined,
			socketId: socket.id
		};
		const httpResponse: IHttpResponse = {};
		const contextIds: IContextIds = {};
		const processorState = {};

		delete socketServerRequest.query?.EIO;
		delete socketServerRequest.query?.transport;

		await this.runProcessorsSocket(
			socketRoute,
			socketServerRequest,
			httpResponse,
			contextIds,
			processorState,
			emitTopic,
			async (topic, response) => {
				socket.emit(topic, response);
			}
		);
	}

	/**
	 * Apply the CORS headers to the response, mirroring the Fastify CORS plugin.
	 * @param req The incoming request.
	 * @param res The outgoing response.
	 * @returns True if the request was a preflight request which has been responded to.
	 * @internal
	 */
	private applyCors(req: IncomingMessage, res: ServerResponse): boolean {
		const cors = this._cors;
		if (Is.empty(cors)) {
			return false;
		}

		res.setHeader("vary", "Origin");

		const origin = req.headers.origin;
		const corsResponse = this.resolveCorsResponse(cors.options, origin);
		if (Is.empty(corsResponse)) {
			return false;
		}

		if (Is.stringValue(corsResponse.allowOrigin)) {
			res.setHeader("access-control-allow-origin", corsResponse.allowOrigin);
		}
		if (corsResponse.credentials) {
			res.setHeader("access-control-allow-credentials", "true");
		}
		res.setHeader("access-control-expose-headers", cors.exposeHeaders);

		if (req.method === HttpMethod.OPTIONS) {
			if (
				!Is.stringValue(origin) ||
				!Is.stringValue(req.headers["access-control-request-method"])
			) {
				res.writeHead(HttpStatusCode.badRequest, {
					[HeaderTypes.ContentType]: `${MimeTypes.PlainText}; charset=utf-8`
				});
				res.end("Invalid Preflight Request");
				return true;
			}
			res.writeHead(HttpStatusCode.noContent, {
				"access-control-allow-methods": cors.allowMethods,
				"access-control-allow-headers": cors.allowHeaders,
				[HeaderTypes.ContentLength]: "0"
			});
			res.end();
			return true;
		}

		return false;
	}

	/**
	 * Read and parse the request body based on its content type.
	 * @param req The incoming request.
	 * @param headers The request headers.
	 * @param bodyLimit The maximum size of the request body in bytes.
	 * @returns The parsed body, or undefined if there is no body.
	 * @throws GeneralError If the body is too large, malformed or an unsupported media type.
	 * @internal
	 */
	private async parseBody(
		req: IncomingMessage,
		headers: IHttpHeaders,
		bodyLimit: number
	): Promise<unknown> {
		if (req.method === HttpMethod.GET || req.method === HttpMethod.HEAD) {
			return undefined;
		}

		const contentType = headers[HeaderTypes.ContentType];
		const mediaType = (Is.string(contentType) ? contentType : "")
			.split(";")[0]
			.trim()
			.toLowerCase();

		const raw = await this.readBody(req, headers, bodyLimit);
		if (Is.empty(raw)) {
			// Like Fastify, declaring a JSON body without sending one is an error
			if (mediaType === MimeTypes.Json) {
				throw this.createTransportError(
					HttpStatusCode.badRequest,
					new GeneralError(NativeWebServer.CLASS_NAME, "emptyJsonBody")
				);
			}
			return undefined;
		}

		const mimeTypeProcessor = this._mimeTypeProcessorMap[mediaType];
		if (!Is.empty(mimeTypeProcessor)) {
			return mimeTypeProcessor.handle(raw);
		}

		if (mediaType === MimeTypes.Json) {
			const text = Converter.bytesToUtf8(raw);
			try {
				return JSON.parse(text);
			} catch (err) {
				throw this.createTransportError(
					HttpStatusCode.badRequest,
					new GeneralError(NativeWebServer.CLASS_NAME, "invalidJsonBody", undefined, err)
				);
			}
		}

		if (mediaType === MimeTypes.PlainText) {
			return Converter.bytesToUtf8(raw);
		}

		throw this.createTransportError(
			HttpStatusCode.unsupportedMediaType,
			new GeneralError(NativeWebServer.CLASS_NAME, "unsupportedMediaType", {
				contentType: mediaType
			})
		);
	}

	/**
	 * Read the raw request body, enforcing the body limit while streaming.
	 * @param req The incoming request.
	 * @param headers The request headers.
	 * @param bodyLimit The maximum size of the request body in bytes.
	 * @returns The raw body, or undefined if it is empty.
	 * @throws GeneralError If the body is larger than the limit.
	 * @internal
	 */
	private async readBody(
		req: IncomingMessage,
		headers: IHttpHeaders,
		bodyLimit: number
	): Promise<Buffer | undefined> {
		const contentLength = headers[HeaderTypes.ContentLength];
		if (Is.string(contentLength) && Number.parseInt(contentLength, 10) > bodyLimit) {
			throw this.createBodyTooLargeError(bodyLimit);
		}

		const chunks: Buffer[] = [];
		let total = 0;
		for await (const chunk of req) {
			const buffer = chunk as Buffer;
			total += buffer.byteLength;
			if (total > bodyLimit) {
				throw this.createBodyTooLargeError(bodyLimit);
			}
			chunks.push(buffer);
		}

		return total === 0 ? undefined : Buffer.concat(chunks, total);
	}

	/**
	 * Create the error for a body which exceeds the limit.
	 * @param bodyLimit The maximum size of the request body in bytes.
	 * @returns The error.
	 * @internal
	 */
	private createBodyTooLargeError(bodyLimit: number): GeneralError {
		return this.createTransportError(
			HttpStatusCode.payloadTooLarge,
			new GeneralError(NativeWebServer.CLASS_NAME, "bodyTooLarge", { bodyLimit })
		);
	}

	/**
	 * Mark an error as raised by the transport, so it is responded to with a specific status code.
	 * @param statusCode The status code for the response.
	 * @param error The error.
	 * @returns The error.
	 * @internal
	 */
	private createTransportError(statusCode: HttpStatusCode, error: GeneralError): GeneralError {
		NativeWebServer._ERROR_STATUS_CODES.set(error, statusCode);
		return error;
	}

	/**
	 * Send the processed response.
	 * @param req The incoming request.
	 * @param res The outgoing response.
	 * @param httpResponse The processed response.
	 * @internal
	 */
	private async sendResponse(
		req: IncomingMessage,
		res: ServerResponse,
		httpResponse: IHttpResponse
	): Promise<void> {
		this.validateResponse(httpResponse);

		const headers: OutgoingHttpHeaders = {};
		if (!Is.empty(httpResponse.headers)) {
			for (const header of Object.keys(httpResponse.headers)) {
				const value = httpResponse.headers[header];
				if (!Is.empty(value)) {
					headers[header.toLowerCase()] = value;
				}
			}
		}

		const status = httpResponse.statusCode ?? HttpStatusCode.ok;
		const payload: unknown = httpResponse.body;

		if (
			Is.empty(payload) ||
			status === HttpStatusCode.noContent ||
			status === HttpStatusCode.notModified
		) {
			res.writeHead(status, headers);
			res.end();
			return;
		}

		const stream = this.toNodeStream(payload);
		if (!Is.empty(stream)) {
			headers[HeaderTypes.ContentType] ??= MimeTypes.OctetStream;
			const encoding = this.selectEncoding(req, headers);
			if (Is.stringValue(encoding)) {
				delete headers[HeaderTypes.ContentLength];
				headers["content-encoding"] = encoding;
				this.appendVary(res, headers, "Accept-Encoding");
				res.writeHead(status, headers);
				await pipeline(stream, NativeWebServer._STREAM_COMPRESSORS[encoding](), res);
			} else {
				res.writeHead(status, headers);
				await pipeline(stream, res);
			}
			return;
		}

		let body: Uint8Array;
		if (Is.uint8Array(payload)) {
			body = payload;
			headers[HeaderTypes.ContentType] ??= MimeTypes.OctetStream;
		} else if (Is.string(payload)) {
			body = Converter.utf8ToBytes(payload);
			headers[HeaderTypes.ContentType] ??= `${MimeTypes.PlainText}; charset=utf-8`;
		} else {
			body = Converter.utf8ToBytes(JSON.stringify(payload));
			headers[HeaderTypes.ContentType] ??= `${MimeTypes.Json}; charset=utf-8`;
		}

		if (body.byteLength >= NativeWebServer._COMPRESS_THRESHOLD) {
			const encoding = this.selectEncoding(req, headers);
			if (Is.stringValue(encoding)) {
				body = await NativeWebServer._COMPRESSORS[encoding](body);
				headers["content-encoding"] = encoding;
				this.appendVary(res, headers, "Accept-Encoding");
			}
		}

		headers[HeaderTypes.ContentLength] = body.byteLength;
		res.writeHead(status, headers);
		res.end(body);
	}

	/**
	 * Convert a streaming response payload to a Node stream.
	 * @param payload The response payload.
	 * @returns The stream, or undefined if the payload is not a stream.
	 * @internal
	 */
	private toNodeStream(payload: unknown): Readable | undefined {
		if (Is.function((payload as Partial<Readable>).pipe)) {
			return payload as Readable;
		}
		if (Is.function((payload as Partial<ReadableStream>).getReader)) {
			return Readable.fromWeb(payload as NodeReadableStream);
		}
		return undefined;
	}

	/**
	 * Select the encoding for the response, if it should be compressed.
	 * @param req The incoming request.
	 * @param headers The response headers.
	 * @returns The encoding, or undefined if the response should not be compressed.
	 * @internal
	 */
	private selectEncoding(req: IncomingMessage, headers: OutgoingHttpHeaders): string | undefined {
		const acceptEncoding = req.headers["accept-encoding"];
		const contentType = headers[HeaderTypes.ContentType];
		if (
			!Is.stringValue(acceptEncoding) ||
			!Is.empty(headers["content-encoding"]) ||
			!Is.string(contentType) ||
			!NativeWebServer._COMPRESSIBLE_TYPES.test(contentType)
		) {
			return undefined;
		}

		let selected: string | undefined;
		let selectedQuality = 0;
		for (const part of acceptEncoding.toLowerCase().split(",")) {
			const [name, ...params] = part.trim().split(";");
			const qualityParam = params.find(p => p.trim().startsWith("q="));
			const quality = Is.stringValue(qualityParam)
				? Number.parseFloat(qualityParam.trim().slice(2))
				: 1;
			const encoding = name === "x-gzip" ? "gzip" : name;
			const candidates =
				encoding === "*"
					? NativeWebServer._ENCODINGS
					: NativeWebServer._ENCODINGS.filter(e => e === encoding);
			for (const candidate of candidates) {
				const isBetter =
					quality > selectedQuality ||
					(quality === selectedQuality &&
						Is.stringValue(selected) &&
						NativeWebServer._ENCODINGS.indexOf(candidate) <
							NativeWebServer._ENCODINGS.indexOf(selected));
				if (quality > 0 && isBetter) {
					selected = candidate;
					selectedQuality = quality;
				}
			}
		}
		return selected;
	}

	/**
	 * Append a value to the vary header, keeping any value already set on the response.
	 * @param res The outgoing response.
	 * @param headers The response headers.
	 * @param value The value to append.
	 * @internal
	 */
	private appendVary(res: ServerResponse, headers: OutgoingHttpHeaders, value: string): void {
		const existing = headers.vary ?? res.getHeader("vary");
		if (Is.empty(existing)) {
			headers.vary = value;
		} else {
			headers.vary = `${Is.array(existing) ? existing.join(", ") : String(existing)}, ${value}`;
		}
	}

	/**
	 * Send an error response.
	 * @param res The outgoing response.
	 * @param error The error to send.
	 * @internal
	 */
	private async sendError(res: ServerResponse, error: unknown): Promise<void> {
		let httpStatusCode = NativeWebServer._ERROR_STATUS_CODES.get(error as object);
		let err: IError;
		if (Is.empty(httpStatusCode)) {
			const errorAndCode = HttpErrorHelper.processError(error);
			err = errorAndCode.error;
			httpStatusCode = errorAndCode.httpStatusCode;
		} else {
			err = BaseError.fromError(error).toJsonObject();
		}

		await this._logging?.log({
			level: "error",
			ts: Date.now(),
			source: NativeWebServer.CLASS_NAME,
			message: "badRequest",
			error: err
		});

		if (res.headersSent) {
			// The response is already partly sent, so the only option left is to drop it
			res.destroy();
			return;
		}

		const body = Converter.utf8ToBytes(JSON.stringify({ error: err }));
		const headers: OutgoingHttpHeaders = {
			[HeaderTypes.ContentType]: `${MimeTypes.Json}; charset=utf-8`,
			[HeaderTypes.ContentLength]: body.byteLength
		};
		if (httpStatusCode === HttpStatusCode.payloadTooLarge) {
			// The unread body would otherwise hold the connection open, so close it like Fastify
			headers.connection = "close";
		}
		res.writeHead(httpStatusCode, headers);
		res.end(body);
	}

	/**
	 * Proxy a connection to the server listening on the host and port.
	 * @param socket The incoming connection.
	 * @param host The host to connect to.
	 * @param port The port to connect to.
	 * @internal
	 */
	private proxyConnection(socket: NetSocket, host: string, port: number): void {
		const upstream = createConnection({ host, port });
		for (const [from, to] of [
			[socket, upstream],
			[upstream, socket]
		]) {
			from.pipe(to);
			from.on("error", () => to.destroy());
			from.on("close", () => to.destroy());
		}
	}

	/**
	 * Listen on a host and port.
	 * @param server The server to listen with.
	 * @param host The host to bind to.
	 * @param port The port to bind to.
	 * @returns A promise that resolves when the server is listening.
	 * @internal
	 */
	private async listenOn(
		server: HttpServer | HttpsServer | NetServer,
		host: string,
		port: number
	): Promise<void> {
		await new Promise<void>((resolve, reject) => {
			server.once("error", reject);
			server.listen(port, host, () => {
				server.off("error", reject);
				resolve();
			});
		});
	}

	/**
	 * Close the socket server, which also closes the server it is attached to.
	 * @param socketServer The socket server to close.
	 * @param server The server the socket server is attached to.
	 * @returns A promise that resolves when both servers have closed.
	 * @internal
	 */
	private async closeSocketServer(
		socketServer: Server,
		server?: HttpServer | HttpsServer
	): Promise<void> {
		const serverClosed = Is.empty(server) ? undefined : once(server, "close");
		socketServer.disconnectSockets();
		await socketServer.close();
		await serverClosed;
	}

	/**
	 * Close a server.
	 * @param server The server to close.
	 * @returns A promise that resolves when the server has closed.
	 * @internal
	 */
	private async closeServer(server: HttpServer | HttpsServer | NetServer): Promise<void> {
		await new Promise<void>((resolve, reject) => {
			server.close(err => (Is.empty(err) ? resolve() : reject(err)));
		});
	}
}
