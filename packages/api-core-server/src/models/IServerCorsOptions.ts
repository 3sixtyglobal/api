// Copyright 2026 IOTA Stiftung.
// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { HttpMethod } from "@3sixty/web";

/**
 * The resolved CORS options for a server.
 */
export interface IServerCorsOptions {
	/**
	 * The allowed origins.
	 */
	origins: string[];

	/**
	 * Whether the allowed origins include the wildcard, in which case any origin is allowed.
	 */
	hasWildcardOrigin: boolean;

	/**
	 * Whether a wildcard origin reflects the request origin with credentials.
	 */
	wildcardCredentials?: boolean;

	/**
	 * The allowed methods.
	 */
	methods: HttpMethod[];

	/**
	 * The allowed headers.
	 */
	allowedHeaders: string[];

	/**
	 * The exposed headers.
	 */
	exposedHeaders: string[];
}
