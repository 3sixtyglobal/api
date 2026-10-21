// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IMimeTypeProcessor } from "@3sixty/api-models";
import { GeneralError, Is, ObjectHelper } from "@3sixty/core";
import { nameof } from "@3sixty/nameof";
import { MimeTypes } from "@3sixty/web";

/**
 * Process the JSON-LD mime type.
 */
export class JsonLdMimeTypeProcessor implements IMimeTypeProcessor {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<JsonLdMimeTypeProcessor>();

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return JsonLdMimeTypeProcessor.CLASS_NAME;
	}

	/**
	 * Get the MIME types that this handler can handle.
	 * @returns The MIME types that this handler can handle.
	 */
	public getTypes(): string[] {
		return [MimeTypes.JsonLd];
	}

	/**
	 * Handle content.
	 * @param body The body to process.
	 * @returns The processed body.
	 */
	public async handle(body: Uint8Array): Promise<unknown> {
		const json = ObjectHelper.fromBytes<{ "@context"?: string }>(body);

		if (Is.empty(json) || Is.empty(json["@context"])) {
			throw new GeneralError(JsonLdMimeTypeProcessor.CLASS_NAME, "invalidJsonLd");
		}

		return json;
	}
}
