// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { Is, StringHelper } from "@3sixty/core";

/**
 * Class to help with handling http URLs.
 */
export class HttpUrlHelper {
	/**
	 * Extract the origin from the url which includes protocol,host,port.
	 * @see https://developer.mozilla.org/en-US/docs/Web/API/URL/origin
	 * @param url The url to extract the origin from.
	 * @returns The extracted origin.
	 */
	public static extractOrigin(url: string): string | undefined {
		try {
			const convertedUrl = new URL(url);
			return convertedUrl.origin;
		} catch {}
	}

	/**
	 * Extract the path from the url.
	 * @see https://developer.mozilla.org/en-US/docs/Web/API/URL/pathname
	 * @param url The url to extract the path from.
	 * @returns The extracted path.
	 */
	public static extractPath(url: string): string | undefined {
		try {
			const convertedUrl = new URL(url);
			return convertedUrl.pathname;
		} catch {}
	}

	/**
	 * Extract the search from the url.
	 * @see https://developer.mozilla.org/en-US/docs/Web/API/URL/search
	 * @param url The url to extract the search from.
	 * @returns The extracted search.
	 */
	public static extractSearch(url: string): string | undefined {
		try {
			const convertedUrl = new URL(url);
			return convertedUrl.search;
		} catch {}
	}

	/**
	 * Extract the path and search from the url.
	 * @param url The url to extract the path and search from.
	 * @returns The extracted path and search.
	 */
	public static extractPathAndSearch(url: string): string | undefined {
		try {
			const convertedUrl = new URL(url);
			return `${convertedUrl.pathname}${convertedUrl.search}`;
		} catch {}
	}

	/**
	 * Combine an optional origin and an optional path into a single URL string.
	 * Relative paths (no protocol, no leading slash) have a leading slash prepended.
	 * Trailing slashes are trimmed from the origin before joining.
	 * Returns undefined when both arguments are absent or empty.
	 * @param origin The optional origin (e.g. "https://example.com").
	 * @param path The optional path or URL template (e.g. "/api/items" or "api/items").
	 * @returns The combined string, or undefined when both are absent.
	 */
	public static combineOriginPath(origin?: string, path?: string): string | undefined {
		const normalizedPath =
			Is.stringValue(path) && !path.includes("://")
				? `/${StringHelper.trimLeadingSlashes(path)}`
				: path;

		if (Is.stringValue(origin) && Is.stringValue(normalizedPath)) {
			return `${StringHelper.trimTrailingSlashes(origin)}${normalizedPath}`;
		} else if (Is.stringValue(origin)) {
			return origin;
		} else if (Is.stringValue(normalizedPath)) {
			return normalizedPath;
		}
	}

	/**
	 * Encode a single URL path segment per RFC 3986 §3.3.
	 * Unlike encodeURIComponent, sub-delimiters ($ & + , ; =) and the colon and
	 * at-sign characters that are valid unencoded in path segments are preserved.
	 * @see https://datatracker.ietf.org/doc/html/rfc3986#section-3.3
	 * @param segment The raw path segment value to encode.
	 * @returns The percent-encoded path segment.
	 */
	public static encodeUriPathSegment(segment: string): string {
		// RFC 3986 §3.3: only encode characters outside the allowed path segment set.
		// Allowed: unreserved (A-Za-z0-9 - . _ ~), sub-delimiters (! $ & ' ( ) * + , ; =), and : @
		return segment.replace(/[^\w!$&'()*+,.:;=@~-]/g, ch => encodeURIComponent(ch));
	}

	/**
	 * Replace the origin in the url.
	 * @param url The url to replace the origin in.
	 * @param newOrigin The new origin to use.
	 * @returns The url with the replaced origin.
	 */
	public static replaceOrigin(url: string, newOrigin?: string): string {
		if (!Is.stringValue(url) || !Is.stringValue(newOrigin) || !newOrigin.startsWith("http")) {
			return url;
		}

		try {
			const parsedUrl = new URL(url.startsWith("/") ? `http://placeholder${url}` : url);
			const newParsedUrl = new URL(newOrigin);
			parsedUrl.protocol = newParsedUrl.protocol;
			parsedUrl.host = newParsedUrl.host;
			parsedUrl.port = newParsedUrl.port;
			return parsedUrl.toString();
		} catch {}

		return url;
	}

	/**
	 * Add a query string parameter to the url.
	 * @param url The url to add the query string parameter to.
	 * @param key The key of the query string parameter.
	 * @param value The value of the query string parameter.
	 * @returns The url with the added query string parameter.
	 */
	public static addQueryStringParam(url: string, key: string, value: string): string {
		if (!Is.stringValue(url) || !Is.stringValue(key) || !Is.stringValue(value)) {
			return url;
		}

		try {
			const isRelative = url.startsWith("/");
			const parsedUrl = new URL(isRelative ? `http://placeholder${url}` : url);
			parsedUrl.searchParams.set(key, value);
			return isRelative
				? `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`
				: parsedUrl.toString();
		} catch {}

		return url;
	}

	/**
	 * Get a query string parameter from the url.
	 * @param url The url to get the query string parameter from.
	 * @param key The key of the query string parameter.
	 * @returns The value of the query string parameter.
	 */
	public static getQueryStringParam(url: string, key: string): string | undefined {
		if (!Is.stringValue(url) || !Is.stringValue(key)) {
			return undefined;
		}

		try {
			const parsedUrl = new URL(url);
			return parsedUrl.searchParams.get(key) ?? undefined;
		} catch {}

		return undefined;
	}
}
