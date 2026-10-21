// Copyright 2025 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IComponent } from "@3sixty/core";
import type { EntityCondition } from "@3sixty/entity";
import type { ITenant } from "./ITenant.js";

/**
 * Configuration for the tenant admin component
 */
export interface ITenantAdminComponent extends IComponent {
	/**
	 * Create a tenant.
	 * @param tenant The tenant to store.
	 * @returns The tenant id.
	 */
	create(
		tenant: Omit<ITenant, "id" | "dateCreated" | "dateModified"> & { id?: string }
	): Promise<string>;

	/**
	 * Update a tenant.
	 * @param tenant The tenant to update.
	 * @returns A promise that resolves when the tenant has been updated.
	 */
	update(tenant: Partial<Omit<ITenant, "dateCreated" | "dateModified">>): Promise<void>;

	/**
	 * Get a tenant by its id.
	 * @param tenantId The id of the tenant.
	 * @returns The tenant.
	 * @throws Error if the tenant is not found.
	 */
	get(tenantId: string): Promise<ITenant>;

	/**
	 * Get a tenant by its api key.
	 * @param apiKey The api key of the tenant.
	 * @returns The tenant.
	 * @throws Error if the tenant is not found.
	 */
	getByApiKey(apiKey: string): Promise<ITenant>;

	/**
	 * Get a tenant by its public origin.
	 * @param publicOrigin The origin of the tenant.
	 * @returns The tenant.
	 * @throws Error if the tenant is not found.
	 */
	getByPublicOrigin(publicOrigin: string): Promise<ITenant>;

	/**
	 * Remove a tenant by its id.
	 * @param tenantId The id of the tenant.
	 * @returns A promise that resolves when the tenant has been removed.
	 * @throws Error if the tenant is not found.
	 */
	remove(tenantId: string): Promise<void>;

	/**
	 * Get a tenant by its organization id, optionally searching legacy ids.
	 * @param organizationId The organization id of the tenant.
	 * @param includeLegacy Whether to also search the legacy organization id array.
	 * @returns The tenant.
	 * @throws Error if the tenant is not found.
	 */
	getTenantByOrganizationId(organizationId: string, includeLegacy?: boolean): Promise<ITenant>;

	/**
	 * Query tenants with pagination.
	 * @param conditions The conditions to filter the tenants.
	 * @param properties The properties to include in the returned tenants.
	 * @param cursor The cursor to start from.
	 * @param limit The maximum number of tenants to return.
	 * @returns The tenants and the next cursor if more tenants are available.
	 */
	query(
		conditions?: EntityCondition<ITenant>,
		properties?: (keyof ITenant)[],
		cursor?: string,
		limit?: number
	): Promise<{ tenants: ITenant[]; cursor?: string }>;
}
