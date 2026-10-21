// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import {
	HttpErrorHelper,
	type IHttpRequest,
	type IHttpResponse,
	type ISocketRequestContext,
	type ISocketRoute,
	type ISocketRouteProcessor,
	type ISocketServerRequest
} from "@3sixty/api-models";
import { Is, NotFoundError } from "@3sixty/core";
import { nameof } from "@3sixty/nameof";
import { HttpStatusCode } from "@3sixty/web";
import type { ISocketRouteProcessorConstructorOptions } from "../models/ISocketRouteProcessorConstructorOptions.js";

/**
 * Process the socket request and hands it on to the route handler.
 */
export class SocketRouteProcessor implements ISocketRouteProcessor {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<SocketRouteProcessor>();

	/**
	 * Include the stack with errors.
	 * @internal
	 */
	private readonly _includeErrorStack: boolean;

	/**
	 * Create a new instance of SocketRouteProcessor.
	 * @param options Options for the processor.
	 */
	constructor(options?: ISocketRouteProcessorConstructorOptions) {
		this._includeErrorStack = options?.config?.includeErrorStack ?? false;
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return SocketRouteProcessor.CLASS_NAME;
	}

	/**
	 * Process the connected event.
	 * @param request The server request object containing the socket id and other parameters.
	 * @param route The route being requested, if a matching one was found.
	 * @param loggingComponentType The logging component type for the request.
	 * @returns Promise that resolves when the request is processed.
	 */
	public async connected(
		request: ISocketServerRequest,
		route: ISocketRoute | undefined,
		loggingComponentType?: string
	): Promise<void> {
		if (route?.connected) {
			try {
				const socketRequestContext: ISocketRequestContext = {
					socketId: request.socketId,
					serverRequest: request,
					processorState: {},
					loggingComponentType
				};

				await route.connected(socketRequestContext);
			} catch {
				// There is no response to emit for a connected event, so the error is dropped
			}
		}
	}

	/**
	 * Process the disconnected event.
	 * @param request The server request object containing the socket id and other parameters.
	 * @param route The route being requested, if a matching one was found.
	 * @param loggingComponentType The logging component type for the request.
	 * @returns Promise that resolves when the request is processed.
	 */
	public async disconnected(
		request: ISocketServerRequest,
		route: ISocketRoute | undefined,
		loggingComponentType?: string
	): Promise<void> {
		if (route?.disconnected) {
			try {
				const socketRequestContext: ISocketRequestContext = {
					socketId: request.socketId,
					serverRequest: request,
					processorState: {},
					loggingComponentType
				};

				await route.disconnected(socketRequestContext);
			} catch {
				// There is no response to emit for a disconnected event, so the error is dropped
			}
		}
	}

	/**
	 * Process the socket request for the specified route.
	 * @param request The incoming request.
	 * @param response The outgoing response.
	 * @param route The route to process.
	 * @param processorState The state handed through the processors.
	 * @param responseEmitter The function to emit a response.
	 * @param loggingComponentType The logging component type for the request.
	 * @returns A promise that resolves when the request has been processed and the response emitted.
	 */
	public async process(
		request: ISocketServerRequest,
		response: IHttpResponse,
		route: ISocketRoute | undefined,
		processorState: { [id: string]: unknown },
		responseEmitter: (topic: string, response: IHttpResponse) => Promise<void>,
		loggingComponentType?: string
	): Promise<void> {
		// Don't handle the route if another processor has already set the response
		// status code e.g. from an auth processor
		if (Is.empty(response.statusCode)) {
			if (Is.empty(route)) {
				HttpErrorHelper.buildResponse(
					response,
					{
						name: NotFoundError.CLASS_NAME,
						message: `${SocketRouteProcessor.CLASS_NAME}.routeNotFound`,
						properties: {
							notFoundId: request.url
						}
					},
					HttpStatusCode.notFound,
					this._includeErrorStack
				);
			} else {
				try {
					const req: IHttpRequest = {
						pathParams: request.pathParams,
						query: request.query,
						body: request.body
					};

					const socketRequestContext: ISocketRequestContext = {
						socketId: request.socketId,
						serverRequest: request,
						processorState,
						loggingComponentType
					};

					await route.handler(socketRequestContext, req, async (topic, socketRouteResponse) => {
						response.headers = socketRouteResponse?.headers;
						response.body = socketRouteResponse?.body;
						response.statusCode =
							socketRouteResponse.statusCode ?? response.statusCode ?? HttpStatusCode.ok;
						await responseEmitter(topic, response);
					});
				} catch (err) {
					const { error, httpStatusCode } = HttpErrorHelper.processError(
						err,
						this._includeErrorStack
					);

					HttpErrorHelper.buildResponse(response, error, httpStatusCode, this._includeErrorStack);
				}
			}
		}
	}
}
