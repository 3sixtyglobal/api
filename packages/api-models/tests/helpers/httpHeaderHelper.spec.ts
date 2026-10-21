// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { GeneralError } from "@3sixty/core";
import { MimeTypes, type IHttpHeaders } from "@3sixty/web";
import { HttpHeaderHelper } from "../../src/helpers/httpHeaderHelper.js";

describe("HttpHeaderHelper", () => {
	describe("extractCursor", () => {
		it("should return the cursor from a next relation link header", () => {
			const headers = { link: '<https://example.com/api?cursor=abc123>; rel="next"' };
			expect(HttpHeaderHelper.extractCursor(headers)).toBe("abc123");
		});

		it("should return undefined when headers is undefined", () => {
			expect(HttpHeaderHelper.extractCursor(undefined)).toBeUndefined();
		});

		it("should return undefined when there is no link header", () => {
			expect(HttpHeaderHelper.extractCursor({})).toBeUndefined();
		});

		it("should return undefined when the link header has no next relation", () => {
			const headers = { link: '<https://example.com/api?cursor=abc123>; rel="prev"' };
			expect(HttpHeaderHelper.extractCursor(headers)).toBeUndefined();
		});

		it("should return undefined when the next relation has no cursor query param", () => {
			const headers = { link: '<https://example.com/api>; rel="next"' };
			expect(HttpHeaderHelper.extractCursor(headers)).toBeUndefined();
		});

		it("should decode a percent-encoded cursor value", () => {
			const headers = { link: '<https://example.com/api?cursor=hello%20world>; rel="next"' };
			expect(HttpHeaderHelper.extractCursor(headers)).toBe("hello world");
		});

		it("should extract cursor from next when multiple relations are present", () => {
			const headers = {
				link: '<https://example.com/api?cursor=prev99>; rel="prev", <https://example.com/api?cursor=next42>; rel="next"'
			};
			expect(HttpHeaderHelper.extractCursor(headers)).toBe("next42");
		});
	});

	describe("extractId", () => {
		it("should extract the ID from a full URL", () => {
			const headers = { location: "http://host.local/path/my-id" };
			expect(HttpHeaderHelper.extractId(headers)).toBe("my-id");
		});

		it("should extract the ID from a full URL with a query string", () => {
			const headers = { location: "http://host.local/path/my-id?foo=blah" };
			expect(HttpHeaderHelper.extractId(headers)).toBe("my-id");
		});

		it("should extract the ID from a relative path", () => {
			const headers = { location: "/segment/my-id" };
			expect(HttpHeaderHelper.extractId(headers)).toBe("my-id");
		});

		it("should extract the ID from a relative path with a query string", () => {
			const headers = { location: "/segment/my-id?foo=blah" };
			expect(HttpHeaderHelper.extractId(headers)).toBe("my-id");
		});

		it("should extract the ID from a dot-relative path", () => {
			const headers = { location: "./segment/my-id" };
			expect(HttpHeaderHelper.extractId(headers)).toBe("my-id");
		});

		it("should extract the ID from a dot-relative path with a query string", () => {
			const headers = { location: "./segment/my-id?foo=blah" };
			expect(HttpHeaderHelper.extractId(headers)).toBe("my-id");
		});

		it("should return a bare ID value as-is", () => {
			const headers = { location: "my-id" };
			expect(HttpHeaderHelper.extractId(headers)).toBe("my-id");
		});

		it("should decode a percent-encoded ID in a full URL", () => {
			const headers = { location: "http://host.local/path/hello%20world" };
			expect(HttpHeaderHelper.extractId(headers)).toBe("hello world");
		});

		it("should decode a percent-encoded ID in a relative path", () => {
			const headers = { location: "/segment/hello%20world" };
			expect(HttpHeaderHelper.extractId(headers)).toBe("hello world");
		});

		it("should decode a percent-encoded bare ID", () => {
			const headers = { location: "hello%20world" };
			expect(HttpHeaderHelper.extractId(headers)).toBe("hello world");
		});

		it("should extract the ID from the middle of a full URL using a template", () => {
			const headers = { location: "http://host.local/path1/path2/my-id/path3" };
			expect(HttpHeaderHelper.extractId(headers, "/path1/path2/:id/path3")).toBe("my-id");
		});

		it("should extract the ID from a full URL with query string using a template", () => {
			const headers = { location: "http://host.local/path1/my-id/path2?foo=bar" };
			expect(HttpHeaderHelper.extractId(headers, "/path1/:id/path2")).toBe("my-id");
		});

		it("should extract the ID from a relative path using a template", () => {
			const headers = { location: "/path1/path2/my-id/path3" };
			expect(HttpHeaderHelper.extractId(headers, "/path1/path2/:id/path3")).toBe("my-id");
		});

		it("should extract the ID from a dot-relative path using a template", () => {
			const headers = { location: "./path1/path2/my-id/path3" };
			expect(HttpHeaderHelper.extractId(headers, "/path1/path2/:id/path3")).toBe("my-id");
		});

		it("should decode a percent-encoded ID when using a template", () => {
			const headers = { location: "/path1/hello%20world/path2" };
			expect(HttpHeaderHelper.extractId(headers, "/path1/:id/path2")).toBe("hello world");
		});

		it("should fall back to last-segment extraction when the template has no ':id' placeholder", () => {
			const headers = { location: "/path1/my-id/path2" };
			expect(HttpHeaderHelper.extractId(headers, "/path1/id/path2")).toBe("path2");
		});

		it("should throw when the location has no segment at the placeholder position", () => {
			const headers = { location: "/path1" };
			expect(() => HttpHeaderHelper.extractId(headers, "/path1/:id/path2")).toThrow(GeneralError);
		});

		it("should extract the ID using a full absolute URL as the template", () => {
			const headers = { location: "https://host.local/path1/my-id/path2" };
			expect(HttpHeaderHelper.extractId(headers, "https://host.local/path1/:id/path2")).toBe(
				"my-id"
			);
		});

		it("should extract the ID using a path-only template against a full URL location", () => {
			const headers = {
				location: "http://localhost:8080/authentication/audit/018f0b53d5d5704fa3a06d6ed2478575"
			};
			expect(HttpHeaderHelper.extractId(headers, "/authentication/audit/:id")).toBe(
				"018f0b53d5d5704fa3a06d6ed2478575"
			);
		});

		it("should extract the ID when the template has a dynamic segment before ':id'", () => {
			const headers = { location: "/metric/container-abc/value/item-xyz" };
			expect(HttpHeaderHelper.extractId(headers, "/metric/:containerId/value/:id")).toBe(
				"item-xyz"
			);
		});

		it("should extract the ID from a full URL when the template has a dynamic segment before ':id'", () => {
			const headers = { location: "https://host.local/metric/container-abc/value/item-xyz" };
			expect(HttpHeaderHelper.extractId(headers, "/metric/:containerId/value/:id")).toBe(
				"item-xyz"
			);
		});

		it("should extract the ID when the template has multiple dynamic segments", () => {
			const headers = { location: "/api/tenant-1/collection-2/item-3" };
			expect(HttpHeaderHelper.extractId(headers, "/api/:tenantId/:collectionId/:id")).toBe(
				"item-3"
			);
		});

		it("should extract the ID when a dynamic segment follows ':id'", () => {
			const headers = { location: "/metric/value-abc/info/extra-segment" };
			expect(HttpHeaderHelper.extractId(headers, "/metric/:id/info/:type")).toBe("value-abc");
		});

		it("should decode a percent-encoded ID when the template has a dynamic segment before ':id'", () => {
			const headers = { location: "/metric/container-abc/value/hello%20world" };
			expect(HttpHeaderHelper.extractId(headers, "/metric/:containerId/value/:id")).toBe(
				"hello world"
			);
		});

		it("should extract the ID when ':id' appears as a query parameter value in the template", () => {
			const headers = { location: "https://host.local/path?id=my-id" };
			expect(HttpHeaderHelper.extractId(headers, "/path?id=:id")).toBe("my-id");
		});

		it("should roundtrip with buildId", () => {
			const original = "hello world";
			const headers: IHttpHeaders = {};
			HttpHeaderHelper.buildId(headers, original, "/path");
			expect(HttpHeaderHelper.extractId(headers)).toBe(original);
		});

		it("should throw when headers is undefined", () => {
			expect(() => HttpHeaderHelper.extractId(undefined)).toThrow(GeneralError);
		});

		it("should throw when the location header is missing", () => {
			expect(() => HttpHeaderHelper.extractId({})).toThrow(GeneralError);
		});

		it("should throw when the location header is an empty string", () => {
			expect(() => HttpHeaderHelper.extractId({ location: "" })).toThrow(GeneralError);
		});
	});

	describe("buildId", () => {
		it("should throw when id is an empty string", () => {
			expect(() => HttpHeaderHelper.buildId({}, "")).toThrow();
		});

		it("should set the Location header to the bare encoded ID when no urlTemplate is provided", () => {
			const headers: IHttpHeaders = {};
			HttpHeaderHelper.buildId(headers, "my-id");
			expect(headers.location).toBe("my-id");
		});

		it("should set the bare ID when urlTemplate is an empty string", () => {
			const headers: IHttpHeaders = {};
			HttpHeaderHelper.buildId(headers, "my-id", "");
			expect(headers.location).toBe("my-id");
		});

		it("should percent-encode a bare ID with special characters", () => {
			const headers: IHttpHeaders = {};
			HttpHeaderHelper.buildId(headers, "hello world");
			expect(headers.location).toBe("hello%20world");
		});

		it("should append the ID to an absolute urlTemplate", () => {
			const headers: IHttpHeaders = {};
			HttpHeaderHelper.buildId(headers, "my-id", "https://example.com/path");
			expect(headers.location).toBe("https://example.com/path/my-id");
		});

		it("should append the ID to a relative urlTemplate", () => {
			const headers: IHttpHeaders = {};
			HttpHeaderHelper.buildId(headers, "my-id", "/segment");
			expect(headers.location).toBe("/segment/my-id");
		});

		it("should trim a trailing slash from urlTemplate before appending", () => {
			const headers: IHttpHeaders = {};
			HttpHeaderHelper.buildId(headers, "my-id", "https://example.com/path/");
			expect(headers.location).toBe("https://example.com/path/my-id");
		});

		it("should percent-encode the ID when appended to a urlTemplate", () => {
			const headers: IHttpHeaders = {};
			HttpHeaderHelper.buildId(headers, "hello world", "/path");
			expect(headers.location).toBe("/path/hello%20world");
		});

		it("should substitute the ID at the ':id' placeholder position in a template", () => {
			const headers: IHttpHeaders = {};
			HttpHeaderHelper.buildId(headers, "my-id", "/path1/:id/path2");
			expect(headers.location).toBe("/path1/my-id/path2");
		});

		it("should not substitute when the placeholder name is not ':id'", () => {
			const headers: IHttpHeaders = {};
			HttpHeaderHelper.buildId(headers, "my-id", "/path1/:resourceId/path2");
			expect(headers.location).toBe("/path1/:resourceId/path2/my-id");
		});

		it("should substitute the ID in an absolute URL template", () => {
			const headers: IHttpHeaders = {};
			HttpHeaderHelper.buildId(headers, "my-id", "https://example.com/path1/:id/path2");
			expect(headers.location).toBe("https://example.com/path1/my-id/path2");
		});

		it("should substitute the ID when ':id' appears as a query parameter value", () => {
			const headers: IHttpHeaders = {};
			HttpHeaderHelper.buildId(headers, "my-id", "/path?param=:id");
			expect(headers.location).toBe("/path?param=my-id");
		});

		it("should percent-encode the ID when substituting into a template", () => {
			const headers: IHttpHeaders = {};
			HttpHeaderHelper.buildId(headers, "hello world", "/path1/:id/path2");
			expect(headers.location).toBe("/path1/hello%20world/path2");
		});

		it("should only replace the first ':id' placeholder when multiple exist", () => {
			const headers: IHttpHeaders = {};
			HttpHeaderHelper.buildId(headers, "my-id", "/path/:id/sub/:id");
			expect(headers.location).toBe("/path/my-id/sub/:id");
		});

		it("should substitute only the complete ':id' placeholder and not corrupt an earlier ':idType' placeholder", () => {
			const headers: IHttpHeaders = {};
			HttpHeaderHelper.buildId(headers, "item-123", "/things/:idType/sub/:id");
			expect(headers.location).toBe("/things/:idType/sub/item-123");
		});

		it("should append when no standalone ':id' is present and an earlier placeholder starts with 'id'", () => {
			const headers: IHttpHeaders = {};
			HttpHeaderHelper.buildId(headers, "item-123", "/things/:idType");
			expect(headers.location).toBe("/things/:idType/item-123");
		});

		it("should roundtrip buildId and extractId when an earlier placeholder starts with 'id'", () => {
			const original = "item-123";
			const template = "/things/:idType/sub/:id";
			const headers: IHttpHeaders = {};
			HttpHeaderHelper.buildId(headers, original, template);
			expect(headers.location).toBe("/things/:idType/sub/item-123");
			expect(HttpHeaderHelper.extractId(headers, template)).toBe(original);
		});
	});

	describe("buildCursor", () => {
		it("should set the Link header when cursor is a non-empty string", () => {
			const headers: IHttpHeaders = {};
			HttpHeaderHelper.buildCursor(headers, "https://example.com/api", undefined, "abc123");
			expect(headers.link).toContain("cursor=abc123");
			expect(headers.link).toContain('rel="next"');
		});

		it("should replace the origin in the URL when publicOrigin is provided", () => {
			const headers: IHttpHeaders = {};
			HttpHeaderHelper.buildCursor(
				headers,
				"https://internal.host/api/items",
				"https://public.host",
				"tok1"
			);
			expect(headers.link).toContain("https://public.host");
			expect(headers.link).not.toContain("internal.host");
		});

		it("should not modify headers when cursor is undefined", () => {
			const headers: IHttpHeaders = {};
			HttpHeaderHelper.buildCursor(headers, "https://example.com/api", undefined, undefined);
			expect(headers.link).toBeUndefined();
		});

		it("should not modify headers when cursor is an empty string", () => {
			const headers: IHttpHeaders = {};
			HttpHeaderHelper.buildCursor(headers, "https://example.com/api", undefined, "");
			expect(headers.link).toBeUndefined();
		});

		it("should not overwrite an existing header when cursor is absent", () => {
			const headers: IHttpHeaders = {
				link: '<https://example.com/api?cursor=old>; rel="prev"'
			};
			HttpHeaderHelper.buildCursor(headers, "https://example.com/api", undefined, undefined);
			expect(headers.link).toContain("old");
		});

		it("should not produce a duplicate cursor when the URL already contains a cursor parameter", () => {
			const headers: IHttpHeaders = {};
			HttpHeaderHelper.buildCursor(
				headers,
				"https://example.com/api?pageSize=2&cursor=cursorPage2",
				undefined,
				"cursorPage3"
			);
			const link = headers.link as string;
			const matches = link.match(/cursor=/g);
			expect(matches?.length).toBe(1);
			expect(link).toContain("cursorPage3");
			expect(link).not.toContain("cursorPage2");
		});

		it("should replace an existing cursor in the URL with the new cursor value", () => {
			const headers: IHttpHeaders = {};
			HttpHeaderHelper.buildCursor(headers, "https://example.com/api?cursor=old", undefined, "new");
			expect(headers.link).toContain("cursor=new");
			expect(headers.link).not.toContain("cursor=old");
		});

		it("should preserve other query parameters when stripping the existing cursor", () => {
			const headers: IHttpHeaders = {};
			HttpHeaderHelper.buildCursor(
				headers,
				"https://example.com/api?pageSize=5&cursor=prev",
				undefined,
				"next"
			);
			expect(headers.link).toContain("pageSize=5");
			expect(headers.link).toContain("cursor=next");
			expect(headers.link).not.toContain("cursor=prev");
		});

		it("should replace an existing cursor for relative URLs", () => {
			const headers: IHttpHeaders = {};
			HttpHeaderHelper.buildCursor(headers, "/api/items?pageSize=5&cursor=prev", undefined, "next");
			expect(headers.link).toContain("/api/items?pageSize=5&cursor=next");
			expect(headers.link).not.toContain("cursor=prev");
		});
	});

	describe("buildJsonContentType", () => {
		it("should set content-type to JSON-LD when Accept is JSON-LD", () => {
			const headers: IHttpHeaders = {};
			HttpHeaderHelper.buildJsonContentType(headers, { accept: MimeTypes.JsonLd });
			expect(headers["content-type"]).toBe(MimeTypes.JsonLd);
		});

		it("should set content-type to JSON when Accept is JSON", () => {
			const headers: IHttpHeaders = {};
			HttpHeaderHelper.buildJsonContentType(headers, { accept: MimeTypes.Json });
			expect(headers["content-type"]).toBe(MimeTypes.Json);
		});

		it("should set content-type to JSON when Accept is some other value", () => {
			const headers: IHttpHeaders = {};
			HttpHeaderHelper.buildJsonContentType(headers, { accept: "text/html" });
			expect(headers["content-type"]).toBe(MimeTypes.Json);
		});

		it("should set content-type to JSON when requestHeaders is undefined", () => {
			const headers: IHttpHeaders = {};
			HttpHeaderHelper.buildJsonContentType(headers, undefined);
			expect(headers["content-type"]).toBe(MimeTypes.Json);
		});

		it("should set content-type to JSON when requestHeaders has no Accept header", () => {
			const headers: IHttpHeaders = {};
			HttpHeaderHelper.buildJsonContentType(headers, {});
			expect(headers["content-type"]).toBe(MimeTypes.Json);
		});

		it("should set content-type to JSON-LD when JSON-LD appears first with equal q-values", () => {
			const headers: IHttpHeaders = {};
			HttpHeaderHelper.buildJsonContentType(headers, {
				accept: `${MimeTypes.JsonLd}, ${MimeTypes.Json}`
			});
			expect(headers["content-type"]).toBe(MimeTypes.JsonLd);
		});

		it("should set content-type to JSON when JSON appears first with equal q-values", () => {
			const headers: IHttpHeaders = {};
			HttpHeaderHelper.buildJsonContentType(headers, {
				accept: `${MimeTypes.Json}, ${MimeTypes.JsonLd}`
			});
			expect(headers["content-type"]).toBe(MimeTypes.Json);
		});

		it("should prefer JSON-LD when it has a higher q-value than JSON", () => {
			const headers: IHttpHeaders = {};
			HttpHeaderHelper.buildJsonContentType(headers, {
				accept: `${MimeTypes.Json};q=0.9, ${MimeTypes.JsonLd}`
			});
			expect(headers["content-type"]).toBe(MimeTypes.JsonLd);
		});

		it("should prefer JSON when it has a higher q-value than JSON-LD", () => {
			const headers: IHttpHeaders = {};
			HttpHeaderHelper.buildJsonContentType(headers, {
				accept: `${MimeTypes.JsonLd};q=0.9, ${MimeTypes.Json}`
			});
			expect(headers["content-type"]).toBe(MimeTypes.Json);
		});

		it("should set content-type to JSON when Accept is a wildcard", () => {
			const headers: IHttpHeaders = {};
			HttpHeaderHelper.buildJsonContentType(headers, { accept: "*/*" });
			expect(headers["content-type"]).toBe(MimeTypes.Json);
		});

		it("should set content-type to JSON when Accept is application wildcard", () => {
			const headers: IHttpHeaders = {};
			HttpHeaderHelper.buildJsonContentType(headers, { accept: "application/*" });
			expect(headers["content-type"]).toBe(MimeTypes.Json);
		});

		it("should prefer JSON-LD over a wildcard when JSON-LD appears first", () => {
			const headers: IHttpHeaders = {};
			HttpHeaderHelper.buildJsonContentType(headers, {
				accept: `${MimeTypes.JsonLd}, */*`
			});
			expect(headers["content-type"]).toBe(MimeTypes.JsonLd);
		});

		it("should handle Accept as a string array", () => {
			const headers: IHttpHeaders = {};
			HttpHeaderHelper.buildJsonContentType(headers, {
				accept: [MimeTypes.JsonLd, MimeTypes.Json]
			});
			expect(headers["content-type"]).toBe(MimeTypes.JsonLd);
		});
	});
});
