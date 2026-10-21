// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { HeaderTypes, HttpStatusCode } from "@3sixty/web";

/**
 * The favicon for the server.
 */
export interface IServerFavIconResponse {
	/**
	 * Additional response headers.
	 */
	headers?: {
		/**
		 * The content type for the response.
		 */
		[HeaderTypes.ContentType]?: string;
	};

	/**
	 * Response status code.
	 */
	statusCode?: HttpStatusCode;

	/**
	 * The favicon for the server.
	 */
	body?: Uint8Array;
}
