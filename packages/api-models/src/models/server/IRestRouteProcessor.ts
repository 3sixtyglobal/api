// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IBaseRouteProcessor } from "./IBaseRouteProcessor.js";
import type { IHttpResponse } from "../protocol/IHttpResponse.js";
import type { IHttpServerRequest } from "../protocol/IHttpServerRequest.js";
import type { IRestRoute } from "../routes/IRestRoute.js";

/**
 * The definition for a processor for handling REST routes.
 */
export interface IRestRouteProcessor extends IBaseRouteProcessor<IRestRoute> {
	/**
	 * Process the REST request for the specified route.
	 * @param request The request to handle.
	 * @param response The response data to send if any.
	 * @param route The route being requested, if a matching one was found.
	 * @param processorState The state handed through the processors.
	 * @param componentTypes The component types for the request.
	 * @param componentTypes.loggingComponentType The logging component type.
	 * @returns A promise that resolves when the request is processed.
	 */
	process?(
		request: IHttpServerRequest,
		response: IHttpResponse,
		route: IRestRoute | undefined,
		processorState: { [id: string]: unknown },
		componentTypes?: {
			loggingComponentType?: string;
		}
	): Promise<void>;
}
