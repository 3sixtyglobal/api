// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { HttpMethod } from "@3sixty/web";
import type { IBaseRoute } from "./IBaseRoute.js";
import type { IRestRouteRequestExample } from "./IRestRouteRequestExample.js";
import type { IRestRouteResponseExample } from "./IRestRouteResponseExample.js";
import type { IRestRouteResponseOptions } from "./IRestRouteResponseOptions.js";
import type { IHttpRequest } from "../protocol/IHttpRequest.js";
import type { IHttpRequestContext } from "../protocol/IHttpRequestContext.js";
import type { IHttpResponse } from "../protocol/IHttpResponse.js";

/**
 * Interface which defines a REST route.
 */
export interface IRestRoute<
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	T extends IHttpRequest = any,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	U extends IHttpResponse & IRestRouteResponseOptions = any
> extends IBaseRoute {
	/**
	 * Summary of what task the operation performs.
	 */
	summary: string;

	/**
	 * Tag for the operation.
	 */
	tag: string;

	/**
	 * The http method.
	 */
	method: HttpMethod;

	/**
	 * The handler module.
	 */
	handler: (
		/**
		 * The http request context.
		 */
		httpRequestContext: IHttpRequestContext,

		/**
		 * The request object, combined query param, path params and body.
		 */
		request: T
	) => Promise<U>;

	/**
	 * The type of the request object.
	 */
	requestType?: {
		/**
		 * The object type for the request.
		 */
		type: string;

		/**
		 * The mime type of the request, defaults to "application/json" if there is a body.
		 */
		mimeType?: string;

		/**
		 * Example objects for the request.
		 */
		examples?: IRestRouteRequestExample<T>[];
	};

	/**
	 * The type of the response object.
	 */
	responseType?: {
		/**
		 * The object type of the response.
		 */
		type: string;

		/**
		 * The mime type of the response, defaults to "application/json" if there is a body.
		 */
		mimeType?: string;

		/**
		 * Example objects of the response.
		 */
		examples?: IRestRouteResponseExample<U>[];
	}[];

	/**
	 * Exclude the route from being included in the spec file.
	 */
	excludeFromSpec?: boolean;

	/**
	 * The name of the body size limit to apply to the route, only used by methods that carry a body.
	 * If not provided, the default body size limit will be used. The body size limits are defined in the web server options.
	 */
	bodyLimit?: string;
}
