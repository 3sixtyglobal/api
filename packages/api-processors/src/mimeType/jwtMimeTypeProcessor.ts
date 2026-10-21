// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IMimeTypeProcessor } from "@3sixty/api-models";
import { Converter } from "@3sixty/core";
import { nameof } from "@3sixty/nameof";
import { MimeTypes } from "@3sixty/web";

/**
 * Process the JWT mime type.
 */
export class JwtMimeTypeProcessor implements IMimeTypeProcessor {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<JwtMimeTypeProcessor>();

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return JwtMimeTypeProcessor.CLASS_NAME;
	}

	/**
	 * Get the MIME types that this handler can handle.
	 * @returns The MIME types that this handler can handle.
	 */
	public getTypes(): string[] {
		return [MimeTypes.Jwt];
	}

	/**
	 * Handle content.
	 * @param body The body to process.
	 * @returns The processed body.
	 */
	public async handle(body: Uint8Array): Promise<unknown> {
		return Converter.bytesToUtf8(body);
	}
}
