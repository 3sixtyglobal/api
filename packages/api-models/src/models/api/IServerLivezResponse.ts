// Copyright 2024 IOTA Stiftung.
// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { HeaderTypes, MimeTypes } from "@3sixty/web";
import type { LivenessStatus } from "../livenessStatus.js";

/**
 * The livez of the server.
 */
export interface IServerLivezResponse {
	/**
	 * The headers for the response.
	 */
	headers: {
		[HeaderTypes.ContentType]: typeof MimeTypes.PlainText;
	};

	/**
	 * The livez information for the server.
	 */
	body: LivenessStatus;
}
