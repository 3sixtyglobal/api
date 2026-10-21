// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { HeaderTypes, MimeTypes } from "@3sixty/web";

/**
 * The readyz of the server.
 */
export interface IServerReadyzResponse {
	/**
	 * The headers for the response.
	 */
	headers: {
		[HeaderTypes.ContentType]: typeof MimeTypes.PlainText;
	};

	/**
	 * The readyz information for the server.
	 */
	body: "ready" | "not ready";
}
