// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The liveness status of the server.
 */
export const LivenessStatus = {
	/**
	 * The server is running.
	 */
	Alive: "alive",

	/**
	 * The server is not running.
	 */
	Dead: "dead"
} as const;

/**
 * The liveness status of the server.
 */
export type LivenessStatus = (typeof LivenessStatus)[keyof typeof LivenessStatus];
