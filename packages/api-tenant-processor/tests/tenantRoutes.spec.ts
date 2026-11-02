// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IHttpRequestContext, ITenantAdminComponent } from "@3sixty/api-models";
import { ComponentFactory, GuardError } from "@3sixty/core";
import { HeaderTypes, HttpStatusCode } from "@3sixty/web";
import { tenantByOrganizationId, tenantCreate, tenantUpdate } from "../src/tenantRoutes.js";

const TENANT_ID = "01234567890123456789012345678901";

const TENANT_BODY = {
	apiKey: "abcdef1234567890abcdef1234567890",
	label: "node",
	organizationId: "org-1"
};

describe("tenantRoutes", () => {
	let component: ITenantAdminComponent;
	const httpRequestContext = {} as IHttpRequestContext;

	beforeEach(() => {
		vi.restoreAllMocks();

		component = {
			create: vi.fn().mockResolvedValue(TENANT_ID),
			update: vi.fn().mockResolvedValue(undefined),
			getTenantByOrganizationId: vi.fn().mockResolvedValue({
				...TENANT_BODY,
				id: TENANT_ID,
				publicOrigin: "https://node.example.org"
			})
		} as unknown as ITenantAdminComponent;

		vi.spyOn(ComponentFactory, "get").mockReturnValue(component);
	});

	describe("tenantCreate", () => {
		test("creates the tenant from the body and returns its location", async () => {
			const response = await tenantCreate(
				httpRequestContext,
				"tenant-admin",
				{ body: TENANT_BODY },
				"tenants"
			);

			expect(component.create).toHaveBeenCalledWith(TENANT_BODY);
			expect(response.statusCode).toBe(HttpStatusCode.created);
			expect(response.headers?.[HeaderTypes.Location]).toContain(TENANT_ID);
		});

		test("fails when the body is missing", async () => {
			await expect(
				tenantCreate(
					httpRequestContext,
					"tenant-admin",
					{ body: undefined as unknown as typeof TENANT_BODY },
					"tenants"
				)
			).rejects.toMatchObject({ name: GuardError.CLASS_NAME });
		});
	});

	describe("tenantByOrganizationId", () => {
		test("gets the tenant by organization id including legacy ids when asked", async () => {
			const response = await tenantByOrganizationId(httpRequestContext, "tenant-admin", {
				pathParams: { organizationId: "org-1" },
				query: { includeLegacy: "true" }
			});

			expect(component.getTenantByOrganizationId).toHaveBeenCalledWith("org-1", true);
			expect(response.body.id).toBe(TENANT_ID);
		});

		test("does not include legacy ids by default", async () => {
			await tenantByOrganizationId(httpRequestContext, "tenant-admin", {
				pathParams: { organizationId: "org-1" }
			});

			expect(component.getTenantByOrganizationId).toHaveBeenCalledWith("org-1", undefined);
		});
	});

	describe("tenantUpdate", () => {
		test("updates the tenant using the id from the path", async () => {
			const response = await tenantUpdate(httpRequestContext, "tenant-admin", {
				pathParams: { id: TENANT_ID },
				body: TENANT_BODY
			});

			expect(component.update).toHaveBeenCalledWith({ ...TENANT_BODY, id: TENANT_ID });
			expect(response.statusCode).toBe(HttpStatusCode.noContent);
		});

		test("prefers the id from the path over the id in the body", async () => {
			await tenantUpdate(httpRequestContext, "tenant-admin", {
				pathParams: { id: TENANT_ID },
				body: { ...TENANT_BODY, id: "99999999999999999999999999999999" }
			});

			expect(component.update).toHaveBeenCalledWith({ ...TENANT_BODY, id: TENANT_ID });
		});
	});
});
