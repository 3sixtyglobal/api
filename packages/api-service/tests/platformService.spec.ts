// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { HttpContextIdKeys, type ITenant, TenantEventType } from "@3sixty/api-models";
import { ContextIdKeys, ContextIdStore } from "@3sixty/context";
import { ComponentFactory } from "@3sixty/core";
import {
	EntityStorageConnectorFactory,
	type IEntityStorageConnector
} from "@3sixty/entity-storage-models";
import type { ILoggingComponent } from "@3sixty/logging-models";
import { PlatformService } from "../src/platformService.js";

const TENANT_A: ITenant = {
	id: "tenant-A",
	apiKey: "key-A",
	publicOrigin: "https://a.example.com",
	dateCreated: new Date().toISOString(),
	dateModified: new Date().toISOString(),
	label: "Tenant A",
	organizationId: "org-1"
};

const TENANT_B: ITenant = {
	id: "tenant-B",
	apiKey: "key-B",
	publicOrigin: "https://b.example.com",
	dateCreated: new Date().toISOString(),
	dateModified: new Date().toISOString(),
	label: "Tenant B",
	organizationId: "org-2"
};

const TENANT_C: ITenant = {
	id: "tenant-C",
	apiKey: "key-C",
	publicOrigin: "https://c.example.com",
	dateCreated: new Date().toISOString(),
	dateModified: new Date().toISOString(),
	label: "Tenant C",
	organizationId: "org-3"
};

const TENANT_NO_ORIGIN: ITenant = {
	id: "tenant-D",
	apiKey: "key-D",
	dateCreated: new Date().toISOString(),
	dateModified: new Date().toISOString(),
	label: "Tenant D",
	organizationId: "org-4"
};

describe("PlatformService", () => {
	let mockTenantStorage: IEntityStorageConnector<ITenant>;

	beforeEach(() => {
		vi.restoreAllMocks();

		mockTenantStorage = {
			getSchema: vi.fn(),
			set: vi.fn(),
			get: vi.fn(),
			remove: vi.fn(),
			query: vi.fn().mockResolvedValue({
				entities: [TENANT_A, TENANT_B, TENANT_C]
			})
		} as unknown as IEntityStorageConnector<ITenant>;

		vi.spyOn(EntityStorageConnectorFactory, "getIfExists").mockReturnValue(mockTenantStorage);
	});

	describe("getLocalOriginContext", () => {
		beforeEach(() => {
			vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({});
		});

		it("should throw when url is empty", async () => {
			const service = new PlatformService();
			await expect(service.getLocalOriginContext("")).rejects.toThrow();
		});

		it("should return undefined when the url has no parseable origin", async () => {
			const service = new PlatformService();
			await expect(service.getLocalOriginContext("not-a-valid-url")).resolves.toBeUndefined();
		});

		it("should return contextIds when url origin matches the context publicOrigin without querying storage", async () => {
			const contextIds = { [HttpContextIdKeys.PublicOrigin]: "https://example.com" };
			vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue(contextIds);
			const service = new PlatformService();
			await expect(service.getLocalOriginContext("https://example.com/some/path")).resolves.toBe(
				contextIds
			);
			expect(mockTenantStorage.get).not.toHaveBeenCalled();
		});

		it("should return contextIds when url origin matches the context localOrigin without querying storage", async () => {
			const contextIds = { [HttpContextIdKeys.LocalOrigin]: "https://local.example.com" };
			vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue(contextIds);
			const service = new PlatformService();
			await expect(
				service.getLocalOriginContext("https://local.example.com/some/path")
			).resolves.toBe(contextIds);
			expect(mockTenantStorage.get).not.toHaveBeenCalled();
		});

		it("should return undefined when origin does not match any tenant", async () => {
			vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
				[HttpContextIdKeys.PublicOrigin]: "https://other.com"
			});
			(mockTenantStorage.get as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
			const service = new PlatformService();
			await expect(
				service.getLocalOriginContext("https://example.com/path")
			).resolves.toBeUndefined();
		});

		it("should return contextIds with tenant info when a tenant's publicOrigin matches the url origin", async () => {
			(mockTenantStorage.get as ReturnType<typeof vi.fn>).mockImplementation(
				async (id: string, index?: string) => {
					if (index === "publicOrigin" && id === "https://b.example.com") {
						return TENANT_B;
					}
					return undefined;
				}
			);
			const service = new PlatformService({ config: { isMultiTenant: true } });
			const result = await service.getLocalOriginContext("https://b.example.com/page");
			expect(result).toMatchObject({
				[ContextIdKeys.Tenant]: TENANT_B.id,
				[ContextIdKeys.Organization]: TENANT_B.organizationId,
				[HttpContextIdKeys.PublicOrigin]: TENANT_B.publicOrigin
			});
			expect(mockTenantStorage.get).toHaveBeenCalledWith("https://b.example.com", "publicOrigin");
		});

		it("should return undefined when the publicOrigin secondary index has no match", async () => {
			(mockTenantStorage.get as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
			const service = new PlatformService({ config: { isMultiTenant: true } });
			await expect(
				service.getLocalOriginContext("https://unknown.example.com/")
			).resolves.toBeUndefined();
			expect(mockTenantStorage.get).toHaveBeenCalledWith(
				"https://unknown.example.com",
				"publicOrigin"
			);
		});

		it("should resolve the target tenant from the organization query param even when the url origin matches the current context (single-node multi-tenant)", async () => {
			// Caller is tenant A (org-1) on the node origin; the callback URL targets tenant B
			// via ?organization=org-2. On a single multi-tenant node every callback shares the
			// node origin, so an origin-only match would wrongly return the caller's own
			// (org-1) context. The organization query param must take precedence and resolve
			// to tenant B's partition, otherwise same-node cross-tenant callbacks misroute.
			vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
				[HttpContextIdKeys.PublicOrigin]: "https://example.com",
				[ContextIdKeys.Tenant]: TENANT_A.id,
				[ContextIdKeys.Organization]: TENANT_A.organizationId
			});
			(mockTenantStorage.get as ReturnType<typeof vi.fn>).mockImplementation(
				async (id: string, index?: string) => {
					if (index === "organizationId" && id === "org-2") {
						return TENANT_B;
					}
					return undefined;
				}
			);
			const service = new PlatformService({ config: { isMultiTenant: true } });
			const result = await service.getLocalOriginContext(
				"https://example.com/rights-management?organization=org-2"
			);
			expect(result).toMatchObject({
				[ContextIdKeys.Tenant]: TENANT_B.id,
				[ContextIdKeys.Organization]: TENANT_B.organizationId
			});
			expect(mockTenantStorage.get).toHaveBeenCalledWith("org-2", "organizationId");
		});

		it("should return undefined when the organization query param does not resolve to a local tenant (cross-node)", async () => {
			vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
				[HttpContextIdKeys.PublicOrigin]: "https://example.com"
			});
			(mockTenantStorage.get as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
			const service = new PlatformService({ config: { isMultiTenant: true } });
			await expect(
				service.getLocalOriginContext(
					"https://example.com/rights-management?organization=remote-org"
				)
			).resolves.toBeUndefined();
			expect(mockTenantStorage.get).toHaveBeenCalledWith("remote-org", "organizationId");
		});

		it("should keep the inherited context publicOrigin when the tenant resolved by the organization query param has no stored publicOrigin", async () => {
			vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
				[HttpContextIdKeys.PublicOrigin]: "https://example.com",
				[ContextIdKeys.Tenant]: TENANT_A.id,
				[ContextIdKeys.Organization]: TENANT_A.organizationId
			});
			(mockTenantStorage.get as ReturnType<typeof vi.fn>).mockImplementation(
				async (id: string, index?: string) => {
					if (index === "organizationId" && id === TENANT_NO_ORIGIN.organizationId) {
						return TENANT_NO_ORIGIN;
					}
					return undefined;
				}
			);
			const service = new PlatformService({ config: { isMultiTenant: true } });
			const result = await service.getLocalOriginContext(
				`https://example.com/rights-management?organization=${TENANT_NO_ORIGIN.organizationId}`
			);
			expect(result).toEqual({
				[HttpContextIdKeys.PublicOrigin]: "https://example.com",
				[ContextIdKeys.Tenant]: TENANT_NO_ORIGIN.id,
				[ContextIdKeys.Organization]: TENANT_NO_ORIGIN.organizationId
			});
		});
	});

	describe("tenant event callbacks", () => {
		it("resolves without error when no callbacks are registered", async () => {
			const service = new PlatformService();
			await expect(
				service.fireTenantEvent("tenant-1", TenantEventType.Created)
			).resolves.toBeUndefined();
		});

		it("invokes a registered callback with the correct tenantId and eventType", async () => {
			const service = new PlatformService();
			const calls: { tenantId: string; eventType: TenantEventType }[] = [];
			service.registerTenantEventCallback("cb-1", async (tenantId, eventType) => {
				calls.push({ tenantId, eventType });
			});

			await service.fireTenantEvent("tenant-1", TenantEventType.Created);

			expect(calls).toEqual([{ tenantId: "tenant-1", eventType: TenantEventType.Created }]);
		});

		it("invokes all registered callbacks in registration order", async () => {
			const service = new PlatformService();
			const order: string[] = [];
			service.registerTenantEventCallback("cb-1", async () => {
				order.push("cb-1");
			});
			service.registerTenantEventCallback("cb-2", async () => {
				order.push("cb-2");
			});

			await service.fireTenantEvent("tenant-1", TenantEventType.Updated);

			expect(order).toEqual(["cb-1", "cb-2"]);
		});

		it("does not invoke an unregistered callback", async () => {
			const service = new PlatformService();
			const calls: string[] = [];
			service.registerTenantEventCallback("cb-1", async () => {
				calls.push("cb-1");
			});
			service.unregisterTenantEventCallback("cb-1");

			await service.fireTenantEvent("tenant-1", TenantEventType.Deleted);

			expect(calls).toHaveLength(0);
		});

		it("re-registering the same callbackId replaces the previous callback", async () => {
			const service = new PlatformService();
			const calls: string[] = [];
			service.registerTenantEventCallback("cb-1", async () => {
				calls.push("original");
			});
			service.registerTenantEventCallback("cb-1", async () => {
				calls.push("replacement");
			});

			await service.fireTenantEvent("tenant-1", TenantEventType.Updated);

			expect(calls).toEqual(["replacement"]);
		});

		it("logs an error and continues when a callback throws", async () => {
			const logCalls: { level: string; message: string }[] = [];
			const mockLogging: ILoggingComponent = {
				className: () => "MockLogging",
				log: vi.fn(async entry => {
					logCalls.push({ level: entry.level, message: entry.message });
				})
			} as unknown as ILoggingComponent;
			vi.spyOn(ComponentFactory, "getIfExists").mockReturnValue(mockLogging);

			const service = new PlatformService({ loggingComponentType: "test-logging" });
			const order: string[] = [];
			service.registerTenantEventCallback("cb-fail", async () => {
				throw new Error("boom");
			});
			service.registerTenantEventCallback("cb-ok", async () => {
				order.push("cb-ok");
			});

			await expect(
				service.fireTenantEvent("tenant-1", TenantEventType.Created)
			).resolves.toBeUndefined();

			expect(logCalls).toEqual([{ level: "error", message: "tenantEventCallbackFailed" }]);
			expect(order).toEqual(["cb-ok"]);
		});

		it("passes each event type correctly to the callback", async () => {
			const service = new PlatformService();
			const received: { tenantId: string; eventType: TenantEventType }[] = [];
			service.registerTenantEventCallback("cb-1", async (tenantId, eventType) => {
				received.push({ tenantId, eventType });
			});

			await service.fireTenantEvent("t", TenantEventType.Created);
			await service.fireTenantEvent("t", TenantEventType.Updated);
			await service.fireTenantEvent("t", TenantEventType.Deleted);

			expect(received.map(r => r.eventType)).toEqual([
				TenantEventType.Created,
				TenantEventType.Updated,
				TenantEventType.Deleted
			]);
		});
	});

	describe("execute", () => {
		it("should not mutate the caller's active request context", async () => {
			const service = new PlatformService({ config: { isMultiTenant: true } });
			const requestContextIds = {
				[ContextIdKeys.Tenant]: TENANT_A.id,
				[ContextIdKeys.User]: "user-1"
			};

			await ContextIdStore.run(requestContextIds, async () => {
				await service.execute(async () => {
					// Simulate per-tenant background work (e.g. spread logging to all partitions).
				});

				const afterContextIds = await ContextIdStore.getContextIds();
				expect(afterContextIds?.[ContextIdKeys.Tenant]).toBe(TENANT_A.id);
				expect(afterContextIds?.[ContextIdKeys.User]).toBe("user-1");
			});
		});

		it("should preserve tenant for subsequent operations in the same request", async () => {
			const service = new PlatformService({ config: { isMultiTenant: true } });
			let partitionTenantAfterRun: string | undefined;

			await ContextIdStore.run({ [ContextIdKeys.Tenant]: TENANT_A.id }, async () => {
				expect((await ContextIdStore.getContextIds())?.[ContextIdKeys.Tenant]).toBe(TENANT_A.id);

				// Simulate a deferred per-tenant flush invoked mid-request (e.g. batched logging).
				await service.execute(async () => {});

				partitionTenantAfterRun = (await ContextIdStore.getContextIds())?.[ContextIdKeys.Tenant];
			});

			expect(partitionTenantAfterRun).toBe(TENANT_A.id);
		});

		it("should run the method under each tenant's context in turn", async () => {
			const service = new PlatformService({ config: { isMultiTenant: true } });
			const seenTenants: (string | undefined)[] = [];

			await ContextIdStore.run({ [ContextIdKeys.Tenant]: TENANT_A.id }, async () => {
				await service.execute(async () => {
					seenTenants.push((await ContextIdStore.getContextIds())?.[ContextIdKeys.Tenant]);
				});
			});

			expect(seenTenants).toEqual([TENANT_A.id, TENANT_B.id, TENANT_C.id]);
		});

		it("should stop iterating tenants when the method returns false", async () => {
			const service = new PlatformService({ config: { isMultiTenant: true } });
			const seenTenants: (string | undefined)[] = [];

			await service.execute(async () => {
				const tenantId = (await ContextIdStore.getContextIds())?.[ContextIdKeys.Tenant];
				seenTenants.push(tenantId);
				return tenantId !== TENANT_B.id;
			});

			expect(seenTenants).toEqual([TENANT_A.id, TENANT_B.id]);
		});

		it("should continue iterating tenants when the method returns nothing", async () => {
			const service = new PlatformService({ config: { isMultiTenant: true } });
			const seenTenants: (string | undefined)[] = [];

			await service.execute(async () => {
				seenTenants.push((await ContextIdStore.getContextIds())?.[ContextIdKeys.Tenant]);
			});

			expect(seenTenants).toEqual([TENANT_A.id, TENANT_B.id, TENANT_C.id]);
		});
	});
});
