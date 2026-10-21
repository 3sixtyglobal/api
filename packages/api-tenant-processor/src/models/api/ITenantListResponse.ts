// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { ITenant } from "@3sixty/api-models";
import type { HeaderTypes } from "@3sixty/web";

/**
 * The list of tenants.
 */
export interface ITenantListResponse {
	/**
	 * The headers which can be used to include the cursor.
	 */
	headers?: {
		[HeaderTypes.Link]?: string | string[];
	};

	/**
	 * The list of tenants.
	 */
	body: ITenant[];
}
