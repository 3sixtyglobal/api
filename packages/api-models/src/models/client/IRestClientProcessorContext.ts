// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { HttpMethod, IHttpHeaders } from "@3sixty/web";

/**
 * The context of a rest client processor.
 */
export interface IRestClientProcessorContext {
	/**
	 * The name of the REST client making the request.
	 */
	restClientClassName: string;

	/**
	 * The base URL of the request.
	 */
	baseUrl: string;

	/**
	 * The route template before path parameter substitution.
	 */
	routeTemplate: string;

	/**
	 * The route being requested.
	 */
	route: string;

	/**
	 * The HTTP method of the request.
	 */
	method: HttpMethod;

	/**
	 * The headers being sent with the request.
	 */
	headers: IHttpHeaders;

	/**
	 * The timeout for the request in milliseconds.
	 */
	timeout?: number;

	/**
	 * Whether to include credentials in the request.
	 */
	includeCredentials?: boolean;

	/**
	 * The request being made.
	 */
	body?: string;
}
