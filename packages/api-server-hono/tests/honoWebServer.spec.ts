// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { lookup } from "node:dns/promises";
import http from "node:http";
import { createServer as createNetServer } from "node:net";
import {
	HealthCategory,
	HealthStatus,
	HttpBodyLimit,
	HttpErrorHelper,
	type IHttpResponse,
	type IRestRoute,
	type IRestRouteProcessor,
	type ISocketRoute
} from "@3sixty/api-models";
import {
	JwtMimeTypeProcessor,
	LoggingProcessor,
	SocketRouteProcessor
} from "@3sixty/api-processors";
import { ComponentFactory, Is, Mutex, NotImplementedError } from "@3sixty/core";
import type { ILogEntry, ILoggingComponent } from "@3sixty/logging-models";
import { HeaderTypes, HttpMethod, HttpStatusCode, MimeTypes } from "@3sixty/web";
import { io, type ManagerOptions, type Socket, type SocketOptions } from "socket.io-client";
import { getFreePort } from "./setupTestEnv.js";
import { HonoWebServer } from "../src/honoWebServer.js";

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
				response.body = { url: request.url };
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

describe("api-server-hono", () => {
	beforeEach(async () => {
		port = await getFreePort();
	});

	test("Can create an instance of the server", () => {
		const server = new HonoWebServer();
		expect(server).toBeDefined();
	});

	test("Can build with no routes or processors", async () => {
		const server = new HonoWebServer();
		await server.build();
		expect(server).toBeDefined();
	});

	test("Can fail to build with REST routes and no processors", async () => {
		const server = new HonoWebServer();

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
		const server = new HonoWebServer();

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
		const server = new HonoWebServer();

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
		const server = new HonoWebServer();

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
		const server = new HonoWebServer();

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
		const server = new HonoWebServer();

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
		const server = new HonoWebServer({
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
		const server = new HonoWebServer();

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
		const server = new HonoWebServer();

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
		const server = new HonoWebServer();

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
		const server = new HonoWebServer();

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
		const server = new HonoWebServer();
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
		const server = new HonoWebServer();
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
		const server = new HonoWebServer();
		server.getInstance().get("/", c => c.text("root content"));
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
		const server = new HonoWebServer();
		server.getInstance().get("/", c => c.text("root content"));
		await server.build(undefined, undefined, undefined, undefined, { port });

		const result = await server.healthApplication(vi.fn());

		expect(result?.[0]?.status).toBe(HealthStatus.Error);
		expect(result?.[0]?.category).toBe(HealthCategory.Application);
		expect(result?.[0]?.error).toBeDefined();
	});

	test("Can return error application status when server is not built", async () => {
		const server = new HonoWebServer();
		server.getInstance().get("/", c => c.text("root content"));

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
		const server = new HonoWebServer();

		const result = await server.healthApplication(vi.fn());

		expect(result).toEqual([]);
	});

	test("Can serialize same-id requests with Mutex while different ids proceed in parallel", async () => {
		const server = new HonoWebServer();
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
		const server = new HonoWebServer({
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
		const server = new HonoWebServer();
		await server.build([createOkProcessor()], [createPostRoute("/")], undefined, undefined, {
			port
		});
		await server.start();

		const withinResponse = await postJsonBody("/", 1048576);
		const overResponse = await postDeclaredLength("/", 1048577);

		expect(withinResponse.status).toEqual(200);
		expect(overResponse.statusCode).toEqual(413);
		expect(overResponse.body).toContain("honoWebServer.bodyTooLarge");

		await server.stop();
	});

	test("Can accept a body at a configured default limit and reject one above it", async () => {
		const server = new HonoWebServer();
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
		const server = new HonoWebServer();
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
		const server = new HonoWebServer();
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
		const server = new HonoWebServer();
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
		const server = new HonoWebServer({
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
		const server = new HonoWebServer();
		await expect(
			server.build([createOkProcessor()], [createPostRoute("/", "huge")], undefined, undefined, {
				port
			})
		).rejects.toMatchObject({
			name: "GeneralError",
			message: "honoWebServer.unknownBodyLimit",
			properties: { route: "/", bodyLimit: "huge" }
		});
	});

	test("Can fail to build when a body limit value is not a positive integer", async () => {
		await expect(
			new HonoWebServer().build(
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
			new HonoWebServer().build(
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
		const server = new HonoWebServer();
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
		const server = new HonoWebServer();
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
		const server = new HonoWebServer();
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
		const server = new HonoWebServer();
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
		const server = new HonoWebServer();
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
		const server = new HonoWebServer();
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
		const server = new HonoWebServer();
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
		expect(json.error.message).toContain("honoWebServer.unsupportedMediaType");
	});

	test("Can reject a malformed JSON body", async () => {
		const server = new HonoWebServer();
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
		expect(json.error.message).toContain("honoWebServer.invalidJsonBody");
	});

	test("Can reject JSON bodies which attempt prototype poisoning", async () => {
		const server = new HonoWebServer();
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

		const post = async (payload: string): Promise<number> => {
			const response = await fetch(`http://localhost:${port}/`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: payload
			});
			await response.arrayBuffer();
			return response.status;
		};

		const protoStatus = await post('{"a":{"__proto__":{"polluted":true}}}');
		const constructorStatus = await post('{"constructor":{"prototype":{"polluted":true}}}');
		const plainConstructorStatus = await post('{"constructor":"allowed"}');

		await server.stop();

		expect(protoStatus).toEqual(HttpStatusCode.badRequest);
		expect(constructorStatus).toEqual(HttpStatusCode.badRequest);
		expect(plainConstructorStatus).toEqual(HttpStatusCode.ok);
		expect(body).toEqual({ constructor: "allowed" });
	});

	test("Can parse a plain text body", async () => {
		const server = new HonoWebServer();
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
		const server = new HonoWebServer();
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
		const server = new HonoWebServer();
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
		expect(json).toEqual({ url: `http://localhost:${port}/missing?x=1` });
	});

	test("Can only allow the configured CORS origins", async () => {
		const server = new HonoWebServer();
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

	test("Can compress large responses and leave small ones uncompressed", async () => {
		const server = new HonoWebServer();
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
		const server = new HonoWebServer();
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

		const server = new HonoWebServer();
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
});
