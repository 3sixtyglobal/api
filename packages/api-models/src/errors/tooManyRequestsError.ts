// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { BaseError } from "@3sixty/core";
import { nameof } from "@3sixty/nameof";

/**
 * Class to handle errors which are triggered by too many requests.
 */
export class TooManyRequestsError extends BaseError {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<TooManyRequestsError>();

	/**
	 * Create a new instance of TooManyRequestsError.
	 * @param source The source of the error.
	 * @param message The message as a code.
	 * @param requestCount The current request count.
	 * @param nextRequestTime The time when the next request can be made, as date ISO string.
	 * @param properties Any additional information for the error.
	 * @param cause The cause of the error if we have wrapped another error.
	 */
	constructor(
		source: string,
		message: string,
		requestCount: number,
		nextRequestTime: string,
		properties?: { [id: string]: unknown },
		cause?: unknown
	) {
		super(
			TooManyRequestsError.CLASS_NAME,
			source,
			message,
			{ requestCount, nextRequestTime, ...properties },
			cause
		);
	}
}
