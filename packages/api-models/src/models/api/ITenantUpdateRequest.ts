// Copyright 2024 IOTA Stiftung.
// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { ITenantUpdate } from "../services/ITenantUpdate.js";

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
	body: ITenantUpdate;
}
