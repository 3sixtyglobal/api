// Copyright 2024 IOTA Stiftung.
// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { ITenant } from "../services/ITenant.js";

/**
 * The tenant get response.
 */
export interface ITenantGetResponse {
	/**
	 * The tenant.
	 */
	body: ITenant;
}
