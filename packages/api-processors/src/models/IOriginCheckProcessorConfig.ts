// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Configuration for the origin check processor.
 */
export interface IOriginCheckProcessorConfig {
	/**
	 * The cross origins allowed to make cookie authenticated requests, normally the CORS origins,
	 * a string can be comma separated. The wildcard "*" is ignored.
	 */
	allowedOrigins?: string | string[];
}
