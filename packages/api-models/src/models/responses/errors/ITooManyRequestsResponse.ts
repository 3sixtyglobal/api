// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IError } from "@3sixty/core";
import type { HttpStatusCode } from "@3sixty/web";

/**
 * The request resulted in too many requests, see the content for more details.
 */
export interface ITooManyRequestsResponse {
	/**
	 * Response status code.
	 */
	statusCode: typeof HttpStatusCode.tooManyRequests;

	/**
	 * The body which contains the error.
	 */
	body: IError;
}
