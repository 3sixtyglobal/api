// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { ITenant } from "@3sixty/api-models";

/**
 * The tenant to create.
 */
export interface ITenantCreateRequest {
	/**
	 * The tenant to create.
	 */
	body: Omit<ITenant, "id" | "dateCreated" | "dateModified"> & { id?: string };
}
