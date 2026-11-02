// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { ITenant } from "@3sixty/api-models";
import { ComparisonOperator } from "@3sixty/entity";
import { HeaderTypes, HttpMethod } from "@3sixty/web";
import { TenantAdminRestClient } from "../src/tenantAdminRestClient.js";
import {
	createdResponse,
	jsonResponse,
	noContentResponse,
	setupFetchMock,
	teardownFetchMock
} from "./helpers/restClientTestHelpers.js";

const ENDPOINT = "http://localhost:8080";
const TENANT_ID = "2a39d6e62d98aa5372432f2e5d2208d4";
const API_KEY = "ad7a5b0b816ca314b69c813ae1368232";
const PUBLIC_ORIGIN = "https://example.com:4321";

const TEST_TENANT: ITenant = {
	id: TENANT_ID,
	apiKey: API_KEY,
	label: "node",
	dateCreated: "2026-01-19T03:59:35.742Z",
	dateModified: "2026-01-19T03:59:35.742Z",
	publicOrigin: PUBLIC_ORIGIN,
	organizationId: "org-1"
};

const fetchMock = vi.fn();

/**
 * Get the query parameters sent with a request.
 * @param callIndex The index of the fetch call.
 * @returns The query parameters.
 */
function sentQuery(callIndex: number): URLSearchParams {
	return new URL(fetchMock.mock.calls[callIndex][0]).searchParams;
}

describe("TenantAdminRestClient", () => {
	let client: TenantAdminRestClient;

	beforeEach(() => {
		setupFetchMock(fetchMock);
		client = new TenantAdminRestClient({ endpoint: ENDPOINT });
	});

	afterEach(() => {
		teardownFetchMock(fetchMock);
	});

	test("returns its class name", () => {
		expect(client.className()).toBe("TenantAdminRestClient");
	});

	describe("create", () => {
		test("sends POST to /tenants and returns the id from the location", async () => {
			fetchMock.mockResolvedValueOnce(createdResponse(`${ENDPOINT}/tenants/${TENANT_ID}`));

			const id = await client.create({
				apiKey: API_KEY,
				label: "node",
				organizationId: "org-1"
			});

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/tenants`);
			expect(options.method).toBe(HttpMethod.POST);
			expect(JSON.parse(options.body)).toEqual({
				apiKey: API_KEY,
				label: "node",
				organizationId: "org-1"
			});
			expect(id).toBe(TENANT_ID);
		});
	});

	describe("update", () => {
		test("sends PUT to /tenants/:id with the tenant", async () => {
			fetchMock.mockResolvedValueOnce(noContentResponse());

			await client.update({ id: TENANT_ID, label: "renamed", organizationId: "org-1" });

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/tenants/${TENANT_ID}`);
			expect(options.method).toBe(HttpMethod.PUT);
			expect(JSON.parse(options.body)).toEqual({
				id: TENANT_ID,
				label: "renamed",
				organizationId: "org-1"
			});
		});

		test("fails without an id", async () => {
			await expect(client.update({ label: "renamed" })).rejects.toMatchObject({
				name: "GuardError"
			});
			expect(fetchMock).not.toHaveBeenCalled();
		});
	});

	describe("get", () => {
		test("sends GET to /tenants/:id and returns the tenant", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_TENANT));

			const result = await client.get(TENANT_ID);

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/tenants/${TENANT_ID}`);
			expect(options.method).toBe(HttpMethod.GET);
			expect(result).toEqual(TEST_TENANT);
		});
	});

	describe("getByApiKey", () => {
		test("sends GET to /tenants/api-key/:apiKey", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_TENANT));

			const result = await client.getByApiKey(API_KEY);

			expect(fetchMock.mock.calls[0][0]).toBe(`${ENDPOINT}/tenants/api-key/${API_KEY}`);
			expect(result).toEqual(TEST_TENANT);
		});
	});

	describe("getByPublicOrigin", () => {
		test("sends GET to /tenants/public-origin/:publicOrigin with the origin encoded", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_TENANT));

			const result = await client.getByPublicOrigin(PUBLIC_ORIGIN);

			expect(fetchMock.mock.calls[0][0]).toBe(
				`${ENDPOINT}/tenants/public-origin/https:%2F%2Fexample.com:4321`
			);
			expect(result).toEqual(TEST_TENANT);
		});
	});

	describe("remove", () => {
		test("sends DELETE to /tenants/:id", async () => {
			fetchMock.mockResolvedValueOnce(noContentResponse());

			await client.remove(TENANT_ID);

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/tenants/${TENANT_ID}`);
			expect(options.method).toBe(HttpMethod.DELETE);
		});
	});

	describe("query", () => {
		test("sends the conditions, properties, cursor and limit and returns the next cursor", async () => {
			fetchMock.mockResolvedValueOnce({
				...jsonResponse([TEST_TENANT]),
				headers: new Headers({
					[HeaderTypes.ContentType]: "application/json",
					[HeaderTypes.Link]: `<${ENDPOINT}/tenants?cursor=next-page>; rel="next"`
				})
			});

			const conditions = {
				property: "label" as const,
				comparison: ComparisonOperator.Equals,
				value: "node"
			};
			const result = await client.query(conditions, ["id", "label"], "this-page", 10);

			const query = sentQuery(0);
			expect(JSON.parse(query.get("conditions") ?? "")).toEqual(conditions);
			expect(query.get("properties")).toBe("id,label");
			expect(query.get("cursor")).toBe("this-page");
			expect(query.get("limit")).toBe("10");
			expect(result.tenants).toEqual([TEST_TENANT]);
			expect(result.cursor).toBe("next-page");
		});

		test("sends no query parameters when none are given", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse([]));

			const result = await client.query();

			expect(fetchMock.mock.calls[0][0]).toBe(`${ENDPOINT}/tenants`);
			expect(result.tenants).toEqual([]);
			expect(result.cursor).toBeUndefined();
		});
	});

	describe("getTenantByOrganizationId", () => {
		test("sends GET to /tenants/organization/:organizationId", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_TENANT));

			const result = await client.getTenantByOrganizationId("org-1");

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/tenants/organization/org-1`);
			expect(options.method).toBe(HttpMethod.GET);
			expect(result).toEqual(TEST_TENANT);
		});

		test("sends includeLegacy when set", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_TENANT));

			await client.getTenantByOrganizationId("org-legacy", true);

			expect(fetchMock.mock.calls[0][0]).toBe(
				`${ENDPOINT}/tenants/organization/org-legacy?includeLegacy=true`
			);
		});
	});
});
