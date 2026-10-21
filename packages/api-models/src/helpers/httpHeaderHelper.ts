// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { GeneralError, Guards, Is, StringHelper } from "@3sixty/core";
import { nameof } from "@3sixty/nameof";
import { HeaderHelper, HeaderTypes, MimeTypes, type IHttpHeaders } from "@3sixty/web";
import { HttpUrlHelper } from "./httpUrlHelper.js";

/**
 * Class to help with handling http headers.
 */
export class HttpHeaderHelper {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<HttpHeaderHelper>();

	/**
	 * Set the Link header with a next cursor relation when a cursor is present.
	 * @param headers The response headers to mutate.
	 * @param url The request URL used as the base for the link.
	 * @param publicOrigin The public origin to substitute into the URL, if any.
	 * @param cursor The cursor value; when undefined or empty the header is not set.
	 */
	public static buildCursor(
		headers: IHttpHeaders,
		url: string,
		publicOrigin: string | undefined,
		cursor: string | undefined
	): asserts headers is IHttpHeaders & { [HeaderTypes.Link]: string | undefined } {
		if (Is.stringValue(cursor)) {
			const baseUrl = HttpUrlHelper.replaceOrigin(url, publicOrigin);
			const cursorUrl = HttpUrlHelper.addQueryStringParam(baseUrl, "cursor", cursor);
			headers[HeaderTypes.Link] = HeaderHelper.createLinkHeader(cursorUrl, undefined, "next");
		}
	}

	/**
	 * Set the Location header to the encoded ID, optionally placed within a URL template.
	 * When the template contains `:id` (e.g. "/path1/:id/path2" or "/path?p=:id") the
	 * encoded ID is substituted at that position; otherwise it is appended.
	 * When no template is provided the bare encoded ID is used.
	 * Callers that need to combine a public origin with a path should use
	 * HttpUrlHelper.combineOriginPath to build the template before calling this method.
	 * @param headers The response headers to mutate.
	 * @param id The resource ID to encode and place.
	 * @param urlTemplate The optional URL template (absolute or relative).
	 */
	public static buildId(
		headers: IHttpHeaders,
		id: string,
		urlTemplate?: string
	): asserts headers is IHttpHeaders & { [HeaderTypes.Location]: string } {
		Guards.stringValue(HttpHeaderHelper.CLASS_NAME, nameof(id), id);
		const encodedId = encodeURIComponent(id);

		if (Is.stringValue(urlTemplate)) {
			if (/:id(?![a-zA-Z0-9])/.test(urlTemplate)) {
				headers[HeaderTypes.Location] = urlTemplate.replace(/:id(?![a-zA-Z0-9])/, encodedId);
			} else {
				headers[HeaderTypes.Location] =
					`${StringHelper.trimTrailingSlashes(urlTemplate)}/${encodedId}`;
			}
		} else {
			headers[HeaderTypes.Location] = encodedId;
		}
	}

	/**
	 * Set the Content-Type header to JSON-LD or JSON depending on the request Accept header.
	 * Uses HeaderHelper.extractAccept which parses the Accept header per RFC 7231 and returns
	 * entries ordered by quality descending, preserving original order for equal q-values.
	 * @param headers The response headers to mutate.
	 * @param requestHeaders The request headers to inspect for the Accept value.
	 */
	public static buildJsonContentType(
		headers: IHttpHeaders,
		requestHeaders?: IHttpHeaders
	): asserts headers is IHttpHeaders & {
		[HeaderTypes.ContentType]: typeof MimeTypes.JsonLd | typeof MimeTypes.Json;
	} {
		const accepted = HeaderHelper.extractAccept(requestHeaders);
		let contentType: string = MimeTypes.Json;
		if (Is.arrayValue(accepted)) {
			for (const { mimeType } of accepted) {
				if (mimeType === MimeTypes.JsonLd) {
					contentType = MimeTypes.JsonLd;
					break;
				}
				if (mimeType === MimeTypes.Json || mimeType === "application/*" || mimeType === "*/*") {
					break;
				}
			}
		}
		headers[HeaderTypes.ContentType] = contentType;
	}

	/**
	 * Extract the cursor from the Link header's next relation.
	 * @param headers The response headers to extract the cursor from.
	 * @returns The cursor value or undefined if not present.
	 */
	public static extractCursor(headers?: IHttpHeaders): string | undefined {
		return HeaderHelper.extractLinkHeaderRelation(headers?.[HeaderTypes.Link], "next")
			?.urlQueryParams?.cursor;
	}

	/**
	 * Extract the resource ID from the Location response header.
	 * Handles absolute URLs, relative paths, and bare ID values.
	 * When a templateUrl containing ':id' is supplied (e.g. "/path1/:id/path2" or
	 * "https://host/path/:id") the ID is extracted via pattern matching at the ':id'
	 * position. Without a matching template the last path segment is returned.
	 * @param headers The response headers containing the Location header.
	 * @param templateUrl Optional URL template containing the ':id' placeholder, e.g. "/path1/:id/path2".
	 * @returns The extracted ID string.
	 * @throws GeneralError If the Location header is missing or the ID cannot be extracted.
	 */
	public static extractId(headers?: IHttpHeaders, templateUrl?: string): string {
		const location = headers?.[HeaderTypes.Location];
		if (!Is.stringValue(location)) {
			throw new GeneralError(HttpHeaderHelper.CLASS_NAME, "locationMissing");
		}

		const withoutQuery = location.split("?")[0];

		if (Is.stringValue(templateUrl) && templateUrl.includes(":id")) {
			const escaped = templateUrl.replace(/[.+^${}()|[\]\\?]/g, "\\$&");
			const pattern = new RegExp(
				escaped.replace(/:[a-zA-Z][a-zA-Z0-9]*/g, m => (m === ":id" ? "([^/?#]+)" : "[^/?#]+"))
			);
			const match = pattern.exec(location);
			if (!Is.stringValue(match?.[1])) {
				throw new GeneralError(HttpHeaderHelper.CLASS_NAME, "idNotFound");
			}
			return decodeURIComponent(match[1]);
		}

		const id = withoutQuery.includes("/") ? withoutQuery.split("/").pop() : withoutQuery;

		if (!Is.stringValue(id)) {
			throw new GeneralError(HttpHeaderHelper.CLASS_NAME, "idNotFound");
		}
		return decodeURIComponent(id);
	}
}
