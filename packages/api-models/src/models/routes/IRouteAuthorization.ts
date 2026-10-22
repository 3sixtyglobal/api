// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Interface which defines the default authorization permission for a route used to seed the RBAC rules.
 */
export interface IRouteAuthorization {
	/**
	 * The permission string for the route.
	 */
	permission: string;

	/**
	 * The optional role string for the route.
	 */
	role?: string;

	/**
	 * The optional array of inherited permissions for the route.
	 */
	inherits?: string[];
}
