// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import {
	AlreadyExistsError,
	BaseError,
	ConflictError,
	GuardError,
	type IError,
	NotFoundError,
	NotImplementedError,
	UnauthorizedError,
	UnprocessableError,
	ValidationError
} from "@3sixty/core";
import { HeaderTypes, HttpStatusCode, MimeTypes } from "@3sixty/web";
import { ForbiddenError } from "../errors/forbiddenError.js";
import { TooManyRequestsError } from "../errors/tooManyRequestsError.js";
import type { IHttpResponse } from "../models/protocol/IHttpResponse.js";

/**
 * Class to help with processing http errors.
 */
export class HttpErrorHelper {
	/**
	 * Mapping of error types to status codes.
	 */
	public static readonly ERROR_TYPE_MAP: { [id: string]: HttpStatusCode } = {
		[GuardError.CLASS_NAME]: HttpStatusCode.badRequest,
		[ValidationError.CLASS_NAME]: HttpStatusCode.badRequest,
		[ConflictError.CLASS_NAME]: HttpStatusCode.conflict,
		[AlreadyExistsError.CLASS_NAME]: HttpStatusCode.conflict,
		[NotFoundError.CLASS_NAME]: HttpStatusCode.notFound,
		[UnauthorizedError.CLASS_NAME]: HttpStatusCode.unauthorized,
		[NotImplementedError.CLASS_NAME]: HttpStatusCode.notImplemented,
		[UnprocessableError.CLASS_NAME]: HttpStatusCode.unprocessableEntity,
		[TooManyRequestsError.CLASS_NAME]: HttpStatusCode.tooManyRequests,
		[ForbiddenError.CLASS_NAME]: HttpStatusCode.forbidden
	};

	/**
	 * Process the errors from the routes.
	 * @param err The error to process.
	 * @param includeStack Should the stack be included in the error.
	 * @returns The status code and additional error data.
	 */
	public static processError(
		err: unknown,
		includeStack?: boolean
	): {
		error: IError;
		httpStatusCode: HttpStatusCode;
	} {
		const error: BaseError = BaseError.fromError(err);

		// If the error or any of its sub errors are of the specific
		// types then set the http response code accordingly
		const flattened = BaseError.flatten(error);

		let httpStatusCode: HttpStatusCode = HttpStatusCode.internalServerError;

		// First check the primary error, as we don't want to override that with a sub error
		if (flattened.length > 0) {
			const primaryError = flattened[0];
			if (HttpErrorHelper.ERROR_TYPE_MAP[primaryError.name]) {
				httpStatusCode = HttpErrorHelper.ERROR_TYPE_MAP[primaryError.name];
			}

			// The primary error is still internal server error, check the sub errors
			if (httpStatusCode === HttpStatusCode.internalServerError) {
				for (const className in HttpErrorHelper.ERROR_TYPE_MAP) {
					if (flattened.some(e => BaseError.isErrorName(e, className))) {
						httpStatusCode = HttpErrorHelper.ERROR_TYPE_MAP[className];
						break;
					}
				}
			}
		}

		const returnError = error.toJsonObject(includeStack);

		return {
			error: returnError,
			httpStatusCode
		};
	}

	/**
	 * Build an error response.
	 * @param response The response to build the error into.
	 * @param error The error to build the response for.
	 * @param statusCode The status code to use for the error.
	 * @param includeStack Should the stack be included in the error.
	 */
	public static buildResponse(
		response: IHttpResponse,
		error: IError,
		statusCode: HttpStatusCode,
		includeStack: boolean
	): void {
		response.headers ??= {};
		response.headers[HeaderTypes.ContentType] = `${MimeTypes.Json}; charset=utf-8`;
		// Fastify treats an Error-typed body as a framework error and overrides the status with 500.
		response.body = BaseError.fromError(error).toJsonObject(includeStack);
		response.statusCode = statusCode;
	}
}
