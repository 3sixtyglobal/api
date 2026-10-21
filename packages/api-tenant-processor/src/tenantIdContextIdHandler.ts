// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IContextIdHandler } from "@3sixty/context";
import { Converter, Guards, Is } from "@3sixty/core";
import { nameof } from "@3sixty/nameof";

/**
 * Context ID handler that treats a tenant ID as a compact base64url-encoded hex string.
 */
export class TenantIdContextIdHandler implements IContextIdHandler {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<TenantIdContextIdHandler>();

	/**
	 * The class name of the component.
	 * @returns The class name.
	 */
	public className(): string {
		return TenantIdContextIdHandler.CLASS_NAME;
	}

	/**
	 * The short form of the tenant id is the base64 version to compact.
	 * @param value The full context id value.
	 * @returns Short form string.
	 */
	public short(value: string): string {
		return Converter.bytesToBase64Url(Converter.hexToBytes(value));
	}

	/**
	 * The long form version of the context ID, expanded from a short version.
	 * @param value The short form context ID value.
	 * @returns The long form version of the context ID.
	 */
	public long(value: string): string {
		if (Is.stringBase64Url(value)) {
			const bytes = Converter.base64UrlToBytes(value);
			const hex = Converter.bytesToHex(bytes);
			return hex;
		}
		return value;
	}

	/**
	 * Guard the value ensuring length.
	 * @param value The value to guard.
	 * @throws GeneralError if the value is too short.
	 */
	public guard(value: string): void {
		Guards.stringHexLength(TenantIdContextIdHandler.CLASS_NAME, nameof(value), value, 32);
	}
}
