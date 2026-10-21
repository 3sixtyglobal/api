// Copyright 2025 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { RandomHelper } from "@3sixty/core";

/**
 * Helper class for tenant id related operations.
 */
export class TenantIdHelper {
	/**
	 * Generates a new tenant ID.
	 * @returns A new tenant ID.
	 */
	public static generateTenantId(): string {
		return RandomHelper.generateUuidV7("compact");
	}

	/**
	 * Generates a new API Key.
	 * @returns A new API Key.
	 */
	public static generateApiKey(): string {
		return RandomHelper.generateUuidV7("compact");
	}
}
