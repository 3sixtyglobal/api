// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { HttpMethod } from "@3sixty/web";
import type { IHttpRequest } from "./IHttpRequest.js";

/**
 * Model for the standard parameters for an http request.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface IHttpServerRequest<T = any> extends IHttpRequest<T> {
	/**
	 * The request url.
	 */
	url: string;

	/**
	 * The request method.
	 */
	method?: HttpMethod;
}
