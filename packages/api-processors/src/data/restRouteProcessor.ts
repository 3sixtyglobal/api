// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import {
	HttpErrorHelper,
	type IHttpRequest,
	type IHttpResponse,
	type IHttpServerRequest,
	type IRestRoute,
	type IRestRouteProcessor,
	type IRestRouteResponseOptions
} from "@3sixty/api-models";
import { Is, NotFoundError } from "@3sixty/core";
import { nameof } from "@3sixty/nameof";
import { HeaderTypes, HttpStatusCode, MimeTypes } from "@3sixty/web";
import type { IRestRouteProcessorConstructorOptions } from "../models/IRestRouteProcessorConstructorOptions.js";

/**
 * Process the REST request and hands it on to the route handler.
 */
export class RestRouteProcessor implements IRestRouteProcessor {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<RestRouteProcessor>();

	/**
	 * Include the stack with errors.
	 * @internal
	 */
	private readonly _includeErrorStack: boolean;

	/**
	 * Create a new instance of RouteProcessor.
	 * @param options Options for the processor.
	 */
	constructor(options?: IRestRouteProcessorConstructorOptions) {
		this._includeErrorStack = options?.config?.includeErrorStack ?? false;
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return RestRouteProcessor.CLASS_NAME;
	}

	/**
	 * Process the REST request for the specified route.
	 * @param request The incoming request.
	 * @param response The outgoing response.
	 * @param route The route to process.
	 * @param processorState The state handed through the processors.
	 * @param componentTypes The component types for the request.
	 * @param componentTypes.loggingComponentType The logging component type.
	 * @returns A promise that resolves when the request has been processed and the response populated.
	 */
	public async process(
		request: IHttpServerRequest,
		response: IHttpResponse,
		route: IRestRoute | undefined,
		processorState: { [id: string]: unknown },
		componentTypes?: {
			loggingComponentType?: string;
		}
	): Promise<void> {
		// Don't handle the route if another processor has already set the response
		// status code e.g. from an auth processor
		if (Is.empty(response.statusCode)) {
			if (Is.empty(route)) {
				HttpErrorHelper.buildResponse(
					response,
					{
						name: NotFoundError.CLASS_NAME,
						message: `${RestRouteProcessor.CLASS_NAME}.routeNotFound`,
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
						headers: request.headers,
						pathParams: request.pathParams,
						query: request.query,
						body: request.body
					};

					const restRouteResponse: IHttpResponse & IRestRouteResponseOptions = await route.handler(
						{
							serverRequest: request,
							processorState,
							loggingComponentType: componentTypes?.loggingComponentType
						},
						req
					);

					let statusCode: HttpStatusCode =
						restRouteResponse.statusCode ?? response.statusCode ?? HttpStatusCode.ok;

					const headers = restRouteResponse?.headers ?? {};

					if (Is.empty(restRouteResponse?.body)) {
						// If there is no custom status code and the body is empty
						// use the no content response and set the length to 0
						headers[HeaderTypes.ContentLength] = "0";
						// Only change to no content if the status code is ok
						// This could be something like a created status code
						// which is successful but has no content
						if (statusCode === HttpStatusCode.ok) {
							statusCode = HttpStatusCode.noContent;
						}
					} else {
						// Only set the content type if there is a body
						// If there are custom response types for the route then use them
						// instead of the default application/json
						headers[HeaderTypes.ContentType] =
							restRouteResponse?.attachment?.mimeType ??
							restRouteResponse.headers?.[HeaderTypes.ContentType] ??
							`${MimeTypes.Json}; charset=utf-8`;

						// If there are filename or inline options set then add the content disposition
						if (
							Is.stringValue(restRouteResponse?.attachment?.filename) ||
							Is.boolean(restRouteResponse?.attachment?.inline)
						) {
							let filename = "";
							if (Is.stringValue(restRouteResponse?.attachment?.filename)) {
								filename = `; filename="${restRouteResponse?.attachment?.filename}"`;
							}
							headers[HeaderTypes.ContentDisposition] =
								`${restRouteResponse?.attachment?.inline ? "inline" : "attachment"}${filename}`;
						}

						// If this is a binary response then set the content length
						if (Is.uint8Array(restRouteResponse?.body)) {
							const contentLength = restRouteResponse.body.length;
							headers[HeaderTypes.ContentLength] = contentLength.toString();
						}

						response.body = restRouteResponse?.body;
					}

					response.headers = headers;
					response.statusCode = statusCode;
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
