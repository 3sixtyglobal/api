// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IMimeTypeProcessor } from "@3sixty/api-models";
import type { IFastifyWebServerConfig } from "./IFastifyWebServerConfig.js";

/**
 * The options for the Fastify web server constructor.
 */
export interface IFastifyWebServerConstructorOptions {
	/**
	 * The type of the logging component to use, if undefined, no logging will happen.
	 */
	loggingComponentType?: string;

	/**
	 * Additional configuration for the server.
	 */
	config?: IFastifyWebServerConfig;

	/**
	 * Additional MIME type processors.
	 */
	mimeTypeProcessors?: IMimeTypeProcessor[];
}
