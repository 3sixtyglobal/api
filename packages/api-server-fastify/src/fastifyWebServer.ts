// Copyright 2024 IOTA Stiftung.
// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { BaseServer } from "@3sixty/api-core-server";
import {
	HttpBodyLimit,
	HttpErrorHelper,
	type IHttpRequest,
	type IHttpRequestPathParams,
	type IHttpRequestQuery,
	type IHttpResponse,
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
import { HttpMethod, HttpStatusCode, type IHttpHeaders } from "@3sixty/web";
import FastifyCompress from "@fastify/compress";
import FastifyCors from "@fastify/cors";
import Fastify, {
	type FastifyInstance,
	type FastifyReply,
	type FastifyRequest,
	type FastifyServerOptions
} from "fastify";
import type { Server, ServerOptions, Socket } from "socket.io";
import FastifySocketIO from "./fastifySocketIo.js";
import type { IFastifyWebServerConstructorOptions } from "./models/IFastifyWebServerConstructorOptions.js";

/**
 * Implementation of the web server using Fastify.
 */
export class FastifyWebServer extends BaseServer<FastifyInstance> {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<FastifyWebServer>();

	/**
	 * The Fastify instance.
	 * @internal
	 */
	private readonly _fastify: FastifyInstance;

	/**
	 * The options for the socket server.
	 * @internal
	 */
	private readonly _socketConfig: Partial<ServerOptions>;

	/**
	 * Create a new instance of FastifyWebServer.
	 * @param options The options for the server.
	 */
	constructor(options?: IFastifyWebServerConstructorOptions) {
		super({
			loggingComponentType: options?.loggingComponentType,
			mimeTypeProcessors: options?.mimeTypeProcessors,
			includeErrorStack: options?.config?.includeErrorStack
		});

		this._fastify = Fastify({
			routerOptions: {
				maxParamLength: 2000
			},
			...options?.config?.web
			// Need this cast for now as maxParamLength has moved in to routerOptions
			// but the TS defs has not been updated yet
		} as unknown as FastifyServerOptions);
		this._socketConfig = {
			path: "/socket",
			...options?.config?.socket
		};
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return FastifyWebServer.CLASS_NAME;
	}

	/**
	 * Get the web server instance.
	 * @returns The web server instance.
	 */
	public getInstance(): FastifyInstance {
		return this._fastify;
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

		await this._fastify.register(FastifyCompress);

		if (Is.arrayValue(socketRoutes)) {
			await this._fastify.register(FastifySocketIO, this._socketConfig);
		}

		if (Is.arrayValue(this._mimeTypeProcessors)) {
			for (const contentTypeHandler of this._mimeTypeProcessors) {
				this._fastify.addContentTypeParser(
					contentTypeHandler.getTypes(),
					{ parseAs: "buffer" },
					(request, body, done) => {
						// Fastify does not handle this method correctly if it is async
						// so we have to use the callback method
						contentTypeHandler
							.handle(body as Buffer)
							// eslint-disable-next-line promise/prefer-await-to-then, promise/no-callback-in-promise
							.then(processed => done(null, processed))
							// eslint-disable-next-line promise/prefer-await-to-then, promise/no-callback-in-promise
							.catch(err => done(BaseError.fromError(err)));
					}
				);
			}
		}

		await this.initCors(options);

		this._fastify.setNotFoundHandler({}, async (request, reply) =>
			this.handleRequestRest(request, reply)
		);

		this._fastify.setErrorHandler(
			async (
				error: Error & {
					code?: number | string;
					statusCode?: number | string;
				},
				request,
				reply
			) => {
				// If code property is set this is a fastify error
				// otherwise it's from our framework
				let httpStatusCode: HttpStatusCode;
				let err: IError;
				if (Is.number(error.code) || Is.string(error.code)) {
					err = {
						source: FastifyWebServer.CLASS_NAME,
						name: error.name,
						message: `${error.code}: ${error.message}`
					};
					httpStatusCode = (error.statusCode as HttpStatusCode) ?? HttpStatusCode.badRequest;
				} else {
					const errorAndCode = HttpErrorHelper.processError(error);
					err = errorAndCode.error;
					httpStatusCode = errorAndCode.httpStatusCode;
				}

				await this._logging?.log({
					level: "error",
					ts: Date.now(),
					source: FastifyWebServer.CLASS_NAME,
					message: "badRequest",
					error: err
				});

				return reply.status(httpStatusCode).send({
					error: err
				});
			}
		);

		await this.addRoutesRest(restRouteProcessors, restRoutes);
		await this.addRoutesSocket(socketRouteProcessors, socketRoutes);
	}

	/**
	 * Start listening for connections on the transport.
	 * @param host The host to bind to.
	 * @param port The port to bind to.
	 * @returns A promise that resolves when the transport is listening.
	 */
	protected async serverListen(host: string, port: number): Promise<void> {
		await this._fastify.listen({ port, host });
	}

	/**
	 * Close the transport and all of its connections.
	 * @returns A promise that resolves when the transport has closed.
	 */
	protected async serverClose(): Promise<void> {
		await this._fastify.close();
	}

	/**
	 * Get the addresses the transport is bound to.
	 * @returns The bound addresses.
	 */
	protected serverAddresses(): { address: string; family?: string; port: number }[] {
		return this._fastify.addresses();
	}

	/**
	 * Whether the transport is serving over TLS.
	 * @returns True if the transport is secure.
	 */
	protected serverIsSecure(): boolean {
		// Fastify reports the https option as true rather than the options object
		const https: unknown = this._fastify.initialConfig.https;
		return https === true || Is.object(https);
	}

	/**
	 * Whether the transport is currently listening for connections.
	 * @returns True if the transport is listening.
	 */
	protected serverIsListening(): boolean {
		return this._fastify?.server?.listening ?? false;
	}

	/**
	 * Whether a GET route is registered for the root path.
	 * @returns True if the root route is registered.
	 */
	protected serverHasRootRoute(): boolean {
		return this._fastify.hasRoute({ method: "GET", url: "/" });
	}

	/**
	 * Add the REST routes to the server.
	 * @param restRouteProcessors The processors for the incoming requests.
	 * @param restRoutes The REST routes to add.
	 * @internal
	 */
	private async addRoutesRest(
		restRouteProcessors?: IRestRouteProcessor[],
		restRoutes?: IRestRoute[]
	): Promise<void> {
		if (Is.arrayValue(restRouteProcessors) && Is.arrayValue(restRoutes)) {
			const bodyLimits = this.resolveBodyLimits();
			for (const restRoute of restRoutes) {
				let path = StringHelper.trimTrailingSlashes(restRoute.path);
				if (!path.startsWith("/")) {
					path = `/${path}`;
				}
				await this._logging?.log({
					level: "info",
					ts: Date.now(),
					source: FastifyWebServer.CLASS_NAME,
					message: "restRouteAdded",
					data: { route: path, method: restRoute.method }
				});
				const method = restRoute.method.toLowerCase() as
					"get" | "post" | "put" | "patch" | "delete" | "options" | "head";

				const bodyLimitKey = Is.stringValue(restRoute.bodyLimit)
					? restRoute.bodyLimit
					: HttpBodyLimit.Default;
				const bodyLimit = bodyLimits[bodyLimitKey];
				if (Is.empty(bodyLimit)) {
					throw new GeneralError(FastifyWebServer.CLASS_NAME, "unknownBodyLimit", {
						route: path,
						bodyLimit: bodyLimitKey
					});
				}

				this._fastify[method](path, { bodyLimit }, async (request, reply) =>
					this.handleRequestRest(request, reply, restRoute)
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
		if (Is.arrayValue(socketRouteProcessors) && Is.arrayValue(socketRoutes)) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const io: Server = (this._fastify as any).io;

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
					source: FastifyWebServer.CLASS_NAME,
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
	 * @param request The incoming request.
	 * @param reply The outgoing response.
	 * @param restRoute The REST route to handle.
	 * @returns The Fastify reply with the response.
	 * @internal
	 */
	private async handleRequestRest(
		request: FastifyRequest,
		reply: FastifyReply,
		restRoute?: IRestRoute
	): Promise<FastifyReply> {
		const port =
			(request.port === 80 && request.protocol === "http") ||
			(request.port === 443 && request.protocol === "https") ||
			!Is.integer(request.port)
				? ""
				: `:${request.port}`;

		const requestOrigin = `${request.protocol}://${request.hostname}${port}`;

		const httpServerRequest = this.buildServerRequest(
			request.method.toUpperCase() as HttpMethod,
			`${requestOrigin}${request.url}`,
			request.body,
			request.query as IHttpRequestQuery,
			// The not found handler matches a wildcard, which is not a param of any route
			Is.empty(restRoute) ? {} : (request.params as IHttpRequestPathParams),
			request.headers as IHttpHeaders
		);

		const httpResponse: IHttpResponse = {};
		const contextIds = this.buildContextIds(
			requestOrigin,
			httpServerRequest.headers,
			request.socket.remoteAddress
		);
		const processorState = {};

		await this.runProcessorsRest(
			restRoute,
			httpServerRequest,
			httpResponse,
			contextIds,
			processorState
		);

		this.validateResponse(httpResponse);

		if (!Is.empty(httpResponse.headers)) {
			for (const header of Object.keys(httpResponse.headers)) {
				reply.header(header, httpResponse.headers[header]);
			}
		}
		return reply.status(httpResponse.statusCode ?? HttpStatusCode.ok).send(httpResponse.body);
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
	 * Initialize the cors options.
	 * @param options The web server options.
	 * @internal
	 */
	private async initCors(options?: IWebServerOptions): Promise<void> {
		const corsOptions = this.resolveCorsOptions(options);

		await this._fastify.register(FastifyCors, {
			delegator: (request, callback) => {
				const origin = request.headers.origin;
				const corsResponse = this.resolveCorsResponse(
					corsOptions,
					Is.string(origin) ? origin : undefined
				);
				callback(null, {
					// False disables CORS for the request, true reflects the request origin
					origin: Is.empty(corsResponse) ? false : (corsResponse.allowOrigin ?? true),
					credentials: corsResponse?.credentials ?? false,
					methods: corsOptions.methods,
					allowedHeaders: corsOptions.allowedHeaders,
					exposedHeaders: corsOptions.exposedHeaders
				});
			}
		});
	}
}
