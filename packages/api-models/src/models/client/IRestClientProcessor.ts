// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IComponent } from "@3sixty/core";
import type { IRestClientProcessorContext } from "./IRestClientProcessorContext.js";

/**
 * A processor that participates in an outbound REST request.
 */
export interface IRestClientProcessor extends IComponent {
	/**
	 * Run the processor before the fetch takes place.
	 * @param context The details of the request being made.
	 * @param next Performs the request, or calls the next processor in the chain.
	 * @returns The result of next.
	 */
	pre?(context: IRestClientProcessorContext, next: () => Promise<Response>): Promise<Response>;

	/**
	 * Run the processor after the fetch completes.
	 * @param context The details of the request that was made.
	 * @param response The response from the request.
	 * @param next Performs the post processing, or calls the next processor in the chain.
	 * @returns The result of next.
	 */
	post?(
		context: IRestClientProcessorContext,
		response: Response,
		next: () => Promise<Response>
	): Promise<Response>;
}
