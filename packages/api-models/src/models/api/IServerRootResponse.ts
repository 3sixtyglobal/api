// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { HeaderTypes, MimeTypes } from "@3sixty/web";

/**
 * The root text for the server.
 */
export interface IServerRootResponse {
	/**
	 * The headers for the response.
	 */
	headers: {
		[HeaderTypes.ContentType]: typeof MimeTypes.PlainText;
	};

	/**
	 * The root text for the server.
	 */
	body: string;
}
