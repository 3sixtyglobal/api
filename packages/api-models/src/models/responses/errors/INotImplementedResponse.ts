// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IError } from "@3sixty/core";
import type { HttpStatusCode } from "@3sixty/web";

/**
 * The operation that you tried to perform is not implemented, see the content for more details.
 */
export interface INotImplementedResponse {
	/**
	 * Response status code.
	 */
	statusCode: typeof HttpStatusCode.notImplemented;

	/**
	 * The body which contains the error.
	 */
	body: IError;
}
