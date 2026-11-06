// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { Converter } from "@3sixty/core";
import { FormUrlEncodedMimeTypeProcessor } from "../../src/mimeType/formUrlEncodedMimeTypeProcessor.js";

describe("FormUrlEncodedMimeTypeProcessor", () => {
	const processor = new FormUrlEncodedMimeTypeProcessor();

	test("handles the form mime type", () => {
		expect(processor.className()).toBe(FormUrlEncodedMimeTypeProcessor.CLASS_NAME);
		expect(processor.getTypes()).toEqual(["application/x-www-form-urlencoded"]);
	});

	test("decodes the fields of a token request", async () => {
		const body = Converter.utf8ToBytes(
			"grant_type=authorization_code&code=Splx%2FlOB&redirect_uri=https%3A%2F%2Fnode.example.com%2Fcb&scope=a+b"
		);

		expect(Object.entries((await processor.handle(body)) as object)).toEqual([
			["grant_type", "authorization_code"],
			["code", "Splx/lOB"],
			["redirect_uri", "https://node.example.com/cb"],
			["scope", "a b"]
		]);
	});

	test("gives a field sent more than once as an array", async () => {
		await expect(processor.handle(Converter.utf8ToBytes("a=1&a=2&a=3&b="))).resolves.toEqual({
			a: ["1", "2", "3"],
			b: ""
		});
	});

	test("gives an empty object for an empty body", async () => {
		await expect(processor.handle(new Uint8Array())).resolves.toEqual({});
	});
});
