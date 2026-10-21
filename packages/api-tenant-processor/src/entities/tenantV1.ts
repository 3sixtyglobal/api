// Copyright 2025 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { entity, property } from "@3sixty/entity";

/**
 * Class defining the storage for node tenants.
 */
@entity({ version: 1 })
export class TenantV1 {
	/**
	 * The unique identifier for the tenant.
	 */
	@property({ type: "string", isPrimary: true })
	public id!: string;

	/**
	 * The api key for the tenant.
	 */
	@property({ type: "string", isSecondary: true })
	public apiKey!: string;

	/**
	 * The label of the tenant.
	 */
	@property({ type: "string" })
	public label!: string;

	/**
	 * The date the tenant was created.
	 */
	@property({ type: "string" })
	public dateCreated!: string;

	/**
	 * The date the tenant was modified.
	 */
	@property({ type: "string" })
	public dateModified!: string;

	/**
	 * The origin available to the public for accessing the API.
	 */
	@property({ type: "string", optional: true, isSecondary: true })
	public publicOrigin?: string;

	/**
	 * The organization id for the tenant.
	 */
	@property({ type: "string", isSecondary: true })
	public organizationId!: string;

	/**
	 * Optional list of organization aliases that can be used for legacy lookups, indexed format.
	 */
	@property({ type: "string", optional: true, isSecondary: true })
	public organizationIdLegacy?: string;
}
