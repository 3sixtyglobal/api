// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { ITenant } from "@3sixty/api-models";

/**
 * The tenant get response.
 */
export interface ITenantGetResponse {
	/**
	 * The tenant.
	 */
	body: ITenant;
}
