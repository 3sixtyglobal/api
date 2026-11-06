// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IMimeTypeProcessor } from "@3sixty/api-models";
import { Converter, Is } from "@3sixty/core";
import { nameof } from "@3sixty/nameof";
import { MimeTypes } from "@3sixty/web";

/**
 * Process the application/x-www-form-urlencoded mime type, such as an OAuth 2.0 token request,
 * into an object of its fields. A field given more than once becomes an array of its values.
 */
export class FormUrlEncodedMimeTypeProcessor implements IMimeTypeProcessor {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<FormUrlEncodedMimeTypeProcessor>();

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return FormUrlEncodedMimeTypeProcessor.CLASS_NAME;
	}

	/**
	 * Get the MIME types that this handler can handle.
	 * @returns The MIME types that this handler can handle.
	 */
	public getTypes(): string[] {
		return [MimeTypes.FormUrlEncoded];
	}

	/**
	 * Handle content.
	 * @param body The body to process.
	 * @returns The fields of the form.
	 */
	public async handle(body: Uint8Array): Promise<unknown> {
		const fields: { [name: string]: string | string[] } = {};
		for (const [name, value] of new URLSearchParams(Converter.bytesToUtf8(body))) {
			const existing = fields[name];
			if (Is.undefined(existing)) {
				fields[name] = value;
			} else if (Is.array<string>(existing)) {
				existing.push(value);
			} else {
				fields[name] = [existing, value];
			}
		}
		return fields;
	}
}
