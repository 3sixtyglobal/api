// Copyright 2024 IOTA Stiftung.
// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import http from "node:http";
import {
	HealthCategory,
	HealthStatus,
	HttpBodyLimit,
	HttpErrorHelper,
	type IHttpResponse,
	type IRestRoute,
	type IRestRouteProcessor
} from "@3sixty/api-models";
import {
	JwtMimeTypeProcessor,
	LoggingProcessor,
	SocketRouteProcessor
} from "@3sixty/api-processors";
import { ComponentFactory, Mutex, NotImplementedError } from "@3sixty/core";
import type { ILogEntry, ILoggingComponent } from "@3sixty/logging-models";
import { HeaderTypes, HttpMethod, HttpStatusCode, MimeTypes } from "@3sixty/web";
import { io } from "socket.io-client";
import { getFreePort } from "./setupTestEnv.js";
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
});
