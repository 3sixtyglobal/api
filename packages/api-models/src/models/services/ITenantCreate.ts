// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { ITenant } from "./ITenant.js";

/**
 * The details of a tenant to create.
 */
export interface ITenantCreate extends Omit<
	ITenant,
	"id" | "apiKey" | "dateCreated" | "dateModified"
> {
	/**
	 * The unique identifier for the tenant, generated when not provided.
	 */
	id?: string;

	/**
	 * The API key of the tenant, generated when not provided.
	 */
	apiKey?: string;
}
