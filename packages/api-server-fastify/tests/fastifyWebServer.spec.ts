// Copyright 2024 IOTA Stiftung.
// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { lookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import { createServer as createNetServer } from "node:net";
import {
	HealthCategory,
	HealthStatus,
	HttpBodyLimit,
	HttpContextIdKeys,
	HttpErrorHelper,
	type IHttpResponse,
	type IMimeTypeProcessor,
	type IRestRoute,
	type IRestRouteProcessor,
	type ISocketRoute
} from "@3sixty/api-models";
import {
	JwtMimeTypeProcessor,
	LoggingProcessor,
	SocketRouteProcessor
} from "@3sixty/api-processors";
import {
	ComponentFactory,
	GeneralError,
	GuardError,
	Is,
	Mutex,
	NotFoundError,
	NotImplementedError,
	UnauthorizedError
} from "@3sixty/core";
import type { ILogEntry, ILoggingComponent } from "@3sixty/logging-models";
import { HeaderTypes, HttpMethod, HttpStatusCode, MimeTypes } from "@3sixty/web";
import { io, type ManagerOptions, type Socket, type SocketOptions } from "socket.io-client";
import { getFreePort } from "./setupTestEnv.js";
import { TEST_TLS_CERT, TEST_TLS_KEY } from "./testCertificate.js";
import { FastifyWebServer } from "../src/fastifyWebServer.js";

let port = 0;

/**
 * Create a route processor which returns an ok response.
 * @returns The processor.
 */
function createOkProcessor(): IRestRouteProcessor {
	return {
		className: () => "RouteProcessor",
		process: async (request, response) => {
			response.statusCode = HttpStatusCode.ok;
			response.body = {};
		}
	};
}

/**
 * Create a POST route with an optional body limit name.
 * @param path The route path.
 * @param bodyLimit The optional body limit name.
 * @returns The route.
 */
function createPostRoute(path: string, bodyLimit?: string): IRestRoute {
	return {
		operationId: "bodyLimitTest",
		path,
		method: HttpMethod.POST,
		tag: "test",
		summary: "",
		handler: async () => ({}),
		bodyLimit
	};
}

/**
 * Post a JSON body with an exact byte length.
 * @param path The route path to post to.
 * @param byteLength The total body length in bytes, including the 11 byte JSON wrapper.
 * @returns The response.
 */
async function postJsonBody(path: string, byteLength: number): Promise<Response> {
	return fetch(`http://localhost:${port}${path}`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ data: "x".repeat(byteLength - 11) })
	});
}

/**
 * Post a request declaring a body byte length without streaming the payload,
 * so an over limit response can be read before the connection is closed.
 * @param path The route path to post to.
 * @param byteLength The declared body length in bytes.
 * @returns The response status code and body.
 */
async function postDeclaredLength(
	path: string,
	byteLength: number
): Promise<{ statusCode?: number; body: string }> {
	return new Promise((resolve, reject) => {
		const request = http.request(
			{
				host: "localhost",
				port,
				path,
				method: "POST",
				headers: { "Content-Type": "application/json", "Content-Length": byteLength }
			},
			response => {
				let data = "";
				response.on("data", chunk => {
					data += chunk;
				});
				response.on("end", () => resolve({ statusCode: response.statusCode, body: data }));
			}
		);
		request.on("error", reject);
		request.setTimeout(5000, () => request.destroy(new Error("Timed out waiting for response")));
		request.flushHeaders();
	});
}

/**
 * Create a route processor which runs the route handler and copies its response.
 * @returns The processor.
 */
function createHandlerProcessor(): IRestRouteProcessor {
	return {
		className: () => "HandlerProcessor",
		process: async (request, response, route, processorState) => {
			if (!route) {
				response.statusCode = HttpStatusCode.notFound;
				response.body = { url: request.url, params: request.pathParams };
				return;
			}
			const routeResponse = await route.handler(
				{ serverRequest: request, processorState },
				{ pathParams: request.pathParams, query: request.query, body: request.body }
			);
			response.headers = routeResponse?.headers;
			response.statusCode = routeResponse?.statusCode ?? HttpStatusCode.ok;
			response.body = routeResponse?.body;
		}
	};
}

/**
 * Create a route with a handler.
 * @param path The route path.
 * @param handler The route handler.
 * @param method The route method.
 * @returns The route.
 */
function createRoute(
	path: string,
	handler: IRestRoute["handler"],
	method: HttpMethod = HttpMethod.GET
): IRestRoute {
	return { operationId: path, path, method, tag: "test", summary: "", handler };
}

/**
 * Create a socket route which echoes the request body back on the echo topic.
 * @returns The route.
 */
function createEchoSocketRoute(): ISocketRoute {
	return {
		operationId: "echo",
		path: "/test-namespace/echo",
		handler: async (socketRequestContext, request, responseEmitter) => {
			await responseEmitter("echo", { body: request.body });
		}
	};
}

/**
 * Send a request with exact control over the method, headers and body.
 * @param method The request method.
 * @param path The request path.
 * @param headers The request headers.
 * @param body The request body.
 * @param chunks The request body sent as separate chunks.
 * @returns The response status code and body.
 */
async function rawRequest(
	method: string,
	path: string,
	headers: { [key: string]: string },
	body?: string,
	chunks?: string[]
): Promise<{ statusCode?: number; body: string }> {
	return new Promise((resolve, reject) => {
		const request = http.request({ host: "localhost", port, method, path, headers }, response => {
			let data = "";
			response.on("data", chunk => {
				data += chunk;
			});
			response.on("end", () => resolve({ statusCode: response.statusCode, body: data }));
		});
		request.on("error", reject);
		request.setTimeout(5000, () => request.destroy(new Error("Timed out waiting for response")));
		for (const chunk of chunks ?? []) {
			request.write(chunk);
		}
		request.end(body);
	});
}

/**
 * Wait for a condition to become true.
 * @param condition The condition to wait for.
 * @param timeoutMs The maximum time to wait.
 */
async function waitFor(condition: () => boolean, timeoutMs: number = 5000): Promise<void> {
	const start = Date.now();
	while (!condition()) {
		if (Date.now() - start > timeoutMs) {
			throw new Error("Timed out waiting for condition");
		}
		await new Promise(resolve => setTimeout(resolve, 10));
	}
}

/**
 * Connect a socket client and wait for the connection to be established.
 * @param url The namespace url to connect to.
 * @param options Additional client options.
 * @returns The connected socket.
 */
async function connectSocket(
	url: string,
	options?: Partial<ManagerOptions & SocketOptions>
): Promise<Socket> {
	const socket = io(url, { path: "/socket", transports: ["websocket"], ...options });
	await new Promise<void>((resolve, reject) => {
		socket.once("connect", () => resolve());
		socket.once("connect_error", reject);
	});
	return socket;
}

describe("api-server-fastify", () => {
	beforeEach(async () => {
		port = await getFreePort();
	});

	test("Can create an instance of the server", () => {
		const server = new FastifyWebServer();
		expect(server).toBeDefined();
	});

	test("Can build with no routes or processors", async () => {
		const server = new FastifyWebServer();
		await server.build();
		expect(server).toBeDefined();
	});

	test("Can fail to build with REST routes and no processors", async () => {
		const server = new FastifyWebServer();

		await expect(
			server.build(
				[],
				[
					{
						operationId: "test",
						path: "/",
						method: HttpMethod.GET,
						tag: "test",
						summary: "",
						handler: async (httpRequestContext, request) => {}
					}
				]
			)
		).rejects.toMatchObject({
			name: "GeneralError",
			message: "baseServer.noRestProcessors"
		});
	});

	test("Can build with REST routes and processors", async () => {
		const server = new FastifyWebServer();

		let counter = 0;
		await server.build(
			[
				{
					className: () => "RouteProcessor",
					process: async (request, response, route, processorState) => {
						counter++;
						const req = {
							pathParams: request.pathParams,
							query: request.query,
							body: request.body
						};
						const socketRouteResponse = await route?.handler(
							{
								serverRequest: request,
								processorState
							},
							req
						);
						response.headers = socketRouteResponse.headers;
						response.statusCode = socketRouteResponse.statusCode ?? HttpStatusCode.ok;
						response.body = socketRouteResponse.body;
					}
				}
			],
			[
				{
					operationId: "test",
					path: "/",
					method: HttpMethod.GET,
					tag: "test",
					summary: "",
					handler: async (httpRequestContext, request) => ({
						body: { data: "bar" }
					})
				}
			],
			undefined,
			undefined,
			{ port }
		);

		await server.start();

		const response = await fetch(`http://localhost:${port}/`);
		const json = await response.json();

		expect(counter).toEqual(1);
		expect(json).toEqual({ data: "bar" });

		await server.stop();
	});

	test("Can handle an error thrown inside a REST processor", async () => {
		const server = new FastifyWebServer();

		await server.build(
			[
				{
					className: () => "RouteProcessor",
					process: async (request, response, route, contextIds, processorState) => {
						HttpErrorHelper.buildResponse(
							response,
							{ name: "Error", message: "AuthError" },
							HttpStatusCode.unauthorized,
							false
						);
					}
				}
			],
			[
				{
					operationId: "test",
					path: "/",
					method: HttpMethod.GET,
					tag: "test",
					summary: "",
					handler: async (httpRequestContext, request) => ({
						body: { data: "bar" }
					})
				}
			],
			undefined,
			undefined,
			{ port }
		);

		await server.start();

		const response = await fetch(`http://localhost:${port}/`);
		const json = await response.json();

		expect(response.status).toEqual(HttpStatusCode.unauthorized);
		expect(json).toEqual({ message: "AuthError", name: "Error" });

		await server.stop();
	});

	test("Can run each REST processor only for the phases it implements", async () => {
		const server = new FastifyWebServer();

		const calls: string[] = [];

		await server.build(
			[
				{
					className: () => "PreOnlyProcessor",
					pre: async () => {
						calls.push("pre-only");
					}
				},
				{
					className: () => "PostOnlyProcessor",
					post: async () => {
						calls.push("post-only");
					}
				},
				createOkProcessor()
			],
			[createPostRoute("/")],
			undefined,
			undefined,
			{ port }
		);

		await server.start();

		await postJsonBody("/", 20);

		expect(calls).toEqual(["pre-only", "post-only"]);

		await server.stop();
	});

	test("Can preserve the processor order within each REST phase", async () => {
		const server = new FastifyWebServer();

		const calls: string[] = [];

		/**
		 * Create a processor which records every phase it runs.
		 * @param name The name of the processor.
		 * @returns The processor.
		 */
		function createRecordingProcessor(name: string): IRestRouteProcessor {
			return {
				className: () => name,
				pre: async () => {
					calls.push(`${name}-pre`);
				},
				process: async (request, response) => {
					calls.push(`${name}-process`);
					response.statusCode = HttpStatusCode.ok;
					response.body = {};
				},
				post: async () => {
					calls.push(`${name}-post`);
				}
			};
		}

		await server.build(
			[createRecordingProcessor("first"), createRecordingProcessor("second")],
			[createPostRoute("/")],
			undefined,
			undefined,
			{ port }
		);

		await server.start();

		await postJsonBody("/", 20);

		expect(calls).toEqual([
			"first-pre",
			"second-pre",
			"first-process",
			"second-process",
			"first-post",
			"second-post"
		]);

		await server.stop();
	});

	test("Can fail to build with socket routes and no processors", async () => {
		const server = new FastifyWebServer();

		await expect(
			server.build(
				undefined,
				undefined,
				[],
				[
					{
						operationId: "test",
						path: "/",
						handler: async (httpRequestContext, request) => {}
					}
				]
			)
		).rejects.toMatchObject({
			name: "GeneralError",
			message: "baseServer.noSocketProcessors"
		});
	});

	test("Can build with socket routes and processors and receive cookies in socket operations", async () => {
		const server = new FastifyWebServer({
			config: { socket: { path: "/my-sockets" } }
		});

		let connectedSocketId = "";
		let connectedCookie = "";
		let disconnectedSocketId = "";
		let disconnectedCookie = "";
		let preSocketId = "";
		let preCookie = "";
		let preData = 0;
		let processSocketId = "";
		let processCookie = "";
		let processData = 0;
		let postSocketId = "";
		let postCookie = "";
		let postData = 0;
		await server.build(
			[
				{
					className: () => "RouteProcessor",
					process: async (request, response, route, contextIds, processorState) => {
						response.headers ??= {};
						response.headers[HeaderTypes.SetCookie] =
							"foo=bar; Max-Age=1000; Domain=localhost; Path=/; Expires=Tue, 01 Jul 2025 10:01:11 GMT; HttpOnly; Secure; SameSite=strict";
					}
				}
			],
			[
				{
					operationId: "test",
					path: "/cookie",
					method: HttpMethod.GET,
					tag: "test",
					summary: "",
					handler: async (httpRequestContext, request) => {}
				}
			],
			[
				{
					className: () => "RouteProcessor",
					connected: async (request, route) => {
						connectedSocketId = request.socketId;
						connectedCookie = request.headers?.[HeaderTypes.Cookie] as string;
					},
					disconnected: async (request, route) => {
						disconnectedSocketId = request.socketId;
						disconnectedCookie = request.headers?.[HeaderTypes.Cookie] as string;
					},
					pre: async (request, response, route, contextIds, processorState) => {
						preSocketId = request.socketId;
						preCookie = request.headers?.[HeaderTypes.Cookie] as string;
						preData = request.body?.data as number;
					},
					process: async (request, response, route, processorState, responseEmitter) => {
						processSocketId = request.socketId;
						processCookie = request.headers?.[HeaderTypes.Cookie] as string;
						processData = request.body?.data as number;
						await route?.handler(
							{
								serverRequest: request,
								processorState,
								socketId: request.socketId
							},
							{
								pathParams: request.pathParams,
								query: request.query,
								body: request.body
							},
							async (topic, socketRouteResponse) => {
								response.headers = socketRouteResponse.headers;
								response.body = socketRouteResponse.body;
								response.statusCode = socketRouteResponse.statusCode ?? HttpStatusCode.ok;
								await responseEmitter(topic, response);
							}
						);
					},
					post: async (request, response, route, requestIdentity, processorState) => {
						postSocketId = request.socketId;
						postCookie = request.headers?.[HeaderTypes.Cookie] as string;
						postData = request.body?.data as number;
					}
				}
			],
			[
				{
					operationId: "test",
					path: "/test-namespace/ping",
					handler: async (httpRequestContext, request, responseEmitter) => {
						await responseEmitter("ping", {
							body: { data: "bar" }
						});
					}
				}
			],
			{ port }
		);

		await server.start();

		// Need to manually get and set the cookie as we are not using a browser which would
		// automatically handle this.
		const fetchResponse = await fetch(`http://localhost:${port}/cookie`);
		const cookie = fetchResponse.headers.get("set-cookie") ?? "";

		const socket = io(`http://localhost:${port}/test-namespace`, {
			path: "/my-sockets",
			withCredentials: true,
			transports: ["websocket"],
			extraHeaders: { cookie }
		});

		socket.on("connect", () => {});

		for (let i = 0; i < 20; i++) {
			if (connectedSocketId.length > 0) {
				break;
			}
			await new Promise(resolve => setTimeout(resolve, 100));
		}

		let pingResult = "";
		socket.on("ping", payload => {
			pingResult = payload.body.data;
		});

		socket.emit("ping", { body: { data: 123 } });

		for (let i = 0; i < 20; i++) {
			if (preSocketId.length > 0) {
				break;
			}
			await new Promise(resolve => setTimeout(resolve, 100));
		}

		for (let i = 0; i < 20; i++) {
			if (pingResult.length > 0) {
				break;
			}
			await new Promise(resolve => setTimeout(resolve, 100));
		}

		socket.close();

		for (let i = 0; i < 20; i++) {
			if (disconnectedSocketId.length > 0) {
				break;
			}
			await new Promise(resolve => setTimeout(resolve, 100));
		}

		await server.stop();

		expect(connectedSocketId.length > 0).toBeTruthy();
		expect(connectedCookie.length > 0).toBeTruthy();
		expect(disconnectedSocketId.length > 0).toBeTruthy();
		expect(disconnectedCookie.length > 0).toBeTruthy();
		expect(preSocketId.length > 0).toBeTruthy();
		expect(preCookie.length > 0).toBeTruthy();
		expect(preData).toEqual(123);
		expect(processSocketId.length > 0).toBeTruthy();
		expect(processCookie.length > 0).toBeTruthy();
		expect(processData).toEqual(123);
		expect(postSocketId.length > 0).toBeTruthy();
		expect(postCookie.length > 0).toBeTruthy();
		expect(postData).toEqual(123);
		expect(pingResult).toBeTruthy();
	});

	test("Can handle an error thrown inside a socket processor", async () => {
		const server = new FastifyWebServer();

		await server.build(
			undefined,
			undefined,
			[
				{
					className: () => "RouteProcessor",
					process: async (request, response, route, contextIds, processorState) => {
						HttpErrorHelper.buildResponse(
							response,
							{ name: "Error", message: "AuthError" },
							HttpStatusCode.unauthorized,
							false
						);
					}
				}
			],
			[
				{
					operationId: "test",
					path: "/test-namespace/ping",
					handler: async (httpRequestContext, request, responseEmitter) => {
						await responseEmitter("ping", {
							body: { data: "bar" }
						});
					}
				}
			],
			{ port }
		);

		await server.start();

		const socket = io(`http://localhost:${port}/test-namespace`, {
			transports: ["websocket"],
			path: "/socket"
		});

		socket.on("connect", () => {});

		let pingResult: IHttpResponse | undefined;
		socket.on("ping", payload => {
			pingResult = payload;
		});

		socket.emit("ping", { data: 123 });

		for (let i = 0; i < 20; i++) {
			if (pingResult) {
				break;
			}
			await new Promise(resolve => setTimeout(resolve, 100));
		}

		socket.close();

		expect(pingResult?.statusCode).toEqual(HttpStatusCode.unauthorized);
		expect(pingResult?.body).toEqual({ message: "AuthError", name: "Error" });

		await server.stop();
	});

	test("Can handle a socket message with no payload without terminating the process", async () => {
		const server = new FastifyWebServer();

		await server.build(
			undefined,
			undefined,
			[new SocketRouteProcessor()],
			[
				{
					operationId: "test",
					path: "/test-namespace/ping",
					handler: async (socketRequestContext, request, responseEmitter) => {
						await responseEmitter("ping", {
							body: { data: request.body?.data ?? "no-body" }
						});
					}
				}
			],
			{ port }
		);

		await server.start();

		const socket = io(`http://localhost:${port}/test-namespace`, {
			transports: ["websocket"],
			path: "/socket"
		});

		socket.on("connect", () => {});

		const pingResults: IHttpResponse[] = [];
		socket.on("ping", payload => {
			pingResults.push(payload);
		});

		// No payload at all, this used to dereference undefined in the socket listener
		socket.emit("ping");

		for (let i = 0; i < 20; i++) {
			if (pingResults.length > 0) {
				break;
			}
			await new Promise(resolve => setTimeout(resolve, 100));
		}

		// The server should still be alive and able to serve a well formed message
		socket.emit("ping", { body: { data: 123 } });

		for (let i = 0; i < 20; i++) {
			if (pingResults.length > 1) {
				break;
			}
			await new Promise(resolve => setTimeout(resolve, 100));
		}

		socket.close();

		expect(pingResults.length).toEqual(2);
		expect(pingResults[0]?.statusCode).toEqual(HttpStatusCode.ok);
		expect(pingResults[0]?.body).toEqual({ data: "no-body" });
		expect(pingResults[1]?.statusCode).toEqual(HttpStatusCode.ok);
		expect(pingResults[1]?.body).toEqual({ data: 123 });

		await server.stop();
	});

	test("Can handle a rejection from an async socket route handler", async () => {
		const server = new FastifyWebServer();

		await server.build(
			undefined,
			undefined,
			[new SocketRouteProcessor()],
			[
				{
					operationId: "test",
					path: "/test-namespace/ping",
					handler: async (socketRequestContext, request) => {
						await new Promise(resolve => setTimeout(resolve, 10));
						throw new Error("handlerFailed");
					}
				}
			],
			{ port }
		);

		await server.start();

		const socket = io(`http://localhost:${port}/test-namespace`, {
			transports: ["websocket"],
			path: "/socket"
		});

		socket.on("connect", () => {});

		let pingResult: IHttpResponse | undefined;
		socket.on("ping", payload => {
			pingResult = payload;
		});

		socket.emit("ping", { body: {} });

		for (let i = 0; i < 20; i++) {
			if (pingResult) {
				break;
			}
			await new Promise(resolve => setTimeout(resolve, 100));
		}

		socket.close();

		expect(pingResult?.statusCode).toEqual(HttpStatusCode.internalServerError);
		expect(pingResult?.body).toEqual(
			expect.objectContaining({ message: "handlerFailed", name: "Error" })
		);

		await server.stop();
	});

	test("Can response on a socket with a different topic", async () => {
		const server = new FastifyWebServer();

		await server.build(
			undefined,
			undefined,
			[
				{
					className: () => "RouteProcessor",
					process: async (request, response, route, processorState, responseEmitter) => {
						await route?.handler(
							{
								serverRequest: request,
								processorState,
								socketId: request.socketId
							},
							{
								pathParams: request.pathParams,
								query: request.query,
								body: request.body
							},
							async (topic, socketRouteResponse) => {
								response.headers = socketRouteResponse.headers;
								response.body = socketRouteResponse.body;
								response.statusCode = socketRouteResponse.statusCode ?? HttpStatusCode.ok;
								await responseEmitter(topic, response);
							}
						);
					}
				}
			],
			[
				{
					operationId: "test",
					path: "/test-namespace/ping",
					handler: async (httpRequestContext, request, responseEmitter) => {
						await responseEmitter("pong", {
							body: { data: "bar" }
						});
					}
				}
			],
			{ port }
		);

		await server.start();

		const socket = io(`http://localhost:${port}/test-namespace`, {
			transports: ["websocket"],
			path: "/socket"
		});

		socket.on("connect", () => {});

		let pongResult: IHttpResponse | undefined;
		socket.on("pong", payload => {
			pongResult = payload;
		});

		socket.emit("ping", { data: 123 });

		for (let i = 0; i < 20; i++) {
			if (pongResult) {
				break;
			}
			await new Promise(resolve => setTimeout(resolve, 100));
		}

		socket.close();

		expect(pongResult).toBeTruthy();

		await server.stop();
	});

	test("Can return healthy status when server is running", async () => {
		const server = new FastifyWebServer();
		await server.build(undefined, undefined, undefined, undefined, { port });
		await server.start();

		const result = await server.health();

		await server.stop();

		expect(result).toEqual([
			{
				source: "BaseServer",
				description: "healthConnectivityDescription",
				status: HealthStatus.Ok,
				category: HealthCategory.Connectivity,
				message: "reachable"
			}
		]);
	});

	test("Can return error status when server is not running", async () => {
		const server = new FastifyWebServer();
		await server.build(undefined, undefined, undefined, undefined, { port });

		const result = await server.health();

		expect(result).toEqual([
			{
				source: "BaseServer",
				description: "healthConnectivityDescription",
				message: "unreachable",
				status: HealthStatus.Error,
				category: HealthCategory.Connectivity
			}
		]);
	});

	test("Can return healthy application status when root endpoint responds with a body", async () => {
		const server = new FastifyWebServer();
		server.getInstance().get("/", async () => "root content");
		await server.build(undefined, undefined, undefined, undefined, { port });
		await server.start();

		const result = await server.healthApplication(vi.fn());

		await server.stop();

		expect(result).toEqual([
			{
				source: "BaseServer",
				status: HealthStatus.Ok,
				category: HealthCategory.Application,
				description: "healthApplicationDescription",
				message: "rootEndpointReachable"
			}
		]);
	});

	test("Can return error application status when server is not listening", async () => {
		const server = new FastifyWebServer();
		server.getInstance().get("/", async () => "root content");
		await server.build(undefined, undefined, undefined, undefined, { port });

		const result = await server.healthApplication(vi.fn());

		expect(result?.[0]?.status).toBe(HealthStatus.Error);
		expect(result?.[0]?.category).toBe(HealthCategory.Application);
		expect(result?.[0]?.error).toBeDefined();
	});

	test("Can return error application status when server is not built", async () => {
		const server = new FastifyWebServer();
		server.getInstance().get("/", async () => "root content");

		const result = await server.healthApplication(vi.fn());

		expect(result).toEqual([
			{
				source: "BaseServer",
				status: HealthStatus.Error,
				category: HealthCategory.Application,
				description: "healthApplicationDescription",
				message: "serverNotBuilt"
			}
		]);
	});

	test("Returns empty health when GET / is not registered", async () => {
		const server = new FastifyWebServer();

		const result = await server.healthApplication(vi.fn());

		expect(result).toEqual([]);
	});

	test("Can serialize same-id requests with Mutex while different ids proceed in parallel", async () => {
		const server = new FastifyWebServer();
		const handlerDelayMs = 100;
		const requestCount = 25;

		// Concurrency counters - incremented only while the lock is held, so any
		// value above 1 for the same key is direct proof the mutex was bypassed.
		const activeConcurrentPerKey: { [key: string]: number } = {};
		const peakConcurrentPerKey: { [key: string]: number } = {};
		let globalActive = 0;
		let peakGlobalActive = 0;

		await server.build(
			[
				{
					className: () => "RouteProcessor",
					process: async (request, response, route, processorState) => {
						const res = await route?.handler(
							{ serverRequest: request, processorState },
							{ pathParams: request.pathParams, query: request.query, body: request.body }
						);
						response.statusCode = res?.statusCode ?? HttpStatusCode.ok;
						response.body = res?.body;
					}
				}
			],
			[
				{
					operationId: "test",
					path: "/:id",
					method: HttpMethod.GET,
					tag: "test",
					summary: "",
					handler: async (httpRequestContext, request) => {
						const id = request.pathParams?.id;
						const acquired = await Mutex.lock(id);
						if (!acquired) {
							return { statusCode: HttpStatusCode.conflict, body: { data: "timeout" } };
						}

						activeConcurrentPerKey[id] = (activeConcurrentPerKey[id] ?? 0) + 1;
						peakConcurrentPerKey[id] = Math.max(
							peakConcurrentPerKey[id] ?? 0,
							activeConcurrentPerKey[id]
						);
						globalActive++;
						peakGlobalActive = Math.max(peakGlobalActive, globalActive);

						try {
							await new Promise(resolve => setTimeout(resolve, handlerDelayMs));
							return { body: { data: "ok" } };
						} finally {
							activeConcurrentPerKey[id]--;
							globalActive--;
							Mutex.unlock(id);
						}
					}
				}
			],
			undefined,
			undefined,
			{ port }
		);

		await server.start();

		// requestCount requests with the same id - serialized by the mutex.
		const sameIdStart = Date.now();
		const sameIdResponses = await Promise.all(
			Array.from({ length: requestCount }, async () => fetch(`http://localhost:${port}/abc`))
		);
		const sameIdDuration = Date.now() - sameIdStart;

		for (const r of sameIdResponses) {
			expect(r.status).toEqual(HttpStatusCode.ok);
		}
		// Direct proof the lock was never bypassed: no two handlers held it simultaneously.
		expect(peakConcurrentPerKey.abc).toEqual(1);
		// Timing confirms serialization.
		expect(sameIdDuration).toBeGreaterThanOrEqual((requestCount - 1) * handlerDelayMs);

		// Reset global tracking before the parallel batch.
		globalActive = 0;
		peakGlobalActive = 0;

		// requestCount requests each with a unique id - independent locks, run in parallel.
		const differentIdStart = Date.now();
		const differentIdResponses = await Promise.all(
			[...new Array(requestCount).keys()].map(async i => fetch(`http://localhost:${port}/${i}`))
		);
		const differentIdDuration = Date.now() - differentIdStart;

		for (const r of differentIdResponses) {
			expect(r.status).toEqual(HttpStatusCode.ok);
		}
		// Direct proof that different-id requests overlapped in the critical section.
		expect(peakGlobalActive).toBeGreaterThan(1);
		// Timing confirms parallelism.
		expect(differentIdDuration).toBeLessThan((requestCount - 1) * handlerDelayMs);

		await server.stop();
	});

	test("Can add a custom content type processor", async () => {
		const server = new FastifyWebServer({
			mimeTypeProcessors: [new JwtMimeTypeProcessor()],
			loggingComponentType: "logging"
		});

		const logEntries: ILogEntry[] = [];
		let body = "";

		const logger: ILoggingComponent = {
			className: () => "logger",
			log: async (logEntry: ILogEntry) => {
				logEntries.push(logEntry);
			},
			query: async () => {
				throw new NotImplementedError("Not implemented", "");
			}
		};

		ComponentFactory.register("logging", () => logger);

		await server.build(
			[
				{
					className: () => "RouteProcessor",
					process: async (request, response, route, contextIds, processorState) => {
						body = request.body;
					}
				},
				new LoggingProcessor({ loggingComponentType: "logging" })
			],
			[
				{
					operationId: "test",
					path: "/",
					method: HttpMethod.POST,
					tag: "test",
					summary: "",
					handler: async (httpRequestContext, request) => {}
				}
			],
			undefined,
			undefined,
			{ port }
		);

		await server.start();

		await fetch(`http://localhost:${port}/`, {
			method: "POST",
			headers: { "Content-Type": "application/jwt" },
			body: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ"
		});

		expect(body).toEqual(
			"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ"
		);
		expect(logEntries.length).toEqual(2);
		expect(logEntries[0].message.startsWith("requestMessage")).toEqual(true);
		expect(logEntries[1].message.startsWith("responseMessage")).toEqual(true);

		await server.stop();
	});

	test("Can accept a body at the default limit and reject one above it", async () => {
		const server = new FastifyWebServer();
		await server.build([createOkProcessor()], [createPostRoute("/")], undefined, undefined, {
			port
		});
		await server.start();

		const withinResponse = await postJsonBody("/", 1048576);
		const overResponse = await postDeclaredLength("/", 1048577);

		expect(withinResponse.status).toEqual(200);
		expect(overResponse.statusCode).toEqual(413);
		expect(overResponse.body).toContain("FST_ERR_CTP_BODY_TOO_LARGE");

		await server.stop();
	});

	test("Can accept a body at a configured default limit and reject one above it", async () => {
		const server = new FastifyWebServer();
		await server.build([createOkProcessor()], [createPostRoute("/")], undefined, undefined, {
			port,
			bodyLimits: { [HttpBodyLimit.Default]: 2048 }
		});
		await server.start();

		const withinResponse = await postJsonBody("/", 2048);
		const overResponse = await postJsonBody("/", 2049);

		expect(withinResponse.status).toEqual(200);
		expect(overResponse.status).toEqual(413);

		await server.stop();
	});

	test("Can raise the limit for a route named large while other routes keep the default", async () => {
		const server = new FastifyWebServer();
		await server.build(
			[createOkProcessor()],
			[createPostRoute("/big", HttpBodyLimit.Large), createPostRoute("/small")],
			undefined,
			undefined,
			{ port }
		);
		await server.start();

		const bigResponse = await postJsonBody("/big", 26214400);
		const bigOverResponse = await postDeclaredLength("/big", 26214401);
		const smallResponse = await postDeclaredLength("/small", 1048577);

		expect(bigResponse.status).toEqual(200);
		expect(bigOverResponse.statusCode).toEqual(413);
		expect(smallResponse.statusCode).toEqual(413);

		await server.stop();
	});

	test("Can lower the limit for a route using a configured name", async () => {
		const server = new FastifyWebServer();
		await server.build(
			[createOkProcessor()],
			[createPostRoute("/", "tiny")],
			undefined,
			undefined,
			{
				port,
				bodyLimits: { tiny: 512 }
			}
		);
		await server.start();

		const withinResponse = await postJsonBody("/", 512);
		const overResponse = await postJsonBody("/", 513);

		expect(withinResponse.status).toEqual(200);
		expect(overResponse.status).toEqual(413);

		await server.stop();
	});

	test("Can apply the route limit to the JSON-LD content type processor", async () => {
		const server = new FastifyWebServer();
		await server.build([createOkProcessor()], [createPostRoute("/")], undefined, undefined, {
			port,
			bodyLimits: { [HttpBodyLimit.Default]: 2048 }
		});
		await server.start();

		const postJsonLdBody = async (byteLength: number): Promise<Response> => {
			const wrapperLength = JSON.stringify({ "@context": "https://schema.org", data: "" }).length;
			return fetch(`http://localhost:${port}/`, {
				method: "POST",
				headers: { "Content-Type": MimeTypes.JsonLd },
				body: JSON.stringify({
					"@context": "https://schema.org",
					data: "x".repeat(byteLength - wrapperLength)
				})
			});
		};

		const withinResponse = await postJsonLdBody(2048);
		const overResponse = await postJsonLdBody(2049);

		expect(withinResponse.status).toEqual(200);
		expect(overResponse.status).toEqual(413);

		await server.stop();
	});

	test("Can use a custom JSON-LD mime type processor instead of the built-in one", async () => {
		let handled = 0;
		const server = new FastifyWebServer({
			mimeTypeProcessors: [
				{
					className: () => "custom-json-ld",
					getTypes: () => [MimeTypes.JsonLd],
					handle: async () => {
						handled++;
						return {};
					}
				}
			]
		});
		await server.build([createOkProcessor()], [createPostRoute("/")], undefined, undefined, {
			port
		});
		await server.start();

		const response = await fetch(`http://localhost:${port}/`, {
			method: "POST",
			headers: { "Content-Type": MimeTypes.JsonLd },
			body: JSON.stringify({ "@context": "https://schema.org" })
		});

		expect(response.status).toEqual(200);
		expect(handled).toEqual(1);

		await server.stop();
	});

	test("Can fail to build when a route names an unknown body limit", async () => {
		const server = new FastifyWebServer();
		await expect(
			server.build([createOkProcessor()], [createPostRoute("/", "huge")], undefined, undefined, {
				port
			})
		).rejects.toMatchObject({
			name: "GeneralError",
			message: "fastifyWebServer.unknownBodyLimit",
			properties: { route: "/", bodyLimit: "huge" }
		});
	});

	test("Can fail to build when a body limit value is not a positive integer", async () => {
		await expect(
			new FastifyWebServer().build(
				[createOkProcessor()],
				[createPostRoute("/")],
				undefined,
				undefined,
				{
					port,
					bodyLimits: { [HttpBodyLimit.Default]: 0 }
				}
			)
		).rejects.toMatchObject({
			name: "GeneralError",
			message: "baseServer.invalidBodyLimit",
			properties: { bodyLimit: HttpBodyLimit.Default, value: 0 }
		});

		await expect(
			new FastifyWebServer().build(
				[createOkProcessor()],
				[createPostRoute("/", "tiny")],
				undefined,
				undefined,
				{ port, bodyLimits: { tiny: 1.5 } }
			)
		).rejects.toMatchObject({
			name: "GeneralError",
			message: "baseServer.invalidBodyLimit",
			properties: { bodyLimit: "tiny", value: 1.5 }
		});
	});

	test("Can stop promptly when clients have not read their responses", async () => {
		const server = new FastifyWebServer();
		await server.build(
			[createHandlerProcessor()],
			[
				createRoute("/", async () => ({ body: { ok: true } })),
				createRoute("/", async () => ({ body: { ok: true } }), HttpMethod.POST)
			],
			undefined,
			undefined,
			{ port }
		);
		await server.start();

		await fetch(`http://localhost:${port}/`);
		await fetch(`http://localhost:${port}/`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ data: 1 })
		});

		const start = Date.now();
		await server.stop();

		expect(Date.now() - start).toBeLessThan(1000);
	});

	test("Can serve concurrent websocket clients without crossing their responses", async () => {
		const server = new FastifyWebServer();
		await server.build(
			undefined,
			undefined,
			[new SocketRouteProcessor()],
			[createEchoSocketRoute()],
			{ port }
		);
		await server.start();

		const clientCount = 10;
		const messageCount = 25;
		const sockets = await Promise.all(
			Array.from({ length: clientCount }, async () =>
				connectSocket(`http://localhost:${port}/test-namespace`)
			)
		);

		const received: string[][] = sockets.map(() => []);
		for (let client = 0; client < clientCount; client++) {
			sockets[client].on("echo", (payload: IHttpResponse<{ client: number; seq: number }>) => {
				received[client].push(`${payload.body?.client}:${payload.body?.seq}`);
			});
		}

		for (let seq = 0; seq < messageCount; seq++) {
			for (let client = 0; client < clientCount; client++) {
				sockets[client].emit("echo", { body: { client, seq } });
			}
		}

		await waitFor(() => received.every(r => r.length === messageCount));

		for (const socket of sockets) {
			socket.close();
		}
		await server.stop();

		for (let client = 0; client < clientCount; client++) {
			expect(received[client]).toEqual(
				Array.from({ length: messageCount }, (v, seq) => `${client}:${seq}`)
			);
		}
	});

	test("Can exchange a large payload over a websocket", async () => {
		const server = new FastifyWebServer();
		await server.build(
			undefined,
			undefined,
			[new SocketRouteProcessor()],
			[createEchoSocketRoute()],
			{ port }
		);
		await server.start();

		const socket = await connectSocket(`http://localhost:${port}/test-namespace`);
		let result: IHttpResponse<{ data: string }> | undefined;
		socket.on("echo", payload => {
			result = payload;
		});

		const data = "x".repeat(512 * 1024);
		socket.emit("echo", { body: { data } });

		await waitFor(() => !Is.empty(result));

		socket.close();
		await server.stop();

		expect(result?.statusCode).toEqual(HttpStatusCode.ok);
		expect(result?.body?.data).toEqual(data);
	});

	test("Can serve REST and websockets on every address localhost resolves to", async () => {
		const server = new FastifyWebServer();
		await server.build(
			[createHandlerProcessor()],
			[createRoute("/info", async () => ({ body: { ok: true } }))],
			[new SocketRouteProcessor()],
			[createEchoSocketRoute()],
			{ port }
		);
		await server.start();

		const hosts = [
			...new Set(
				(await lookup("localhost", { all: true })).map(a => {
					const isIPv6 = a.family === 6;
					return isIPv6 ? `[${a.address}]` : a.address;
				})
			)
		];

		const results: { host: string; status: number; echo: unknown }[] = [];
		for (const host of hosts) {
			const response = await fetch(`http://${host}:${port}/info`);
			await response.arrayBuffer();
			const socket = await connectSocket(`http://${host}:${port}/test-namespace`);
			let echo: unknown;
			socket.on("echo", (payload: IHttpResponse) => {
				echo = payload.body;
			});
			socket.emit("echo", { body: { host } });
			await waitFor(() => !Is.empty(echo));
			socket.close();
			results.push({ host, status: response.status, echo });
		}

		await server.stop();

		expect(results.length).toBeGreaterThan(0);
		for (const result of results) {
			expect(result).toEqual({
				host: result.host,
				status: HttpStatusCode.ok,
				echo: { host: result.host }
			});
		}
	});

	test("Can upgrade a polling socket connection to a websocket", async () => {
		const server = new FastifyWebServer();
		await server.build(
			undefined,
			undefined,
			[new SocketRouteProcessor()],
			[createEchoSocketRoute()],
			{ port }
		);
		await server.start();

		const socket = await connectSocket(`http://localhost:${port}/test-namespace`, {
			transports: ["polling", "websocket"]
		});
		await waitFor(() => socket.io.engine.transport.name === "websocket");

		let result: IHttpResponse | undefined;
		socket.on("echo", payload => {
			result = payload;
		});
		socket.emit("echo", { body: { value: 1 } });

		await waitFor(() => !Is.empty(result));

		socket.close();
		await server.stop();

		expect(result?.body).toEqual({ value: 1 });
	});

	test("Can disconnect websocket clients when the server stops", async () => {
		const server = new FastifyWebServer();
		let connectedCount = 0;
		let disconnectedCount = 0;
		await server.build(
			undefined,
			undefined,
			[
				{
					className: () => "RouteProcessor",
					connected: async () => {
						connectedCount++;
					},
					disconnected: async () => {
						disconnectedCount++;
					}
				}
			],
			[createEchoSocketRoute()],
			{ port }
		);
		await server.start();

		const socket = await connectSocket(`http://localhost:${port}/test-namespace`, {
			reconnection: false
		});
		let clientDisconnected = false;
		socket.on("disconnect", () => {
			clientDisconnected = true;
		});

		await waitFor(() => connectedCount === 1);
		await server.stop();
		await waitFor(() => clientDisconnected && disconnectedCount === 1);

		socket.close();

		expect(await server.health()).toEqual([
			expect.objectContaining({ status: HealthStatus.Error, message: "unreachable" })
		]);
	});

	test("Can reject a body with an unsupported content type", async () => {
		const server = new FastifyWebServer();
		await server.build([createOkProcessor()], [createPostRoute("/")], undefined, undefined, {
			port
		});
		await server.start();

		const response = await fetch(`http://localhost:${port}/`, {
			method: "POST",
			headers: { "Content-Type": "application/xml" },
			body: "<a/>"
		});
		const json = await response.json();

		await server.stop();

		expect(response.status).toEqual(HttpStatusCode.unsupportedMediaType);
		expect(json.error.message).toContain("FST_ERR_CTP_INVALID_MEDIA_TYPE");
	});

	test("Can reject a malformed JSON body", async () => {
		const server = new FastifyWebServer();
		await server.build([createOkProcessor()], [createPostRoute("/")], undefined, undefined, {
			port
		});
		await server.start();

		const response = await fetch(`http://localhost:${port}/`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: "{ not json"
		});
		const json = await response.json();

		await server.stop();

		expect(response.status).toEqual(HttpStatusCode.badRequest);
		expect(json.error.message).toContain("FST_ERR_CTP_INVALID_JSON_BODY");
	});

	test("Can parse a plain text body", async () => {
		const server = new FastifyWebServer();
		let body: unknown;
		await server.build(
			[createHandlerProcessor()],
			[
				createRoute(
					"/",
					async (context, request) => {
						body = request.body;
						return { body: {} };
					},
					HttpMethod.POST
				)
			],
			undefined,
			undefined,
			{ port }
		);
		await server.start();

		const response = await fetch(`http://localhost:${port}/`, {
			method: "POST",
			headers: { "Content-Type": "text/plain" },
			body: "hello"
		});
		await response.arrayBuffer();

		await server.stop();

		expect(response.status).toEqual(HttpStatusCode.ok);
		expect(body).toEqual("hello");
	});

	test("Can decode path params and query values", async () => {
		const server = new FastifyWebServer();
		await server.build(
			[createHandlerProcessor()],
			[
				createRoute("/items/:id", async (context, request) => ({
					body: { id: request.pathParams?.id, q: request.query?.q }
				}))
			],
			undefined,
			undefined,
			{ port }
		);
		await server.start();

		const response = await fetch(`http://localhost:${port}/items/a%20b?q=c%20d`);
		const json = await response.json();

		await server.stop();

		expect(json).toEqual({ id: "a b", q: "c d" });
	});

	test("Can run the processors for a request which matches no route", async () => {
		const server = new FastifyWebServer();
		await server.build(
			[createHandlerProcessor()],
			[createRoute("/known", async () => ({ body: {} }))],
			undefined,
			undefined,
			{ port }
		);
		await server.start();

		const response = await fetch(`http://localhost:${port}/missing?x=1`);
		const json = await response.json();

		await server.stop();

		expect(response.status).toEqual(HttpStatusCode.notFound);
		expect(json).toEqual({ url: `http://localhost:${port}/missing?x=1`, params: {} });
	});

	test("Can only allow the configured CORS origins", async () => {
		const server = new FastifyWebServer();
		await server.build([createOkProcessor()], [createPostRoute("/")], undefined, undefined, {
			port,
			corsOrigins: ["http://allowed.test"]
		});
		await server.start();

		const preflight = async (origin: string): Promise<Response> => {
			const response = await fetch(`http://localhost:${port}/`, {
				method: "OPTIONS",
				headers: {
					Origin: origin,
					"Access-Control-Request-Method": "POST"
				}
			});
			await response.arrayBuffer();
			return response;
		};

		const allowed = await preflight("http://allowed.test");
		const denied = await preflight("http://denied.test");

		await server.stop();

		expect(allowed.status).toEqual(HttpStatusCode.noContent);
		expect(allowed.headers.get("access-control-allow-origin")).toEqual("http://allowed.test");
		expect(allowed.headers.get("access-control-allow-credentials")).toEqual("true");
		expect(allowed.headers.get("access-control-allow-methods")).toContain("POST");
		expect(denied.headers.get("access-control-allow-origin")).toBeNull();
	});

	test("Can answer a wildcard CORS origin without credentials", async () => {
		const server = new FastifyWebServer();
		await server.build([createOkProcessor()], [createPostRoute("/")], undefined, undefined, {
			port,
			corsWildcardCredentials: false
		});
		await server.start();

		const preflight = await fetch(`http://localhost:${port}/`, {
			method: "OPTIONS",
			headers: { Origin: "http://any.test", "Access-Control-Request-Method": "POST" }
		});
		await preflight.arrayBuffer();
		const response = await fetch(`http://localhost:${port}/`, {
			method: "POST",
			headers: { Origin: "http://any.test" }
		});
		await response.arrayBuffer();

		await server.stop();

		expect(preflight.status).toEqual(HttpStatusCode.noContent);
		expect(preflight.headers.get("access-control-allow-origin")).toEqual("*");
		expect(preflight.headers.get("access-control-allow-credentials")).toBeNull();
		expect(response.headers.get("access-control-allow-origin")).toEqual("*");
		expect(response.headers.get("access-control-allow-credentials")).toBeNull();
	});

	test("Can reflect a wildcard CORS origin with credentials by default", async () => {
		const server = new FastifyWebServer();
		await server.build([createOkProcessor()], [createPostRoute("/")], undefined, undefined, {
			port
		});
		await server.start();

		const response = await fetch(`http://localhost:${port}/`, {
			method: "POST",
			headers: { Origin: "http://any.test" }
		});
		await response.arrayBuffer();

		await server.stop();

		expect(response.headers.get("access-control-allow-origin")).toEqual("http://any.test");
		expect(response.headers.get("access-control-allow-credentials")).toEqual("true");
	});

	test("Can use the socket address as the client IP unless the peer is a trusted proxy", async () => {
		const ipProcessor: IRestRouteProcessor = {
			className: () => "IpProcessor",
			pre: async (request, response, route, contextIds, processorState) => {
				processorState.ip = contextIds[HttpContextIdKeys.IpAddress];
			},
			process: async (request, response, route, processorState) => {
				response.statusCode = HttpStatusCode.ok;
				response.body = { ip: processorState.ip };
			}
		};
		const requestIp = async (): Promise<unknown> => {
			const response = await fetch(`http://127.0.0.1:${port}/`, {
				method: "POST",
				headers: { "X-Forwarded-For": "203.0.113.1, 198.51.100.2", "X-Real-IP": "203.0.113.9" }
			});
			return response.json();
		};

		const untrusted = new FastifyWebServer();
		await untrusted.build([ipProcessor], [createPostRoute("/")], undefined, undefined, { port });
		await untrusted.start();
		const untrustedJson = await requestIp();
		await untrusted.stop();

		const trusted = new FastifyWebServer();
		await trusted.build([ipProcessor], [createPostRoute("/")], undefined, undefined, {
			port,
			trustedProxies: ["127.0.0.0/8", "::1"]
		});
		await trusted.start();
		const trustedJson = await requestIp();
		await trusted.stop();

		expect(untrustedJson).toEqual({ ip: "127.0.0.1" });
		expect(trustedJson).toEqual({ ip: "198.51.100.2" });
	});

	test("Can compress large responses and leave small ones uncompressed", async () => {
		const server = new FastifyWebServer();
		const items = Array.from({ length: 2000 }, (v, i) => ({ id: i, name: `item-${i}` }));
		await server.build(
			[createHandlerProcessor()],
			[
				createRoute("/large", async () => ({ body: { items } })),
				createRoute("/small", async () => ({ body: { ok: true } }))
			],
			undefined,
			undefined,
			{ port }
		);
		await server.start();

		const large = await fetch(`http://localhost:${port}/large`, {
			headers: { "Accept-Encoding": "gzip" }
		});
		const largeJson = await large.json();
		const small = await fetch(`http://localhost:${port}/small`, {
			headers: { "Accept-Encoding": "gzip" }
		});
		const smallJson = await small.json();

		await server.stop();

		expect(large.headers.get("content-encoding")).toEqual("gzip");
		expect(largeJson).toEqual({ items });
		expect(small.headers.get("content-encoding")).toBeNull();
		expect(small.headers.get("content-length")).toEqual("11");
		expect(smallJson).toEqual({ ok: true });
	});

	test("Can send binary, text and HEAD responses", async () => {
		const server = new FastifyWebServer();
		await server.build(
			[createHandlerProcessor()],
			[
				createRoute("/binary", async () => ({ body: new Uint8Array([1, 2, 3]) })),
				createRoute("/text", async () => ({ body: "hello" }))
			],
			undefined,
			undefined,
			{ port }
		);
		await server.start();

		const binary = await fetch(`http://localhost:${port}/binary`);
		const binaryBody = new Uint8Array(await binary.arrayBuffer());
		const text = await fetch(`http://localhost:${port}/text`);
		const textBody = await text.text();
		const head = await fetch(`http://localhost:${port}/text`, { method: "HEAD" });
		const headBody = await head.text();

		await server.stop();

		expect(binary.headers.get("content-type")).toEqual(MimeTypes.OctetStream);
		expect(binaryBody).toEqual(new Uint8Array([1, 2, 3]));
		expect(text.headers.get("content-type")).toEqual("text/plain; charset=utf-8");
		expect(textBody).toEqual("hello");
		expect(head.status).toEqual(HttpStatusCode.ok);
		expect(headBody).toEqual("");
	});

	test("Can keep serving when an additional localhost address is already in use", async () => {
		const addresses = await lookup("localhost", { all: true });
		const blockers: ReturnType<typeof createNetServer>[] = [];
		// The first address is the primary binding, block the others so they fail to bind
		for (const address of addresses.slice(1)) {
			const blocker = createNetServer();
			await new Promise<void>(resolve => blocker.listen(port, address.address, resolve));
			blockers.push(blocker);
		}

		const server = new FastifyWebServer();
		await server.build(
			[createHandlerProcessor()],
			[createRoute("/info", async () => ({ body: { ok: true } }))],
			undefined,
			undefined,
			{ port }
		);
		await server.start();

		const primary = addresses[0];
		const host = primary.family === 6 ? `[${primary.address}]` : primary.address;
		const response = await fetch(`http://${host}:${port}/info`);
		const json = await response.json();
		const health = await server.health();

		await server.stop();
		for (const blocker of blockers) {
			await new Promise(resolve => blocker.close(resolve));
		}

		expect(json).toEqual({ ok: true });
		expect(health).toEqual([expect.objectContaining({ status: HealthStatus.Ok })]);
	});

	test("Can serve REST and websockets over https and report application health", async () => {
		const server = new FastifyWebServer({
			config: { web: { https: { key: TEST_TLS_KEY, cert: TEST_TLS_CERT } } }
		});
		await server.build(
			[createHandlerProcessor()],
			[createRoute("/", async () => ({ body: "root content" }))],
			[new SocketRouteProcessor()],
			[createEchoSocketRoute()],
			{ port }
		);
		await server.start();

		const response = await new Promise<{ statusCode?: number; body: string }>((resolve, reject) => {
			https
				.get(`https://localhost:${port}/`, { ca: TEST_TLS_CERT }, res => {
					let data = "";
					res.on("data", chunk => {
						data += chunk;
					});
					res.on("end", () => resolve({ statusCode: res.statusCode, body: data }));
				})
				.on("error", reject);
		});

		const socket = await connectSocket(`https://localhost:${port}/test-namespace`, {
			ca: TEST_TLS_CERT
		});
		let echo: unknown;
		socket.on("echo", (payload: IHttpResponse) => {
			echo = payload.body;
		});
		socket.emit("echo", { body: { secure: true } });
		await waitFor(() => !Is.empty(echo));
		socket.close();

		const health = await server.healthApplication(vi.fn());

		await server.stop();

		expect(response).toEqual({ statusCode: HttpStatusCode.ok, body: "root content" });
		expect(echo).toEqual({ secure: true });
		expect(health).toEqual([
			expect.objectContaining({ status: HealthStatus.Ok, message: "rootEndpointReachable" })
		]);
	});

	test("Can match routes, params and query values the same way as the other servers", async () => {
		const server = new FastifyWebServer();

		const echoRoute = (operationId: string, path: string, method?: HttpMethod): IRestRoute =>
			createRoute(
				path,
				async (context, request) => ({
					body: {
						route: operationId,
						params: request.pathParams ?? {},
						query: request.query ?? {}
					}
				}),
				method
			);

		await server.build(
			[createHandlerProcessor()],
			[
				echoRoute("list", "/items"),
				echoRoute("item", "/items/:id"),
				echoRoute("static", "/items/special"),
				echoRoute("itemPost", "/items/:id", HttpMethod.POST),
				echoRoute("entries", "/items/:id/entries"),
				echoRoute("entry", "/items/:id/entries/:entryId"),
				echoRoute("entryObjects", "/items/:id/entries/objects"),
				echoRoute("revision", "/docs/:docId/:revision"),
				echoRoute("trailing", "/things/"),
				echoRoute("noLeadingSlash", "relative/path"),
				echoRoute("case", "/Case/Sensitive")
			],
			undefined,
			undefined,
			{ port }
		);
		await server.start();

		const cases: {
			method?: HttpMethod;
			path: string;
			status: number;
			route?: string;
			params?: { [key: string]: string };
			query?: { [key: string]: string | string[] };
		}[] = [
			{ path: "/items", status: 200, route: "list", params: {} },
			{ path: "/items/special", status: 200, route: "static", params: {} },
			{ path: "/items/abc", status: 200, route: "item", params: { id: "abc" } },
			{ method: HttpMethod.POST, path: "/items/abc", status: 200, route: "itemPost" },
			{ method: HttpMethod.PUT, path: "/items/abc", status: 404 },
			{ path: "/items/abc/entries", status: 200, route: "entries", params: { id: "abc" } },
			{
				path: "/items/abc/entries/objects",
				status: 200,
				route: "entryObjects",
				params: { id: "abc" }
			},
			{
				path: "/items/abc/entries/e1",
				status: 200,
				route: "entry",
				params: { id: "abc", entryId: "e1" }
			},
			{
				path: "/docs/d1/3",
				status: 200,
				route: "revision",
				params: { docId: "d1", revision: "3" }
			},
			{ path: "/things", status: 200, route: "trailing" },
			{ path: "/relative/path", status: 200, route: "noLeadingSlash" },
			{ path: "/Case/Sensitive", status: 200, route: "case" },
			{ path: "/case/sensitive", status: 404 },
			{ path: "/items/", status: 200, route: "item", params: { id: "" } },
			{
				path: "/docs/d1/",
				status: 200,
				route: "revision",
				params: { docId: "d1", revision: "" }
			},
			{
				path: "/docs//3",
				status: 200,
				route: "revision",
				params: { docId: "", revision: "3" }
			},
			{ path: "/items/abc/", status: 404 },
			{ path: "/items/abc/unknown", status: 404 },
			{ path: "/items/a%20b", status: 200, route: "item", params: { id: "a b" } },
			{ path: "/items/caf%C3%A9", status: 200, route: "item", params: { id: "café" } },
			{ path: "/items/report.v1.pdf", status: 200, route: "item", params: { id: "report.v1.pdf" } },
			{
				path: "/items/did:iota:0x123",
				status: 200,
				route: "item",
				params: { id: "did:iota:0x123" }
			},
			{
				path: "/items/did%3Aiota%3A0x123%23key-1",
				status: 200,
				route: "item",
				params: { id: "did:iota:0x123#key-1" }
			},
			{
				path: "/items/https%3A%2F%2Fexample.com%3A8080",
				status: 200,
				route: "item",
				params: { id: "https://example.com:8080" }
			},
			{ path: "/items/a+b", status: 200, route: "item", params: { id: "a+b" } },
			{
				path: "/items/user@example.com",
				status: 200,
				route: "item",
				params: { id: "user@example.com" }
			},
			{ path: "/items/100%25", status: 200, route: "item", params: { id: "100%" } },
			{ path: "/items/a%2520b", status: 200, route: "item", params: { id: "a%20b" } },
			{
				path: "/items/abc?q=a%20b&r=1",
				status: 200,
				route: "item",
				params: { id: "abc" },
				query: { q: "a b", r: "1" }
			},
			{ path: "/items?q=a+b", status: 200, route: "list", query: { q: "a b" } },
			{ path: "/items?flag", status: 200, route: "list", query: { flag: "" } },
			{ path: "/items?empty=", status: 200, route: "list", query: { empty: "" } },
			{ path: "/items?a%20key=v", status: 200, route: "list", query: { "a key": "v" } },
			{ path: "/items?p=100%25", status: 200, route: "list", query: { p: "100%" } },
			{ path: "/items?a=1&a=2", status: 200, route: "list", query: { a: ["1", "2"] } },
			{
				path: "/items?origin=https%3A%2F%2Fexample.com%3A8080%2Fpath",
				status: 200,
				route: "list",
				query: { origin: "https://example.com:8080/path" }
			}
		];

		const results: { method: string; path: string; actual: unknown }[] = [];
		for (const testCase of cases) {
			const method = testCase.method ?? HttpMethod.GET;
			const response = await fetch(`http://localhost:${port}${testCase.path}`, { method });
			const json = (await response.json()) as {
				route?: string;
				params?: { [key: string]: string };
				query?: { [key: string]: string | string[] };
			};
			results.push({
				method,
				path: testCase.path,
				actual: {
					status: response.status,
					route: testCase.status === 200 ? json.route : undefined,
					params: Is.object(testCase.params) ? json.params : undefined,
					query: Is.object(testCase.query) ? json.query : undefined
				}
			});
		}

		await server.stop();

		expect(results).toEqual(
			cases.map(testCase => ({
				method: testCase.method ?? HttpMethod.GET,
				path: testCase.path,
				actual: {
					status: testCase.status,
					route: testCase.status === 200 ? testCase.route : undefined,
					params: testCase.params,
					query: testCase.query
				}
			}))
		);
	});

	test("Can respond to error conditions the same way as the other servers", async () => {
		const throwingMimeTypeProcessor: IMimeTypeProcessor = {
			className: () => "ThrowingMimeTypeProcessor",
			getTypes: () => ["application/x-boom"],
			handle: async () => {
				throw new GeneralError("test", "boom");
			}
		};
		const circular: { [key: string]: unknown } = {};
		circular.self = circular;
		const echoBody: IRestRoute["handler"] = async (context, request) => ({
			body: { body: request.body ?? null }
		});

		const server = new FastifyWebServer({ mimeTypeProcessors: [throwingMimeTypeProcessor] });
		await server.build(
			[createHandlerProcessor()],
			[
				createRoute("/items/:id", async (context, request) => ({
					body: { id: request.pathParams?.id, query: request.query }
				})),
				createRoute("/echo", echoBody, HttpMethod.POST),
				createRoute("/echo", echoBody, HttpMethod.DELETE),
				{ ...createRoute("/small", echoBody, HttpMethod.POST), bodyLimit: "tiny" },
				createRoute("/throw/not-found", async () => {
					throw new NotFoundError("test", "missing", "id1");
				}),
				createRoute("/throw/guard", async () => {
					throw new GuardError("test", "guard", "property", undefined);
				}),
				createRoute("/throw/plain", async () => {
					throw new Error("plain");
				}),
				createRoute("/circular", async () => ({ body: circular })),
				createRoute("/invalid-header", async () => ({
					headers: { "x-invalid": "a\nb" },
					body: {}
				})),
				createRoute("/invalid-status", async () => ({ statusCode: 999, body: {} }))
			],
			undefined,
			undefined,
			{ port, corsOrigins: ["http://allowed.test"], bodyLimits: { tiny: 512 } }
		);
		await server.start();

		const json = { "content-type": "application/json" };
		const cases: {
			name: string;
			method: string;
			path: string;
			headers?: { [key: string]: string };
			body?: string;
			chunks?: string[];
			status: number;
			responseBody?: unknown;
		}[] = [
			{ name: "malformed path encoding", method: "GET", path: "/items/%E0%A4%A", status: 400 },
			{
				name: "malformed path encoding on an unknown path",
				method: "GET",
				path: "/unknown/%E0%A4%A",
				status: 400
			},
			{
				name: "malformed query encoding is passed through",
				method: "GET",
				path: "/items/x?q=%E0%A4%A",
				status: 200,
				responseBody: { id: "x", query: { q: "%E0%A4%A" } }
			},
			{
				name: "param at the maximum length",
				method: "GET",
				path: `/items/${"a".repeat(2000)}`,
				status: 200
			},
			{
				name: "param over the maximum length",
				method: "GET",
				path: `/items/${"a".repeat(2001)}`,
				status: 414
			},
			{
				name: "empty JSON body",
				method: "POST",
				path: "/echo",
				headers: { ...json, "content-length": "0" },
				body: "",
				status: 400
			},
			{
				name: "empty JSON body on a DELETE",
				method: "DELETE",
				path: "/echo",
				headers: { ...json, "content-length": "0" },
				body: "",
				status: 400
			},
			{
				name: "body without a content type",
				method: "POST",
				path: "/echo",
				body: "hello",
				status: 415
			},
			{
				name: "form encoded body",
				method: "POST",
				path: "/echo",
				headers: { "content-type": "application/x-www-form-urlencoded" },
				body: "a=1",
				status: 415
			},
			{
				name: "upper case JSON content type",
				method: "POST",
				path: "/echo",
				headers: { "content-type": "Application/JSON" },
				body: '{"a":1}',
				status: 200,
				responseBody: { body: { a: 1 } }
			},
			{
				name: "JSON content type with a charset",
				method: "POST",
				path: "/echo",
				headers: { "content-type": "application/json; charset=utf-8" },
				body: '{"a":1}',
				status: 200,
				responseBody: { body: { a: 1 } }
			},
			{
				name: "JSON array body",
				method: "POST",
				path: "/echo",
				headers: json,
				body: "[1,2]",
				status: 200,
				responseBody: { body: [1, 2] }
			},
			{
				name: "JSON number body",
				method: "POST",
				path: "/echo",
				headers: json,
				body: "42",
				status: 200,
				responseBody: { body: 42 }
			},
			{
				name: "JSON null body",
				method: "POST",
				path: "/echo",
				headers: json,
				body: "null",
				status: 200,
				responseBody: { body: null }
			},
			{
				name: "body on a GET is ignored",
				method: "GET",
				path: "/items/x",
				headers: { ...json, "content-length": "7" },
				body: '{"a":1}',
				status: 200,
				responseBody: { id: "x", query: {} }
			},
			{
				name: "body on a DELETE is parsed",
				method: "DELETE",
				path: "/echo",
				headers: { ...json, "content-length": "7" },
				body: '{"a":1}',
				status: 200,
				responseBody: { body: { a: 1 } }
			},
			{
				name: "chunked body over the limit",
				method: "POST",
				path: "/small",
				headers: { ...json, "transfer-encoding": "chunked" },
				chunks: ['{"data":"', "x".repeat(600), '"}'],
				status: 413
			},
			{
				name: "mime type processor throws",
				method: "POST",
				path: "/echo",
				headers: { "content-type": "application/x-boom" },
				body: "x",
				status: 500,
				responseBody: { error: { name: "GeneralError", source: "test", message: "test.boom" } }
			},
			{
				name: "handler throws a not found error",
				method: "GET",
				path: "/throw/not-found",
				status: 404,
				responseBody: {
					name: "NotFoundError",
					source: "test",
					message: "test.missing",
					properties: { notFoundId: "id1" }
				}
			},
			{
				name: "handler throws a guard error",
				method: "GET",
				path: "/throw/guard",
				status: 400,
				responseBody: {
					name: "GuardError",
					source: "test",
					message: "test.guard",
					properties: { property: "property", value: "undefined" }
				}
			},
			{
				name: "handler throws a plain error",
				method: "GET",
				path: "/throw/plain",
				status: 500,
				responseBody: { name: "Error", message: "plain" }
			},
			{ name: "body cannot be serialised", method: "GET", path: "/circular", status: 500 },
			{
				name: "invalid response header value",
				method: "GET",
				path: "/invalid-header",
				status: 500,
				responseBody: {
					error: expect.objectContaining({
						source: "BaseServer",
						message: "baseServer.invalidHeader",
						properties: { header: "x-invalid" }
					})
				}
			},
			{
				name: "invalid response status code",
				method: "GET",
				path: "/invalid-status",
				status: 500,
				responseBody: {
					error: {
						name: "GeneralError",
						source: "BaseServer",
						message: "baseServer.invalidStatusCode",
						properties: { statusCode: 999 }
					}
				}
			},
			{
				name: "method with no routes",
				method: "PROPFIND",
				path: "/unknown",
				headers: { "content-length": "0" },
				status: 404
			},
			{
				name: "preflight without a request method",
				method: "OPTIONS",
				path: "/items/x",
				headers: { origin: "http://allowed.test" },
				status: 400
			},
			{
				name: "preflight without an origin",
				method: "OPTIONS",
				path: "/items/x",
				headers: { "access-control-request-method": "GET" },
				status: 404
			},
			{
				name: "preflight for an unknown path",
				method: "OPTIONS",
				path: "/unknown",
				headers: { origin: "http://allowed.test", "access-control-request-method": "GET" },
				status: 204
			},
			{
				name: "still serving after the errors",
				method: "GET",
				path: "/items/ok",
				status: 200,
				responseBody: { id: "ok", query: {} }
			}
		];

		const results: { name: string; status?: number; responseBody?: unknown }[] = [];
		for (const testCase of cases) {
			const response = await rawRequest(
				testCase.method,
				testCase.path,
				testCase.headers ?? {},
				testCase.body,
				testCase.chunks
			);
			let responseBody: unknown;
			if (!Is.undefined(testCase.responseBody)) {
				try {
					responseBody = JSON.parse(response.body);
				} catch {
					responseBody = response.body;
				}
			}
			results.push({ name: testCase.name, status: response.statusCode, responseBody });
		}

		await server.stop();

		expect(results).toEqual(
			cases.map(testCase => ({
				name: testCase.name,
				status: testCase.status,
				responseBody: testCase.responseBody
			}))
		);
	});

	test("Can handle errors in each REST processor phase the same way as the other servers", async () => {
		const calls: string[] = [];
		const server = new FastifyWebServer();
		await server.build(
			[
				{
					className: () => "PhaseProcessor",
					pre: async (request, response) => {
						calls.push(`pre:${request.url.slice(request.url.lastIndexOf("/"))}`);
						if (request.url.endsWith("/pre-throws")) {
							throw new UnauthorizedError("test", "denied");
						}
						if (request.url.endsWith("/pre-sets-error")) {
							response.statusCode = HttpStatusCode.forbidden;
							response.body = { reason: "forbidden" };
						}
					},
					process: async (request, response) => {
						calls.push(`process:${request.url.slice(request.url.lastIndexOf("/"))}`);
						response.statusCode = HttpStatusCode.ok;
						response.body = { processed: true };
					},
					post: async request => {
						calls.push(`post:${request.url.slice(request.url.lastIndexOf("/"))}`);
						if (request.url.endsWith("/post-throws")) {
							throw new Error("post failed");
						}
					}
				}
			],
			[
				createRoute("/pre-throws", async () => ({})),
				createRoute("/pre-sets-error", async () => ({})),
				createRoute("/post-throws", async () => ({}))
			],
			undefined,
			undefined,
			{ port }
		);
		await server.start();

		const results: { path: string; status: number; body: unknown }[] = [];
		for (const path of ["/pre-throws", "/pre-sets-error", "/post-throws"]) {
			const response = await fetch(`http://localhost:${port}${path}`);
			results.push({ path, status: response.status, body: await response.json() });
		}

		await server.stop();

		expect(results).toEqual([
			{
				path: "/pre-throws",
				status: HttpStatusCode.unauthorized,
				body: { name: "UnauthorizedError", source: "test", message: "test.denied" }
			},
			{ path: "/pre-sets-error", status: HttpStatusCode.forbidden, body: { reason: "forbidden" } },
			{ path: "/post-throws", status: HttpStatusCode.ok, body: { processed: true } }
		]);
		expect(calls).toEqual([
			"pre:/pre-throws",
			"post:/pre-throws",
			"pre:/pre-sets-error",
			"post:/pre-sets-error",
			"pre:/post-throws",
			"process:/post-throws",
			"post:/post-throws"
		]);
	});

	test("Can keep serving when clients disconnect part way through a request", async () => {
		let slowCalls = 0;
		const server = new FastifyWebServer();
		await server.build(
			[createHandlerProcessor()],
			[
				createRoute(
					"/upload",
					async (context, request) => ({ body: { received: request.body } }),
					HttpMethod.POST
				),
				createRoute("/slow", async () => {
					slowCalls++;
					await new Promise(resolve => setTimeout(resolve, 200));
					return { body: { slow: true } };
				}),
				createRoute("/items/:id", async (context, request) => ({
					body: { id: request.pathParams?.id }
				}))
			],
			undefined,
			undefined,
			{ port }
		);
		await server.start();

		// Abort an upload after sending part of the declared body
		await new Promise<void>(resolve => {
			const request = http.request({
				host: "localhost",
				port,
				path: "/upload",
				method: "POST",
				headers: { "content-type": "application/json", "content-length": 1000 }
			});
			request.on("error", () => resolve());
			request.write('{"data":"partial');
			setTimeout(() => {
				request.destroy();
				resolve();
			}, 100);
		});

		// Disconnect before the response is sent
		await new Promise<void>(resolve => {
			const request = http.get({ host: "localhost", port, path: "/slow" });
			request.on("error", () => resolve());
			setTimeout(() => {
				request.destroy();
				resolve();
			}, 50);
		});
		await new Promise(resolve => setTimeout(resolve, 300));

		const response = await fetch(`http://localhost:${port}/items/still-alive`);
		const json = await response.json();

		await server.stop();

		expect(slowCalls).toEqual(1);
		expect(response.status).toEqual(HttpStatusCode.ok);
		expect(json).toEqual({ id: "still-alive" });
	});

	test("Can handle socket error conditions the same way as the other servers", async () => {
		const server = new FastifyWebServer();
		await server.build(
			undefined,
			undefined,
			[
				{
					className: () => "ConnectedThrows",
					connected: async request => {
						if (request.query?.reject === "true") {
							throw new UnauthorizedError("test", "socketDenied");
						}
					}
				},
				new SocketRouteProcessor()
			],
			[createEchoSocketRoute()],
			{ port }
		);
		await server.start();

		// A connected processor which throws emits the error on the route topic
		const rejectedSocket = io(`http://localhost:${port}/test-namespace`, {
			path: "/socket",
			transports: ["websocket"],
			query: { reject: "true" }
		});
		let connectError: IHttpResponse | undefined;
		rejectedSocket.on("echo", (payload: IHttpResponse) => {
			connectError = payload;
		});
		await waitFor(() => !Is.empty(connectError));
		rejectedSocket.close();

		// Payloads which are not request objects arrive without a body
		const socket = await connectSocket(`http://localhost:${port}/test-namespace`);
		const echoes: IHttpResponse[] = [];
		socket.on("echo", (payload: IHttpResponse) => {
			echoes.push(payload);
		});
		socket.emit("echo", "not an object");
		socket.emit("echo", 42);
		socket.emit("echo", null);
		await waitFor(() => echoes.length === 3);
		socket.close();

		// An unknown namespace is refused
		let namespaceError: Error | undefined;
		const unknownSocket = io(`http://localhost:${port}/unknown-namespace`, {
			path: "/socket",
			transports: ["websocket"],
			reconnection: false
		});
		unknownSocket.on("connect_error", err => {
			namespaceError = err;
		});
		await waitFor(() => !Is.empty(namespaceError));
		unknownSocket.close();

		await server.stop();

		expect(connectError).toEqual({
			statusCode: HttpStatusCode.unauthorized,
			headers: { [HeaderTypes.ContentType]: `${MimeTypes.Json}; charset=utf-8` },
			body: { name: "UnauthorizedError", source: "test", message: "test.socketDenied" }
		});
		expect(echoes.map(echo => echo.statusCode)).toEqual([
			HttpStatusCode.ok,
			HttpStatusCode.ok,
			HttpStatusCode.ok
		]);
		expect(echoes.map(echo => echo.body)).toEqual([undefined, undefined, undefined]);
		expect(namespaceError?.message).toEqual("Invalid namespace");
	});
});
