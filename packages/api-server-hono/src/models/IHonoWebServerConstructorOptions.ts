// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IMimeTypeProcessor } from "@3sixty/api-models";
import type { IHonoWebServerConfig } from "./IHonoWebServerConfig.js";

/**
 * The options for the Hono web server constructor.
 */
export interface IHonoWebServerConstructorOptions {
	/**
	 * The type of the logging component to use, if undefined, no logging will happen.
	 */
	loggingComponentType?: string;

	/**
	 * Additional configuration for the server.
	 */
	config?: IHonoWebServerConfig;

	/**
	 * Additional MIME type processors.
	 */
	mimeTypeProcessors?: IMimeTypeProcessor[];
}
