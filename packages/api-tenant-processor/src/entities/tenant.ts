// Copyright 2025 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { entity, property } from "@3sixty/entity";

/**
 * Class defining the storage for node tenants.
 */
@entity({ version: 2 })
export class Tenant {
	/**
	 * The unique identifier for the tenant.
	 */
	@property({ type: "string", isPrimary: true, maxLength: 32 })
	public id!: string;

	/**
	 * The api key for the tenant.
	 */
	@property({ type: "string", maxLength: 32, isSecondary: true })
	public apiKey!: string;

	/**
	 * The label of the tenant.
	 */
	@property({ type: "string", maxLength: 256 })
	public label!: string;

	/**
	 * The date the tenant was created.
	 */
	@property({ type: "string", format: "date-time" })
	public dateCreated!: string;

	/**
	 * The date the tenant was modified.
	 */
	@property({ type: "string", format: "date-time" })
	public dateModified!: string;

	/**
	 * The origin available to the public for accessing the API.
	 */
	@property({ type: "string", format: "uri", optional: true, isSecondary: true })
	public publicOrigin?: string;

	/**
	 * The organization id for the tenant.
	 */
	@property({ type: "string", maxLength: 255, isSecondary: true })
	public organizationId!: string;

	/**
	 * Optional list of organization aliases that can be used for legacy lookups, indexed format.
	 */
	@property({ type: "array", itemType: "string", optional: true, isSecondary: true })
	public organizationIdLegacy?: string[];
}
