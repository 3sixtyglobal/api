// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IHttpHeaders } from "@3sixty/web";
import type { IHttpRequestPathParams } from "./IHttpRequestPathParams.js";
import type { IHttpRequestQuery } from "./IHttpRequestQuery.js";

/**
 * Model for the standard parameters for an http request.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface IHttpRequest<T = any> {
	/**
	 * Incoming Http Headers.
	 */
	headers?: IHttpHeaders;

	/**
	 * The path parameters.
	 */
	pathParams?: IHttpRequestPathParams;

	/**
	 * The query parameters.
	 */
	query?: IHttpRequestQuery;

	/**
	 * Data to return send as the body.
	 */
	body?: T;
}
