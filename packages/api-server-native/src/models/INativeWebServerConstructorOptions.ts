// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IMimeTypeProcessor } from "@3sixty/api-models";
import type { INativeWebServerConfig } from "./INativeWebServerConfig.js";

/**
 * The options for the native web server constructor.
 */
export interface INativeWebServerConstructorOptions {
	/**
	 * The type of the logging component to use, if undefined, no logging will happen.
	 */
	loggingComponentType?: string;

	/**
	 * Additional configuration for the server.
	 */
	config?: INativeWebServerConfig;

	/**
	 * Additional MIME type processors.
	 */
	mimeTypeProcessors?: IMimeTypeProcessor[];
}
