// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { ISocketRouteProcessor } from "@3sixty/api-models";

/**
 * The socket processor phase chains, bound to their processors when the server is built.
 */
export interface ISocketProcessorChains {
	/**
	 * The socket connected phase.
	 */
	connected: NonNullable<ISocketRouteProcessor["connected"]>[];

	/**
	 * The socket disconnected phase.
	 */
	disconnected: NonNullable<ISocketRouteProcessor["disconnected"]>[];

	/**
	 * The pre processing phase.
	 */
	pre: NonNullable<ISocketRouteProcessor["pre"]>[];

	/**
	 * The main processing phase.
	 */
	process: NonNullable<ISocketRouteProcessor["process"]>[];

	/**
	 * The post processing phase.
	 */
	post: NonNullable<ISocketRouteProcessor["post"]>[];
}
