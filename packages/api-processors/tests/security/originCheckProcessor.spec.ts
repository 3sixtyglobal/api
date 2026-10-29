// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import {
	HttpContextIdKeys,
	type IHttpServerRequest,
	type ISocketServerRequest
} from "@3sixty/api-models";
import type { IContextIds } from "@3sixty/context";
import { HttpMethod, type IHttpHeaders } from "@3sixty/web";
import { OriginCheckProcessor } from "../../src/security/originCheckProcessor.js";

function makeRequest(method: HttpMethod, headers: IHttpHeaders): IHttpServerRequest {
	return { url: "https://api.example/items", method, headers };
}

async function check(
	processor: OriginCheckProcessor,
	request: IHttpServerRequest | ISocketServerRequest,
	contextIds: IContextIds = {}
): Promise<void> {
	await processor.pre(request, {}, undefined, contextIds, {});
}

describe("OriginCheckProcessor", () => {
	test("allows a same origin cookie request", async () => {
		const processor = new OriginCheckProcessor();

		await expect(
			check(
				processor,
				makeRequest(HttpMethod.POST, { cookie: "session=1", origin: "https://api.example" })
			)
		).resolves.toBeUndefined();
	});

	test("allows the public origin from the context ids", async () => {
		const processor = new OriginCheckProcessor();

		await expect(
			check(
				processor,
				makeRequest(HttpMethod.POST, { cookie: "session=1", origin: "https://public.example" }),
				{ [HttpContextIdKeys.PublicOrigin]: "https://public.example" }
			)
		).resolves.toBeUndefined();
	});

	test("rejects a cross origin cookie request", async () => {
		const processor = new OriginCheckProcessor();

		await expect(
			check(
				processor,
				makeRequest(HttpMethod.DELETE, { cookie: "session=1", origin: "https://evil.example" })
			)
		).rejects.toThrowError(
			expect.objectContaining({
				name: "ForbiddenError",
				message: "originCheckProcessor.originNotAllowed"
			})
		);
	});

	test("allows a configured origin but ignores the wildcard", async () => {
		const processor = new OriginCheckProcessor({
			config: { allowedOrigins: "*, https://App.example" }
		});

		await expect(
			check(
				processor,
				makeRequest(HttpMethod.PUT, { cookie: "session=1", origin: "https://app.example" })
			)
		).resolves.toBeUndefined();
		await expect(
			check(
				processor,
				makeRequest(HttpMethod.PUT, { cookie: "session=1", origin: "https://evil.example" })
			)
		).rejects.toThrowError(
			expect.objectContaining({ message: "originCheckProcessor.originNotAllowed" })
		);
	});

	test("does not check bearer token, cookieless or safe requests", async () => {
		const processor = new OriginCheckProcessor();

		await expect(
			check(
				processor,
				makeRequest(HttpMethod.POST, {
					cookie: "session=1",
					authorization: "Bearer token",
					origin: "https://evil.example"
				})
			)
		).resolves.toBeUndefined();
		await expect(
			check(processor, makeRequest(HttpMethod.POST, { origin: "https://evil.example" }))
		).resolves.toBeUndefined();
		await expect(
			check(
				processor,
				makeRequest(HttpMethod.GET, { cookie: "session=1", origin: "https://evil.example" })
			)
		).resolves.toBeUndefined();
	});

	test("checks cookie requests with a non bearer Authorization header", async () => {
		const processor = new OriginCheckProcessor();

		await expect(
			check(
				processor,
				makeRequest(HttpMethod.POST, {
					cookie: "session=1",
					authorization: "Basic eA==",
					origin: "https://evil.example"
				})
			)
		).rejects.toThrowError(
			expect.objectContaining({ message: "originCheckProcessor.originNotAllowed" })
		);
	});

	test("uses Sec-Fetch-Site when there is no Origin", async () => {
		const processor = new OriginCheckProcessor();

		await expect(
			check(
				processor,
				makeRequest(HttpMethod.PATCH, { cookie: "session=1", "sec-fetch-site": "same-origin" })
			)
		).resolves.toBeUndefined();
		await expect(
			check(
				processor,
				makeRequest(HttpMethod.PATCH, { cookie: "session=1", "sec-fetch-site": "cross-site" })
			)
		).rejects.toThrowError(
			expect.objectContaining({ message: "originCheckProcessor.crossSiteRequest" })
		);
	});

	test("allows server to server requests without Origin or Sec-Fetch-Site", async () => {
		const processor = new OriginCheckProcessor();

		await expect(
			check(processor, makeRequest(HttpMethod.POST, { cookie: "session=1" }))
		).resolves.toBeUndefined();
	});

	describe("sockets", () => {
		function makeSocketRequest(headers: IHttpHeaders): ISocketServerRequest {
			return {
				url: "/socket/topic",
				method: HttpMethod.GET,
				headers: { host: "api.example", ...headers },
				socketId: "socket-1"
			};
		}

		test("allows a same origin cookie connection and message", async () => {
			const processor = new OriginCheckProcessor();
			const request = makeSocketRequest({ cookie: "session=1", origin: "https://api.example" });

			await expect(processor.connected(request, undefined)).resolves.toBeUndefined();
			await expect(check(processor, request)).resolves.toBeUndefined();
		});

		test("rejects a cross origin cookie connection and message", async () => {
			const processor = new OriginCheckProcessor();
			const request = makeSocketRequest({ cookie: "session=1", origin: "https://evil.example" });
			const expected = expect.objectContaining({
				name: "ForbiddenError",
				message: "originCheckProcessor.originNotAllowed"
			});

			await expect(processor.connected(request, undefined)).rejects.toThrowError(expected);
			await expect(check(processor, request)).rejects.toThrowError(expected);
		});

		test("allows configured and context origins", async () => {
			const processor = new OriginCheckProcessor({
				config: { allowedOrigins: ["https://app.example"] }
			});

			await expect(
				processor.connected(
					makeSocketRequest({ cookie: "session=1", origin: "https://app.example" }),
					undefined
				)
			).resolves.toBeUndefined();
			await expect(
				check(
					processor,
					makeSocketRequest({ cookie: "session=1", origin: "https://public.example" }),
					{ [HttpContextIdKeys.PublicOrigin]: "https://public.example" }
				)
			).resolves.toBeUndefined();
		});

		test("does not check bearer token or cookieless connections", async () => {
			const processor = new OriginCheckProcessor();

			await expect(
				processor.connected(
					makeSocketRequest({
						cookie: "session=1",
						authorization: "Bearer token",
						origin: "https://evil.example"
					}),
					undefined
				)
			).resolves.toBeUndefined();
			await expect(
				processor.connected(makeSocketRequest({ origin: "https://evil.example" }), undefined)
			).resolves.toBeUndefined();
		});

		test("uses Sec-Fetch-Site when there is no Origin", async () => {
			const processor = new OriginCheckProcessor();

			await expect(
				processor.connected(
					makeSocketRequest({ cookie: "session=1", "sec-fetch-site": "same-origin" }),
					undefined
				)
			).resolves.toBeUndefined();
			await expect(
				processor.connected(
					makeSocketRequest({ cookie: "session=1", "sec-fetch-site": "cross-site" }),
					undefined
				)
			).rejects.toThrowError(
				expect.objectContaining({ message: "originCheckProcessor.crossSiteRequest" })
			);
		});
	});
});
