// Copyright 2026 IOTA Stiftung.
// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IMimeTypeProcessor } from "@3sixty/api-models";

/**
 * Options for constructing a base server.
 */
export interface IBaseServerConstructorOptions {
	/**
	 * The type of the logging component to use, defaults to no logging.
	 */
	loggingComponentType?: string;

	/**
	 * The mime type processors to use for the request bodies.
	 */
	mimeTypeProcessors?: IMimeTypeProcessor[];

	/**
	 * Include the stack with errors.
	 * @default false
	 */
	includeErrorStack?: boolean;
}
