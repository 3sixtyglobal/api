// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import {
	HealthCategory,
	HealthStatus,
	HttpBodyLimit,
	HttpContextIdKeys,
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
	type IWebServerOptions
} from "@3sixty/api-models";
import type { IContextIds } from "@3sixty/context";
import { ComponentFactory, NotImplementedError, UnauthorizedError } from "@3sixty/core";
import type { ILogEntry, ILoggingComponent } from "@3sixty/logging-models";
import { HeaderTypes, HttpMethod, HttpStatusCode, type IHttpHeaders, MimeTypes } from "@3sixty/web";
import type { IBaseServerConstructorOptions } from "../src/models/IBaseServerConstructorOptions.js";
import type { IServerCorsOptions } from "../src/models/IServerCorsOptions.js";
import { BaseServer } from "../src/servers/baseServer.js";

class TestServer extends BaseServer<string> {
	public static readonly CLASS_NAME: string = "TestServer";

	public listening: boolean;

	public secure: boolean;

	public hasRoot: boolean;

	public closed: boolean;

	public listenError: Error | undefined;

	public boundAddresses: { address: string; family?: string; port: number }[];

	constructor(options?: IBaseServerConstructorOptions) {
		super(options);
		this.listening = false;
		this.secure = false;
		this.hasRoot = true;
		this.closed = false;
		this.boundAddresses = [];
	}

	public className(): string {
		return TestServer.CLASS_NAME;
	}

	public getInstance(): string {
		return "test-instance";
	}

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
	}

	public configureProcessors(
		restRouteProcessors?: IRestRouteProcessor[],
		socketRouteProcessors?: ISocketRouteProcessor[]
	): void {
		this.buildProcessorChains(restRouteProcessors, socketRouteProcessors);
	}

	public async runRest(
		restRoute: IRestRoute | undefined,
		httpServerRequest: IHttpServerRequest,
		httpResponse: IHttpResponse,
		processorState: { [id: string]: unknown }
	): Promise<void> {
		await this.runProcessorsRest(restRoute, httpServerRequest, httpResponse, {}, processorState);
	}

	public async runSocket(
		socketRoute: ISocketRoute,
		socketServerRequest: ISocketServerRequest,
		httpResponse: IHttpResponse,
		processorState: { [id: string]: unknown },
		requestTopic: string,
		responseEmitter: (topic: string, response: IHttpResponse) => Promise<void>
	): Promise<void> {
		await this.runProcessorsSocket(
			socketRoute,
			socketServerRequest,
			httpResponse,
			{},
			processorState,
			requestTopic,
			responseEmitter
		);
	}

	public bodyLimits(): { [name: string]: number } {
		return this.resolveBodyLimits();
	}

	public corsOptions(options?: IWebServerOptions): IServerCorsOptions {
		return this.resolveCorsOptions(options);
	}

	public serverRequest(
		method: HttpMethod,
		url: string,
		body: unknown,
		query?: IHttpRequestQuery,
		pathParams?: IHttpRequestPathParams,
		headers?: IHttpHeaders
	): IHttpServerRequest {
		return this.buildServerRequest(method, url, body, query, pathParams, headers);
	}

	public contextIds(requestOrigin: string, headers?: IHttpHeaders): IContextIds {
		return this.buildContextIds(requestOrigin, headers);
	}

	public mimeTypeProcessors(): IMimeTypeProcessor[] {
		return this._mimeTypeProcessors;
	}

	public localOrigin(): string | undefined {
		return this._localOrigin;
	}

	public publicOrigin(): string | undefined {
		return this._publicOrigin;
	}

	protected async serverListen(host: string, port: number): Promise<void> {
		if (this.listenError) {
			throw this.listenError;
		}
		this.listening = true;
		this.boundAddresses = [{ address: host, family: "IPv4", port }];
	}

	protected async serverClose(): Promise<void> {
		this.listening = false;
		this.closed = true;
	}

	protected serverAddresses(): { address: string; family?: string; port: number }[] {
		return this.boundAddresses;
	}

	protected serverIsSecure(): boolean {
		return this.secure;
	}

	protected serverIsListening(): boolean {
		return this.listening;
	}

	protected serverHasRootRoute(): boolean {
		return this.hasRoot;
	}
}

const logEntries: ILogEntry[] = [];

const logger: ILoggingComponent = {
	className: () => "logger",
	log: async (logEntry: ILogEntry) => {
		logEntries.push(logEntry);
	},
	query: async () => {
		throw new NotImplementedError("Not implemented", "");
	}
};

/**
 * Create a REST route for the processor tests.
 * @returns The route.
 */
function createRestRoute(): IRestRoute {
	return {
		operationId: "test",
		path: "/test",
		method: HttpMethod.GET,
		tag: "test",
		summary: "",
		handler: async () => ({})
	};
}

/**
 * Create a socket route for the processor tests.
 * @returns The route.
 */
function createSocketRoute(): ISocketRoute {
	return {
		operationId: "test",
		path: "/test/ping",
		handler: async () => {}
	};
}

/**
 * Create a server request for the processor tests.
 * @returns The server request.
 */
function createServerRequest(): IHttpServerRequest {
	return {
		method: HttpMethod.GET,
		url: "http://localhost:3000/test"
	};
}

describe("BaseServer", () => {
	beforeAll(() => {
		ComponentFactory.register("logging", () => logger);
	});

	beforeEach(() => {
		logEntries.length = 0;
	});

	describe("prepareBuild", () => {
		test("throws when REST routes are supplied with no processors", async () => {
			const server = new TestServer();

			await expect(server.build([], [createRestRoute()])).rejects.toMatchObject({
				name: "GeneralError",
				message: "baseServer.noRestProcessors"
			});
		});

		test("throws when socket routes are supplied with no processors", async () => {
			const server = new TestServer();

			await expect(
				server.build(undefined, undefined, [], [createSocketRoute()])
			).rejects.toMatchObject({
				name: "GeneralError",
				message: "baseServer.noSocketProcessors"
			});
		});

		test("throws when the public origin is not a valid origin URL", async () => {
			const server = new TestServer();

			await expect(
				server.build(undefined, undefined, undefined, undefined, { publicOrigin: "not a url" })
			).rejects.toMatchObject({
				name: "GeneralError",
				message: "baseServer.invalidPublicOrigin"
			});
		});

		test("normalises a wildcard bind host to the loopback address for the local origin", async () => {
			const server = new TestServer();

			await server.build(undefined, undefined, undefined, undefined, {
				host: "0.0.0.0",
				port: 4000
			});

			expect(server.localOrigin()).toEqual("http://127.0.0.1:4000");
		});

		test("reduces the public origin to its schema, host and port", async () => {
			const server = new TestServer();

			await server.build(undefined, undefined, undefined, undefined, {
				publicOrigin: "https://example.com:8443/some/path"
			});

			expect(server.publicOrigin()).toEqual("https://example.com:8443");
		});
	});

	describe("REST processor error handling", () => {
		test("builds an error response and skips processing when a pre processor throws", async () => {
			const server = new TestServer();
			const calls: string[] = [];

			server.configureProcessors([
				{
					className: () => "ThrowingPre",
					pre: async () => {
						calls.push("pre");
						throw new Error("boom");
					},
					process: async () => {
						calls.push("process");
					},
					post: async () => {
						calls.push("post");
					}
				}
			]);

			const httpResponse: IHttpResponse = {};
			await server.runRest(createRestRoute(), createServerRequest(), httpResponse, {});

			expect(calls).toEqual(["pre", "post"]);
			expect(httpResponse.statusCode).toEqual(HttpStatusCode.internalServerError);
			expect(httpResponse.body).toMatchObject({ name: "Error", message: "boom" });
		});

		test("maps a known error type to its status code", async () => {
			const server = new TestServer();

			server.configureProcessors([
				{
					className: () => "ThrowingPre",
					pre: async () => {
						throw new UnauthorizedError("TestServer", "nope");
					}
				}
			]);

			const httpResponse: IHttpResponse = {};
			await server.runRest(createRestRoute(), createServerRequest(), httpResponse, {});

			expect(httpResponse.statusCode).toEqual(HttpStatusCode.unauthorized);
		});

		test("skips processing when a pre processor sets an error status without throwing", async () => {
			const server = new TestServer();
			const calls: string[] = [];

			server.configureProcessors([
				{
					className: () => "HaltingPre",
					pre: async (request, response) => {
						calls.push("pre");
						response.statusCode = HttpStatusCode.forbidden;
					},
					process: async () => {
						calls.push("process");
					},
					post: async () => {
						calls.push("post");
					}
				}
			]);

			const httpResponse: IHttpResponse = {};
			await server.runRest(createRestRoute(), createServerRequest(), httpResponse, {});

			expect(calls).toEqual(["pre", "post"]);
			expect(httpResponse.statusCode).toEqual(HttpStatusCode.forbidden);
		});

		test("continues processing when a pre processor sets a success status", async () => {
			const server = new TestServer();
			const calls: string[] = [];

			server.configureProcessors([
				{
					className: () => "OkPre",
					pre: async (request, response) => {
						calls.push("pre");
						response.statusCode = HttpStatusCode.ok;
					},
					process: async () => {
						calls.push("process");
					}
				}
			]);

			await server.runRest(createRestRoute(), createServerRequest(), {}, {});

			expect(calls).toEqual(["pre", "process"]);
		});

		test("builds an error response and still runs post when a process processor throws", async () => {
			const server = new TestServer();
			const calls: string[] = [];

			server.configureProcessors([
				{
					className: () => "ThrowingProcess",
					process: async () => {
						calls.push("process");
						throw new Error("process failed");
					},
					post: async () => {
						calls.push("post");
					}
				}
			]);

			const httpResponse: IHttpResponse = {};
			await server.runRest(createRestRoute(), createServerRequest(), httpResponse, {});

			expect(calls).toEqual(["process", "post"]);
			expect(httpResponse.statusCode).toEqual(HttpStatusCode.internalServerError);
			expect(httpResponse.body).toMatchObject({ message: "process failed" });
		});

		test("swallows and logs an error thrown by a post processor", async () => {
			const server = new TestServer({ loggingComponentType: "logging" });

			server.configureProcessors([
				{
					className: () => "ThrowingPost",
					process: async (request, response) => {
						response.statusCode = HttpStatusCode.ok;
						response.body = { data: "ok" };
					},
					post: async () => {
						throw new Error("post failed");
					}
				}
			]);

			const httpResponse: IHttpResponse = {};
			await expect(
				server.runRest(createRestRoute(), createServerRequest(), httpResponse, {})
			).resolves.toBeUndefined();

			// The successful response from the process phase is left intact.
			expect(httpResponse.statusCode).toEqual(HttpStatusCode.ok);
			expect(httpResponse.body).toEqual({ data: "ok" });

			const errorLog = logEntries.find(entry => entry.message === "postProcessorError");
			expect(errorLog).toBeDefined();
			expect(errorLog?.level).toEqual("error");
			expect(errorLog?.source).toEqual(BaseServer.CLASS_NAME);
			expect(errorLog?.data?.route).toEqual("/test");
		});

		test("does not reject when a post processor throws and no logging component is configured", async () => {
			const server = new TestServer();

			server.configureProcessors([
				{
					className: () => "ThrowingPost",
					post: async () => {
						throw new Error("post failed");
					}
				}
			]);

			await expect(
				server.runRest(createRestRoute(), createServerRequest(), {}, {})
			).resolves.toBeUndefined();
		});

		test("runs every phase in processor order when nothing throws", async () => {
			const server = new TestServer();
			const calls: string[] = [];

			server.configureProcessors([
				{
					className: () => "First",
					pre: async () => {
						calls.push("first-pre");
					},
					process: async () => {
						calls.push("first-process");
					},
					post: async () => {
						calls.push("first-post");
					}
				},
				{
					className: () => "Second",
					pre: async () => {
						calls.push("second-pre");
					},
					process: async () => {
						calls.push("second-process");
					},
					post: async () => {
						calls.push("second-post");
					}
				}
			]);

			await server.runRest(createRestRoute(), createServerRequest(), {}, {});

			expect(calls).toEqual([
				"first-pre",
				"second-pre",
				"first-process",
				"second-process",
				"first-post",
				"second-post"
			]);
		});

		test("runs a processor only for the phases it implements", async () => {
			const server = new TestServer();
			const calls: string[] = [];

			server.configureProcessors([
				{
					className: () => "PreOnly",
					pre: async () => {
						calls.push("pre-only");
					}
				},
				{
					className: () => "PostOnly",
					post: async () => {
						calls.push("post-only");
					}
				}
			]);

			await server.runRest(createRestRoute(), createServerRequest(), {}, {});

			expect(calls).toEqual(["pre-only", "post-only"]);
		});

		test("shares the processor state across the phases", async () => {
			const server = new TestServer();
			let seen: unknown;

			server.configureProcessors([
				{
					className: () => "StateProcessor",
					pre: async (request, response, route, contextIds, processorState) => {
						processorState.marker = "from-pre";
					},
					post: async (request, response, route, contextIds, processorState) => {
						seen = processorState.marker;
					}
				}
			]);

			await server.runRest(createRestRoute(), createServerRequest(), {}, {});

			expect(seen).toEqual("from-pre");
		});
	});

	describe("socket processor error handling", () => {
		test("emits an error response when a pre processor throws", async () => {
			const server = new TestServer();
			const emitted: { topic: string; response: IHttpResponse }[] = [];

			server.configureProcessors(undefined, [
				{
					className: () => "ThrowingPre",
					pre: async () => {
						throw new Error("socket boom");
					}
				}
			]);

			await server.runSocket(
				createSocketRoute(),
				{ method: HttpMethod.GET, url: "/test/ping", socketId: "socket-1" },
				{},
				{},
				"ping",
				async (topic, response) => {
					emitted.push({ topic, response });
				}
			);

			expect(emitted).toHaveLength(1);
			expect(emitted[0].topic).toEqual("ping");
			expect(emitted[0].response.statusCode).toEqual(HttpStatusCode.internalServerError);
			expect(emitted[0].response.body).toMatchObject({ message: "socket boom" });
		});

		test("emits an error response when a process processor throws", async () => {
			const server = new TestServer();
			const emitted: { topic: string; response: IHttpResponse }[] = [];

			server.configureProcessors(undefined, [
				{
					className: () => "ThrowingProcess",
					process: async () => {
						throw new Error("socket process failed");
					}
				}
			]);

			await server.runSocket(
				createSocketRoute(),
				{ method: HttpMethod.GET, url: "/test/ping", socketId: "socket-1" },
				{},
				{},
				"ping",
				async (topic, response) => {
					emitted.push({ topic, response });
				}
			);

			expect(emitted).toHaveLength(1);
			expect(emitted[0].response.body).toMatchObject({ message: "socket process failed" });
		});

		test("emits the response manually when a pre processor sets a status code", async () => {
			const server = new TestServer();
			const emitted: { topic: string; response: IHttpResponse }[] = [];

			server.configureProcessors(undefined, [
				{
					className: () => "HaltingPre",
					pre: async (request, response) => {
						response.statusCode = HttpStatusCode.unauthorized;
					}
				}
			]);

			await server.runSocket(
				createSocketRoute(),
				{ method: HttpMethod.GET, url: "/test/ping", socketId: "socket-1" },
				{},
				{},
				"ping",
				async (topic, response) => {
					emitted.push({ topic, response });
				}
			);

			expect(emitted.length).toBeGreaterThanOrEqual(1);
			expect(emitted[0].response.statusCode).toEqual(HttpStatusCode.unauthorized);
		});

		test("runs the post processors after the response has been emitted", async () => {
			const server = new TestServer();
			const calls: string[] = [];

			server.configureProcessors(undefined, [
				{
					className: () => "EmittingProcess",
					process: async (request, response, route, processorState, responseEmitter) => {
						calls.push("process");
						await responseEmitter("ping", { statusCode: HttpStatusCode.ok, body: { data: 1 } });
					},
					post: async () => {
						calls.push("post");
					}
				}
			]);

			const emitted: IHttpResponse[] = [];
			await server.runSocket(
				createSocketRoute(),
				{ method: HttpMethod.GET, url: "/test/ping", socketId: "socket-1" },
				{},
				{},
				"ping",
				async (topic, response) => {
					calls.push("emit");
					emitted.push(response);
				}
			);

			expect(calls).toEqual(["process", "emit", "post"]);
			expect(emitted[0].body).toEqual({ data: 1 });
		});

		test("swallows and logs an error thrown by a socket post processor", async () => {
			const server = new TestServer({ loggingComponentType: "logging" });

			server.configureProcessors(undefined, [
				{
					className: () => "ThrowingPost",
					process: async (request, response, route, processorState, responseEmitter) => {
						await responseEmitter("ping", { statusCode: HttpStatusCode.ok });
					},
					post: async () => {
						throw new Error("socket post failed");
					}
				}
			]);

			await expect(
				server.runSocket(
					createSocketRoute(),
					{ method: HttpMethod.GET, url: "/test/ping", socketId: "socket-1" },
					{},
					{},
					"ping",
					async () => {}
				)
			).resolves.toBeUndefined();

			const errorLog = logEntries.find(entry => entry.message === "postProcessorError");
			expect(errorLog).toBeDefined();
			expect(errorLog?.source).toEqual(BaseServer.CLASS_NAME);
			expect(errorLog?.data?.route).toEqual("/test/ping");
		});
	});

	describe("resolveBodyLimits", () => {
		test("returns the built-in limits when none are configured", async () => {
			const server = new TestServer();
			await server.build();

			const limits = server.bodyLimits();

			expect(limits[HttpBodyLimit.Default]).toEqual(1048576);
			expect(limits[HttpBodyLimit.Large]).toEqual(26214400);
		});

		test("merges the configured limits over the built-in ones", async () => {
			const server = new TestServer();
			await server.build(undefined, undefined, undefined, undefined, {
				bodyLimits: { [HttpBodyLimit.Default]: 2048, custom: 4096 }
			});

			const limits = server.bodyLimits();

			expect(limits[HttpBodyLimit.Default]).toEqual(2048);
			expect(limits.custom).toEqual(4096);
			expect(limits[HttpBodyLimit.Large]).toEqual(26214400);
		});

		test("throws when a configured limit is not a positive integer", async () => {
			const server = new TestServer();
			await server.build(undefined, undefined, undefined, undefined, {
				bodyLimits: { custom: 0 }
			});

			expect(() => server.bodyLimits()).toThrowError(
				expect.objectContaining({ message: "baseServer.invalidBodyLimit" })
			);
		});
	});

	describe("resolveCorsOptions", () => {
		test("allows any origin by default", () => {
			const server = new TestServer();

			const cors = server.corsOptions();

			expect(cors.origins).toEqual(["*"]);
			expect(cors.hasWildcardOrigin).toEqual(true);
			expect(cors.methods).toEqual([
				HttpMethod.GET,
				HttpMethod.PUT,
				HttpMethod.POST,
				HttpMethod.PATCH,
				HttpMethod.DELETE,
				HttpMethod.OPTIONS
			]);
		});

		test("wraps a single origin string in an array", () => {
			const server = new TestServer();

			const cors = server.corsOptions({ corsOrigins: "https://example.com" });

			expect(cors.origins).toEqual(["https://example.com"]);
			expect(cors.hasWildcardOrigin).toEqual(false);
		});

		test("appends the configured allowed and exposed headers to the defaults", () => {
			const server = new TestServer();

			const cors = server.corsOptions({
				allowedHeaders: ["X-Custom-Request"],
				exposedHeaders: ["X-Custom-Response"]
			});

			expect(cors.allowedHeaders).toContain("X-Custom-Request");
			expect(cors.allowedHeaders).toContain(HeaderTypes.ContentType);
			expect(cors.exposedHeaders).toContain("X-Custom-Response");
			expect(cors.exposedHeaders).toContain(HeaderTypes.Location);
		});
	});

	describe("buildServerRequest", () => {
		test("decodes the path params and the query values", () => {
			const server = new TestServer();

			const request = server.serverRequest(
				HttpMethod.GET,
				"http://localhost:3000/test",
				undefined,
				{ filter: "a%20b" },
				{ id: "urn%3Atest%3A1" }
			);

			expect(request.pathParams?.id).toEqual("urn:test:1");
			expect(request.query?.filter).toEqual("a b");
		});

		test("keeps the method, url and body as supplied", () => {
			const server = new TestServer();

			const request = server.serverRequest(HttpMethod.POST, "http://localhost:3000/test", {
				data: "value"
			});

			expect(request.method).toEqual(HttpMethod.POST);
			expect(request.url).toEqual("http://localhost:3000/test");
			expect(request.body).toEqual({ data: "value" });
		});
	});

	describe("buildContextIds", () => {
		test("falls back to the request origin when no public origin is configured", async () => {
			const server = new TestServer();
			await server.build(undefined, undefined, undefined, undefined, {
				host: "127.0.0.1",
				port: 4000
			});

			const contextIds = server.contextIds("http://request-origin:4000");

			expect(contextIds[HttpContextIdKeys.LocalOrigin]).toEqual("http://127.0.0.1:4000");
			expect(contextIds[HttpContextIdKeys.PublicOrigin]).toEqual("http://request-origin:4000");
			expect(contextIds[HttpContextIdKeys.RemoteRequest]).toBeDefined();
		});

		test("prefers the configured public origin over the request origin", async () => {
			const server = new TestServer();
			await server.build(undefined, undefined, undefined, undefined, {
				publicOrigin: "https://example.com"
			});

			const contextIds = server.contextIds("http://request-origin:4000");

			expect(contextIds[HttpContextIdKeys.PublicOrigin]).toEqual("https://example.com");
		});
	});

	describe("mime type processors", () => {
		test("adds a JSON-LD processor when none is supplied", () => {
			const server = new TestServer();

			const types = server.mimeTypeProcessors().flatMap(processor => processor.getTypes());

			expect(types).toContain(MimeTypes.JsonLd);
		});

		test("does not add a second JSON-LD processor when one is supplied", () => {
			const supplied: IMimeTypeProcessor = {
				className: () => "SuppliedJsonLd",
				getTypes: () => [MimeTypes.JsonLd],
				handle: async () => ({})
			};

			const server = new TestServer({ mimeTypeProcessors: [supplied] });

			expect(server.mimeTypeProcessors()).toHaveLength(1);
			expect(server.mimeTypeProcessors()[0].className()).toEqual("SuppliedJsonLd");
		});
	});

	describe("lifecycle and health", () => {
		test("starts and stops the transport", async () => {
			const server = new TestServer({ loggingComponentType: "logging" });
			await server.build(undefined, undefined, undefined, undefined, {
				host: "127.0.0.1",
				port: 4000
			});

			await server.start();
			expect(server.listening).toEqual(true);

			await server.stop();
			expect(server.listening).toEqual(false);
			expect(server.closed).toEqual(true);
			expect(logEntries.some(entry => entry.message === "stopped")).toEqual(true);
		});

		test("logs rather than throws when the transport fails to listen", async () => {
			const server = new TestServer({ loggingComponentType: "logging" });
			server.listenError = new Error("port in use");
			await server.build(undefined, undefined, undefined, undefined, {
				host: "127.0.0.1",
				port: 4000
			});

			await expect(server.start()).resolves.toBeUndefined();

			const errorLog = logEntries.find(entry => entry.message === "startFailed");
			expect(errorLog).toBeDefined();
			expect(errorLog?.level).toEqual("error");
			expect(server.listening).toEqual(false);
		});

		test("does not close the transport when it was never started", async () => {
			const server = new TestServer();

			await server.stop();

			expect(server.closed).toEqual(false);
		});

		test("reports connectivity as healthy while listening", async () => {
			const server = new TestServer();
			server.listening = true;

			const health = await server.health();

			expect(health).toHaveLength(1);
			expect(health[0].status).toEqual(HealthStatus.Ok);
			expect(health[0].category).toEqual(HealthCategory.Connectivity);
			expect(health[0].source).toEqual(BaseServer.CLASS_NAME);
			expect(health[0].message).toEqual("reachable");
		});

		test("reports connectivity as unhealthy when not listening", async () => {
			const server = new TestServer();

			const health = await server.health();

			expect(health[0].status).toEqual(HealthStatus.Error);
			expect(health[0].message).toEqual("unreachable");
		});

		test("skips the application health check when there is no root route", async () => {
			const server = new TestServer();
			server.hasRoot = false;

			const health = await server.healthApplication(async () => {});

			expect(health).toEqual([]);
		});

		test("reports an error when the application health check runs before the build", async () => {
			const server = new TestServer();

			const health = await server.healthApplication(async () => {});

			expect(health?.[0].status).toEqual(HealthStatus.Error);
			expect(health?.[0].message).toEqual("serverNotBuilt");
		});
	});
});
