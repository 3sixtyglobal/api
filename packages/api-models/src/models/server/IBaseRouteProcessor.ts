// Copyright 2024 IOTA Stiftung.
// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IContextIds } from "@3sixty/context";
import type { IComponent } from "@3sixty/core";
import type { IHttpResponse } from "../protocol/IHttpResponse.js";
import type { IHttpServerRequest } from "../protocol/IHttpServerRequest.js";
import type { IBaseRoute } from "../routes/IBaseRoute.js";

/**
 * The definition for a base processor for handling REST routes.
 */
export interface IBaseRouteProcessor<T = IBaseRoute, R = IHttpServerRequest> extends IComponent {
	/**
	 * Pre process the REST request for the specified route.
	 * @param request The request to handle.
	 * @param response The response data to send if any.
	 * @param route The route being requested, if a matching one was found.
	 * @param contextIds The context IDs of the request.
	 * @param processorState The state handed through the processors.
	 * @param componentTypes The component types for the request.
	 * @param componentTypes.loggingComponentType The logging component type.
	 * @returns Promise that resolves when the request is processed.
	 */
	pre?(
		request: R,
		response: IHttpResponse,
		route: T | undefined,
		contextIds: IContextIds,
		processorState: { [id: string]: unknown },
		componentTypes?: {
			loggingComponentType?: string;
		}
	): Promise<void>;

	/**
	 * Post process the REST request for the specified route.
	 * @param request The request to handle.
	 * @param response The response data to send if any.
	 * @param route The route being requested, if a matching one was found.
	 * @param contextIds The context IDs of the request.
	 * @param processorState The state handed through the processors.
	 * @param componentTypes The component types for the request.
	 * @param componentTypes.loggingComponentType The logging component type.
	 * @returns Promise that resolves when the request is processed.
	 */
	post?(
		request: R,
		response: IHttpResponse,
		route: T | undefined,
		contextIds: IContextIds,
		processorState: { [id: string]: unknown },
		componentTypes?: {
			loggingComponentType?: string;
		}
	): Promise<void>;
}
