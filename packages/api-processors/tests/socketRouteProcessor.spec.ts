// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IHttpResponse, ISocketRoute, ISocketServerRequest } from "@3sixty/api-models";
import { HttpMethod, HttpStatusCode } from "@3sixty/web";
import { SocketRouteProcessor } from "../src/data/socketRouteProcessor.js";

function makeRequest(body?: unknown): ISocketServerRequest {
	return {
		method: HttpMethod.GET,
		url: "/test-namespace/ping",
		headers: {},
		socketId: "socket-1",
		body
	};
}

function makeRoute(route: Partial<ISocketRoute>): ISocketRoute {
	return {
		operationId: "test",
		path: "/test-namespace/ping",
		handler: async () => {},
		...route
	};
}

describe("SocketRouteProcessor", () => {
	describe("process", () => {
		test("converts a rejection from an async handler into an error response", async () => {
			const processor = new SocketRouteProcessor();
			const response: IHttpResponse = {};

			const route = makeRoute({
				handler: async () => {
					throw new Error("handlerFailed");
				}
			});

			await processor.process(makeRequest(), response, route, {}, async () => {});

			expect(response.statusCode).toEqual(HttpStatusCode.internalServerError);
			expect(response.body).toEqual(
				expect.objectContaining({ message: "handlerFailed", name: "Error" })
			);
		});

		test("waits for an async handler to emit before returning", async () => {
			const processor = new SocketRouteProcessor();
			const response: IHttpResponse = {};
			const emitted: string[] = [];

			const route = makeRoute({
				handler: async (socketRequestContext, request, emit) => {
					await new Promise(resolve => setTimeout(resolve, 20));
					await emit("ping", { body: { data: "bar" } });
				}
			});

			await processor.process(makeRequest({ data: 123 }), response, route, {}, async topic => {
				emitted.push(topic);
			});

			expect(emitted).toEqual(["ping"]);
			expect(response.statusCode).toEqual(HttpStatusCode.ok);
			expect(response.body).toEqual({ data: "bar" });
		});

		test("returns a not found response when there is no matching route", async () => {
			const processor = new SocketRouteProcessor();
			const response: IHttpResponse = {};

			await processor.process(makeRequest(), response, undefined, {}, async () => {});

			expect(response.statusCode).toEqual(HttpStatusCode.notFound);
		});
	});

	describe("connected", () => {
		test("swallows a rejection from an async connected handler", async () => {
			const processor = new SocketRouteProcessor();

			const route = makeRoute({
				connected: async () => {
					throw new Error("connectedFailed");
				}
			});

			await expect(processor.connected(makeRequest(), route)).resolves.toBeUndefined();
		});

		test("waits for an async connected handler to complete", async () => {
			const processor = new SocketRouteProcessor();
			let completed = false;

			const route = makeRoute({
				connected: async () => {
					await new Promise(resolve => setTimeout(resolve, 20));
					completed = true;
				}
			});

			await processor.connected(makeRequest(), route);

			expect(completed).toBeTruthy();
		});
	});

	describe("disconnected", () => {
		test("swallows a rejection from an async disconnected handler", async () => {
			const processor = new SocketRouteProcessor();

			const route = makeRoute({
				disconnected: async () => {
					throw new Error("disconnectedFailed");
				}
			});

			await expect(processor.disconnected(makeRequest(), route)).resolves.toBeUndefined();
		});

		test("waits for an async disconnected handler to complete", async () => {
			const processor = new SocketRouteProcessor();
			let completed = false;

			const route = makeRoute({
				disconnected: async () => {
					await new Promise(resolve => setTimeout(resolve, 20));
					completed = true;
				}
			});

			await processor.disconnected(makeRequest(), route);

			expect(completed).toBeTruthy();
		});
	});
});
