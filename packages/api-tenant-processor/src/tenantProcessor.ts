// Copyright 2025 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import {
	HttpErrorHelper,
	type IBaseRoute,
	type IBaseRouteProcessor,
	type IHttpResponse,
	type IHttpServerRequest,
	type ITenant,
	type ITenantAdminComponent,
	HttpContextIdKeys
} from "@3sixty/api-models";
import { ContextIdKeys, type IContextIds } from "@3sixty/context";
import {
	BaseError,
	ComponentFactory,
	GuardError,
	Is,
	NotFoundError,
	UnauthorizedError
} from "@3sixty/core";
import { nameof } from "@3sixty/nameof";
import { HttpStatusCode } from "@3sixty/web";
import type { ITenantProcessorConstructorOptions } from "./models/ITenantProcessorConstructorOptions.js";

/**
 * Handles incoming api keys and maps them to tenant ids.
 */
export class TenantProcessor implements IBaseRouteProcessor {
	/**
	 * The default name for the api key header.
	 * @internal
	 */
	public static readonly DEFAULT_API_KEY_NAME: string = "x-api-key";

	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<TenantProcessor>();

	/**
	 * The default endpoints to match for api key processing.
	 * @internal
	 */
	private static readonly _DEFAULT_API_KEY_ENDPOINTS: string[] = ["/login$"];

	/**
	 * The component used to resolve tenants, which also provides the lookup caching.
	 * @internal
	 */
	private readonly _tenantAdminComponent: ITenantAdminComponent;

	/**
	 * The key in the header to look for the api key.
	 * @internal
	 */
	private readonly _apiKeyName: string;

	/**
	 * The list of regexp patterns to match against the request URL to determine if the api key header should be processed.
	 * @internal
	 */
	private readonly _apiKeyEndpoints: RegExp[];

	/**
	 * Include the stack with errors.
	 * @internal
	 */
	private readonly _includeErrorStack: boolean;

	/**
	 * Create a new instance of TenantProcessor.
	 * @param options Options for the processor.
	 */
	constructor(options?: ITenantProcessorConstructorOptions) {
		this._tenantAdminComponent = ComponentFactory.get<ITenantAdminComponent>(
			options?.tenantAdminComponentType ?? "tenant-admin"
		);
		this._apiKeyName = options?.config?.apiKeyName ?? TenantProcessor.DEFAULT_API_KEY_NAME;
		this._apiKeyEndpoints = (
			options?.config?.apiKeyEndpoints ?? TenantProcessor._DEFAULT_API_KEY_ENDPOINTS
		).map((ep: string) => new RegExp(ep));
		this._includeErrorStack = options?.config?.includeErrorStack ?? false;
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return TenantProcessor.CLASS_NAME;
	}

	/**
	 * Pre process the REST request for the specified route.
	 * @param request The incoming request.
	 * @param response The outgoing response.
	 * @param route The route to process.
	 * @param contextIds The context IDs of the request.
	 * @param processorState The state handed through the processors.
	 * @returns A promise that resolves when the tenant context has been resolved and injected, or an error response set.
	 */
	public async pre(
		request: IHttpServerRequest,
		response: IHttpResponse,
		route: IBaseRoute | undefined,
		contextIds: IContextIds,
		processorState: { [id: string]: unknown }
	): Promise<void> {
		if (!Is.empty(route) && !(route.skipTenant ?? false)) {
			try {
				let tenant;
				const isSkipAuth = route.skipAuth ?? false;
				const urlPath = new URL(request.url, "http://localhost").pathname;
				const isApiKeyEndpoint = this._apiKeyEndpoints.some(re => re.test(urlPath));

				if (isApiKeyEndpoint) {
					const apiKey = request.headers?.[this._apiKeyName] ?? request.query?.[this._apiKeyName];
					if (Is.stringValue(apiKey)) {
						tenant = await this.resolveByApiKey(apiKey);
					} else {
						throw new UnauthorizedError(TenantProcessor.CLASS_NAME, "missingApiKey", {
							keyName: this._apiKeyName
						});
					}
				} else {
					const organizationIdQueryParam = request.query?.[ContextIdKeys.Organization];
					if (Is.stringValue(organizationIdQueryParam)) {
						tenant = await this.resolveByOrganizationId(organizationIdQueryParam);
					} else if (isSkipAuth) {
						throw new UnauthorizedError(TenantProcessor.CLASS_NAME, "missingOrganizationId", {
							paramName: ContextIdKeys.Organization
						});
					}
				}

				if (!Is.empty(tenant)) {
					contextIds[ContextIdKeys.Tenant] = tenant.id;
					contextIds[ContextIdKeys.Organization] = tenant.organizationId;

					// If the tenant has a custom public origin, we set it in the context for downstream processors to use.
					if (Is.stringValue(tenant.publicOrigin)) {
						contextIds[HttpContextIdKeys.PublicOrigin] = tenant.publicOrigin;
					}
				}
			} catch (err) {
				HttpErrorHelper.buildResponse(
					response,
					BaseError.fromError(err),
					HttpStatusCode.unauthorized,
					this._includeErrorStack
				);
			}
		}
	}

	/**
	 * Resolve the tenant context from an api key.
	 * @param apiKey The api key sent by the caller.
	 * @returns The tenant associated with the api key.
	 * @throws UnauthorizedError if no tenant matches the api key.
	 * @internal
	 */
	private async resolveByApiKey(apiKey: string): Promise<ITenant> {
		try {
			return await this._tenantAdminComponent.getByApiKey(apiKey);
		} catch (err) {
			if (this.isLookupFailure(err)) {
				throw new UnauthorizedError(
					TenantProcessor.CLASS_NAME,
					"apiKeyNotFound",
					{ key: apiKey },
					err
				);
			}
			throw err;
		}
	}

	/**
	 * Resolve the tenant context from a plain organization query param.
	 * Matches against the organization id or one of the legacy organization ids.
	 * @param organizationId The organization id from the query param.
	 * @returns The tenant associated with the organization id.
	 * @throws UnauthorizedError if no tenant matches the organization id.
	 * @internal
	 */
	private async resolveByOrganizationId(organizationId: string): Promise<ITenant> {
		try {
			return await this._tenantAdminComponent.getTenantByOrganizationId(organizationId, true);
		} catch (err) {
			if (this.isLookupFailure(err)) {
				throw new UnauthorizedError(
					TenantProcessor.CLASS_NAME,
					"organizationIdNotFound",
					{ organizationId },
					err
				);
			}
			throw err;
		}
	}

	/**
	 * Determine whether a tenant lookup failure means the credential is unusable.
	 * A credential that matches no tenant, or is not even well formed, is unauthorized; anything
	 * else is a genuine fault and is passed through untouched.
	 * @param err The error raised by the tenant admin component.
	 * @returns True if the credential should be reported as unauthorized.
	 * @internal
	 */
	private isLookupFailure(err: unknown): boolean {
		return (
			BaseError.isErrorName(err, NotFoundError.CLASS_NAME) ||
			BaseError.isErrorName(err, GuardError.CLASS_NAME)
		);
	}
}
