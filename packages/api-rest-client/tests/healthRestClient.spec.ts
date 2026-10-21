// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { HttpMethod } from "@3sixty/web";
import { HealthRestClient } from "../src/healthRestClient.js";
import {
	jsonResponse,
	setupFetchMock,
	teardownFetchMock
} from "./helpers/restClientTestHelpers.js";

// OpenAPI spec: ../../api-service/docs/open-api/spec.json
const ENDPOINT = "http://localhost:8080";

const TEST_HEALTH_OK = {
	status: "ok",
	components: [
		{ source: "Database", status: "ok" },
		{ source: "Storage", status: "ok" }
	]
};

const TEST_HEALTH_WARNING = {
	status: "warning",
	components: [
		{ source: "Database", status: "warning", description: "slowRunning" },
		{ source: "Storage", status: "ok" }
	]
};

const TEST_HEALTH_ERROR = {
	status: "error",
	components: [
		{ source: "Database", status: "ok" },
		{ source: "Storage", status: "error", description: "storageFull" }
	]
};

const fetchMock = vi.fn();

describe("HealthRestClient", () => {
	let client: HealthRestClient;

	beforeEach(() => {
		setupFetchMock(fetchMock);
		client = new HealthRestClient({ endpoint: ENDPOINT });
	});

	afterEach(() => {
		teardownFetchMock(fetchMock);
	});

	describe("healthStatus", () => {
		test("sends GET to /health", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_HEALTH_OK));

			await client.healthStatus();

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/health`);
			expect(options.method).toBe(HttpMethod.GET);
		});

		test("returns status and components from the response body", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_HEALTH_OK));

			const result = await client.healthStatus();

			expect(result.status).toBe("ok");
			expect(result.components).toEqual(TEST_HEALTH_OK.components);
		});

		test("returns warning status when a component reports a warning", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_HEALTH_WARNING));

			const result = await client.healthStatus();

			expect(result.status).toBe("warning");
			expect(result.components[0].description).toBe("slowRunning");
		});

		test("returns error status when a component reports an error", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_HEALTH_ERROR));

			const result = await client.healthStatus();

			expect(result.status).toBe("error");
			expect(result.components[1].description).toBe("storageFull");
		});
	});
});
