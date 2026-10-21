// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { ITenant } from "@3sixty/api-models";

/**
 * The tenant to update.
 */
export interface ITenantUpdateRequest {
	/**
	 * The path parameters.
	 */
	pathParams: {
		/**
		 * The id of the tenant to update.
		 */
		id: string;
	};

	/**
	 * The tenant to update.
	 */
	body: Omit<ITenant, "id" | "dateCreated" | "dateModified">;
}
