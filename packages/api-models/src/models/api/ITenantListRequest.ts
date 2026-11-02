// Copyright 2024 IOTA Stiftung.
// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The list of tenants.
 */
export interface ITenantListRequest {
	/**
	 * The query parameters.
	 */
	query: {
		/**
		 * The condition for the query as JSON version of EntityCondition type.
		 */
		conditions?: string;

		/**
		 * The properties to include in the returned tenants, separated by commas.
		 * If not provided, all properties will be returned.
		 */
		properties?: string;

		/**
		 * The cursor to get the next chunk of tenants.
		 */
		cursor?: string;

		/**
		 * The number of tenants to return.
		 */
		limit?: string;
	};
}
