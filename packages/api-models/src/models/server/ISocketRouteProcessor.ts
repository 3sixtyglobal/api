// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IBaseRouteProcessor } from "./IBaseRouteProcessor.js";
import type { IHttpResponse } from "../protocol/IHttpResponse.js";
import type { ISocketServerRequest } from "../protocol/ISocketServerRequest.js";
import type { ISocketRoute } from "../routes/ISocketRoute.js";

/**
 * The definition for a processor for handling socket routes.
 */
export interface ISocketRouteProcessor extends IBaseRouteProcessor<
	ISocketRoute,
	ISocketServerRequest
> {
	/**
	 * Process the connected event.
	 * @param request The server request object containing the socket id and other parameters.
	 * @param route The route being requested, if a matching one was found.
	 * @param loggingComponentType The logging component type for the request.
	 * @returns A promise that resolves when the request is processed.
	 */
	connected?(
		request: ISocketServerRequest,
		route: ISocketRoute | undefined,
		loggingComponentType?: string
	): Promise<void>;

	/**
	 * Process the disconnected event.
	 * @param request The server request object containing the socket id and other parameters.
	 * @param route The route being requested, if a matching one was found.
	 * @param loggingComponentType The logging component type for the request.
	 * @returns A promise that resolves when the request is processed.
	 */
	disconnected?(
		request: ISocketServerRequest,
		route: ISocketRoute | undefined,
		loggingComponentType?: string
	): Promise<void>;

	/**
	 * Process the REST request for the specified route.
	 * @param request The server request object containing the socket id and other parameters.
	 * @param response The response data to send if any.
	 * @param route The route being requested, if a matching one was found.
	 * @param processorState The state handed through the processors.
	 * @param responseEmitter The function to emit a response.
	 * @param loggingComponentType The logging component type for the request.
	 * @returns A promise that resolves when the request is processed.
	 */
	process?(
		request: ISocketServerRequest,
		response: IHttpResponse,
		route: ISocketRoute | undefined,
		processorState: { [id: string]: unknown },
		responseEmitter: (topic: string, response: IHttpResponse) => Promise<void>,
		loggingComponentType?: string
	): Promise<void>;
}
