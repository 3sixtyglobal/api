// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { ITenant } from "./ITenant.js";

/**
 * The details of a tenant to update.
 */
export interface ITenantUpdate extends Partial<Omit<ITenant, "dateCreated" | "dateModified">> {
	/**
	 * The unique identifier of the tenant to update.
	 */
	id?: string;
}
