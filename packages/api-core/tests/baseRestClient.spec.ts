// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IBaseRestClientConfig, IHttpRequest, IHttpResponse } from "@3sixty/api-models";
import { HeaderTypes, HttpStatusCode, MimeTypes } from "@3sixty/web";
import { BaseRestClient } from "../src/clients/baseRestClient.js";

class TestRestClient extends BaseRestClient {
	public static readonly CLASS_NAME: string = "TestRestClient";

	constructor(config: IBaseRestClientConfig) {
		super(TestRestClient.CLASS_NAME, config, "test-prefix");
	}

	public className(): string {
		return TestRestClient.CLASS_NAME;
	}
}

const fetchMock = vi.fn();

describe("BaseRestClient", () => {
	beforeEach(() => {
		globalThis.fetch = fetchMock;
	});

	afterEach(() => {
		fetchMock.mockReset();
	});

	describe("getPathPrefix", () => {
		test("returns the default path prefix with a leading slash", () => {
			const client = new TestRestClient({ endpoint: "http://localhost:8080" });
			expect(client.getPathPrefix()).toBe("test-prefix");
		});

		test("returns the config pathPrefix with a leading slash when provided", () => {
			const client = new TestRestClient({
				endpoint: "http://localhost:8080",
				pathPrefix: "override-prefix"
			});
			expect(client.getPathPrefix()).toBe("override-prefix");
		});

		test("returns an empty string when the config pathPrefix is empty", () => {
			const client = new TestRestClient({
				endpoint: "http://localhost:8080",
				pathPrefix: ""
			});
			expect(client.getPathPrefix()).toBe("");
		});
	});

	test("can merge per-request headers into outgoing request", async () => {
		fetchMock.mockResolvedValueOnce({
			ok: true,
			status: HttpStatusCode.ok,
			headers: new Headers({
				[HeaderTypes.ContentType]: MimeTypes.Json
			}),
			json: async () => ({ success: true })
		});

		const client = new TestRestClient({ endpoint: "http://localhost:8080" });

		await client.fetch<IHttpRequest, IHttpResponse>("/resource", "GET", {
			headers: {
				[HeaderTypes.Authorization]: "Bearer test-token",
				[HeaderTypes.Accept]: MimeTypes.JsonLd
			}
		});

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [, fetchOptions] = fetchMock.mock.calls[0];
		expect(fetchOptions.headers[HeaderTypes.Authorization]).toBe("Bearer test-token");
		expect(fetchOptions.headers[HeaderTypes.Accept]).toBe(MimeTypes.JsonLd);
	});

	test("per-request headers override instance-level headers", async () => {
		fetchMock.mockResolvedValueOnce({
			ok: true,
			status: HttpStatusCode.ok,
			headers: new Headers({
				[HeaderTypes.ContentType]: MimeTypes.Json
			}),
			json: async () => ({ success: true })
		});

		const client = new TestRestClient({
			endpoint: "http://localhost:8080",
			headers: {
				[HeaderTypes.Accept]: MimeTypes.Json
			}
		});

		await client.fetch<IHttpRequest, IHttpResponse>("/resource", "GET", {
			headers: {
				[HeaderTypes.Accept]: MimeTypes.JsonLd
			}
		});

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [, fetchOptions] = fetchMock.mock.calls[0];
		expect(fetchOptions.headers[HeaderTypes.Accept]).toBe(MimeTypes.JsonLd);
	});

	test("request without per-request headers still works", async () => {
		fetchMock.mockResolvedValueOnce({
			ok: true,
			status: HttpStatusCode.ok,
			headers: new Headers({
				[HeaderTypes.ContentType]: MimeTypes.Json
			}),
			json: async () => ({ success: true })
		});

		const client = new TestRestClient({
			endpoint: "http://localhost:8080",
			headers: {
				[HeaderTypes.Accept]: MimeTypes.Json
			}
		});

		await client.fetch<IHttpRequest, IHttpResponse>("/resource", "GET");

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [, fetchOptions] = fetchMock.mock.calls[0];
		expect(fetchOptions.headers[HeaderTypes.Accept]).toBe(MimeTypes.Json);
	});

	test("query string in endpoint URL is preserved on every outgoing request", async () => {
		fetchMock.mockResolvedValueOnce({
			ok: true,
			status: HttpStatusCode.ok,
			headers: new Headers({
				[HeaderTypes.ContentType]: MimeTypes.Json
			}),
			json: async () => ({ success: true })
		});

		const client = new TestRestClient({
			endpoint: "http://localhost:8080?tenant-token=abc123"
		});

		await client.fetch<IHttpRequest, IHttpResponse>("/resource", "GET");

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [outgoingUrl] = fetchMock.mock.calls[0];
		expect(outgoingUrl).toBe("http://localhost:8080/test-prefix/resource?tenant-token=abc123");
	});

	test("customHeaders hook headers are included in outgoing request", async () => {
		fetchMock.mockResolvedValueOnce({
			ok: true,
			status: HttpStatusCode.ok,
			headers: new Headers({ [HeaderTypes.ContentType]: MimeTypes.Json }),
			json: async () => ({})
		});

		const client = new TestRestClient({
			endpoint: "http://localhost:8080",
			customHeaders: async () => ({ "x-custom": "hook-value" })
		});

		await client.fetch<IHttpRequest, IHttpResponse>("/resource", "GET");

		const [, fetchOptions] = fetchMock.mock.calls[0];
		expect(fetchOptions.headers["x-custom"]).toBe("hook-value");
	});

	test("customHeaders hook overrides per-request headers", async () => {
		fetchMock.mockResolvedValueOnce({
			ok: true,
			status: HttpStatusCode.ok,
			headers: new Headers({ [HeaderTypes.ContentType]: MimeTypes.Json }),
			json: async () => ({})
		});

		const client = new TestRestClient({
			endpoint: "http://localhost:8080",
			customHeaders: async () => ({ [HeaderTypes.Accept]: MimeTypes.Json })
		});

		await client.fetch<IHttpRequest, IHttpResponse>("/resource", "GET", {
			headers: { [HeaderTypes.Accept]: MimeTypes.JsonLd }
		});

		const [, fetchOptions] = fetchMock.mock.calls[0];
		expect(fetchOptions.headers[HeaderTypes.Accept]).toBe(MimeTypes.Json);
	});

	test("customAuthHeader hook sets Authorization header", async () => {
		fetchMock.mockResolvedValueOnce({
			ok: true,
			status: HttpStatusCode.ok,
			headers: new Headers({ [HeaderTypes.ContentType]: MimeTypes.Json }),
			json: async () => ({})
		});

		const client = new TestRestClient({
			endpoint: "http://localhost:8080",
			customAuthHeader: async () => "Bearer dynamic-token"
		});

		await client.fetch<IHttpRequest, IHttpResponse>("/resource", "GET");

		const [, fetchOptions] = fetchMock.mock.calls[0];
		expect(fetchOptions.headers[HeaderTypes.Authorization]).toBe("Bearer dynamic-token");
	});

	test("customAuthHeader hook overrides Authorization from per-request headers", async () => {
		fetchMock.mockResolvedValueOnce({
			ok: true,
			status: HttpStatusCode.ok,
			headers: new Headers({ [HeaderTypes.ContentType]: MimeTypes.Json }),
			json: async () => ({})
		});

		const client = new TestRestClient({
			endpoint: "http://localhost:8080",
			customAuthHeader: async () => "Bearer hook-token"
		});

		await client.fetch<IHttpRequest, IHttpResponse>("/resource", "GET", {
			headers: { [HeaderTypes.Authorization]: "Bearer request-token" }
		});

		const [, fetchOptions] = fetchMock.mock.calls[0];
		expect(fetchOptions.headers[HeaderTypes.Authorization]).toBe("Bearer hook-token");
	});

	test("onAuthFailure hook is called on 401 response", async () => {
		fetchMock.mockResolvedValueOnce({
			ok: false,
			status: HttpStatusCode.unauthorized,
			statusText: "Unauthorized",
			headers: new Headers(),
			json: async () => ({ message: "Unauthorized", name: "UnauthorizedError" })
		});

		const onAuthFailure = vi.fn().mockResolvedValueOnce(undefined);
		const client = new TestRestClient({
			endpoint: "http://localhost:8080",
			onAuthFailure
		});

		await expect(client.fetch<IHttpRequest, IHttpResponse>("/resource", "GET")).rejects.toThrow();

		expect(onAuthFailure).toHaveBeenCalledTimes(1);
	});

	test("onAuthFailure hook is not called for non-401 errors", async () => {
		fetchMock.mockResolvedValueOnce({
			ok: false,
			status: HttpStatusCode.forbidden,
			statusText: "Forbidden",
			headers: new Headers(),
			json: async () => ({ message: "Forbidden", name: "ForbiddenError" })
		});

		const onAuthFailure = vi.fn();
		const client = new TestRestClient({
			endpoint: "http://localhost:8080",
			onAuthFailure
		});

		await expect(client.fetch<IHttpRequest, IHttpResponse>("/resource", "GET")).rejects.toThrow();

		expect(onAuthFailure).not.toHaveBeenCalled();
	});

	test("original error is thrown even when onAuthFailure hook itself throws", async () => {
		fetchMock.mockResolvedValueOnce({
			ok: false,
			status: HttpStatusCode.unauthorized,
			statusText: "Unauthorized",
			headers: new Headers(),
			json: async () => ({ message: "Unauthorized", name: "UnauthorizedError" })
		});

		const client = new TestRestClient({
			endpoint: "http://localhost:8080",
			onAuthFailure: async () => {
				throw new Error("handler failed");
			}
		});

		await expect(client.fetch<IHttpRequest, IHttpResponse>("/resource", "GET")).rejects.toThrow(
			"Unauthorized"
		);
	});

	test("overridePrefix replaces the default prefix in the outgoing URL", async () => {
		fetchMock.mockResolvedValueOnce({
			ok: true,
			status: HttpStatusCode.ok,
			headers: new Headers({ [HeaderTypes.ContentType]: MimeTypes.Json }),
			json: async () => ({})
		});

		const client = new TestRestClient({ endpoint: "http://localhost:8080" });

		await client.fetch<IHttpRequest, IHttpResponse>("/resource", "GET", undefined, {
			overridePrefix: "alt-prefix"
		});

		const [outgoingUrl] = fetchMock.mock.calls[0];
		expect(outgoingUrl).toBe("http://localhost:8080/alt-prefix/resource");
	});

	test("empty string overridePrefix strips the prefix entirely", async () => {
		fetchMock.mockResolvedValueOnce({
			ok: true,
			status: HttpStatusCode.ok,
			headers: new Headers({ [HeaderTypes.ContentType]: MimeTypes.Json }),
			json: async () => ({})
		});

		const client = new TestRestClient({ endpoint: "http://localhost:8080" });

		await client.fetch<IHttpRequest, IHttpResponse>("/resource", "GET", undefined, {
			overridePrefix: ""
		});

		const [outgoingUrl] = fetchMock.mock.calls[0];
		expect(outgoingUrl).toBe("http://localhost:8080/resource");
	});

	test("omitting overridePrefix uses the default prefix", async () => {
		fetchMock.mockResolvedValueOnce({
			ok: true,
			status: HttpStatusCode.ok,
			headers: new Headers({ [HeaderTypes.ContentType]: MimeTypes.Json }),
			json: async () => ({})
		});

		const client = new TestRestClient({ endpoint: "http://localhost:8080" });

		await client.fetch<IHttpRequest, IHttpResponse>("/resource", "GET");

		const [outgoingUrl] = fetchMock.mock.calls[0];
		expect(outgoingUrl).toBe("http://localhost:8080/test-prefix/resource");
	});

	test("overridePrefix works alongside endpoint query params", async () => {
		fetchMock.mockResolvedValueOnce({
			ok: true,
			status: HttpStatusCode.ok,
			headers: new Headers({ [HeaderTypes.ContentType]: MimeTypes.Json }),
			json: async () => ({})
		});

		const client = new TestRestClient({
			endpoint: "http://localhost:8080?tenant-token=abc123"
		});

		await client.fetch<IHttpRequest, IHttpResponse>("/resource", "GET", undefined, {
			overridePrefix: "alt-prefix"
		});

		const [outgoingUrl] = fetchMock.mock.calls[0];
		expect(outgoingUrl).toBe("http://localhost:8080/alt-prefix/resource?tenant-token=abc123");
	});

	test("endpoint query params are merged with per-request query params", async () => {
		fetchMock.mockResolvedValueOnce({
			ok: true,
			status: HttpStatusCode.ok,
			headers: new Headers({
				[HeaderTypes.ContentType]: MimeTypes.Json
			}),
			json: async () => ({ success: true })
		});

		const client = new TestRestClient({
			endpoint: "http://localhost:8080?tenant-token=abc123"
		});

		await client.fetch<IHttpRequest, IHttpResponse>("/resource", "GET", {
			query: { page: "2" }
		});

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [outgoingUrl] = fetchMock.mock.calls[0];
		expect(outgoingUrl).toBe(
			"http://localhost:8080/test-prefix/resource?tenant-token=abc123&page=2"
		);
	});

	describe("query parameter values", () => {
		/**
		 * Issue a GET request with the given query object and return the outgoing URL.
		 * The query values are typed loosely here because BaseRestClient.fetch accepts
		 * number/boolean/undefined/null query values at runtime, even though
		 * IHttpRequestQuery's type is string-only.
		 * @param query The query object to pass as the request's query.
		 * @returns The URL that was passed to the mocked global fetch.
		 */
		async function requestWithQuery(query: { [id: string]: unknown }): Promise<string> {
			fetchMock.mockResolvedValueOnce({
				ok: true,
				status: HttpStatusCode.ok,
				headers: new Headers({
					[HeaderTypes.ContentType]: MimeTypes.Json
				}),
				json: async () => ({ success: true })
			});

			const client = new TestRestClient({ endpoint: "http://localhost:8080" });
			await client.fetch<IHttpRequest, IHttpResponse>("/resource", "GET", {
				query: query as IHttpRequest["query"]
			});

			const [outgoingUrl] = fetchMock.mock.calls[0];
			return outgoingUrl as string;
		}

		test("sends a non-blank string query value as-is", async () => {
			const url = await requestWithQuery({ id: "abc" });
			expect(new URL(url).searchParams.get("id")).toEqual("abc");
		});

		test("sends an empty-string query value instead of dropping it", async () => {
			const url = await requestWithQuery({ id: "", type: "Consignment" });
			expect(new URL(url).searchParams.has("id")).toEqual(true);
			expect(new URL(url).searchParams.get("id")).toEqual("");
			expect(new URL(url).searchParams.get("type")).toEqual("Consignment");
		});

		test("sends a whitespace-only query value instead of dropping it", async () => {
			const url = await requestWithQuery({ id: "   " });
			expect(new URL(url).searchParams.has("id")).toEqual(true);
			expect(new URL(url).searchParams.get("id")).toEqual("   ");
		});

		test("sends a numeric query value", async () => {
			const url = await requestWithQuery({ limit: 0 });
			expect(new URL(url).searchParams.get("limit")).toEqual("0");
		});

		test("sends a boolean query value", async () => {
			const url = await requestWithQuery({ includeAll: false });
			expect(new URL(url).searchParams.get("includeAll")).toEqual("false");
		});

		test("omits undefined and null query values", async () => {
			const url = await requestWithQuery({ id: undefined, cursor: null });
			expect(new URL(url).searchParams.has("id")).toEqual(false);
			expect(new URL(url).searchParams.has("cursor")).toEqual(false);
		});
	});
});
