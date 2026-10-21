// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import {
	AlreadyExistsError,
	ConflictError,
	GeneralError,
	GuardError,
	type IError,
	NotFoundError,
	NotImplementedError,
	UnauthorizedError,
	UnprocessableError,
	ValidationError
} from "@3sixty/core";
import { HttpStatusCode } from "@3sixty/web";
import { ForbiddenError } from "../../src/errors/forbiddenError.js";
import { TooManyRequestsError } from "../../src/errors/tooManyRequestsError.js";
import { HttpErrorHelper } from "../../src/helpers/httpErrorHelper.js";
import type { IHttpResponse } from "../../src/models/protocol/IHttpResponse.js";

describe("HttpErrorHelper", () => {
	it("should map GuardError to badRequest", () => {
		const err = new GuardError("TestClass", "testProp", "badValue", "guard error");
		const result = HttpErrorHelper.processError(err);
		expect(result.httpStatusCode).toBe(HttpStatusCode.badRequest);
		expect(result.error.name).toBe(GuardError.CLASS_NAME);
	});

	it("should map ValidationError to badRequest", () => {
		const failures = [{ property: "testProp", message: "validation error", reason: "invalid" }];
		const err = new ValidationError("TestClass", "testProp", failures);
		const result = HttpErrorHelper.processError(err);
		expect(result.httpStatusCode).toBe(HttpStatusCode.badRequest);
		expect(result.error.name).toBe(ValidationError.CLASS_NAME);
	});

	it("should map ConflictError to conflict", () => {
		const err = new ConflictError("TestClass", "testProp");
		const result = HttpErrorHelper.processError(err);
		expect(result.httpStatusCode).toBe(HttpStatusCode.conflict);
		expect(result.error.name).toBe(ConflictError.CLASS_NAME);
	});

	it("should map AlreadyExistsError to conflict", () => {
		const err = new AlreadyExistsError("TestClass", "testProp");
		const result = HttpErrorHelper.processError(err);
		expect(result.httpStatusCode).toBe(HttpStatusCode.conflict);
		expect(result.error.name).toBe(AlreadyExistsError.CLASS_NAME);
	});

	it("should map NotFoundError to notFound", () => {
		const err = new NotFoundError("TestClass", "testProp");
		const result = HttpErrorHelper.processError(err);
		expect(result.httpStatusCode).toBe(HttpStatusCode.notFound);
		expect(result.error.name).toBe(NotFoundError.CLASS_NAME);
	});

	it("should map UnauthorizedError to unauthorized", () => {
		const err = new UnauthorizedError("TestClass", "testProp");
		const result = HttpErrorHelper.processError(err);
		expect(result.httpStatusCode).toBe(HttpStatusCode.unauthorized);
		expect(result.error.name).toBe(UnauthorizedError.CLASS_NAME);
	});

	it("should map NotImplementedError to notImplemented", () => {
		const err = new NotImplementedError("TestClass", "testProp");
		const result = HttpErrorHelper.processError(err);
		expect(result.httpStatusCode).toBe(HttpStatusCode.notImplemented);
		expect(result.error.name).toBe(NotImplementedError.CLASS_NAME);
	});

	it("should map ForbiddenError to forbidden", () => {
		const err = new ForbiddenError("TestClass", "testProp");
		const result = HttpErrorHelper.processError(err);
		expect(result.httpStatusCode).toBe(HttpStatusCode.forbidden);
		expect(result.error.name).toBe(ForbiddenError.CLASS_NAME);
	});

	it("should map TooManyRequestsError to tooManyRequests", () => {
		const err = new TooManyRequestsError("TestClass", "testProp", 5, new Date().toISOString());
		const result = HttpErrorHelper.processError(err);
		expect(result.httpStatusCode).toBe(HttpStatusCode.tooManyRequests);
		expect(result.error.name).toBe(TooManyRequestsError.CLASS_NAME);
	});

	it("should map UnprocessableError to unprocessableEntity", () => {
		const err = new UnprocessableError("TestClass", "testProp");
		const result = HttpErrorHelper.processError(err);
		expect(result.httpStatusCode).toBe(HttpStatusCode.unprocessableEntity);
		expect(result.error.name).toBe(UnprocessableError.CLASS_NAME);
	});

	it("should default to internalServerError for unknown error", () => {
		const err = new Error("generic error");
		const result = HttpErrorHelper.processError(err);
		expect(result.httpStatusCode).toBe(HttpStatusCode.internalServerError);
		expect(result.error.name).toBe("Error");
	});

	it("should map suberror GuardError to badRequest when primary error is generic", () => {
		const cause = new GuardError("TestClass", "testProp", "badValue", "guard error");
		const err = new Error("generic error", { cause });
		const result = HttpErrorHelper.processError(err);
		expect(result.httpStatusCode).toBe(HttpStatusCode.badRequest);
		expect(result.error.name).toBe("Error");
		expect(result.error.cause?.name).toBe(GuardError.CLASS_NAME);
	});

	it("should map suberror ValidationError to badRequest when primary error is generic", () => {
		const failures = [{ property: "testProp", message: "validation error", reason: "invalid" }];
		const cause = new ValidationError("TestClass", "testProp", failures);
		const err = new Error("generic error", { cause });
		const result = HttpErrorHelper.processError(err);
		expect(result.httpStatusCode).toBe(HttpStatusCode.badRequest);
		expect(result.error.name).toBe("Error");
		expect(result.error.cause?.name).toBe(ValidationError.CLASS_NAME);
	});

	it("should map suberror ConflictError to conflict when primary error is generic", () => {
		const cause = new ConflictError("TestClass", "testProp");
		const err = new Error("generic error", { cause });
		const result = HttpErrorHelper.processError(err);
		expect(result.httpStatusCode).toBe(HttpStatusCode.conflict);
		expect(result.error.name).toBe("Error");
		expect(result.error.cause?.name).toBe(ConflictError.CLASS_NAME);
	});

	it("should map suberror NotFoundError to notFound when primary error is generic", () => {
		const cause = new NotFoundError("TestClass", "testProp");
		const err = new Error("generic error", { cause });
		const result = HttpErrorHelper.processError(err);
		expect(result.httpStatusCode).toBe(HttpStatusCode.notFound);
		expect(result.error.name).toBe("Error");
		expect(result.error.cause?.name).toBe(NotFoundError.CLASS_NAME);
	});

	it("should include stack when requested", () => {
		const err = new Error("stack error");
		const result = HttpErrorHelper.processError(err, true);
		expect(result.error.stack).toBeDefined();
	});

	it("should build error response correctly", () => {
		const failures = [{ property: "testProp", message: "validation error", reason: "invalid" }];
		const error = new ValidationError("TestClass", "testProp", failures).toJsonObject();
		const response: IHttpResponse = { headers: {} };
		HttpErrorHelper.buildResponse(response, error, HttpStatusCode.badRequest, false);
		expect(response.statusCode).toBe(HttpStatusCode.badRequest);
		expect(response.body).toEqual(error);
		expect(response.headers?.["content-type"]).toContain("application/json");
	});

	it("should include the stack in the response body when requested", () => {
		const { error, httpStatusCode } = HttpErrorHelper.processError(new Error("stack error"), true);
		const response: IHttpResponse = { headers: {} };
		HttpErrorHelper.buildResponse(response, error, httpStatusCode, true);
		expect((response.body as IError).stack).toBeDefined();
	});

	it("should include the stack of the error cause chain in the response body when requested", () => {
		const err = new GeneralError("TestClass", "testFailed", undefined, new Error("inner error"));
		const { error, httpStatusCode } = HttpErrorHelper.processError(err, true);
		const response: IHttpResponse = { headers: {} };
		HttpErrorHelper.buildResponse(response, error, httpStatusCode, true);
		expect((response.body as IError).stack).toBeDefined();
		expect((response.body as IError).cause?.stack).toBeDefined();
	});

	it("should not include the stack in the response body when not requested", () => {
		const { error, httpStatusCode } = HttpErrorHelper.processError(new Error("stack error"));
		const response: IHttpResponse = { headers: {} };
		HttpErrorHelper.buildResponse(response, error, httpStatusCode, false);
		expect((response.body as IError).stack).toBeUndefined();
	});
});
