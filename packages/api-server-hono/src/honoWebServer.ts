// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { lookup } from "node:dns/promises";
import { once } from "node:events";
import { createServer as createNetServer, type Server as NetServer } from "node:net";
import type { Server as TlsServer } from "node:tls";
import { BaseServer } from "@3sixty/api-core-server";
import {
	HttpBodyLimit,
	HttpErrorHelper,
	type IHttpRequest,
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
import { BaseError, GeneralError, type IError, Is, StringHelper } from "@3sixty/core";
import { nameof } from "@3sixty/nameof";
import { HeaderTypes, HttpMethod, HttpStatusCode, type IHttpHeaders, MimeTypes } from "@3sixty/web";
import { createAdaptorServer, type HttpBindings, type ServerType } from "@hono/node-server";
import { type Context, Hono } from "hono";
import { compress } from "hono/compress";
import { HTTPException } from "hono/http-exception";
import { Server, type ServerOptions, type Socket } from "socket.io";
import type { IHonoWebServerConfig } from "./models/IHonoWebServerConfig.js";
import type { IHonoWebServerConstructorOptions } from "./models/IHonoWebServerConstructorOptions.js";

/**
 * Implementation of the web server using Hono.
 */
export class HonoWebServer extends BaseServer<Hono> {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<HonoWebServer>();

	/**
	 * Matches the JSON keys which can be used for prototype poisoning.
	 * @internal
	 */
	private static readonly _POISON_KEYS: RegExp = /"(?:__proto__|constructor)"\s*:/;

	/**
	 * Shared encoder for text response bodies.
	 * @internal
	 */
	private static readonly _TEXT_ENCODER: TextEncoder = new TextEncoder();

	/**
	 * The Hono application.
	 * @internal
	 */
	private readonly _app: Hono;

	/**
	 * The options for the node web server.
	 * @internal
	 */
	private readonly _webConfig: IHonoWebServerConfig["web"];

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
	 * The node server the application is served on, available once listening.
	 * @internal
	 */
	private _server?: ServerType;

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
	 * Create a new instance of HonoWebServer.
	 * @param options The options for the server.
	 */
	constructor(options?: IHonoWebServerConstructorOptions) {
		super({
			loggingComponentType: options?.loggingComponentType,
			mimeTypeProcessors: options?.mimeTypeProcessors,
			includeErrorStack: options?.config?.includeErrorStack
		});

		this._app = new Hono();
		this._webConfig = options?.config?.web;
		this._socketConfig = {
			path: "/socket",
			...options?.config?.socket
		};
		this._mimeTypeProcessorMap = {};
		this._additionalServers = [];
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return HonoWebServer.CLASS_NAME;
	}

	/**
	 * Get the web server instance.
	 * @returns The web server instance.
	 */
	public getInstance(): Hono {
		return this._app;
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

		// Only run the compression middleware when the client accepts an encoding, as it
		// reads the request and response headers through the slower fetch API
		const compressMiddleware = compress();
		this._app.use(async (c, next) => {
			if (Is.stringValue(this.getRequestHeaders(c)["accept-encoding"])) {
				await compressMiddleware(c, next);
			} else {
				await next();
			}
		});

		if (Is.arrayValue(socketRoutes)) {
			this._socketServer = new Server(this._socketConfig);
		}

		// Processors supplied first take precedence for a media type
		for (const mimeTypeProcessor of [...this._mimeTypeProcessors].reverse()) {
			for (const mediaType of mimeTypeProcessor.getTypes()) {
				this._mimeTypeProcessorMap[mediaType.toLowerCase()] = mimeTypeProcessor;
			}
		}

		this.initCors(options);

		const bodyLimits = this.resolveBodyLimits();

		this._app.notFound(async c => this.handleRequestRest(c, bodyLimits[HttpBodyLimit.Default]));

		this._app.onError(async (error, c) => {
			// HTTP exceptions are raised by the transport, everything else is from our framework
			let httpStatusCode: HttpStatusCode;
			let err: IError;
			const httpException = error as Partial<HTTPException>;
			if (Is.integer(httpException.status) && Is.function(httpException.getResponse)) {
				err = BaseError.fromError(httpException.cause).toJsonObject();
				httpStatusCode = httpException.status as HttpStatusCode;
			} else {
				const errorAndCode = HttpErrorHelper.processError(error);
				err = errorAndCode.error;
				httpStatusCode = errorAndCode.httpStatusCode;
			}

			await this._logging?.log({
				level: "error",
				ts: Date.now(),
				source: HonoWebServer.CLASS_NAME,
				message: "badRequest",
				error: err
			});

			if (httpStatusCode === HttpStatusCode.payloadTooLarge) {
				// The unread body would otherwise hold the connection open, so close it like Fastify
				c.header("connection", "close");
			}

			return c.json({ error: err }, httpStatusCode as 400);
		});

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
		// The config omits the options the server controls, which flattens the server type union
		const server = createAdaptorServer({
			...this._webConfig,
			fetch: this._app.fetch
		} as Parameters<typeof createAdaptorServer>[0]);
		this._socketServer?.attach(server);

		// Like Fastify, bind every address localhost resolves to, so both IPv4 and IPv6 clients connect
		const hosts =
			host === "localhost"
				? [...new Set((await lookup(host, { all: true })).map(a => a.address))]
				: [host];

		await this.listenOn(server, hosts[0], port);
		this._server = server;

		for (const additionalHost of hosts.slice(1)) {
			const additionalServer = createNetServer(socket => server.emit("connection", socket));
			try {
				await this.listenOn(additionalServer, additionalHost, port);
				this._additionalServers.push(additionalServer);
			} catch (err) {
				// Like Fastify, an additional address failing to bind does not stop the server
				await this._logging?.log({
					level: "warn",
					ts: Date.now(),
					source: HonoWebServer.CLASS_NAME,
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
		return Is.function((this._server as Partial<TlsServer> | undefined)?.setSecureContext);
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
		return this._app.routes.some(route => route.method === HttpMethod.GET && route.path === "/");
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
					source: HonoWebServer.CLASS_NAME,
					message: "restRouteAdded",
					data: { route: path, method: restRoute.method }
				});

				const bodyLimitKey = Is.stringValue(restRoute.bodyLimit)
					? restRoute.bodyLimit
					: HttpBodyLimit.Default;
				const bodyLimit = bodyLimits[bodyLimitKey];
				if (Is.empty(bodyLimit)) {
					throw new GeneralError(HonoWebServer.CLASS_NAME, "unknownBodyLimit", {
						route: path,
						bodyLimit: bodyLimitKey
					});
				}

				this._app.on(restRoute.method, path, async c =>
					this.handleRequestRest(c, bodyLimit, restRoute)
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
					source: HonoWebServer.CLASS_NAME,
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
	 * Handle the incoming REST request.
	 * @param c The Hono context for the request.
	 * @param bodyLimit The maximum size of the request body in bytes.
	 * @param restRoute The REST route to handle.
	 * @returns The response.
	 * @internal
	 */
	private async handleRequestRest(
		c: Context,
		bodyLimit: number,
		restRoute?: IRestRoute
	): Promise<Response> {
		const url = c.req.url;
		const pathStart = url.indexOf("/", url.indexOf("//") + 2);
		const requestOrigin = pathStart === -1 ? url : url.slice(0, pathStart);
		const headers = this.getRequestHeaders(c);

		const httpServerRequest = this.buildServerRequest(
			c.req.method.toUpperCase() as HttpMethod,
			url,
			await this.parseBody(c, headers, bodyLimit),
			c.req.query(),
			c.req.param(),
			headers
		);

		const httpResponse: IHttpResponse = {};
		const contextIds = this.buildContextIds(requestOrigin, httpServerRequest.headers);
		const processorState = {};

		await this.runProcessorsRest(
			restRoute,
			httpServerRequest,
			httpResponse,
			contextIds,
			processorState
		);

		return this.buildResponse(httpResponse);
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
	 * Get the request headers, using the headers already parsed by Node when available,
	 * as building them from the fetch request is comparatively expensive.
	 * @param c The Hono context for the request.
	 * @returns The request headers with lower case names.
	 * @internal
	 */
	private getRequestHeaders(c: Context): IHttpHeaders {
		const incoming = (c.env as Partial<HttpBindings> | undefined)?.incoming;
		return (incoming?.headers ?? c.req.header()) as IHttpHeaders;
	}

	/**
	 * Read and parse the request body based on its content type.
	 * @param c The Hono context for the request.
	 * @param headers The request headers.
	 * @param bodyLimit The maximum size of the request body in bytes.
	 * @returns The parsed body, or undefined if there is no body.
	 * @throws HTTPException If the body is too large, malformed or an unsupported media type.
	 * @internal
	 */
	private async parseBody(c: Context, headers: IHttpHeaders, bodyLimit: number): Promise<unknown> {
		const method = c.req.method;
		if (method === HttpMethod.GET || method === HttpMethod.HEAD) {
			return undefined;
		}

		const raw = await this.readBody(c, headers, bodyLimit);
		if (Is.empty(raw)) {
			return undefined;
		}

		const contentType = headers[HeaderTypes.ContentType];
		const mediaType = (Is.string(contentType) ? contentType : "")
			.split(";")[0]
			.trim()
			.toLowerCase();

		const mimeTypeProcessor = this._mimeTypeProcessorMap[mediaType];
		if (!Is.empty(mimeTypeProcessor)) {
			return mimeTypeProcessor.handle(raw);
		}

		if (mediaType === MimeTypes.Json) {
			const text = new TextDecoder().decode(raw);
			try {
				const parsed: unknown = JSON.parse(text);
				if (HonoWebServer._POISON_KEYS.test(text)) {
					this.assertNotPoisoned(parsed);
				}
				return parsed;
			} catch (err) {
				throw new HTTPException(HttpStatusCode.badRequest, {
					cause: new GeneralError(HonoWebServer.CLASS_NAME, "invalidJsonBody", undefined, err)
				});
			}
		}

		if (mediaType === MimeTypes.PlainText) {
			return new TextDecoder().decode(raw);
		}

		throw new HTTPException(HttpStatusCode.unsupportedMediaType, {
			cause: new GeneralError(HonoWebServer.CLASS_NAME, "unsupportedMediaType", {
				contentType: mediaType
			})
		});
	}

	/**
	 * Read the raw request body, enforcing the body limit while streaming.
	 * @param c The Hono context for the request.
	 * @param headers The request headers.
	 * @param bodyLimit The maximum size of the request body in bytes.
	 * @returns The raw body, or undefined if it is empty.
	 * @throws HTTPException If the body is larger than the limit.
	 * @internal
	 */
	private async readBody(
		c: Context,
		headers: IHttpHeaders,
		bodyLimit: number
	): Promise<Uint8Array | undefined> {
		const contentLength = headers[HeaderTypes.ContentLength];
		if (Is.string(contentLength) && Number.parseInt(contentLength, 10) > bodyLimit) {
			throw this.createBodyTooLargeError(bodyLimit);
		}

		// Reading the Node stream directly avoids wrapping it in a web stream
		const source: AsyncIterable<Uint8Array> | null =
			(c.env as Partial<HttpBindings> | undefined)?.incoming ?? c.req.raw.body;
		if (Is.empty(source)) {
			return undefined;
		}

		const chunks: Uint8Array[] = [];
		let total = 0;
		for await (const chunk of source) {
			total += chunk.byteLength;
			if (total > bodyLimit) {
				throw this.createBodyTooLargeError(bodyLimit);
			}
			chunks.push(chunk);
		}

		return total === 0 ? undefined : Buffer.concat(chunks, total);
	}

	/**
	 * Create the error for a body which exceeds the limit.
	 * @param bodyLimit The maximum size of the request body in bytes.
	 * @returns The error.
	 * @internal
	 */
	private createBodyTooLargeError(bodyLimit: number): HTTPException {
		return new HTTPException(HttpStatusCode.payloadTooLarge, {
			cause: new GeneralError(HonoWebServer.CLASS_NAME, "bodyTooLarge", { bodyLimit })
		});
	}

	/**
	 * Reject parsed JSON containing keys which could be used for prototype poisoning.
	 * @param value The parsed value to check.
	 * @throws GeneralError If a poisoning key is found.
	 * @internal
	 */
	private assertNotPoisoned(value: unknown): void {
		const pending: unknown[] = [value];
		while (pending.length > 0) {
			const current = pending.pop();
			if (Is.object<{ [key: string]: unknown }>(current) || Is.array(current)) {
				if (
					Object.hasOwn(current, "__proto__") ||
					(Object.hasOwn(current, "constructor") &&
						Is.object((current as { constructor: unknown }).constructor) &&
						Object.hasOwn((current as { constructor: object }).constructor, "prototype"))
				) {
					throw new GeneralError(HonoWebServer.CLASS_NAME, "prototypePoisoning");
				}
				pending.push(...Object.values(current));
			}
		}
	}

	/**
	 * Build the transport response from the processed response.
	 * @param httpResponse The processed response.
	 * @returns The response.
	 * @internal
	 */
	private buildResponse(httpResponse: IHttpResponse): Response {
		// A plain header record keeps the response on the node adapter's fast path,
		// multiple values for a header can only be represented with a Headers instance
		const headers: { [name: string]: string } = {};
		let multiValueHeaders: Headers | undefined;
		if (!Is.empty(httpResponse.headers)) {
			for (const header of Object.keys(httpResponse.headers)) {
				const value = httpResponse.headers[header];
				if (Is.array(value)) {
					multiValueHeaders ??= new Headers();
					for (const item of value) {
						multiValueHeaders.append(header, item);
					}
				} else if (!Is.empty(value)) {
					headers[header.toLowerCase()] = String(value);
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
			return new Response(null, {
				status,
				headers: this.mergeHeaders(headers, multiValueHeaders)
			});
		}

		if (Is.function((payload as Partial<ReadableStream>).getReader)) {
			headers[HeaderTypes.ContentType] ??= MimeTypes.OctetStream;
			return new Response(payload as ReadableStream, {
				status,
				headers: this.mergeHeaders(headers, multiValueHeaders)
			});
		}

		let body: Uint8Array;
		if (Is.uint8Array(payload)) {
			body = payload;
			headers[HeaderTypes.ContentType] ??= MimeTypes.OctetStream;
		} else if (Is.string(payload)) {
			body = HonoWebServer._TEXT_ENCODER.encode(payload);
			headers[HeaderTypes.ContentType] ??= `${MimeTypes.PlainText}; charset=utf-8`;
		} else {
			body = HonoWebServer._TEXT_ENCODER.encode(JSON.stringify(payload));
			headers[HeaderTypes.ContentType] ??= `${MimeTypes.Json}; charset=utf-8`;
		}

		// A known length lets compression skip small bodies and avoids a chunked response
		headers[HeaderTypes.ContentLength] = body.byteLength.toString();

		return new Response(body as Uint8Array<ArrayBuffer>, {
			status,
			headers: this.mergeHeaders(headers, multiValueHeaders)
		});
	}

	/**
	 * Merge the single value headers in to the multiple value headers, if there are any.
	 * @param headers The single value headers.
	 * @param multiValueHeaders The multiple value headers.
	 * @returns The headers to use for the response.
	 * @internal
	 */
	private mergeHeaders(
		headers: { [name: string]: string },
		multiValueHeaders?: Headers
	): HeadersInit {
		if (Is.empty(multiValueHeaders)) {
			return headers;
		}
		for (const header of Object.keys(headers)) {
			multiValueHeaders.set(header, headers[header]);
		}
		return multiValueHeaders;
	}

	/**
	 * Initialize the cors options.
	 * @param options The web server options.
	 * @internal
	 */
	private initCors(options?: IWebServerOptions): void {
		const corsOptions = this.resolveCorsOptions(options);
		const allowMethods = corsOptions.methods.join(", ");
		const allowHeaders = corsOptions.allowedHeaders.join(", ");
		const exposeHeaders = corsOptions.exposedHeaders.join(", ");

		// Mirrors the Fastify CORS plugin, the headers are added after the handler has run
		// because creating the response headers beforehand forces Hono to rebuild the response
		this._app.use(async (c, next) => {
			const headers = this.getRequestHeaders(c);
			const origin = headers.origin;
			const requestOrigin = Is.string(origin) ? origin : undefined;
			const allowed =
				corsOptions.hasWildcardOrigin ||
				(Is.stringValue(requestOrigin) && corsOptions.origins.includes(requestOrigin));

			if (allowed && c.req.method === HttpMethod.OPTIONS) {
				if (
					!Is.stringValue(requestOrigin) ||
					!Is.stringValue(headers["access-control-request-method"])
				) {
					return c.text("Invalid Preflight Request", HttpStatusCode.badRequest, {
						vary: "Origin"
					});
				}
				return new Response(null, {
					status: HttpStatusCode.noContent,
					headers: {
						vary: "Origin",
						"access-control-allow-origin": requestOrigin,
						"access-control-allow-credentials": "true",
						"access-control-expose-headers": exposeHeaders,
						"access-control-allow-methods": allowMethods,
						"access-control-allow-headers": allowHeaders,
						"content-length": "0"
					}
				});
			}

			await next();

			const responseHeaders = c.res.headers;
			responseHeaders.append("vary", "Origin");
			if (allowed) {
				if (Is.stringValue(requestOrigin)) {
					responseHeaders.set("access-control-allow-origin", requestOrigin);
				}
				responseHeaders.set("access-control-allow-credentials", "true");
				responseHeaders.set("access-control-expose-headers", exposeHeaders);
			}
		});
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
		server: ServerType | NetServer,
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
	private async closeSocketServer(socketServer: Server, server?: ServerType): Promise<void> {
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
	private async closeServer(server: ServerType | NetServer): Promise<void> {
		await new Promise<void>((resolve, reject) => {
			server.close(err => (Is.empty(err) ? resolve() : reject(err)));
		});
	}
}
