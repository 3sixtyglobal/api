// Copyright 2024 IOTA Stiftung.
// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import {
	type HealthApplicationCallback,
	HealthCategory,
	HealthStatus,
	type IHealth,
	type IHealthProviderComponent,
	type IPlatformComponent,
	type ITenant,
	type ITenantAdminComponent,
	TenantEventType
} from "@3sixty/api-models";
import { ContextIdKeys, ContextIdStore, type IContextIds } from "@3sixty/context";
import {
	AlreadyExistsError,
	BaseError,
	ComponentFactory,
	Converter,
	GeneralError,
	Guards,
	type IError,
	Is,
	LfuCache,
	NotFoundError,
	Url
} from "@3sixty/core";
import { Blake2b } from "@3sixty/crypto";
import { ComparisonOperator, type EntityCondition } from "@3sixty/entity";
import {
	EntityStorageConnectorFactory,
	type IEntityStorageConnector
} from "@3sixty/entity-storage-models";
import { nameof } from "@3sixty/nameof";
import { Tenant } from "./entities/tenant.js";
import type { ITenantAdminServiceConstructorOptions } from "./models/ITenantAdminServiceConstructorOptions.js";
import { TenantIdHelper } from "./utils/tenantIdHelper.js";

/**
 * Service for performing tenant administration operations.
 */
export class TenantAdminService implements ITenantAdminComponent, IHealthProviderComponent {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<TenantAdminService>();

	/**
	 * The default time to keep a tenant lookup in the cache.
	 * @internal
	 */
	private static readonly _DEFAULT_CACHE_TTL_MS: number = 30000;

	/**
	 * The cache key prefix for tenants looked up by id.
	 * @internal
	 */
	private static readonly _CACHE_PREFIX_ID: string = "id:";

	/**
	 * The cache key prefix for tenants looked up by api key.
	 * @internal
	 */
	private static readonly _CACHE_PREFIX_API_KEY: string = "apiKey:";

	/**
	 * The cache key prefix for tenants looked up by public origin.
	 * @internal
	 */
	private static readonly _CACHE_PREFIX_PUBLIC_ORIGIN: string = "publicOrigin:";

	/**
	 * The cache key prefix for tenants looked up by organization id, including legacy ids.
	 * @internal
	 */
	private static readonly _CACHE_PREFIX_ORGANIZATION_ID: string = "organizationId:";

	/**
	 * Entity storage connector used by the service.
	 * @internal
	 */
	private readonly _entityStorageConnector: IEntityStorageConnector<Tenant>;

	/**
	 * Platform component used to fire tenant events.
	 * @internal
	 */
	private readonly _platformComponent: IPlatformComponent;

	/**
	 * The cache of tenant lookups, undefined when caching is disabled.
	 * @internal
	 */
	private readonly _tenantCache?: LfuCache<ITenant>;

	/**
	 * How long a cached tenant may live, counted from when it was read.
	 * @internal
	 */
	private readonly _tenantCacheTtlMs: number;

	/**
	 * Create a new instance of TenantAdminService.
	 * @param options The options for the connector.
	 */
	constructor(options?: ITenantAdminServiceConstructorOptions) {
		this._entityStorageConnector = EntityStorageConnectorFactory.get(
			options?.tenantEntityStorageType ?? "tenant"
		);
		this._platformComponent = ComponentFactory.get<IPlatformComponent>(
			options?.platformComponentType ?? "platform"
		);

		this._tenantCacheTtlMs =
			options?.config?.tenantCacheTtlMs ?? TenantAdminService._DEFAULT_CACHE_TTL_MS;
		if (this._tenantCacheTtlMs > 0) {
			this._tenantCache = new LfuCache<ITenant>({
				capacity: options?.config?.tenantCacheCapacity,
				ttiMs: this._tenantCacheTtlMs,
				mutexTimeoutMs: options?.config?.tenantCacheMutexTimeoutMs
			});
		}
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return TenantAdminService.CLASS_NAME;
	}

	/**
	 * Stop the service and release the tenant cache.
	 * @returns A promise that resolves when the service has stopped.
	 */
	public async stop(): Promise<void> {
		this._tenantCache?.destroy();
	}

	/**
	 * Get a tenant by its id.
	 * @param tenantId The id of the tenant.
	 * @returns The tenant.
	 * @throws Error if the tenant is not found.
	 */
	public async get(tenantId: string): Promise<ITenant> {
		Guards.stringHexLength(TenantAdminService.CLASS_NAME, nameof(tenantId), tenantId, 32);

		return this.cachedLookup(`${TenantAdminService._CACHE_PREFIX_ID}${tenantId}`, async () => {
			const tenant = await this._entityStorageConnector.get(tenantId);
			if (!Is.object(tenant)) {
				throw new NotFoundError(TenantAdminService.CLASS_NAME, "tenantNotFound", tenantId);
			}

			return this.entityToModel(tenant);
		});
	}

	/**
	 * Get a tenant by its api key.
	 * @param apiKey The api key of the tenant.
	 * @returns The tenant.
	 * @throws Error if the tenant is not found.
	 */
	public async getByApiKey(apiKey: string): Promise<ITenant> {
		Guards.stringHexLength(TenantAdminService.CLASS_NAME, nameof(apiKey), apiKey, 32);

		return this.cachedLookup(this.apiKeyCacheKey(apiKey), async () => {
			const tenant = await this._entityStorageConnector.get(apiKey, "apiKey");
			if (!Is.object(tenant)) {
				throw new NotFoundError(TenantAdminService.CLASS_NAME, "tenantNotFound", apiKey);
			}

			return this.entityToModel(tenant);
		});
	}

	/**
	 * Get a tenant by its public origin.
	 * @param publicOrigin The origin of the tenant.
	 * @returns The tenant.
	 * @throws Error if the tenant is not found.
	 */
	public async getByPublicOrigin(publicOrigin: string): Promise<ITenant> {
		Guards.stringValue(TenantAdminService.CLASS_NAME, nameof(publicOrigin), publicOrigin);

		return this.cachedLookup(
			`${TenantAdminService._CACHE_PREFIX_PUBLIC_ORIGIN}${publicOrigin}`,
			async () => {
				const tenant = await this._entityStorageConnector.get(publicOrigin, "publicOrigin");

				if (!Is.object(tenant)) {
					throw new NotFoundError(TenantAdminService.CLASS_NAME, "tenantNotFound", publicOrigin);
				}

				return this.entityToModel(tenant);
			}
		);
	}

	/**
	 * Get a tenant by its organization id, optionally searching legacy ids.
	 * @param organizationId The organization id of the tenant.
	 * @param includeLegacy Whether to also search the legacy organization id array.
	 * @returns The tenant.
	 * @throws Error if the tenant is not found.
	 */
	public async getTenantByOrganizationId(
		organizationId: string,
		includeLegacy?: boolean
	): Promise<ITenant> {
		Guards.stringValue(TenantAdminService.CLASS_NAME, nameof(organizationId), organizationId);

		return this.cachedLookup(
			this.organizationIdCacheKey(organizationId, includeLegacy ?? false),
			async () => {
				let tenant = await this._entityStorageConnector.get(organizationId, "organizationId");

				if (!Is.object(tenant) && (includeLegacy ?? false)) {
					const result = await this._entityStorageConnector.query(
						{
							property: "organizationIdLegacy",
							comparison: ComparisonOperator.Includes,
							value: organizationId
						},
						undefined,
						undefined,
						undefined,
						1
					);
					tenant = (result.entities as Tenant[])[0];
				}

				if (!Is.object(tenant)) {
					throw new NotFoundError(TenantAdminService.CLASS_NAME, "tenantNotFound", organizationId);
				}

				return this.entityToModel(tenant);
			}
		);
	}

	/**
	 * Create a tenant.
	 * @param tenant The tenant to store.
	 * @returns The tenant id.
	 */
	public async create(
		tenant: Omit<ITenant, "id" | "dateCreated" | "dateModified"> & { id?: string }
	): Promise<string> {
		Guards.objectValue<ITenant>(TenantAdminService.CLASS_NAME, nameof(tenant), tenant);
		Guards.stringValue(
			TenantAdminService.CLASS_NAME,
			nameof(tenant.organizationId),
			tenant.organizationId
		);
		if (Is.stringValue(tenant.id)) {
			Guards.stringHexLength(TenantAdminService.CLASS_NAME, nameof(tenant.id), tenant.id, 32);
			const existing = await this._entityStorageConnector.get(tenant.id);
			if (Is.object(existing)) {
				throw new AlreadyExistsError(
					TenantAdminService.CLASS_NAME,
					"tenantAlreadyExists",
					tenant.id
				);
			}
		}
		if (Is.stringValue(tenant.apiKey)) {
			Guards.stringHexLength(
				TenantAdminService.CLASS_NAME,
				nameof(tenant.apiKey),
				tenant.apiKey,
				32
			);
		}

		let publicOrigin: string | undefined;
		if (Is.stringValue(tenant.publicOrigin)) {
			Url.guard(TenantAdminService.CLASS_NAME, nameof(tenant.publicOrigin), tenant.publicOrigin);

			const url = new Url(tenant.publicOrigin);
			const parts = url.parts();
			publicOrigin = `${parts.schema}://${parts.host}${Is.integer(parts.port) ? `:${parts.port}` : ""}`;
		}

		if (Is.stringValue(tenant.apiKey)) {
			const existingApiKey = await this._entityStorageConnector.get(tenant.apiKey, "apiKey");
			if (Is.object(existingApiKey) && existingApiKey.id !== tenant.id) {
				throw new GeneralError(TenantAdminService.CLASS_NAME, "apiKeyAlreadyInUse");
			}
		}

		if (Is.stringValue(publicOrigin)) {
			const existingPublicOrigin = await this._entityStorageConnector.get(
				publicOrigin,
				"publicOrigin"
			);
			if (Is.object(existingPublicOrigin)) {
				throw new AlreadyExistsError(
					TenantAdminService.CLASS_NAME,
					"publicOriginAlreadyExists",
					publicOrigin
				);
			}
		}

		const existingOrgId = await this._entityStorageConnector.get(
			tenant.organizationId,
			"organizationId"
		);
		if (Is.object(existingOrgId)) {
			throw new AlreadyExistsError(
				TenantAdminService.CLASS_NAME,
				"organizationIdAlreadyExists",
				tenant.organizationId
			);
		}

		const tenantEntity: ITenant = {
			id: tenant.id ?? TenantIdHelper.generateTenantId(),
			apiKey: tenant.apiKey ?? TenantIdHelper.generateApiKey(),
			dateCreated: new Date(Date.now()).toISOString(),
			dateModified: new Date(Date.now()).toISOString(),
			label: tenant.label,
			publicOrigin,
			organizationId: tenant.organizationId,
			organizationIdLegacy: tenant.organizationIdLegacy
		};

		await this._entityStorageConnector.set(this.modelToEntity(tenantEntity));

		// A new tenant cannot have a stale id, api key or public origin entry, because those are
		// unique-checked above and failed lookups are never cached. Its organization ids can be
		// stale though; only the primary organization index is checked, so an id that another
		// tenant currently answers through its legacy list may already be cached against that
		// tenant even though the new tenant now owns it outright.
		this.invalidateTenant(tenantEntity);

		await this._platformComponent.fireTenantEvent(tenantEntity.id, TenantEventType.Created);

		return tenantEntity.id;
	}

	/**
	 * Update a tenant.
	 * @param tenant The tenant to update.
	 * @returns A promise that resolves when the tenant has been updated.
	 */
	public async update(
		tenant: Partial<Omit<ITenant, "dateCreated" | "dateModified">>
	): Promise<void> {
		Guards.objectValue<ITenant>(TenantAdminService.CLASS_NAME, nameof(tenant), tenant);
		Guards.stringHexLength(TenantAdminService.CLASS_NAME, nameof(tenant.id), tenant.id, 32);
		Guards.stringValue(
			TenantAdminService.CLASS_NAME,
			nameof(tenant.organizationId),
			tenant.organizationId
		);
		if (Is.stringValue(tenant.apiKey)) {
			Guards.stringHexLength(
				TenantAdminService.CLASS_NAME,
				nameof(tenant.apiKey),
				tenant.apiKey,
				32
			);
		}

		let publicOrigin: string | undefined;
		if (Is.stringValue(tenant.publicOrigin)) {
			Url.guard(TenantAdminService.CLASS_NAME, nameof(tenant.publicOrigin), tenant.publicOrigin);

			const url = new Url(tenant.publicOrigin);
			const parts = url.parts();
			publicOrigin = `${parts.schema}://${parts.host}${Is.integer(parts.port) ? `:${parts.port}` : ""}`;
		}

		const currentTenant = await this._entityStorageConnector.get(tenant.id);
		if (!Is.object(currentTenant)) {
			throw new NotFoundError(TenantAdminService.CLASS_NAME, "tenantNotFound", tenant.id);
		}

		if (Is.stringValue(tenant.apiKey)) {
			const existingApiKey = await this._entityStorageConnector.get(tenant.apiKey, "apiKey");
			if (Is.object(existingApiKey) && existingApiKey.id !== currentTenant.id) {
				throw new GeneralError(TenantAdminService.CLASS_NAME, "apiKeyAlreadyInUse");
			}
		}

		if (Is.stringValue(publicOrigin)) {
			const existingPublicOrigin = await this._entityStorageConnector.get(
				publicOrigin,
				"publicOrigin"
			);
			if (Is.object(existingPublicOrigin) && existingPublicOrigin.id !== currentTenant.id) {
				throw new AlreadyExistsError(
					TenantAdminService.CLASS_NAME,
					"publicOriginAlreadyExists",
					publicOrigin
				);
			}
		}

		const existingOrgId = await this._entityStorageConnector.get(
			tenant.organizationId,
			"organizationId"
		);
		if (Is.object(existingOrgId) && existingOrgId.id !== currentTenant.id) {
			throw new AlreadyExistsError(
				TenantAdminService.CLASS_NAME,
				"organizationIdAlreadyExists",
				tenant.organizationId
			);
		}

		const currentTenantEntity = this.entityToModel(currentTenant);

		const orgIdChanged = tenant.organizationId !== currentTenantEntity.organizationId;

		let newOrganizationIdLegacy: string[] | undefined;
		if (orgIdChanged) {
			const legacySet = new Set(currentTenantEntity.organizationIdLegacy ?? []);
			if (Is.stringValue(currentTenantEntity.organizationId)) {
				legacySet.add(currentTenantEntity.organizationId);
			}
			legacySet.delete(tenant.organizationId);
			newOrganizationIdLegacy = legacySet.size > 0 ? [...legacySet] : undefined;
		} else {
			newOrganizationIdLegacy = Is.array(tenant.organizationIdLegacy)
				? tenant.organizationIdLegacy
				: currentTenantEntity.organizationIdLegacy;
		}

		const tenantEntity: ITenant = {
			id: tenant.id,
			apiKey: tenant.apiKey ?? currentTenantEntity.apiKey,
			dateCreated: currentTenantEntity.dateCreated,
			dateModified: new Date(Date.now()).toISOString(),
			label: tenant.label ?? currentTenantEntity.label,
			publicOrigin: publicOrigin ?? currentTenantEntity.publicOrigin,
			organizationId: tenant.organizationId,
			organizationIdLegacy: newOrganizationIdLegacy
		};

		await this._entityStorageConnector.set(this.modelToEntity(tenantEntity));

		// The api key, organization id and public origin can all have moved, so the entries
		// cached under the previous values have to go as well as the new ones.
		this.invalidateTenant(currentTenantEntity);
		this.invalidateTenant(tenantEntity);

		await this._platformComponent.fireTenantEvent(tenantEntity.id, TenantEventType.Updated);
	}

	/**
	 * Remove a tenant by its id.
	 * @param tenantId The id of the tenant.
	 * @returns Nothing.
	 */
	public async remove(tenantId: string): Promise<void> {
		Guards.stringHexLength(TenantAdminService.CLASS_NAME, nameof(tenantId), tenantId, 32);

		// The keys to drop have to be read before the tenant goes, but the drop itself has to happen
		// after it, otherwise a lookup racing the delete would re-cache the tenant behind us.
		const currentTenant = Is.empty(this._tenantCache)
			? undefined
			: await this._entityStorageConnector.get(tenantId);

		await this._entityStorageConnector.remove(tenantId);

		if (Is.object(currentTenant)) {
			this.invalidateTenant(this.entityToModel(currentTenant));
		} else {
			// The tenant could not be read back, so its other keys are unknown, but an entry cached
			// under the id before it went missing still has to go.
			this._tenantCache?.delete(`${TenantAdminService._CACHE_PREFIX_ID}${tenantId}`);
		}

		await this._platformComponent.fireTenantEvent(tenantId, TenantEventType.Deleted);
	}

	/**
	 * Query tenants with pagination.
	 * @param conditions The conditions to filter the tenants.
	 * @param properties The properties to include in the returned tenants.
	 * @param cursor The cursor to start from.
	 * @param limit The maximum number of tenants to return.
	 * @returns The tenants and the next cursor if more tenants are available.
	 */
	public async query(
		conditions?: EntityCondition<ITenant>,
		properties?: (keyof ITenant)[],
		cursor?: string,
		limit?: number
	): Promise<{ tenants: ITenant[]; cursor?: string }> {
		const result = await this._entityStorageConnector.query(
			conditions,
			undefined,
			properties,
			cursor,
			limit
		);

		return {
			tenants: (result.entities as Tenant[]).map(e => this.entityToModel(e)),
			cursor: result.cursor
		};
	}

	/**
	 * Provision a temporary tenant for the application health cycle.
	 * @param contextIds Accumulated context IDs; receives the provisional tenant ID.
	 * @returns A promise that resolves when provisioning is complete.
	 */
	public async healthApplicationInit(contextIds: IContextIds): Promise<void> {
		const organizationId = contextIds[ContextIdKeys.Organization];
		if (!Is.stringValue(organizationId)) {
			return;
		}
		const tenantId = await this.create({
			apiKey: TenantIdHelper.generateApiKey(),
			organizationId,
			label: "health-check"
		});
		contextIds[ContextIdKeys.Tenant] = tenantId;
	}

	/**
	 * Verify the provisioned tenant can be retrieved.
	 * The tenant ID is read from the active context set by the init pass.
	 * @param callback The callback to invoke when a deferred health result is ready.
	 * @returns The health entries for this component.
	 */
	public async healthApplication(
		callback: HealthApplicationCallback
	): Promise<IHealth[] | undefined> {
		const contextIds = await ContextIdStore.getContextIds();
		const tenantId = contextIds?.[ContextIdKeys.Tenant];

		if (!Is.stringValue(tenantId)) {
			return [];
		}

		let status: HealthStatus = HealthStatus.Ok;
		let healthError: IError | undefined;

		try {
			await this.get(tenantId);
		} catch (err) {
			status = HealthStatus.Error;
			healthError = BaseError.fromError(err);
		}

		return [
			{
				source: TenantAdminService.CLASS_NAME,
				category: HealthCategory.Application,
				status,
				error: healthError
			}
		];
	}

	/**
	 * Remove the temporary tenant provisioned during init.
	 * The tenant ID is read from the active context set by the init pass.
	 * Does nothing when no tenant ID is present.
	 * @returns A promise that resolves when teardown is complete.
	 */
	public async healthApplicationTeardown(): Promise<void> {
		const contextIds = await ContextIdStore.getContextIds();
		const tenantId = contextIds?.[ContextIdKeys.Tenant];

		if (Is.stringValue(tenantId)) {
			await this.remove(tenantId);
		}
	}

	/**
	 * Build the cache key used for an api key lookup.
	 * The api key is hashed so neither the cache keys nor the mutex keys derived from them hold
	 * the credential itself.
	 * @param apiKey The api key being looked up.
	 * @returns The cache key.
	 * @internal
	 */
	private apiKeyCacheKey(apiKey: string): string {
		const hashed = Converter.bytesToHex(Blake2b.sum256(Converter.utf8ToBytes(apiKey)));
		return `${TenantAdminService._CACHE_PREFIX_API_KEY}${hashed}`;
	}

	/**
	 * Build the cache key used for an organization id lookup.
	 * @param organizationId The organization id being looked up.
	 * @param includeLegacy Whether the lookup also searches the legacy organization ids.
	 * @returns The cache key.
	 * @internal
	 */
	private organizationIdCacheKey(organizationId: string, includeLegacy: boolean): string {
		return `${TenantAdminService._CACHE_PREFIX_ORGANIZATION_ID}${includeLegacy ? "legacy:" : ""}${organizationId}`;
	}

	/**
	 * Perform a lookup through the cache, falling back to a direct lookup when caching is disabled.
	 * Lookups that throw are not cached, so a missing tenant is re-checked against storage each time.
	 * @param cacheKey The key the tenant is cached under.
	 * @param lookup The lookup to perform when the tenant is not already cached.
	 * @returns The tenant.
	 * @internal
	 */
	private async cachedLookup(cacheKey: string, lookup: () => Promise<ITenant>): Promise<ITenant> {
		if (Is.empty(this._tenantCache)) {
			return lookup();
		}

		// The expiry is absolute rather than the idle time the cache applies alongside it. Entries
		// are only invalidated in the process that made the change, so without it a tenant under
		// steady traffic on one node would never pick up an edit made on another.
		const cached = await this._tenantCache.getOrSet(
			cacheKey,
			lookup,
			Date.now() + this._tenantCacheTtlMs
		);

		// Callers get their own copy; the cached instance is shared by every caller and some of
		// them fill in defaults on the tenant they are handed.
		return {
			...cached,
			organizationIdLegacy: Is.array(cached.organizationIdLegacy)
				? [...cached.organizationIdLegacy]
				: undefined
		};
	}

	/**
	 * Remove every cache entry that can resolve to the given tenant.
	 * @param tenant The tenant whose cache entries should be dropped.
	 * @internal
	 */
	private invalidateTenant(tenant: ITenant): void {
		if (Is.empty(this._tenantCache)) {
			return;
		}

		this._tenantCache.delete(`${TenantAdminService._CACHE_PREFIX_ID}${tenant.id}`);

		if (Is.stringValue(tenant.apiKey)) {
			this._tenantCache.delete(this.apiKeyCacheKey(tenant.apiKey));
		}

		if (Is.stringValue(tenant.publicOrigin)) {
			this._tenantCache.delete(
				`${TenantAdminService._CACHE_PREFIX_PUBLIC_ORIGIN}${tenant.publicOrigin}`
			);
		}

		const organizationIds = [tenant.organizationId, ...(tenant.organizationIdLegacy ?? [])];
		for (const organizationId of organizationIds) {
			if (Is.stringValue(organizationId)) {
				this._tenantCache.delete(this.organizationIdCacheKey(organizationId, false));
				this._tenantCache.delete(this.organizationIdCacheKey(organizationId, true));
			}
		}
	}

	/**
	 * Convert a tenant entity to a tenant model.
	 * @param tenant The tenant entity.
	 * @returns The tenant model.
	 * @internal
	 */
	private entityToModel(tenant: Tenant): ITenant {
		return {
			id: tenant.id,
			apiKey: tenant.apiKey,
			label: tenant.label,
			dateCreated: tenant.dateCreated,
			dateModified: tenant.dateModified,
			publicOrigin: tenant.publicOrigin,
			organizationId: tenant.organizationId,
			organizationIdLegacy: tenant.organizationIdLegacy
		};
	}

	/**
	 * Convert a tenant model to a tenant entity.
	 * @param tenant The tenant model.
	 * @returns The tenant entity.
	 * @internal
	 */
	private modelToEntity(tenant: ITenant): Tenant {
		const tenantEntity = new Tenant();
		tenantEntity.id = tenant.id;
		tenantEntity.apiKey = tenant.apiKey;
		tenantEntity.label = tenant.label;
		tenantEntity.dateCreated = tenant.dateCreated;
		tenantEntity.dateModified = tenant.dateModified;
		tenantEntity.publicOrigin = tenant.publicOrigin;
		tenantEntity.organizationId = tenant.organizationId;
		tenantEntity.organizationIdLegacy = Is.arrayValue(tenant.organizationIdLegacy)
			? tenant.organizationIdLegacy
			: undefined;
		return tenantEntity;
	}
}
