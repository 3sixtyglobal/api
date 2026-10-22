// Copyright 2024 IOTA Stiftung.
// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import {
	HttpContextIdKeys,
	HttpHeaderHelper,
	HttpParameterHelper,
	HttpUrlHelper,
	type ICreatedResponse,
	type IHttpRequestContext,
	type INoContentResponse,
	type IRestRoute,
	type ITag,
	type ITenantAdminComponent,
	type IRouteAuthorization
} from "@3sixty/api-models";
import { ContextIdStore } from "@3sixty/context";
import { Coerce, ComponentFactory, Guards, Is } from "@3sixty/core";
import { nameof } from "@3sixty/nameof";
import { HeaderTypes, HttpStatusCode, type IHttpHeaders } from "@3sixty/web";
import type { ITenantCreateRequest } from "./models/api/ITenantCreateRequest.js";
import type { ITenantGetByApiKeyRequest } from "./models/api/ITenantGetByApiKeyRequest.js";
import type { ITenantGetByIdRequest } from "./models/api/ITenantGetByIdRequest.js";
import type { ITenantGetByPublicOriginRequest } from "./models/api/ITenantGetByPublicOriginRequest.js";
import type { ITenantGetResponse } from "./models/api/ITenantGetResponse.js";
import type { ITenantListRequest } from "./models/api/ITenantListRequest.js";
import type { ITenantListResponse } from "./models/api/ITenantListResponse.js";
import type { ITenantRemoveRequest } from "./models/api/ITenantRemoveRequest.js";
import type { ITenantUpdateRequest } from "./models/api/ITenantUpdateRequest.js";

/**
 * The source used when communicating about these routes.
 */
const ROUTES_SOURCE = "tenantRoutes";

/**
 * The default authorization for the routes, used to seed authorization rules.
 */
const DEFAULT_AUTHORIZATION_READER: IRouteAuthorization = {
	permission: "tenant:read",
	role: "tenant-admin"
};
const DEFAULT_AUTHORIZATION_WRITER: IRouteAuthorization = {
	permission: "tenant:write",
	role: "tenant-admin",
	inherits: [DEFAULT_AUTHORIZATION_READER.permission]
};

/**
 * The tag to associate with the routes.
 */
export const tagsTenants: ITag[] = [
	{
		name: "Tenants",
		description: "Tenants endpoints for the REST server."
	}
];

/**
 * The REST routes for tenant management.
 * @param baseRouteName Prefix to prepend to the paths.
 * @param componentName The name of the component to use in the routes stored in the ComponentFactory.
 * @returns The generated routes.
 */
export function generateRestRoutesTenants(
	baseRouteName: string,
	componentName: string
): IRestRoute[] {
	const tenantListRoute: IRestRoute<ITenantListRequest, ITenantListResponse> = {
		operationId: "tenantList",
		summary: "Get the list of tenants",
		tag: tagsTenants[0].name,
		method: "GET",
		path: `${baseRouteName}/`,
		handler: async (httpRequestContext, request) =>
			tenantList(httpRequestContext, componentName, request),
		responseType: [
			{
				type: nameof<ITenantListResponse>(),
				examples: [
					{
						id: "tenantListResponse",
						description: "The response for the list tenants request.",
						response: {
							headers: {
								[HeaderTypes.Link]: '<https://api.3sixty.global/tenants/1>; rel="next"'
							},
							body: [
								{
									id: "2a39d6e62d98aa5372432f2e5d2208d4",
									apiKey: "ad7a5b0b816ca314b69c813ae1368232",
									label: "node",
									dateCreated: "2026-01-19T03:59:35.742Z",
									dateModified: "2026-01-19T03:59:35.742Z",
									publicOrigin: "https://example.com:4321",
									organizationId: "org-1"
								}
							]
						}
					}
				]
			}
		],
		defaultAuthorization: DEFAULT_AUTHORIZATION_READER
	};

	const tenantGetByIdRoute: IRestRoute<ITenantGetByIdRequest, ITenantGetResponse> = {
		operationId: "tenantGetById",
		summary: "Get the tenant by id",
		tag: tagsTenants[0].name,
		method: "GET",
		path: `${baseRouteName}/:id`,
		handler: async (httpRequestContext, request) =>
			tenantById(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<ITenantGetByIdRequest>(),
			examples: [
				{
					id: "tenantGetByIdRequestExample",
					request: {
						pathParams: {
							id: "2a39d6e62d98aa5372432f2e5d2208d4"
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<ITenantGetResponse>(),
				examples: [
					{
						id: "tenantGetByIdResponse",
						description: "The response for the get tenant by id request.",
						response: {
							body: {
								id: "2a39d6e62d98aa5372432f2e5d2208d4",
								apiKey: "ad7a5b0b816ca314b69c813ae1368232",
								label: "node",
								dateCreated: "2026-01-19T03:59:35.742Z",
								dateModified: "2026-01-19T03:59:35.742Z",
								publicOrigin: "https://example.com:4321",
								organizationId: "org-1"
							}
						}
					}
				]
			}
		],
		defaultAuthorization: DEFAULT_AUTHORIZATION_READER
	};

	const tenantGetByApiKeyRoute: IRestRoute<ITenantGetByApiKeyRequest, ITenantGetResponse> = {
		operationId: "tenantGetByApiKey",
		summary: "Get the tenant by api key",
		tag: tagsTenants[0].name,
		method: "GET",
		path: `${baseRouteName}/api-key/:apiKey`,
		handler: async (httpRequestContext, request) =>
			tenantByApiKey(httpRequestContext, componentName, request),
		responseType: [
			{
				type: nameof<ITenantGetResponse>(),
				examples: [
					{
						id: "tenantGetByApiKeyResponse",
						description: "The response for the get tenant by api key request.",
						response: {
							body: {
								id: "2a39d6e62d98aa5372432f2e5d2208d4",
								apiKey: "ad7a5b0b816ca314b69c813ae1368232",
								label: "node",
								dateCreated: "2026-01-19T03:59:35.742Z",
								dateModified: "2026-01-19T03:59:35.742Z",
								publicOrigin: "https://example.com:4321",
								organizationId: "org-1"
							}
						}
					}
				]
			}
		],
		defaultAuthorization: DEFAULT_AUTHORIZATION_READER
	};

	const tenantGetByPublicOriginRoute: IRestRoute = {
		operationId: "tenantGetByPublicOrigin",
		summary: "Get the tenant by public origin",
		tag: tagsTenants[0].name,
		method: "GET",
		path: `${baseRouteName}/public-origin/:publicOrigin`,
		handler: async (httpRequestContext, request) =>
			tenantByPublicOrigin(httpRequestContext, componentName, request),
		responseType: [
			{
				type: nameof<ITenantGetResponse>(),
				examples: [
					{
						id: "tenantGetByPublicOriginResponse",
						description: "The response for the get tenant by public origin request.",
						response: {
							body: {
								id: "2a39d6e62d98aa5372432f2e5d2208d4",
								apiKey: "ad7a5b0b816ca314b69c813ae1368232",
								label: "node",
								dateCreated: "2026-01-19T03:59:35.742Z",
								publicOrigin: "https://example.com:4321"
							}
						}
					}
				]
			}
		],
		defaultAuthorization: DEFAULT_AUTHORIZATION_READER
	};

	const tenantRemoveRoute: IRestRoute<ITenantRemoveRequest, INoContentResponse> = {
		operationId: "tenantRemove",
		summary: "Remove the tenant by id",
		tag: tagsTenants[0].name,
		method: "DELETE",
		path: `${baseRouteName}/:id`,
		handler: async (httpRequestContext, request) =>
			tenantRemove(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<ITenantRemoveRequest>(),
			examples: [
				{
					id: "tenantRemoveRequestExample",
					description: "The request for the remove tenant by id request.",
					request: {
						pathParams: {
							id: "2a39d6e62d98aa5372432f2e5d2208d4"
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<INoContentResponse>()
			}
		],
		defaultAuthorization: DEFAULT_AUTHORIZATION_WRITER
	};

	const tenantCreateRoute: IRestRoute<ITenantCreateRequest, ICreatedResponse> = {
		operationId: "tenantCreate",
		summary: "Create a new tenant",
		tag: tagsTenants[0].name,
		method: "POST",
		path: `${baseRouteName}/`,
		handler: async (httpRequestContext, request) =>
			tenantCreate(httpRequestContext, componentName, request, baseRouteName),
		requestType: {
			type: nameof<ITenantCreateRequest>(),
			examples: [
				{
					id: "tenantCreateRequestExample",
					description: "The request for the create tenant request.",
					request: {
						body: {
							apiKey: "ad7a5b0b816ca314b69c813ae1368232",
							label: "node",
							publicOrigin: "https://example.com:4321",
							organizationId: "org-1"
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<ICreatedResponse>()
			}
		],
		defaultAuthorization: DEFAULT_AUTHORIZATION_WRITER
	};

	const tenantUpdateRoute: IRestRoute<ITenantUpdateRequest, INoContentResponse> = {
		operationId: "tenantUpdate",
		summary: "Update an existing tenant",
		tag: tagsTenants[0].name,
		method: "PUT",
		path: `${baseRouteName}/:id`,
		handler: async (httpRequestContext, request) =>
			tenantUpdate(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<ITenantUpdateRequest>(),
			examples: [
				{
					id: "tenantUpdateRequestExample",
					description: "The request for the update tenant request.",
					request: {
						pathParams: {
							id: "2a39d6e62d98aa5372432f2e5d2208d4"
						},
						body: {
							apiKey: "ad7a5b0b816ca314b69c813ae1368232",
							label: "node",
							publicOrigin: "https://example.com:4321",
							organizationId: "org-1"
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<INoContentResponse>()
			}
		],
		defaultAuthorization: DEFAULT_AUTHORIZATION_WRITER
	};

	return [
		tenantListRoute,
		tenantCreateRoute,
		tenantGetByIdRoute,
		tenantGetByApiKeyRoute,
		tenantGetByPublicOriginRoute,
		tenantRemoveRoute,
		tenantUpdateRoute
	];
}

/**
 * Get the list of tenants.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function tenantList(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: ITenantListRequest
): Promise<ITenantListResponse> {
	const component = ComponentFactory.get<ITenantAdminComponent>(componentName);

	const result = await component.query(
		HttpParameterHelper.objectFromString(request.query?.conditions),
		HttpParameterHelper.arrayFromString(request.query?.properties),
		request.query?.cursor,
		Coerce.integer(request.query?.limit)
	);

	const headers: ITenantListResponse["headers"] = {};
	const contextIds = await ContextIdStore.getContextIds();
	const publicOrigin = contextIds?.[HttpContextIdKeys.PublicOrigin];

	HttpHeaderHelper.buildCursor(
		headers,
		httpRequestContext.serverRequest.url,
		publicOrigin,
		result.cursor
	);

	return {
		headers,
		body: result.tenants.map(t => ({
			...t,
			publicOrigin: t.publicOrigin ?? publicOrigin
		}))
	};
}

/**
 * Get the tenant by id.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function tenantById(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: ITenantGetByIdRequest
): Promise<ITenantGetResponse> {
	Guards.stringValue(ROUTES_SOURCE, nameof(request.pathParams.id), request.pathParams.id);
	const component = ComponentFactory.get<ITenantAdminComponent>(componentName);

	const result = await component.get(request.pathParams.id);

	if (!Is.stringValue(result.publicOrigin)) {
		const contextIds = await ContextIdStore.getContextIds();
		const publicOrigin = contextIds?.[HttpContextIdKeys.PublicOrigin];

		result.publicOrigin ??= publicOrigin;
	}

	return {
		body: result
	};
}

/**
 * Get the tenant by api key.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function tenantByApiKey(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: ITenantGetByApiKeyRequest
): Promise<ITenantGetResponse> {
	Guards.stringValue(ROUTES_SOURCE, nameof(request.pathParams.apiKey), request.pathParams.apiKey);
	const component = ComponentFactory.get<ITenantAdminComponent>(componentName);

	const result = await component.getByApiKey(request.pathParams.apiKey);

	if (!Is.stringValue(result.publicOrigin)) {
		const contextIds = await ContextIdStore.getContextIds();
		const publicOrigin = contextIds?.[HttpContextIdKeys.PublicOrigin];
		result.publicOrigin ??= publicOrigin;
	}

	return {
		body: result
	};
}

/**
 * Get the tenant by public origin.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function tenantByPublicOrigin(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: ITenantGetByPublicOriginRequest
): Promise<ITenantGetResponse> {
	Guards.stringValue(
		ROUTES_SOURCE,
		nameof(request.pathParams.publicOrigin),
		request.pathParams.publicOrigin
	);
	const component = ComponentFactory.get<ITenantAdminComponent>(componentName);

	const result = await component.getByPublicOrigin(request.pathParams.publicOrigin);

	if (!Is.stringValue(result.publicOrigin)) {
		const contextIds = await ContextIdStore.getContextIds();
		const publicOrigin = contextIds?.[HttpContextIdKeys.PublicOrigin];
		result.publicOrigin ??= publicOrigin;
	}

	return {
		body: result
	};
}

/**
 * Remove the tenant by id.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function tenantRemove(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: ITenantRemoveRequest
): Promise<INoContentResponse> {
	Guards.stringValue(ROUTES_SOURCE, nameof(request.pathParams.id), request.pathParams.id);
	const component = ComponentFactory.get<ITenantAdminComponent>(componentName);

	await component.remove(request.pathParams.id);

	return {
		statusCode: HttpStatusCode.noContent
	};
}

/**
 * Create the tenant.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @param baseRouteName The base route name for the tenant.
 * @returns The response object with additional http response properties.
 */
export async function tenantCreate(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: ITenantCreateRequest,
	baseRouteName: string
): Promise<ICreatedResponse> {
	Guards.stringValue(ROUTES_SOURCE, nameof(request.body), request.body);
	const component = ComponentFactory.get<ITenantAdminComponent>(componentName);

	const createdId = await component.create(request.body);

	const contextIds = await ContextIdStore.getContextIds();
	const publicOrigin = contextIds?.[HttpContextIdKeys.PublicOrigin];

	const headers: IHttpHeaders = {};
	HttpHeaderHelper.buildId(
		headers,
		createdId,
		HttpUrlHelper.combineOriginPath(publicOrigin, `${baseRouteName}/:id`)
	);

	return {
		statusCode: HttpStatusCode.created,
		headers
	};
}

/**
 * Update the tenant.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function tenantUpdate(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: ITenantUpdateRequest
): Promise<INoContentResponse> {
	Guards.stringValue(ROUTES_SOURCE, nameof(request.pathParams.id), request.pathParams.id);
	Guards.stringValue(ROUTES_SOURCE, nameof(request.body), request.body);
	const component = ComponentFactory.get<ITenantAdminComponent>(componentName);

	await component.update(request.body);

	return {
		statusCode: HttpStatusCode.noContent
	};
}
