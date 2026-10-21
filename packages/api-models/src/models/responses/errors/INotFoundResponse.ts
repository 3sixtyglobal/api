// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IError } from "@3sixty/core";
import type { HttpStatusCode } from "@3sixty/web";

/**
 * The resource you tried to access does not exist, see the content for more details.
 */
export interface INotFoundResponse {
	/**
	 * Response status code.
	 */
	statusCode: typeof HttpStatusCode.notFound;

	/**
	 * The body which contains the error.
	 */
	body: IError & {
		/**
		 * The id if the item that was not found.
		 */
		notFoundId?: string;
	};
}
