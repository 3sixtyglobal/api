// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { BaseRestClient } from "@3sixty/api-core";
import {
	HttpHeaderHelper,
	HttpParameterHelper,
	type IBaseRestClientConfig,
	type ICreatedResponse,
	type INoContentResponse,
	type ITenant,
	type ITenantAdminComponent,
	type ITenantCreate,
	type ITenantCreateRequest,
	type ITenantGetByApiKeyRequest,
	type ITenantGetByIdRequest,
	type ITenantGetByOrganizationIdRequest,
	type ITenantGetByPublicOriginRequest,
	type ITenantGetResponse,
	type ITenantListRequest,
	type ITenantListResponse,
	type ITenantRemoveRequest,
	type ITenantUpdate,
	type ITenantUpdateRequest
} from "@3sixty/api-models";
import { Coerce, Guards } from "@3sixty/core";
import type { EntityCondition } from "@3sixty/entity";
import { nameof } from "@3sixty/nameof";
import { HttpMethod } from "@3sixty/web";

/**
 * The client to connect to the tenant admin service.
 */
export class TenantAdminRestClient extends BaseRestClient implements ITenantAdminComponent {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<TenantAdminRestClient>();

	/**
	 * Create a new instance of TenantAdminRestClient.
	 * @param config The configuration for the client.
	 */
	constructor(config: IBaseRestClientConfig) {
		super(nameof<TenantAdminRestClient>(), config, "tenants");
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return TenantAdminRestClient.CLASS_NAME;
	}

	/**
	 * Create a tenant.
	 * @param tenant The tenant to store.
	 * @returns The tenant id.
	 */
	public async create(tenant: ITenantCreate): Promise<string> {
		Guards.object<ITenantCreate>(TenantAdminRestClient.CLASS_NAME, nameof(tenant), tenant);

		const response = await this.fetch<ITenantCreateRequest, ICreatedResponse>(
			"/",
			HttpMethod.POST,
			{
				body: tenant
			}
		);

		return HttpHeaderHelper.extractId(response.headers, `${this.getPathPrefix()}/:id`);
	}

	/**
	 * Update a tenant.
	 * @param tenant The tenant to update.
	 * @returns A promise that resolves when the tenant has been updated.
	 */
	public async update(tenant: ITenantUpdate): Promise<void> {
		Guards.object<ITenantUpdate>(TenantAdminRestClient.CLASS_NAME, nameof(tenant), tenant);
		Guards.stringValue(TenantAdminRestClient.CLASS_NAME, nameof(tenant.id), tenant.id);

		await this.fetch<ITenantUpdateRequest, INoContentResponse>("/:id", HttpMethod.PUT, {
			pathParams: { id: tenant.id },
			body: tenant
		});
	}

	/**
	 * Get a tenant by its id.
	 * @param tenantId The id of the tenant.
	 * @returns The tenant.
	 * @throws Error if the tenant is not found.
	 */
	public async get(tenantId: string): Promise<ITenant> {
		Guards.stringValue(TenantAdminRestClient.CLASS_NAME, nameof(tenantId), tenantId);

		const response = await this.fetch<ITenantGetByIdRequest, ITenantGetResponse>(
			"/:id",
			HttpMethod.GET,
			{
				pathParams: { id: tenantId }
			}
		);

		return response.body;
	}

	/**
	 * Get a tenant by its api key.
	 * @param apiKey The api key of the tenant.
	 * @returns The tenant.
	 * @throws Error if the tenant is not found.
	 */
	public async getByApiKey(apiKey: string): Promise<ITenant> {
		Guards.stringValue(TenantAdminRestClient.CLASS_NAME, nameof(apiKey), apiKey);

		const response = await this.fetch<ITenantGetByApiKeyRequest, ITenantGetResponse>(
			"/api-key/:apiKey",
			HttpMethod.GET,
			{
				pathParams: { apiKey }
			}
		);

		return response.body;
	}

	/**
	 * Get a tenant by its public origin.
	 * @param publicOrigin The origin of the tenant.
	 * @returns The tenant.
	 * @throws Error if the tenant is not found.
	 */
	public async getByPublicOrigin(publicOrigin: string): Promise<ITenant> {
		Guards.stringValue(TenantAdminRestClient.CLASS_NAME, nameof(publicOrigin), publicOrigin);

		const response = await this.fetch<ITenantGetByPublicOriginRequest, ITenantGetResponse>(
			"/public-origin/:publicOrigin",
			HttpMethod.GET,
			{
				pathParams: { publicOrigin }
			}
		);

		return response.body;
	}

	/**
	 * Remove a tenant by its id.
	 * @param tenantId The id of the tenant.
	 * @returns A promise that resolves when the tenant has been removed.
	 * @throws Error if the tenant is not found.
	 */
	public async remove(tenantId: string): Promise<void> {
		Guards.stringValue(TenantAdminRestClient.CLASS_NAME, nameof(tenantId), tenantId);

		await this.fetch<ITenantRemoveRequest, INoContentResponse>("/:id", HttpMethod.DELETE, {
			pathParams: { id: tenantId }
		});
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
		Guards.stringValue(TenantAdminRestClient.CLASS_NAME, nameof(organizationId), organizationId);

		const response = await this.fetch<ITenantGetByOrganizationIdRequest, ITenantGetResponse>(
			"/organization/:organizationId",
			HttpMethod.GET,
			{
				pathParams: { organizationId },
				query: {
					includeLegacy: Coerce.string(includeLegacy)
				}
			}
		);

		return response.body;
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
		const response = await this.fetch<ITenantListRequest, ITenantListResponse>(
			"/",
			HttpMethod.GET,
			{
				query: {
					conditions: HttpParameterHelper.objectToString(conditions),
					properties: HttpParameterHelper.arrayToString(properties),
					cursor,
					limit: Coerce.string(limit)
				}
			}
		);

		return {
			tenants: response.body,
			cursor: HttpHeaderHelper.extractCursor(response.headers)
		};
	}
}
