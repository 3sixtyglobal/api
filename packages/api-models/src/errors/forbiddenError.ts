// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { BaseError } from "@3sixty/core";
import { nameof } from "@3sixty/nameof";

/**
 * Class to handle errors which are triggered by forbidden actions.
 */
export class ForbiddenError extends BaseError {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<ForbiddenError>();

	/**
	 * Create a new instance of ForbiddenError.
	 * @param source The source of the error.
	 * @param message The message as a code.
	 * @param properties Any additional information for the error.
	 * @param cause The cause of the error if we have wrapped another error.
	 */
	constructor(
		source: string,
		message: string,
		properties?: { [id: string]: unknown },
		cause?: unknown
	) {
		super(ForbiddenError.CLASS_NAME, source, message, properties, cause);
	}
}
