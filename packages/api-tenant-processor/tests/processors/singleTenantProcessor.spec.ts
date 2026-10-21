// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { HttpErrorHelper, type IHttpResponse } from "@3sixty/api-models";
import { ContextIdKeys, ContextIdStore, type IContextIds } from "@3sixty/context";
import type { IError } from "@3sixty/core";
import { HttpStatusCode } from "@3sixty/web";
import { SingleTenantProcessor } from "../../src/singleTenantProcessor.js";

const NODE_ORG = "org-node";

const makeProcessor = (): SingleTenantProcessor => new SingleTenantProcessor();

const startProcessor = async (): Promise<SingleTenantProcessor> => {
	const processor = makeProcessor();
	await processor.start();
	return processor;
};

describe("SingleTenantProcessor", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
			[ContextIdKeys.Organization]: NODE_ORG
		});
	});

	describe("constructor", () => {
		it("constructs without options", () => {
			expect(() => new SingleTenantProcessor()).not.toThrow();
		});

		it("constructs with options", () => {
			expect(() => new SingleTenantProcessor({})).not.toThrow();
		});
	});

	describe("className", () => {
		it("returns SingleTenantProcessor", () => {
			expect(makeProcessor().className()).toBe("SingleTenantProcessor");
		});
	});

	describe("start", () => {
		it("resolves when the context store provides an organization ID", async () => {
			await expect(makeProcessor().start()).resolves.not.toThrow();
			expect(ContextIdStore.getContextIds).toHaveBeenCalled();
		});

		it("throws when the context store returns no organization ID", async () => {
			vi.mocked(ContextIdStore.getContextIds).mockResolvedValue({});
			await expect(makeProcessor().start()).rejects.toThrow();
		});
	});

	describe("pre - organization injection", () => {
		it("always injects the cached node org ID into contextIds, even when route is undefined", async () => {
			const processor = await startProcessor();
			const contextIds: IContextIds = {};
			const response: IHttpResponse = {};

			await processor.pre(
				{ url: "/api/test", headers: {}, query: {} } as never,
				response,
				undefined,
				contextIds,
				{}
			);

			expect(contextIds[ContextIdKeys.Organization]).toBe(NODE_ORG);
			expect(response.statusCode).toBeUndefined();
		});

		it("injects the cached node org ID into contextIds when org query param matches", async () => {
			const processor = await startProcessor();
			const contextIds: IContextIds = {};
			const response: IHttpResponse = {};

			await processor.pre(
				{ url: "/api/test", headers: {}, query: { organization: NODE_ORG } } as never,
				response,
				{} as never,
				contextIds,
				{}
			);

			expect(contextIds[ContextIdKeys.Organization]).toBe(NODE_ORG);
			expect(response.statusCode).toBeUndefined();
		});

		it("injects undefined into contextIds when start() has not been called", async () => {
			const processor = makeProcessor();
			const contextIds: IContextIds = {};
			const response: IHttpResponse = {};

			await processor.pre(
				{ url: "/api/test", headers: {}, query: {} } as never,
				response,
				undefined,
				contextIds,
				{}
			);

			expect(contextIds[ContextIdKeys.Organization]).toBeUndefined();
			expect(response.statusCode).toBeUndefined();
		});
	});

	describe("pre - query param validation", () => {
		it("succeeds without error when org query param is absent", async () => {
			const processor = await startProcessor();
			const response: IHttpResponse = {};

			await processor.pre(
				{ url: "/api/test", headers: {}, query: {} } as never,
				response,
				{} as never,
				{},
				{}
			);

			expect(response.statusCode).toBeUndefined();
		});

		it("succeeds without error when request.query is undefined", async () => {
			const processor = await startProcessor();
			const response: IHttpResponse = {};

			await processor.pre(
				{ url: "/api/test", headers: {} } as never,
				response,
				{} as never,
				{},
				{}
			);

			expect(response.statusCode).toBeUndefined();
		});

		it("returns 401 invalidOrganizationId when org query param does not match the node org ID", async () => {
			const processor = await startProcessor();
			const buildResponseSpy = vi.spyOn(HttpErrorHelper, "buildResponse");
			const response: IHttpResponse = {};

			await processor.pre(
				{ url: "/api/test", headers: {}, query: { organization: "other-org" } } as never,
				response,
				{} as never,
				{},
				{}
			);

			expect(response.statusCode).toBe(HttpStatusCode.unauthorized);
			expect(buildResponseSpy).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ message: "singleTenantProcessor.invalidOrganizationId" }),
				HttpStatusCode.unauthorized,
				false
			);
		});

		it("returns 401 invalidOrganizationId when start() has not been called and org query param is provided", async () => {
			const processor = makeProcessor();
			const buildResponseSpy = vi.spyOn(HttpErrorHelper, "buildResponse");
			const response: IHttpResponse = {};

			await processor.pre(
				{ url: "/api/test", headers: {}, query: { organization: NODE_ORG } } as never,
				response,
				{} as never,
				{},
				{}
			);

			expect(response.statusCode).toBe(HttpStatusCode.unauthorized);
			expect(buildResponseSpy).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ message: "singleTenantProcessor.invalidOrganizationId" }),
				HttpStatusCode.unauthorized,
				false
			);
		});

		it("returns the error stack in the 401 response when includeErrorStack is enabled", async () => {
			const processor = new SingleTenantProcessor({ config: { includeErrorStack: true } });
			await processor.start();
			const response: IHttpResponse = {};

			await processor.pre(
				{ url: "/api/test", headers: {}, query: { organization: "other-org" } } as never,
				response,
				{} as never,
				{},
				{}
			);

			expect(response.statusCode).toBe(HttpStatusCode.unauthorized);
			expect((response.body as IError).stack).toBeDefined();
		});
	});
});
