// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The names of the well-known body size limits for routes.
 */
export const HttpBodyLimit = {
	/**
	 * The server default limit.
	 */
	Default: "default",

	/**
	 * A large limit for routes carrying file payloads, defaults to 25 MiB.
	 */
	Large: "large"
} as const;

/**
 * The names of the well-known body size limits for routes.
 */
export type HttpBodyLimit = (typeof HttpBodyLimit)[keyof typeof HttpBodyLimit];
