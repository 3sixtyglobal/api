// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The tenant to get by organization id.
 */
export interface ITenantGetByOrganizationIdRequest {
	/**
	 * The path parameters.
	 */
	pathParams: {
		/**
		 * The organization id of the tenant to get.
		 */
		organizationId: string;
	};

	/**
	 * The query parameters.
	 */
	query?: {
		/**
		 * Whether to also search the legacy organization ids, defaults to false.
		 */
		includeLegacy?: string;
	};
}
