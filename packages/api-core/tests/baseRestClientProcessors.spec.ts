// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type {
	IBaseRestClientConfig,
	IRestClientProcessor,
	IRestClientProcessorContext
} from "@3sixty/api-models";
import { RestClientProcessorFactory } from "@3sixty/api-models";
import { GeneralError } from "@3sixty/core";
import { HeaderTypes, HttpMethod, HttpStatusCode, MimeTypes } from "@3sixty/web";
import { BaseRestClient } from "../src/clients/baseRestClient.js";

let calls: string[] = [];

class TestProcessor implements IRestClientProcessor {
	private readonly _name: string;

	private readonly _header?: string;

	constructor(name: string, header?: string) {
		this._name = name;
		this._header = header;
	}

	public className(): string {
		return this._name;
	}

	public async pre(
		context: IRestClientProcessorContext,
		next: () => Promise<Response>
	): Promise<Response> {
		calls.push(`${this._name}:before:${context.route}`);
		if (this._header) {
			context.headers[this._header] = this._name;
		}
		try {
			return await next();
		} finally {
			calls.push(`${this._name}:after`);
		}
	}
}

class TestProcessorWithPost extends TestProcessor {
	public async post(
		context: IRestClientProcessorContext,
		response: Response,
		next: () => Promise<Response>
	): Promise<Response> {
		calls.push(`${this.className()}:post:${context.route}:${response.status}`);
		return next();
	}
}

class TestRestClient extends BaseRestClient {
	constructor(config: IBaseRestClientConfig) {
		super("TestRestClient", config, "test-prefix");
	}

	public className(): string {
		return "TestRestClient";
	}
}

const fetchMock = vi.fn();

function okResponse(): unknown {
	return {
		ok: true,
		status: HttpStatusCode.ok,
		headers: new Headers({ [HeaderTypes.ContentType]: MimeTypes.Json }),
		json: async () => ({ success: true })
	};
}

describe("BaseRestClient processors", () => {
	beforeEach(() => {
		calls = [];
		globalThis.fetch = fetchMock;
		RestClientProcessorFactory.register("first", () => new TestProcessor("first", "x-first"));
		RestClientProcessorFactory.register("second", () => new TestProcessor("second", "x-second"));
	});

	afterEach(() => {
		fetchMock.mockReset();
	});

	function makeClient(processorTypes?: string[]): TestRestClient {
		return new TestRestClient({ endpoint: "http://localhost:8080", processorTypes });
	}

	test("performs the request directly when no processors are configured", async () => {
		fetchMock.mockResolvedValueOnce(okResponse());

		await makeClient().fetch("/resource", HttpMethod.GET);

		expect(calls).toEqual([]);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	test("runs a processor around the request", async () => {
		fetchMock.mockResolvedValueOnce(okResponse());

		await makeClient(["first"]).fetch("/resource", HttpMethod.GET);

		expect(calls).toEqual(["first:before:/resource", "first:after"]);
	});

	test("composes processors with the first listed outermost", async () => {
		fetchMock.mockResolvedValueOnce(okResponse());

		await makeClient(["first", "second"]).fetch("/resource", HttpMethod.GET);

		expect(calls).toEqual([
			"first:before:/resource",
			"second:before:/resource",
			"second:after",
			"first:after"
		]);
	});

	test("lets a processor add headers to the request", async () => {
		fetchMock.mockResolvedValueOnce(okResponse());

		await makeClient(["first", "second"]).fetch("/resource", HttpMethod.GET);

		const [, fetchOptions] = fetchMock.mock.calls[0];
		expect(fetchOptions.headers["x-first"]).toEqual("first");
		expect(fetchOptions.headers["x-second"]).toEqual("second");
	});

	test("lets a processor modify the route before the request", async () => {
		fetchMock.mockResolvedValueOnce(okResponse());

		class RouteModifier implements IRestClientProcessor {
			public className(): string {
				return "RouteModifier";
			}

			public async pre(
				context: IRestClientProcessorContext,
				next: () => Promise<Response>
			): Promise<Response> {
				context.route = "/modified";
				return next();
			}
		}
		RestClientProcessorFactory.register("route-modifier", () => new RouteModifier());

		await makeClient(["route-modifier"]).fetch("/resource", HttpMethod.GET);

		const [url] = fetchMock.mock.calls[0];
		expect(url).toBe("http://localhost:8080/test-prefix/modified");
	});

	test("lets a processor modify the base URL before the request", async () => {
		fetchMock.mockResolvedValueOnce(okResponse());

		class BaseUrlModifier implements IRestClientProcessor {
			public className(): string {
				return "BaseUrlModifier";
			}

			public async pre(
				context: IRestClientProcessorContext,
				next: () => Promise<Response>
			): Promise<Response> {
				context.baseUrl = "http://other:9999";
				return next();
			}
		}
		RestClientProcessorFactory.register("base-url-modifier", () => new BaseUrlModifier());

		await makeClient(["base-url-modifier"]).fetch("/resource", HttpMethod.GET);

		const [url] = fetchMock.mock.calls[0];
		expect(url).toBe("http://other:9999/resource");
	});

	test("lets a processor modify the HTTP method before the request", async () => {
		fetchMock.mockResolvedValueOnce(okResponse());

		class MethodModifier implements IRestClientProcessor {
			public className(): string {
				return "MethodModifier";
			}

			public async pre(
				context: IRestClientProcessorContext,
				next: () => Promise<Response>
			): Promise<Response> {
				context.method = HttpMethod.POST;
				return next();
			}
		}
		RestClientProcessorFactory.register("method-modifier", () => new MethodModifier());

		await makeClient(["method-modifier"]).fetch("/resource", HttpMethod.GET);

		const [, fetchOptions] = fetchMock.mock.calls[0];
		expect(fetchOptions.method).toBe(HttpMethod.POST);
	});

	test("lets a processor modify the body before the request", async () => {
		fetchMock.mockResolvedValueOnce(okResponse());

		class BodyModifier implements IRestClientProcessor {
			public className(): string {
				return "BodyModifier";
			}

			public async pre(
				context: IRestClientProcessorContext,
				next: () => Promise<Response>
			): Promise<Response> {
				context.body = '{"modified":true}';
				return next();
			}
		}
		RestClientProcessorFactory.register("body-modifier", () => new BodyModifier());

		await makeClient(["body-modifier"]).fetch("/resource", HttpMethod.POST, {
			body: { original: true }
		});

		const [, fetchOptions] = fetchMock.mock.calls[0];
		expect(fetchOptions.body).toBe('{"modified":true}');
	});

	test("lets a processor set a timeout before the request", async () => {
		fetchMock.mockResolvedValueOnce(okResponse());

		class TimeoutSetter implements IRestClientProcessor {
			public className(): string {
				return "TimeoutSetter";
			}

			public async pre(
				context: IRestClientProcessorContext,
				next: () => Promise<Response>
			): Promise<Response> {
				context.timeout = 5000;
				return next();
			}
		}
		RestClientProcessorFactory.register("timeout-setter", () => new TimeoutSetter());

		await makeClient(["timeout-setter"]).fetch("/resource", HttpMethod.GET);

		const [, fetchOptions] = fetchMock.mock.calls[0];
		expect(fetchOptions.signal).toBeDefined();
	});

	test("lets a processor enable credentials before the request", async () => {
		fetchMock.mockResolvedValueOnce(okResponse());

		class CredentialsSetter implements IRestClientProcessor {
			public className(): string {
				return "CredentialsSetter";
			}

			public async pre(
				context: IRestClientProcessorContext,
				next: () => Promise<Response>
			): Promise<Response> {
				context.includeCredentials = true;
				return next();
			}
		}
		RestClientProcessorFactory.register("credentials-setter", () => new CredentialsSetter());

		await makeClient(["credentials-setter"]).fetch("/resource", HttpMethod.GET);

		const [, fetchOptions] = fetchMock.mock.calls[0];
		expect(fetchOptions.credentials).toBe("include");
	});

	test("gives the processor the substituted route", async () => {
		fetchMock.mockResolvedValueOnce(okResponse());

		await makeClient(["first"]).fetch("/resource/:id", HttpMethod.GET, {
			pathParams: { id: "abc-123" }
		});

		expect(calls[0]).toEqual("first:before:/resource/abc-123");
	});

	test("throws when a processor type is not registered", async () => {
		expect(() => makeClient(["missing"])).toThrow();
	});

	test("propagates a request failure through the processors", async () => {
		fetchMock.mockRejectedValueOnce(new GeneralError("test", "network"));

		await expect(makeClient(["first"]).fetch("/resource", HttpMethod.GET)).rejects.toThrow();

		expect(calls).toEqual(["first:before:/resource", "first:after"]);
	});

	test("calls next when a processor has no pre method", async () => {
		fetchMock.mockResolvedValueOnce(okResponse());

		class PostOnlyProcessor implements IRestClientProcessor {
			public className(): string {
				return "PostOnly";
			}
		}

		RestClientProcessorFactory.register("post-only", () => new PostOnlyProcessor());

		await makeClient(["post-only"]).fetch("/resource", HttpMethod.GET);

		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	test("uses the processors registered at construction time", async () => {
		fetchMock.mockResolvedValue(okResponse());
		RestClientProcessorFactory.register("later", () => new TestProcessor("later"));
		const client = makeClient(["later"]);

		await client.fetch("/resource", HttpMethod.GET);

		expect(calls).toEqual(["later:before:/resource", "later:after"]);
	});

	test("runs a post processor after the fetch", async () => {
		fetchMock.mockResolvedValueOnce(okResponse());
		RestClientProcessorFactory.register("with-post", () => new TestProcessorWithPost("with-post"));

		await makeClient(["with-post"]).fetch("/resource", HttpMethod.GET);

		expect(calls).toEqual([
			"with-post:before:/resource",
			"with-post:after",
			"with-post:post:/resource:200"
		]);
	});

	test("runs post processors in reverse order of pre", async () => {
		fetchMock.mockResolvedValueOnce(okResponse());
		RestClientProcessorFactory.register("alpha", () => new TestProcessorWithPost("alpha"));
		RestClientProcessorFactory.register("beta", () => new TestProcessorWithPost("beta"));

		await makeClient(["alpha", "beta"]).fetch("/resource", HttpMethod.GET);

		expect(calls).toEqual([
			"alpha:before:/resource",
			"beta:before:/resource",
			"beta:after",
			"alpha:after",
			"beta:post:/resource:200",
			"alpha:post:/resource:200"
		]);
	});

	test("calls next in post when a processor has no post method", async () => {
		fetchMock.mockResolvedValueOnce(okResponse());

		await makeClient(["first"]).fetch("/resource", HttpMethod.GET);

		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	test("does not run post processors when the fetch fails", async () => {
		fetchMock.mockRejectedValueOnce(new GeneralError("test", "network"));
		RestClientProcessorFactory.register("with-post", () => new TestProcessorWithPost("with-post"));

		await expect(makeClient(["with-post"]).fetch("/resource", HttpMethod.GET)).rejects.toThrow();

		expect(calls.some(c => c.includes(":post:"))).toBe(false);
	});

	test("lets a post processor replace the response seen by the caller", async () => {
		fetchMock.mockResolvedValueOnce(okResponse());

		class ResponseReplacer implements IRestClientProcessor {
			public className(): string {
				return "ResponseReplacer";
			}

			public async post(
				context: IRestClientProcessorContext,
				response: Response,
				next: () => Promise<Response>
			): Promise<Response> {
				return {
					ok: true,
					status: HttpStatusCode.ok,
					headers: new Headers({ [HeaderTypes.ContentType]: MimeTypes.Json }),
					json: async () => ({ replaced: true })
				} as unknown as Response;
			}
		}
		RestClientProcessorFactory.register("response-replacer", () => new ResponseReplacer());

		const result = await makeClient(["response-replacer"]).fetch("/resource", HttpMethod.GET);

		expect(result.body).toEqual({ replaced: true });
	});
});
