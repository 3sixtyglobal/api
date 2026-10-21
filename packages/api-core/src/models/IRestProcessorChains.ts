// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IRestRouteProcessor } from "@3sixty/api-models";

/**
 * The REST processor phase chains, bound to their processors when the server is built.
 */
export interface IRestProcessorChains {
	/**
	 * The pre processing phase.
	 */
	pre: NonNullable<IRestRouteProcessor["pre"]>[];

	/**
	 * The main processing phase.
	 */
	process: NonNullable<IRestRouteProcessor["process"]>[];

	/**
	 * The post processing phase.
	 */
	post: NonNullable<IRestRouteProcessor["post"]>[];
}
