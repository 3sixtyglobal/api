// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IHttpResponse, IHttpServerRequest } from "@3sixty/api-models";
import { ComponentFactory } from "@3sixty/core";
import type { ILogEntry, ILoggingComponent } from "@3sixty/logging-models";
import { HeaderTypes, HttpMethod, HttpStatusCode, MimeTypes } from "@3sixty/web";
import { LoggingProcessor } from "../src/logging/loggingProcessor.js";

function makeLogger(logEntries: ILogEntry[]): ILoggingComponent {
	return {
		className: () => "logger",
		log: async (entry: ILogEntry) => {
			logEntries.push(entry);
		},
		query: async () => ({ entities: logEntries })
	};
}

function makeRequest(url: string, method: HttpMethod = HttpMethod.GET): IHttpServerRequest {
	return { url, method, headers: {} };
}

function makeResponse(body: unknown = {}): IHttpResponse {
	return {
		statusCode: HttpStatusCode.ok,
		headers: { [HeaderTypes.ContentType]: MimeTypes.Json },
		body
	};
}

describe("LoggingProcessor", () => {
	describe("path exclusion", () => {
		test("does not log requests to /logging by default (prevents feedback loop)", async () => {
			const logEntries: ILogEntry[] = [];
			ComponentFactory.register("logging", () => makeLogger(logEntries));

			const processor = new LoggingProcessor({
				loggingComponentType: "logging",
				config: { includeBody: true }
			});

			for (let i = 0; i < 5; i++) {
				const request = makeRequest("/logging");
				const response = makeResponse({ entities: [...logEntries] });
				const state: { [id: string]: unknown } = {};
				await processor.pre(request, response, undefined, {}, state);
				response.body = { entities: [...logEntries] };
				await processor.post(request, response, undefined, {}, state);
			}

			expect(logEntries).toHaveLength(0);
		});

		test("still logs requests to non-excluded paths", async () => {
			const logEntries: ILogEntry[] = [];
			ComponentFactory.register("logging", () => makeLogger(logEntries));

			const processor = new LoggingProcessor({
				loggingComponentType: "logging",
				config: { includeBody: true }
			});

			const request = makeRequest("/tasks");
			const response = makeResponse({ id: "task-1" });
			const state: { [id: string]: unknown } = {};
			await processor.pre(request, response, undefined, {}, state);
			await processor.post(request, response, undefined, {}, state);

			expect(logEntries).toHaveLength(2);
			expect(logEntries[0].message).toContain("requestMessage");
			expect(logEntries[1].message).toContain("responseMessage");
		});

		test("log store grows exponentially when /logging is not excluded", async () => {
			const logEntries: ILogEntry[] = [];
			ComponentFactory.register("logging", () => makeLogger(logEntries));
			const processor = new LoggingProcessor({
				loggingComponentType: "logging",
				config: { includeBody: true, excludePaths: [] }
			});

			const byteSizes: number[] = [];
			for (let i = 0; i < 6; i++) {
				const request = makeRequest("/logging");
				const response = makeResponse();
				const state: { [id: string]: unknown } = {};
				await processor.pre(request, response, undefined, {}, state);
				response.body = { entities: [...logEntries] };
				await processor.post(request, response, undefined, {}, state);
				byteSizes.push(JSON.stringify(logEntries).length);
			}

			for (let i = 1; i < byteSizes.length; i++) {
				expect(byteSizes[i]).toBeGreaterThan(byteSizes[i - 1]);
			}
			expect(byteSizes[byteSizes.length - 1]).toBeGreaterThan(byteSizes[0] * 10);
		});

		test("log store stays empty when /logging is excluded", async () => {
			const logEntries: ILogEntry[] = [];
			ComponentFactory.register("logging", () => makeLogger(logEntries));
			const processor = new LoggingProcessor({
				loggingComponentType: "logging",
				config: { includeBody: true, excludePaths: ["/logging"] }
			});

			for (let i = 0; i < 6; i++) {
				const request = makeRequest("/logging");
				const response = makeResponse();
				const state: { [id: string]: unknown } = {};
				await processor.pre(request, response, undefined, {}, state);
				response.body = { entities: [...logEntries] };
				await processor.post(request, response, undefined, {}, state);
			}

			expect(logEntries).toHaveLength(0);
		});

		test("excludePaths can be overridden via config", async () => {
			const logEntries: ILogEntry[] = [];
			ComponentFactory.register("logging", () => makeLogger(logEntries));

			const processor = new LoggingProcessor({
				loggingComponentType: "logging",
				config: { excludePaths: ["/custom-logs"] }
			});

			// /custom-logs is excluded - nothing logged
			const req1 = makeRequest("/custom-logs");
			const res1 = makeResponse();
			const state1: { [id: string]: unknown } = {};
			await processor.pre(req1, res1, undefined, {}, state1);
			await processor.post(req1, res1, undefined, {}, state1);
			expect(logEntries).toHaveLength(0);

			// /logging is no longer excluded - should be logged
			const req2 = makeRequest("/logging");
			const res2 = makeResponse();
			const state2: { [id: string]: unknown } = {};
			await processor.pre(req2, res2, undefined, {}, state2);
			await processor.post(req2, res2, undefined, {}, state2);
			expect(logEntries).toHaveLength(2);
		});
	});
});
