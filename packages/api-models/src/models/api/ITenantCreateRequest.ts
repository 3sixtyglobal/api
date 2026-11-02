// Copyright 2024 IOTA Stiftung.
// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { ITenantCreate } from "../services/ITenantCreate.js";

/**
 * The tenant to create.
 */
export interface ITenantCreateRequest {
	/**
	 * The tenant to create.
	 */
	body: ITenantCreate;
}
