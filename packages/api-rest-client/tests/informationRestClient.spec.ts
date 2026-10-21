// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { HttpMethod } from "@3sixty/web";
import { InformationRestClient } from "../src/informationRestClient.js";
import {
	binaryResponse,
	jsonResponse,
	setupFetchMock,
	teardownFetchMock,
	textResponse
} from "./helpers/restClientTestHelpers.js";

// OpenAPI spec: ../../api-service/docs/open-api/spec.json
const ENDPOINT = "http://localhost:8080";

const TEST_SERVER_INFO = {
	name: "API Server",
	version: "1.0.0"
};

const TEST_SPEC = {
	openapi: "3.1.0",
	info: {},
	paths: {}
};

const fetchMock = vi.fn();

describe("InformationRestClient", () => {
	let client: InformationRestClient;

	beforeEach(() => {
		setupFetchMock(fetchMock);
		client = new InformationRestClient({ endpoint: ENDPOINT });
	});

	afterEach(() => {
		teardownFetchMock(fetchMock);
	});

	describe("root", () => {
		test("sends GET to /", async () => {
			fetchMock.mockResolvedValueOnce(textResponse("Welcome to the API"));

			await client.root();

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(ENDPOINT);
			expect(options.method).toBe(HttpMethod.GET);
		});

		test("returns the root page content as a string", async () => {
			fetchMock.mockResolvedValueOnce(textResponse("Welcome to the API"));

			const result = await client.root();

			expect(result).toBe("Welcome to the API");
		});
	});

	describe("info", () => {
		test("sends GET to /info", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_SERVER_INFO));

			await client.info();

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/info`);
			expect(options.method).toBe(HttpMethod.GET);
		});

		test("returns the server name and version from the response body", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_SERVER_INFO));

			const result = await client.info();

			expect(result.name).toBe("API Server");
			expect(result.version).toBe("1.0.0");
		});
	});

	describe("favicon", () => {
		test("sends GET to /favicon.ico", async () => {
			fetchMock.mockResolvedValueOnce(binaryResponse(new Uint8Array([137, 80, 78])));

			await client.favicon();

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/favicon.ico`);
			expect(options.method).toBe(HttpMethod.GET);
		});

		test("returns the favicon as a Uint8Array", async () => {
			const faviconBytes = new Uint8Array([137, 80, 78]);
			fetchMock.mockResolvedValueOnce(binaryResponse(faviconBytes));

			const result = await client.favicon();

			expect(result).toBeInstanceOf(Uint8Array);
			expect(result).toEqual(faviconBytes);
		});

		test("returns undefined when the favicon response is empty", async () => {
			fetchMock.mockResolvedValueOnce(binaryResponse(new Uint8Array(0)));

			const result = await client.favicon();

			expect(result).toBeUndefined();
		});
	});

	describe("spec", () => {
		test("sends GET to /spec", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_SPEC));

			await client.spec();

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/spec`);
			expect(options.method).toBe(HttpMethod.GET);
		});

		test("returns the OpenAPI spec object from the response body", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_SPEC));

			const result = await client.spec();

			expect(result).toEqual(TEST_SPEC);
		});
	});

	describe("livez", () => {
		test("sends GET to /livez", async () => {
			fetchMock.mockResolvedValueOnce(textResponse("alive"));

			await client.livez();

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/livez`);
			expect(options.method).toBe(HttpMethod.GET);
		});

		test("returns alive status when the server is live", async () => {
			fetchMock.mockResolvedValueOnce(textResponse("alive"));

			const result = await client.livez();

			expect(result.status).toBe("alive");
		});

		test("returns dead status when the server is not live", async () => {
			fetchMock.mockResolvedValueOnce(textResponse("dead"));

			const result = await client.livez();

			expect(result.status).toBe("dead");
		});
	});

	describe("readyz", () => {
		test("sends GET to /readyz", async () => {
			fetchMock.mockResolvedValueOnce(textResponse("ready"));

			await client.readyz();

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/readyz`);
			expect(options.method).toBe(HttpMethod.GET);
		});

		test("returns ready status when the server is ready", async () => {
			fetchMock.mockResolvedValueOnce(textResponse("ready"));

			const result = await client.readyz();

			expect(result.status).toBe("ready");
		});

		test("returns not ready status when the server is not ready", async () => {
			fetchMock.mockResolvedValueOnce(textResponse("not ready"));

			const result = await client.readyz();

			expect(result.status).toBe("not ready");
		});
	});
});
