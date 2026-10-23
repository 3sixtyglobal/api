// Copyright 2026 IOTA Stiftung.
// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import {
	HealthCategory,
	HealthStatus,
	type IPlatformComponent,
	type ITenant
} from "@3sixty/api-models";
import { ContextIdKeys, ContextIdStore, type IContextIds } from "@3sixty/context";
import {
	AlreadyExistsError,
	ComponentFactory,
	Converter,
	LfuCache,
	NotFoundError
} from "@3sixty/core";
import { Blake2b } from "@3sixty/crypto";
import { ComparisonOperator } from "@3sixty/entity";
import {
	EntityStorageConnectorFactory,
	type IEntityStorageConnector
} from "@3sixty/entity-storage-models";
import type { Tenant } from "../../src/entities/tenant.js";
import { TenantAdminService } from "../../src/tenantAdminService.js";

const TENANT_ID = "01234567890123456789012345678901";
const OTHER_TENANT_ID = "99999999999999999999999999999999";
const API_KEY = "abcdef1234567890abcdef1234567890";
const NEW_API_KEY = "0123456789abcdef0123456789abcdef";
const ORG_ID = "org-original";
const OTHER_ORG_ID = "org-other";
const LEGACY_ORG_ID = "org-legacy";
const PUBLIC_ORIGIN = "https://node.example.org";
const OTHER_PUBLIC_ORIGIN = "https://other.example.org";

const EXISTING_TENANT: Tenant = {
	id: TENANT_ID,
	apiKey: API_KEY,
	label: "Original",
	publicOrigin: "https://node.example.org",
	organizationId: ORG_ID,
	dateCreated: "2026-01-01T00:00:00.000Z",
	dateModified: "2026-01-01T00:00:00.000Z"
};

describe("TenantAdminService", () => {
	let mockStorage: IEntityStorageConnector<Tenant>;
	let mockPlatformComponent: IPlatformComponent;

	beforeEach(() => {
		vi.restoreAllMocks();

		mockStorage = {
			getSchema: vi.fn(),
			set: vi.fn(),
			get: vi.fn().mockResolvedValue(undefined),
			remove: vi.fn(),
			query: vi.fn().mockResolvedValue({ entities: [] })
		} as unknown as IEntityStorageConnector<Tenant>;

		mockPlatformComponent = {
			className: vi.fn().mockReturnValue("PlatformService"),
			isMultiTenant: vi.fn().mockReturnValue(false),
			execute: vi.fn().mockResolvedValue(undefined),
			getLocalOriginContext: vi.fn().mockResolvedValue(undefined),
			registerTenantEventCallback: vi.fn(),
			unregisterTenantEventCallback: vi.fn(),
			fireTenantEvent: vi.fn().mockResolvedValue(undefined)
		};

		vi.spyOn(EntityStorageConnectorFactory, "get").mockReturnValue(mockStorage);
		vi.spyOn(ComponentFactory, "get").mockReturnValue(mockPlatformComponent);
	});

	describe("create", () => {
		it("should throw AlreadyExistsError when a tenant with the same id already exists", async () => {
			vi.mocked(mockStorage.get).mockImplementation(
				async (id: string, index?: string): Promise<Tenant | undefined> => {
					if (!index && id === TENANT_ID) {
						return EXISTING_TENANT;
					}
					return undefined;
				}
			);

			const service = new TenantAdminService();

			await expect(
				service.create({
					id: TENANT_ID,
					apiKey: API_KEY,
					label: "Someone Else",
					organizationId: OTHER_ORG_ID
				})
			).rejects.toThrow(AlreadyExistsError);
		});

		it("should throw AlreadyExistsError when publicOrigin is already in use by another tenant", async () => {
			vi.mocked(mockStorage.get).mockImplementation(
				async (id: string, index?: string): Promise<Tenant | undefined> => {
					if (index === "publicOrigin" && id === PUBLIC_ORIGIN) {
						return EXISTING_TENANT;
					}
					return undefined;
				}
			);

			const service = new TenantAdminService();

			await expect(
				service.create({
					apiKey: API_KEY,
					label: "New Tenant",
					organizationId: OTHER_ORG_ID,
					publicOrigin: PUBLIC_ORIGIN
				})
			).rejects.toThrow(AlreadyExistsError);
		});

		it("should throw AlreadyExistsError when organizationId is already in use by another tenant", async () => {
			vi.mocked(mockStorage.get).mockImplementation(
				async (id: string, index?: string): Promise<Tenant | undefined> => {
					if (index === "organizationId" && id === ORG_ID) {
						return EXISTING_TENANT;
					}
					return undefined;
				}
			);

			const service = new TenantAdminService();

			await expect(
				service.create({ apiKey: API_KEY, label: "New Tenant", organizationId: ORG_ID })
			).rejects.toThrow(AlreadyExistsError);
		});

		it("should succeed and return the generated id when no tenant with that id exists", async () => {
			vi.mocked(mockStorage.get).mockResolvedValue(undefined);

			const service = new TenantAdminService();
			const result = await service.create({
				apiKey: API_KEY,
				label: "New Tenant",
				organizationId: ORG_ID
			});

			expect(result).toBeDefined();
			expect(typeof result).toBe("string");
			expect(mockStorage.set).toHaveBeenCalledOnce();
		});

		it("should use the caller-supplied id when one is provided", async () => {
			vi.mocked(mockStorage.get).mockResolvedValue(undefined);

			const service = new TenantAdminService();
			const result = await service.create({
				id: TENANT_ID,
				apiKey: API_KEY,
				label: "Named Tenant",
				organizationId: ORG_ID
			});

			expect(result).toBe(TENANT_ID);
		});

		it("should fire a created event with the new tenant id after storing", async () => {
			vi.mocked(mockStorage.get).mockResolvedValue(undefined);

			const service = new TenantAdminService();
			const result = await service.create({
				id: TENANT_ID,
				apiKey: API_KEY,
				label: "Named Tenant",
				organizationId: ORG_ID
			});

			expect(mockPlatformComponent.fireTenantEvent).toHaveBeenCalledOnce();
			expect(mockPlatformComponent.fireTenantEvent).toHaveBeenCalledWith(result, "created");
		});

		it("should not fire a created event when the operation fails", async () => {
			vi.mocked(mockStorage.get).mockImplementation(
				async (id: string, index?: string): Promise<Tenant | undefined> => {
					if (index === "organizationId" && id === ORG_ID) {
						return EXISTING_TENANT;
					}
					return undefined;
				}
			);

			const service = new TenantAdminService();

			await expect(
				service.create({ apiKey: API_KEY, label: "Duplicate", organizationId: ORG_ID })
			).rejects.toThrow(AlreadyExistsError);

			expect(mockPlatformComponent.fireTenantEvent).not.toHaveBeenCalled();
		});
	});

	describe("update", () => {
		it("should throw AlreadyExistsError when publicOrigin is already used by another tenant", async () => {
			vi.mocked(mockStorage.get).mockImplementation(
				async (id: string, index?: string): Promise<Tenant | undefined> => {
					if (!index && id === TENANT_ID) {
						return EXISTING_TENANT;
					}
					if (index === "publicOrigin" && id === OTHER_PUBLIC_ORIGIN) {
						return { ...EXISTING_TENANT, id: OTHER_TENANT_ID, publicOrigin: OTHER_PUBLIC_ORIGIN };
					}
					return undefined;
				}
			);

			const service = new TenantAdminService();

			await expect(
				service.update({ id: TENANT_ID, organizationId: ORG_ID, publicOrigin: OTHER_PUBLIC_ORIGIN })
			).rejects.toThrow(AlreadyExistsError);
		});

		it("should not throw when publicOrigin is unchanged on the same tenant", async () => {
			vi.mocked(mockStorage.get).mockImplementation(
				async (id: string, index?: string): Promise<Tenant | undefined> => {
					if (!index && id === TENANT_ID) {
						return EXISTING_TENANT;
					}
					if (index === "publicOrigin" && id === PUBLIC_ORIGIN) {
						return EXISTING_TENANT;
					}
					return undefined;
				}
			);

			const service = new TenantAdminService();

			await expect(
				service.update({ id: TENANT_ID, organizationId: ORG_ID, publicOrigin: PUBLIC_ORIGIN })
			).resolves.toBeUndefined();
		});

		it("should throw AlreadyExistsError when organizationId is already used by another tenant", async () => {
			vi.mocked(mockStorage.get).mockImplementation(
				async (id: string, index?: string): Promise<Tenant | undefined> => {
					if (!index && id === TENANT_ID) {
						return EXISTING_TENANT;
					}
					if (index === "organizationId" && id === OTHER_ORG_ID) {
						return { ...EXISTING_TENANT, id: OTHER_TENANT_ID, organizationId: OTHER_ORG_ID };
					}
					return undefined;
				}
			);

			const service = new TenantAdminService();

			await expect(service.update({ id: TENANT_ID, organizationId: OTHER_ORG_ID })).rejects.toThrow(
				AlreadyExistsError
			);
		});

		it("should not throw when organizationId is unchanged on the same tenant", async () => {
			vi.mocked(mockStorage.get).mockImplementation(
				async (id: string, index?: string): Promise<Tenant | undefined> => {
					if (!index && id === TENANT_ID) {
						return EXISTING_TENANT;
					}
					if (index === "organizationId" && id === ORG_ID) {
						return EXISTING_TENANT;
					}
					return undefined;
				}
			);

			const service = new TenantAdminService();

			await expect(
				service.update({ id: TENANT_ID, organizationId: ORG_ID, label: "Updated" })
			).resolves.toBeUndefined();
		});

		it("should move old organizationId into legacy when organizationId changes", async () => {
			vi.mocked(mockStorage.get).mockImplementation(
				async (id: string, index?: string): Promise<Tenant | undefined> => {
					if (!index && id === TENANT_ID) {
						return EXISTING_TENANT;
					}
					return undefined;
				}
			);

			const service = new TenantAdminService();
			await service.update({ id: TENANT_ID, organizationId: OTHER_ORG_ID });

			expect(mockStorage.set).toHaveBeenCalledWith(
				expect.objectContaining({
					organizationId: OTHER_ORG_ID,
					organizationIdLegacy: [ORG_ID]
				})
			);
		});

		it("should remove new organizationId from legacy if it was previously in the legacy array", async () => {
			const tenantWithLegacy: Tenant = {
				...EXISTING_TENANT,
				organizationIdLegacy: [LEGACY_ORG_ID]
			};

			vi.mocked(mockStorage.get).mockImplementation(
				async (id: string, index?: string): Promise<Tenant | undefined> => {
					if (!index && id === TENANT_ID) {
						return tenantWithLegacy;
					}
					return undefined;
				}
			);

			const service = new TenantAdminService();
			await service.update({ id: TENANT_ID, organizationId: LEGACY_ORG_ID });

			expect(mockStorage.set).toHaveBeenCalledWith(
				expect.objectContaining({
					organizationId: LEGACY_ORG_ID,
					organizationIdLegacy: [ORG_ID]
				})
			);
		});

		it("should produce no legacy entry when moving to a new id with no prior legacy", async () => {
			const tenantNoLegacy: Tenant = { ...EXISTING_TENANT, organizationIdLegacy: undefined };

			vi.mocked(mockStorage.get).mockImplementation(
				async (id: string, index?: string): Promise<Tenant | undefined> => {
					if (!index && id === TENANT_ID) {
						return tenantNoLegacy;
					}
					return undefined;
				}
			);

			const service = new TenantAdminService();
			await service.update({ id: TENANT_ID, organizationId: OTHER_ORG_ID });

			expect(mockStorage.set).toHaveBeenCalledWith(
				expect.objectContaining({
					organizationId: OTHER_ORG_ID,
					organizationIdLegacy: [ORG_ID]
				})
			);
		});

		it("should fire an updated event with the tenant id after storing", async () => {
			vi.mocked(mockStorage.get).mockImplementation(
				async (id: string, index?: string): Promise<Tenant | undefined> => {
					if (!index && id === TENANT_ID) {
						return EXISTING_TENANT;
					}
					return undefined;
				}
			);

			const service = new TenantAdminService();
			await service.update({ id: TENANT_ID, organizationId: ORG_ID, label: "Updated" });

			expect(mockPlatformComponent.fireTenantEvent).toHaveBeenCalledOnce();
			expect(mockPlatformComponent.fireTenantEvent).toHaveBeenCalledWith(TENANT_ID, "updated");
		});

		it("should not fire an updated event when the operation fails", async () => {
			vi.mocked(mockStorage.get).mockResolvedValue(undefined);

			const service = new TenantAdminService();

			await expect(service.update({ id: TENANT_ID, organizationId: ORG_ID })).rejects.toThrow(
				NotFoundError
			);

			expect(mockPlatformComponent.fireTenantEvent).not.toHaveBeenCalled();
		});
	});

	describe("remove", () => {
		it("should fire a deleted event with the tenant id after removing", async () => {
			const service = new TenantAdminService();
			await service.remove(TENANT_ID);

			expect(mockPlatformComponent.fireTenantEvent).toHaveBeenCalledOnce();
			expect(mockPlatformComponent.fireTenantEvent).toHaveBeenCalledWith(TENANT_ID, "deleted");
		});
	});

	describe("lookup error handling", () => {
		it("should throw NotFoundError from get when no tenant exists", async () => {
			vi.mocked(mockStorage.get).mockResolvedValue(undefined);

			const service = new TenantAdminService();

			await expect(service.get(TENANT_ID)).rejects.toThrow(NotFoundError);
		});

		it("should rethrow non-NotFound errors from get", async () => {
			const connectorError = new Error("connector unavailable");
			vi.mocked(mockStorage.get).mockRejectedValue(connectorError);

			const service = new TenantAdminService();

			await expect(service.get(TENANT_ID)).rejects.toThrow(connectorError);
		});

		it("should throw NotFoundError from getByApiKey when no tenant exists", async () => {
			vi.mocked(mockStorage.get).mockResolvedValue(undefined);

			const service = new TenantAdminService();

			await expect(service.getByApiKey(API_KEY)).rejects.toThrow(NotFoundError);
		});

		it("should rethrow non-NotFound errors from getByApiKey", async () => {
			const connectorError = new Error("connector unavailable");
			vi.mocked(mockStorage.get).mockRejectedValue(connectorError);

			const service = new TenantAdminService();

			await expect(service.getByApiKey(API_KEY)).rejects.toThrow(connectorError);
		});

		it("should throw NotFoundError from getByPublicOrigin when no tenant exists", async () => {
			vi.mocked(mockStorage.get).mockResolvedValue(undefined);

			const service = new TenantAdminService();

			await expect(service.getByPublicOrigin(PUBLIC_ORIGIN)).rejects.toThrow(NotFoundError);
		});

		it("should rethrow non-NotFound errors from getByPublicOrigin", async () => {
			const connectorError = new Error("connector unavailable");
			vi.mocked(mockStorage.get).mockRejectedValue(connectorError);

			const service = new TenantAdminService();

			await expect(service.getByPublicOrigin(PUBLIC_ORIGIN)).rejects.toThrow(connectorError);
		});
	});

	describe("getTenantByOrganizationId", () => {
		it("should return the tenant when found by primary organizationId", async () => {
			vi.mocked(mockStorage.get).mockImplementation(
				async (id: string, index?: string): Promise<Tenant | undefined> => {
					if (index === "organizationId" && id === ORG_ID) {
						return EXISTING_TENANT;
					}
					return undefined;
				}
			);

			const service = new TenantAdminService();
			const result = await service.getTenantByOrganizationId(ORG_ID);

			expect(result.id).toBe(TENANT_ID);
			expect(result.organizationId).toBe(ORG_ID);
		});

		it("should return the tenant when found in legacy with includeLegacy=true", async () => {
			const tenantWithLegacy: Tenant = {
				...EXISTING_TENANT,
				organizationId: OTHER_ORG_ID,
				organizationIdLegacy: [ORG_ID]
			};

			vi.mocked(mockStorage.get).mockResolvedValue(undefined);
			vi.mocked(mockStorage.query).mockResolvedValue({ entities: [tenantWithLegacy] });

			const service = new TenantAdminService();
			const result = await service.getTenantByOrganizationId(ORG_ID, true);

			expect(result.id).toBe(TENANT_ID);
		});

		it("should not search legacy when includeLegacy is not set", async () => {
			vi.mocked(mockStorage.get).mockResolvedValue(undefined);

			const service = new TenantAdminService();

			await expect(service.getTenantByOrganizationId(ORG_ID)).rejects.toThrow(NotFoundError);
			expect(mockStorage.query).not.toHaveBeenCalled();
		});

		it("should throw NotFoundError when not found even with includeLegacy=true", async () => {
			vi.mocked(mockStorage.get).mockResolvedValue(undefined);
			vi.mocked(mockStorage.query).mockResolvedValue({ entities: [] });

			const service = new TenantAdminService();

			await expect(service.getTenantByOrganizationId(ORG_ID, true)).rejects.toThrow(NotFoundError);
		});

		it("should rethrow non-NotFound errors from primary organization lookup", async () => {
			const connectorError = new Error("connector unavailable");
			vi.mocked(mockStorage.get).mockRejectedValue(connectorError);

			const service = new TenantAdminService();

			await expect(service.getTenantByOrganizationId(ORG_ID, true)).rejects.toThrow(connectorError);
			expect(mockStorage.query).not.toHaveBeenCalled();
		});
	});

	describe("query", () => {
		it("should return organizationIdLegacy as a string array rather than a pipe-delimited string", async () => {
			const tenantWithLegacy: Tenant = {
				...EXISTING_TENANT,
				organizationIdLegacy: [LEGACY_ORG_ID]
			};
			vi.mocked(mockStorage.query).mockResolvedValue({ entities: [tenantWithLegacy] });

			const service = new TenantAdminService();
			const result = await service.query();

			expect(result.tenants[0].organizationIdLegacy).toEqual([LEGACY_ORG_ID]);
		});

		it("should return organizationIdLegacy as undefined when the entity has no legacy ids", async () => {
			vi.mocked(mockStorage.query).mockResolvedValue({ entities: [EXISTING_TENANT] });

			const service = new TenantAdminService();
			const result = await service.query();

			expect(result.tenants[0].organizationIdLegacy).toBeUndefined();
		});

		it("should return multiple legacy ids as separate array elements", async () => {
			const tenantWithMultipleLegacy: Tenant = {
				...EXISTING_TENANT,
				organizationIdLegacy: [LEGACY_ORG_ID, OTHER_ORG_ID]
			};
			vi.mocked(mockStorage.query).mockResolvedValue({ entities: [tenantWithMultipleLegacy] });

			const service = new TenantAdminService();
			const result = await service.query();

			expect(result.tenants[0].organizationIdLegacy).toEqual([LEGACY_ORG_ID, OTHER_ORG_ID]);
		});

		it("should pass through the cursor returned by the storage connector", async () => {
			vi.mocked(mockStorage.query).mockResolvedValue({ entities: [], cursor: "nextPage" });

			const service = new TenantAdminService();
			const result = await service.query();

			expect(result.cursor).toBe("nextPage");
		});

		it("should return undefined cursor when no further pages exist", async () => {
			vi.mocked(mockStorage.query).mockResolvedValue({ entities: [] });

			const service = new TenantAdminService();
			const result = await service.query();

			expect(result.cursor).toBeUndefined();
		});

		it("should forward conditions, properties, cursor, and limit to the storage connector", async () => {
			vi.mocked(mockStorage.query).mockResolvedValue({ entities: [] });

			const service = new TenantAdminService();
			await service.query(
				{ property: "organizationId", comparison: ComparisonOperator.Equals, value: ORG_ID },
				["id", "organizationId"],
				"cursor1",
				10
			);

			expect(mockStorage.query).toHaveBeenCalledWith(
				{ property: "organizationId", comparison: ComparisonOperator.Equals, value: ORG_ID },
				undefined,
				["id", "organizationId"],
				"cursor1",
				10
			);
		});

		it("should apply entityToModel to every entity in the result", async () => {
			const tenant1: Tenant = {
				...EXISTING_TENANT,
				id: TENANT_ID,
				organizationIdLegacy: [LEGACY_ORG_ID]
			};
			const tenant2: Tenant = {
				...EXISTING_TENANT,
				id: OTHER_TENANT_ID,
				organizationId: OTHER_ORG_ID,
				organizationIdLegacy: undefined
			};
			vi.mocked(mockStorage.query).mockResolvedValue({ entities: [tenant1, tenant2] });

			const service = new TenantAdminService();
			const result = await service.query();

			expect(result.tenants).toHaveLength(2);
			expect(result.tenants[0].organizationIdLegacy).toEqual([LEGACY_ORG_ID]);
			expect(result.tenants[1].organizationIdLegacy).toBeUndefined();
		});
	});

	describe("tenant cache", () => {
		afterEach(() => {
			vi.useRealTimers();
		});

		it("serves repeated id lookups from the cache", async () => {
			vi.mocked(mockStorage.get).mockResolvedValue(EXISTING_TENANT);

			const service = new TenantAdminService();

			await service.get(TENANT_ID);
			await service.get(TENANT_ID);
			await service.get(TENANT_ID);

			expect(mockStorage.get).toHaveBeenCalledTimes(1);

			await service.stop();
		});

		it("keys the api key lookup by a hash of the api key, never the api key itself", async () => {
			vi.mocked(mockStorage.get).mockResolvedValue(EXISTING_TENANT);
			const getOrSet = vi.spyOn(LfuCache.prototype, "getOrSet");

			const service = new TenantAdminService();

			await service.getByApiKey(API_KEY);

			const cacheKey = getOrSet.mock.calls[0][0];
			expect(cacheKey).not.toContain(API_KEY);
			expect(cacheKey).toBe(
				`apiKey:${Converter.bytesToHex(Blake2b.sum256(Converter.utf8ToBytes(API_KEY)))}`
			);

			await service.stop();
		});

		it("serves repeated api key lookups from the cache", async () => {
			vi.mocked(mockStorage.get).mockResolvedValue(EXISTING_TENANT);

			const service = new TenantAdminService();

			await service.getByApiKey(API_KEY);
			await service.getByApiKey(API_KEY);

			expect(mockStorage.get).toHaveBeenCalledTimes(1);
			expect(mockStorage.get).toHaveBeenCalledWith(API_KEY, "apiKey");

			await service.stop();
		});

		it("serves repeated public origin lookups from the cache", async () => {
			vi.mocked(mockStorage.get).mockResolvedValue(EXISTING_TENANT);

			const service = new TenantAdminService();

			await service.getByPublicOrigin(PUBLIC_ORIGIN);
			await service.getByPublicOrigin(PUBLIC_ORIGIN);

			expect(mockStorage.get).toHaveBeenCalledTimes(1);

			await service.stop();
		});

		it("serves repeated legacy organization id lookups without re-running the query", async () => {
			vi.mocked(mockStorage.get).mockResolvedValue(undefined);
			vi.mocked(mockStorage.query).mockResolvedValue({
				entities: [{ ...EXISTING_TENANT, organizationIdLegacy: [LEGACY_ORG_ID] }]
			});

			const service = new TenantAdminService();

			await service.getTenantByOrganizationId(LEGACY_ORG_ID, true);
			await service.getTenantByOrganizationId(LEGACY_ORG_ID, true);

			expect(mockStorage.get).toHaveBeenCalledTimes(1);
			expect(mockStorage.query).toHaveBeenCalledTimes(1);

			await service.stop();
		});

		it("does not reuse a legacy organization id entry for a non-legacy lookup", async () => {
			vi.mocked(mockStorage.get).mockResolvedValue(undefined);
			vi.mocked(mockStorage.query).mockResolvedValue({
				entities: [{ ...EXISTING_TENANT, organizationIdLegacy: [LEGACY_ORG_ID] }]
			});

			const service = new TenantAdminService();

			await service.getTenantByOrganizationId(LEGACY_ORG_ID, true);

			await expect(service.getTenantByOrganizationId(LEGACY_ORG_ID, false)).rejects.toThrow(
				NotFoundError
			);

			await service.stop();
		});

		it("does not cache a failed lookup", async () => {
			vi.mocked(mockStorage.get).mockResolvedValue(undefined);

			const service = new TenantAdminService();

			await expect(service.get(TENANT_ID)).rejects.toThrow(NotFoundError);
			await expect(service.get(TENANT_ID)).rejects.toThrow(NotFoundError);

			expect(mockStorage.get).toHaveBeenCalledTimes(2);

			await service.stop();
		});

		it("resolves concurrent lookups for the same id with a single storage read", async () => {
			vi.mocked(mockStorage.get).mockResolvedValue(EXISTING_TENANT);

			const service = new TenantAdminService();

			await Promise.all([0, 1, 2, 3].map(async () => service.get(TENANT_ID)));

			expect(mockStorage.get).toHaveBeenCalledTimes(1);

			await service.stop();
		});

		it("invalidates an organization id a new tenant takes over from another tenant's legacy list", async () => {
			const NEW_TENANT_ID = "11111111111111111111111111111111";
			const SHARED_ORG_ID = "org-shared";
			const legacyHolder: Tenant = {
				...EXISTING_TENANT,
				organizationIdLegacy: [SHARED_ORG_ID]
			};
			let created: Tenant | undefined;

			vi.mocked(mockStorage.get).mockImplementation(
				async (id: string, index?: string): Promise<Tenant | undefined> => {
					if (index === "organizationId" && id === SHARED_ORG_ID) {
						return created;
					}
					return undefined;
				}
			);
			vi.mocked(mockStorage.query).mockResolvedValue({ entities: [legacyHolder] });
			vi.mocked(mockStorage.set).mockImplementation(async (entity: Tenant): Promise<void> => {
				created = entity;
			});

			const service = new TenantAdminService();

			// The shared id resolves to the legacy holder and is cached against it.
			expect((await service.getTenantByOrganizationId(SHARED_ORG_ID, true)).id).toBe(TENANT_ID);

			await service.create({
				id: NEW_TENANT_ID,
				apiKey: NEW_API_KEY,
				organizationId: SHARED_ORG_ID,
				label: "New owner"
			});

			// The new tenant owns it outright now, so the cached legacy answer must be gone.
			expect((await service.getTenantByOrganizationId(SHARED_ORG_ID, true)).id).toBe(NEW_TENANT_ID);

			await service.stop();
		});

		it("invalidates the cached tenant when it is updated", async () => {
			let stored: Tenant = EXISTING_TENANT;
			vi.mocked(mockStorage.get).mockImplementation(
				async (id: string, index?: string): Promise<Tenant | undefined> => {
					if (!index && id === TENANT_ID) {
						return stored;
					}
					return undefined;
				}
			);
			vi.mocked(mockStorage.set).mockImplementation(async (entity: Tenant): Promise<void> => {
				stored = entity;
			});

			const service = new TenantAdminService();

			expect((await service.get(TENANT_ID)).label).toBe("Original");

			await service.update({ id: TENANT_ID, organizationId: ORG_ID, label: "Changed" });

			expect((await service.get(TENANT_ID)).label).toBe("Changed");

			await service.stop();
		});

		it("invalidates the previous api key entry when the api key is changed", async () => {
			let stored: Tenant = EXISTING_TENANT;
			vi.mocked(mockStorage.get).mockImplementation(
				async (id: string, index?: string): Promise<Tenant | undefined> => {
					if (!index && id === TENANT_ID) {
						return stored;
					}
					if (index === "apiKey" && id === stored.apiKey) {
						return stored;
					}
					return undefined;
				}
			);
			vi.mocked(mockStorage.set).mockImplementation(async (entity: Tenant): Promise<void> => {
				stored = entity;
			});

			const service = new TenantAdminService();

			expect((await service.getByApiKey(API_KEY)).id).toBe(TENANT_ID);

			await service.update({ id: TENANT_ID, organizationId: ORG_ID, apiKey: NEW_API_KEY });

			await expect(service.getByApiKey(API_KEY)).rejects.toThrow(NotFoundError);
			expect((await service.getByApiKey(NEW_API_KEY)).id).toBe(TENANT_ID);

			await service.stop();
		});

		it("hands every caller its own copy so one cannot alter what another sees", async () => {
			vi.mocked(mockStorage.get).mockResolvedValue({
				...EXISTING_TENANT,
				publicOrigin: undefined,
				organizationIdLegacy: [LEGACY_ORG_ID]
			});

			const service = new TenantAdminService();

			const first = await service.get(TENANT_ID);
			first.publicOrigin = "https://leaked.example.org";
			first.organizationIdLegacy?.push("org-leaked");

			const second = await service.get(TENANT_ID);

			expect(second.publicOrigin).toBeUndefined();
			expect(second.organizationIdLegacy).toEqual([LEGACY_ORG_ID]);

			await service.stop();
		});

		it("expires a cached tenant a fixed time after it was read, however busy the node", async () => {
			// Only the clock is faked; the cache and its mutex rely on real timers.
			vi.useFakeTimers({ toFake: ["Date"] });
			const start = Date.now();
			vi.mocked(mockStorage.get).mockResolvedValue(EXISTING_TENANT);

			const service = new TenantAdminService({ config: { tenantCacheTtlMs: 60000 } });

			await service.get(TENANT_ID);

			// Steady traffic inside the lifetime keeps hitting the same entry.
			vi.setSystemTime(start + 30000);
			await service.get(TENANT_ID);
			expect(mockStorage.get).toHaveBeenCalledTimes(1);

			// Those hits must not extend it; an edit made on another node is picked up once the
			// lifetime is up.
			vi.setSystemTime(start + 70000);
			await service.get(TENANT_ID);
			expect(mockStorage.get).toHaveBeenCalledTimes(2);

			await service.stop();
		});

		it("drops the cached tenant only once the storage delete has completed", async () => {
			let stored: Tenant | undefined = EXISTING_TENANT;
			let lookupDuringRemove: Promise<ITenant> | undefined;

			vi.mocked(mockStorage.get).mockImplementation(
				async (id: string, index?: string): Promise<Tenant | undefined> => {
					if (!index && id === TENANT_ID) {
						return stored;
					}
					return undefined;
				}
			);

			const service = new TenantAdminService();

			vi.mocked(mockStorage.remove).mockImplementation(async (): Promise<void> => {
				// A lookup racing the delete re-caches the tenant while the delete is in flight.
				lookupDuringRemove = service.get(TENANT_ID);
				await lookupDuringRemove;
				stored = undefined;
			});

			await service.remove(TENANT_ID);
			await lookupDuringRemove;

			// The invalidation runs after the delete, so the racing lookup's entry is gone too.
			await expect(service.get(TENANT_ID)).rejects.toThrow(NotFoundError);

			await service.stop();
		});

		it("invalidates the cached tenant when it is removed", async () => {
			let stored: Tenant | undefined = EXISTING_TENANT;
			vi.mocked(mockStorage.get).mockImplementation(
				async (id: string, index?: string): Promise<Tenant | undefined> => {
					if (!index && id === TENANT_ID) {
						return stored;
					}
					return undefined;
				}
			);
			vi.mocked(mockStorage.remove).mockImplementation(async (): Promise<void> => {
				stored = undefined;
			});

			const service = new TenantAdminService();

			expect((await service.get(TENANT_ID)).id).toBe(TENANT_ID);

			await service.remove(TENANT_ID);

			await expect(service.get(TENANT_ID)).rejects.toThrow(NotFoundError);

			await service.stop();
		});

		it("drops the id entry even when the tenant can no longer be read back", async () => {
			let stored: Tenant | undefined = EXISTING_TENANT;
			vi.mocked(mockStorage.get).mockImplementation(
				async (id: string, index?: string): Promise<Tenant | undefined> => {
					if (!index && id === TENANT_ID) {
						return stored;
					}
					return undefined;
				}
			);

			const service = new TenantAdminService();

			expect((await service.get(TENANT_ID)).id).toBe(TENANT_ID);

			// The tenant goes out from under the service, so remove cannot read its other keys.
			stored = undefined;

			await service.remove(TENANT_ID);

			await expect(service.get(TENANT_ID)).rejects.toThrow(NotFoundError);

			await service.stop();
		});

		it("does not read storage during remove when caching is disabled", async () => {
			const service = new TenantAdminService({ config: { tenantCacheTtlMs: 0 } });

			await service.remove(TENANT_ID);

			expect(mockStorage.get).not.toHaveBeenCalled();
			expect(mockStorage.remove).toHaveBeenCalledWith(TENANT_ID);

			await service.stop();
		});

		it("reads storage on every lookup when caching is disabled", async () => {
			vi.mocked(mockStorage.get).mockResolvedValue(EXISTING_TENANT);

			const service = new TenantAdminService({ config: { tenantCacheTtlMs: 0 } });

			await service.get(TENANT_ID);
			await service.get(TENANT_ID);
			await service.get(TENANT_ID);

			expect(mockStorage.get).toHaveBeenCalledTimes(3);

			await service.stop();
		});

		it("evicts the least used entry when the capacity is reached", async () => {
			vi.mocked(mockStorage.get).mockImplementation(
				async (id: string): Promise<Tenant | undefined> => ({ ...EXISTING_TENANT, id })
			);

			const service = new TenantAdminService({ config: { tenantCacheCapacity: 1 } });

			await service.get(TENANT_ID);
			await service.get(OTHER_TENANT_ID);
			await service.get(TENANT_ID);

			expect(mockStorage.get).toHaveBeenCalledTimes(3);

			await service.stop();
		});
	});

	describe("health lifecycle", () => {
		const HEALTH_ORG_ID = "org-health-check";
		let createdTenant: Tenant | undefined;

		beforeEach(() => {
			createdTenant = undefined;

			vi.mocked(mockStorage.set).mockImplementation(async entity => {
				createdTenant = entity as Tenant;
			});

			vi.mocked(mockStorage.get).mockImplementation(async (id: string, index?: string) => {
				if (!index && id === createdTenant?.id) {
					return createdTenant;
				}
				return undefined;
			});

			vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue(undefined);
		});

		it("healthApplicationInit creates a tenant using the organization ID from contextIds", async () => {
			const service = new TenantAdminService();
			const contextIds: IContextIds = { [ContextIdKeys.Organization]: HEALTH_ORG_ID };

			await service.healthApplicationInit(contextIds);

			expect(mockStorage.set).toHaveBeenCalledOnce();
			expect(mockStorage.set).toHaveBeenCalledWith(
				expect.objectContaining({ organizationId: HEALTH_ORG_ID })
			);
			expect(contextIds[ContextIdKeys.Tenant]).toBeDefined();
			expect(typeof contextIds[ContextIdKeys.Tenant]).toBe("string");
		});

		it("healthApplicationInit skips provisioning when organization ID is absent from context", async () => {
			const service = new TenantAdminService();
			const contextIds: IContextIds = {};

			await service.healthApplicationInit(contextIds);

			expect(mockStorage.set).not.toHaveBeenCalled();
			expect(contextIds[ContextIdKeys.Tenant]).toBeUndefined();
		});

		it("healthApplication returns Ok when the provisioned tenant is retrieved", async () => {
			const service = new TenantAdminService();
			const contextIds: IContextIds = { [ContextIdKeys.Organization]: HEALTH_ORG_ID };

			await service.healthApplicationInit(contextIds);
			vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue(contextIds);
			const result = await service.healthApplication(vi.fn());

			expect(result).toHaveLength(1);
			expect(result?.[0].status).toBe(HealthStatus.Ok);
			expect(result?.[0].category).toBe(HealthCategory.Application);
			expect(result?.[0].source).toBe(TenantAdminService.CLASS_NAME);
		});

		it("healthApplication returns Error when the provisioned tenant cannot be retrieved", async () => {
			const service = new TenantAdminService();
			const contextIds: IContextIds = { [ContextIdKeys.Organization]: HEALTH_ORG_ID };

			await service.healthApplicationInit(contextIds);
			vi.mocked(mockStorage.get).mockResolvedValue(undefined);
			vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue(contextIds);
			const result = await service.healthApplication(vi.fn());

			expect(result?.[0].status).toBe(HealthStatus.Error);
			expect(result?.[0].category).toBe(HealthCategory.Application);
		});

		it("healthApplication returns empty when no tenant was provisioned", async () => {
			const service = new TenantAdminService();

			const result = await service.healthApplication(vi.fn());

			expect(result).toEqual([]);
		});

		it("healthApplicationTeardown removes the provisioned tenant", async () => {
			const service = new TenantAdminService();
			const contextIds: IContextIds = { [ContextIdKeys.Organization]: HEALTH_ORG_ID };

			await service.healthApplicationInit(contextIds);
			vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue(contextIds);
			await service.healthApplication(vi.fn());
			await service.healthApplicationTeardown();

			expect(mockStorage.remove).toHaveBeenCalledWith(contextIds[ContextIdKeys.Tenant]);
		});

		it("healthApplicationTeardown does nothing when no tenant was provisioned", async () => {
			const service = new TenantAdminService();

			await service.healthApplicationTeardown();

			expect(mockStorage.remove).not.toHaveBeenCalled();
		});

		it("healthApplicationTeardown clears the tenant ID so the next cycle can provision afresh", async () => {
			const service = new TenantAdminService();
			const contextIds1: IContextIds = { [ContextIdKeys.Organization]: HEALTH_ORG_ID };

			await service.healthApplicationInit(contextIds1);
			vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue(contextIds1);
			await service.healthApplication(vi.fn());
			await service.healthApplicationTeardown();

			const contextIds2: IContextIds = { [ContextIdKeys.Organization]: HEALTH_ORG_ID };
			await service.healthApplicationInit(contextIds2);

			expect(mockStorage.set).toHaveBeenCalledTimes(2);
			expect(contextIds2[ContextIdKeys.Tenant]).toBeDefined();
		});
	});
});
