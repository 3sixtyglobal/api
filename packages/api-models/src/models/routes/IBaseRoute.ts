// Copyright 2024 IOTA Stiftung.
// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IRouteAuthorization } from "./IRouteAuthorization.js";

/**
 * Interface which defines a route.
 */
export interface IBaseRoute {
	/**
	 * The id of the operation.
	 */
	operationId: string;

	/**
	 * The path to use for routing.
	 */
	path: string;

	/**
	 * Skips the authentication requirement for this route.
	 * @default false
	 */
	skipAuth?: boolean;

	/**
	 * Skips the tenant requirement for this route.
	 * @default false
	 */
	skipTenant?: boolean;

	/**
	 * Requires authorization for this route.
	 * @default true
	 */
	requiresAuthorization?: boolean;

	/**
	 * The default authorization which can access this route, used to seed the RBAC rules.
	 */
	defaultAuthorization?: IRouteAuthorization;

	/**
	 * Set to true to prevent callers from using the overrideTenant query parameter on this route.
	 * Tenant override is allowed by default, but you must hold the escalated privilege role to use it.
	 * @default false
	 */
	disableTenantOverride?: boolean;
}
