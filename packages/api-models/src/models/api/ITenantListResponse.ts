// Copyright 2024 IOTA Stiftung.
// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { HeaderTypes } from "@3sixty/web";
import type { ITenant } from "../services/ITenant.js";

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
