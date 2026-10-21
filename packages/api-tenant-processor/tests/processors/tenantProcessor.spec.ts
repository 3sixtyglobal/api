// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import {
	HttpErrorHelper,
	type IHttpResponse,
	type ITenant,
	type ITenantAdminComponent
} from "@3sixty/api-models";
import { ContextIdKeys, type IContextIds } from "@3sixty/context";
import {
	ComponentFactory,
	GeneralError,
	GuardError,
	type IError,
	NotFoundError
} from "@3sixty/core";
import { HttpStatusCode } from "@3sixty/web";
import { TenantProcessor } from "../../src/tenantProcessor.js";

const LOGIN_URL = "/api/login";

const TENANT_A: ITenant = {
	id: "tenant-A",
	apiKey: "key-A",
	publicOrigin: "https://a.example.com",
	organizationId: "org-A",
	organizationIdLegacy: ["org-legacy-1", "org-legacy-2"],
	dateCreated: new Date().toISOString(),
	dateModified: new Date().toISOString(),
	label: "Tenant A"
};

/**
 * Build the not found error the tenant admin component raises for an unknown credential.
 * @returns The error.
 */
function notFound(): NotFoundError {
	return new NotFoundError("test", "tenantNotFound", "missing");
}

describe("TenantProcessor", () => {
	let mockTenantAdmin: ITenantAdminComponent;

	beforeEach(() => {
		vi.restoreAllMocks();

		mockTenantAdmin = {
			className: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			get: vi.fn().mockRejectedValue(notFound()),
			getByApiKey: vi.fn().mockRejectedValue(notFound()),
			getByPublicOrigin: vi.fn().mockRejectedValue(notFound()),
			getTenantByOrganizationId: vi.fn().mockRejectedValue(notFound()),
			remove: vi.fn(),
			query: vi.fn()
		};

		vi.spyOn(ComponentFactory, "get").mockReturnValue(mockTenantAdmin);
	});

	describe("api-key path", () => {
		it("should resolve tenant from x-api-key header", async () => {
			vi.mocked(mockTenantAdmin.getByApiKey).mockResolvedValue(TENANT_A);

			const processor = new TenantProcessor();
			const contextIds: IContextIds = {};
			const processorState: { [id: string]: unknown } = {};
			const response: IHttpResponse = {};

			await processor.pre(
				{ url: LOGIN_URL, headers: { "x-api-key": "key-A" } } as never,
				response,
				{} as never,
				contextIds,
				processorState
			);

			expect(response.statusCode).toBeUndefined();
			expect(contextIds[ContextIdKeys.Tenant]).toBe("tenant-A");
			expect(contextIds[ContextIdKeys.Organization]).toBe("org-A");
			expect(mockTenantAdmin.getByApiKey).toHaveBeenCalledWith("key-A");
		});

		it("should return 401 missingApiKey when neither header nor query carry a credential", async () => {
			const processor = new TenantProcessor();
			const buildResponseSpy = vi.spyOn(HttpErrorHelper, "buildResponse");
			const response: IHttpResponse = {};

			await processor.pre({ url: LOGIN_URL, headers: {} } as never, response, {} as never, {}, {});

			expect(buildResponseSpy).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ message: "tenantProcessor.missingApiKey" }),
				HttpStatusCode.unauthorized,
				false
			);
			expect(response.statusCode).toBe(HttpStatusCode.unauthorized);
		});

		it("should include the error stack in the 401 response when includeErrorStack is enabled", async () => {
			const processor = new TenantProcessor({ config: { includeErrorStack: true } });
			const response: IHttpResponse = {};

			await processor.pre({ url: LOGIN_URL, headers: {} } as never, response, {} as never, {}, {});

			expect(response.statusCode).toBe(HttpStatusCode.unauthorized);
			expect((response.body as IError).stack).toBeDefined();
		});

		it("should skip when route opts out via skipTenant", async () => {
			const processor = new TenantProcessor();
			const response: IHttpResponse = {};

			await processor.pre(
				{ url: LOGIN_URL, headers: {} } as never,
				response,
				{ skipTenant: true } as never,
				{},
				{}
			);

			expect(response.statusCode).toBeUndefined();
			expect(mockTenantAdmin.getByApiKey).not.toHaveBeenCalled();
		});

		it("should return 401 apiKeyNotFound when the tenant component reports no match", async () => {
			const processor = new TenantProcessor();
			const buildResponseSpy = vi.spyOn(HttpErrorHelper, "buildResponse");
			const response: IHttpResponse = {};

			await processor.pre(
				{ url: LOGIN_URL, headers: { "x-api-key": "unknown-key" } } as never,
				response,
				{} as never,
				{},
				{}
			);

			expect(response.statusCode).toBe(HttpStatusCode.unauthorized);
			expect(buildResponseSpy).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ message: "tenantProcessor.apiKeyNotFound" }),
				HttpStatusCode.unauthorized,
				false
			);
		});

		it("should return 401 apiKeyNotFound when the api key is rejected by the component guards", async () => {
			vi.mocked(mockTenantAdmin.getByApiKey).mockRejectedValue(
				new GuardError("test", "guard.stringHexLength", "apiKey", "not-hex")
			);

			const processor = new TenantProcessor();
			const buildResponseSpy = vi.spyOn(HttpErrorHelper, "buildResponse");
			const response: IHttpResponse = {};

			await processor.pre(
				{ url: LOGIN_URL, headers: { "x-api-key": "not-hex" } } as never,
				response,
				{} as never,
				{},
				{}
			);

			expect(response.statusCode).toBe(HttpStatusCode.unauthorized);
			expect(buildResponseSpy).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ message: "tenantProcessor.apiKeyNotFound" }),
				HttpStatusCode.unauthorized,
				false
			);
		});

		it("should pass through a component fault rather than reporting it as an unknown api key", async () => {
			vi.mocked(mockTenantAdmin.getByApiKey).mockRejectedValue(
				new GeneralError("test", "storageUnavailable")
			);

			const processor = new TenantProcessor();
			const buildResponseSpy = vi.spyOn(HttpErrorHelper, "buildResponse");
			const response: IHttpResponse = {};

			await processor.pre(
				{ url: LOGIN_URL, headers: { "x-api-key": "key-A" } } as never,
				response,
				{} as never,
				{},
				{}
			);

			expect(buildResponseSpy).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ message: "test.storageUnavailable" }),
				HttpStatusCode.unauthorized,
				false
			);
		});
	});

	describe("organization- path", () => {
		it("resolves tenant by organization id, including legacy ids", async () => {
			vi.mocked(mockTenantAdmin.getTenantByOrganizationId).mockResolvedValue(TENANT_A);

			const processor = new TenantProcessor();
			const contextIds: IContextIds = {};
			const processorState: { [id: string]: unknown } = {};
			const response: IHttpResponse = {};

			await processor.pre(
				{ url: "/api/users", headers: {}, query: { organization: "org-A" } } as never,
				response,
				{} as never,
				contextIds,
				processorState
			);

			expect(response.statusCode).toBeUndefined();
			expect(contextIds[ContextIdKeys.Tenant]).toBe("tenant-A");
			expect(contextIds[ContextIdKeys.Organization]).toBe("org-A");
			expect(mockTenantAdmin.getTenantByOrganizationId).toHaveBeenCalledWith("org-A", true);
		});

		it("resolves tenant by a legacy organization id", async () => {
			vi.mocked(mockTenantAdmin.getTenantByOrganizationId).mockResolvedValue(TENANT_A);

			const processor = new TenantProcessor();
			const contextIds: IContextIds = {};
			const response: IHttpResponse = {};

			await processor.pre(
				{ url: "/api/users", headers: {}, query: { organization: "org-legacy-1" } } as never,
				response,
				{} as never,
				contextIds,
				{}
			);

			expect(response.statusCode).toBeUndefined();
			expect(contextIds[ContextIdKeys.Tenant]).toBe("tenant-A");
			expect(contextIds[ContextIdKeys.Organization]).toBe("org-A");
			expect(mockTenantAdmin.getTenantByOrganizationId).toHaveBeenCalledWith("org-legacy-1", true);
		});

		it("returns 401 organizationIdNotFound when the component reports no match", async () => {
			const processor = new TenantProcessor();
			const buildResponseSpy = vi.spyOn(HttpErrorHelper, "buildResponse");
			const response: IHttpResponse = {};

			await processor.pre(
				{ url: "/api/users", headers: {}, query: { organization: "unknown-org" } } as never,
				response,
				{} as never,
				{},
				{}
			);

			expect(response.statusCode).toBe(HttpStatusCode.unauthorized);
			expect(buildResponseSpy).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ message: "tenantProcessor.organizationIdNotFound" }),
				HttpStatusCode.unauthorized,
				false
			);
		});

		it("returns 401 missingOrganizationId when organization query param is absent", async () => {
			const processor = new TenantProcessor();
			const buildResponseSpy = vi.spyOn(HttpErrorHelper, "buildResponse");
			const response: IHttpResponse = {};

			await processor.pre(
				{ url: "/api/users", headers: {}, query: {} } as never,
				response,
				{ skipAuth: true } as never,
				{},
				{}
			);

			expect(response.statusCode).toBe(HttpStatusCode.unauthorized);
			expect(buildResponseSpy).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ message: "tenantProcessor.missingOrganizationId" }),
				HttpStatusCode.unauthorized,
				false
			);
			expect(mockTenantAdmin.getTenantByOrganizationId).not.toHaveBeenCalled();
		});
	});

	describe("skipAuth path", () => {
		it("resolves tenant from organization when skipAuth is true", async () => {
			vi.mocked(mockTenantAdmin.getTenantByOrganizationId).mockResolvedValue(TENANT_A);

			const processor = new TenantProcessor();
			const contextIds: IContextIds = {};
			const processorState: { [id: string]: unknown } = {};
			const response: IHttpResponse = {};

			await processor.pre(
				{ url: "/api/some-endpoint", headers: {}, query: { organization: "org-A" } } as never,
				response,
				{ skipAuth: true } as never,
				contextIds,
				processorState
			);

			expect(response.statusCode).toBeUndefined();
			expect(contextIds[ContextIdKeys.Tenant]).toBe("tenant-A");
			expect(contextIds[ContextIdKeys.Organization]).toBe("org-A");
			expect(mockTenantAdmin.getTenantByOrganizationId).toHaveBeenCalledWith("org-A", true);
		});

		it("passes through silently when organization is absent and skipAuth is false", async () => {
			const processor = new TenantProcessor();
			const contextIds: IContextIds = {};
			const response: IHttpResponse = {};

			await processor.pre(
				{ url: "/api/some-endpoint", headers: {}, query: {} } as never,
				response,
				{} as never,
				contextIds,
				{}
			);

			expect(response.statusCode).toBeUndefined();
			expect(contextIds[ContextIdKeys.Tenant]).toBeUndefined();
			expect(mockTenantAdmin.getByApiKey).not.toHaveBeenCalled();
			expect(mockTenantAdmin.getTenantByOrganizationId).not.toHaveBeenCalled();
		});
	});

	describe("tenantAdminComponentType", () => {
		it("resolves the tenant admin component under the default name", () => {
			const componentFactorySpy = vi.spyOn(ComponentFactory, "get");

			const processor = new TenantProcessor();

			expect(processor.className()).toBe("TenantProcessor");
			expect(componentFactorySpy).toHaveBeenCalledWith("tenant-admin");
		});

		it("resolves the tenant admin component under a configured name", () => {
			const componentFactorySpy = vi.spyOn(ComponentFactory, "get");

			const processor = new TenantProcessor({ tenantAdminComponentType: "custom-tenant-admin" });

			expect(processor.className()).toBe("TenantProcessor");
			expect(componentFactorySpy).toHaveBeenCalledWith("custom-tenant-admin");
		});
	});

	describe("apiKeyEndpoints", () => {
		it("resolves tenant via organization on a non-api-key-endpoint URL", async () => {
			vi.mocked(mockTenantAdmin.getTenantByOrganizationId).mockResolvedValue(TENANT_A);

			const processor = new TenantProcessor();
			const contextIds: IContextIds = {};
			const response: IHttpResponse = {};

			await processor.pre(
				{ url: "/api/users", headers: {}, query: { organization: "org-A" } } as never,
				response,
				{} as never,
				contextIds,
				{}
			);

			expect(response.statusCode).toBeUndefined();
			expect(contextIds[ContextIdKeys.Tenant]).toBe("tenant-A");
			expect(mockTenantAdmin.getByApiKey).not.toHaveBeenCalled();
			expect(mockTenantAdmin.getTenantByOrganizationId).toHaveBeenCalledWith("org-A", true);
		});

		it("api-key wins on a login URL even when organization is also present", async () => {
			vi.mocked(mockTenantAdmin.getByApiKey).mockResolvedValue({
				...TENANT_A,
				id: "tenant-from-key"
			});

			const processor = new TenantProcessor();
			const contextIds: IContextIds = {};
			const response: IHttpResponse = {};

			await processor.pre(
				{
					url: LOGIN_URL,
					headers: { "x-api-key": "key-A" },
					query: { organization: "org-A" }
				} as never,
				response,
				{} as never,
				contextIds,
				{}
			);

			expect(response.statusCode).toBeUndefined();
			expect(contextIds[ContextIdKeys.Tenant]).toBe("tenant-from-key");
			expect(mockTenantAdmin.getByApiKey).toHaveBeenCalledWith("key-A");
			expect(mockTenantAdmin.getTenantByOrganizationId).not.toHaveBeenCalled();
		});

		it("default pattern matches URL ending in /login", async () => {
			vi.mocked(mockTenantAdmin.getByApiKey).mockResolvedValue(TENANT_A);

			const processor = new TenantProcessor();
			const contextIds: IContextIds = {};
			const response: IHttpResponse = {};

			await processor.pre(
				{ url: "/v1/auth/login", headers: { "x-api-key": "key-A" } } as never,
				response,
				{} as never,
				contextIds,
				{}
			);

			expect(response.statusCode).toBeUndefined();
			expect(contextIds[ContextIdKeys.Tenant]).toBe("tenant-A");
		});

		it("default pattern does not match URL with /login in the middle", async () => {
			vi.mocked(mockTenantAdmin.getTenantByOrganizationId).mockResolvedValue(TENANT_A);

			const processor = new TenantProcessor();
			const contextIds: IContextIds = {};
			const response: IHttpResponse = {};

			await processor.pre(
				{
					url: "/login/callback",
					headers: {},
					query: { organization: "org-A" }
				} as never,
				response,
				{} as never,
				contextIds,
				{}
			);

			expect(response.statusCode).toBeUndefined();
			expect(contextIds[ContextIdKeys.Tenant]).toBe("tenant-A");
			expect(mockTenantAdmin.getTenantByOrganizationId).toHaveBeenCalledWith("org-A", true);
		});

		it("uses custom apiKeyEndpoints when provided", async () => {
			vi.mocked(mockTenantAdmin.getByApiKey).mockResolvedValue(TENANT_A);

			const processor = new TenantProcessor({
				config: { apiKeyEndpoints: ["^/auth/token$"] }
			});
			const contextIds: IContextIds = {};
			const response: IHttpResponse = {};

			await processor.pre(
				{ url: "/auth/token", headers: { "x-api-key": "key-A" } } as never,
				response,
				{} as never,
				contextIds,
				{}
			);

			expect(response.statusCode).toBeUndefined();
			expect(contextIds[ContextIdKeys.Tenant]).toBe("tenant-A");
		});

		it("falls through to organization when URL does not match custom apiKeyEndpoints", async () => {
			vi.mocked(mockTenantAdmin.getTenantByOrganizationId).mockResolvedValue(TENANT_A);

			const processor = new TenantProcessor({
				config: { apiKeyEndpoints: ["^/auth/token$"] }
			});
			const contextIds: IContextIds = {};
			const response: IHttpResponse = {};

			await processor.pre(
				{ url: LOGIN_URL, headers: {}, query: { organization: "org-A" } } as never,
				response,
				{} as never,
				contextIds,
				{}
			);

			expect(response.statusCode).toBeUndefined();
			expect(contextIds[ContextIdKeys.Tenant]).toBe("tenant-A");
			expect(mockTenantAdmin.getTenantByOrganizationId).toHaveBeenCalledWith("org-A", true);
		});

		it("matches any of multiple configured patterns", async () => {
			vi.mocked(mockTenantAdmin.getByApiKey).mockResolvedValue(TENANT_A);

			const processor = new TenantProcessor({
				config: { apiKeyEndpoints: ["/login$", "^/auth/token$"] }
			});
			const contextIds: IContextIds = {};
			const response: IHttpResponse = {};

			await processor.pre(
				{ url: "/auth/token", headers: { "x-api-key": "key-A" } } as never,
				response,
				{} as never,
				contextIds,
				{}
			);

			expect(response.statusCode).toBeUndefined();
			expect(contextIds[ContextIdKeys.Tenant]).toBe("tenant-A");
		});

		it("matches the path even when the URL contains a query string", async () => {
			vi.mocked(mockTenantAdmin.getByApiKey).mockResolvedValue(TENANT_A);

			const processor = new TenantProcessor();
			const contextIds: IContextIds = {};
			const response: IHttpResponse = {};

			await processor.pre(
				{ url: "/api/login?x-api-key=key-A", headers: { "x-api-key": "key-A" } } as never,
				response,
				{} as never,
				contextIds,
				{}
			);

			expect(response.statusCode).toBeUndefined();
			expect(contextIds[ContextIdKeys.Tenant]).toBe("tenant-A");
		});

		it("does not use api-key path when query string contains /login but path does not end with it", async () => {
			vi.mocked(mockTenantAdmin.getTenantByOrganizationId).mockResolvedValue(TENANT_A);

			const processor = new TenantProcessor();
			const contextIds: IContextIds = {};
			const response: IHttpResponse = {};

			await processor.pre(
				{
					url: "/api/users?redirect=/login",
					headers: {},
					query: { organization: "org-A" }
				} as never,
				response,
				{} as never,
				contextIds,
				{}
			);

			expect(response.statusCode).toBeUndefined();
			expect(contextIds[ContextIdKeys.Tenant]).toBe("tenant-A");
			expect(mockTenantAdmin.getTenantByOrganizationId).toHaveBeenCalledWith("org-A", true);
			expect(mockTenantAdmin.getByApiKey).not.toHaveBeenCalled();
		});
	});
});
