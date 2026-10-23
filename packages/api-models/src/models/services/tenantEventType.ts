// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The type of event that occurred for a tenant.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const TenantEventType = {
	/**
	 * The tenant was created.
	 */
	Created: "created",

	/**
	 * The tenant was updated.
	 */
	Updated: "updated",

	/**
	 * The tenant was deleted.
	 */
	Deleted: "deleted"
} as const;

/**
 * The type of event that occurred for a tenant.
 */
export type TenantEventType = (typeof TenantEventType)[keyof typeof TenantEventType];
