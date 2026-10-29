// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Http header types used by the servers which are not in the common header types.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const HeaderTypesExtended = {
	/**
	 * The client and proxy addresses a request was forwarded through.
	 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Forwarded-For
	 */
	XForwardedFor: "x-forwarded-for",

	/**
	 * The client address set by a reverse proxy.
	 */
	XRealIp: "x-real-ip",

	/**
	 * The relationship between the origin of the request initiator and the requested resource.
	 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Sec-Fetch-Site
	 */
	SecFetchSite: "sec-fetch-site"
} as const;

/**
 * Http header types used by the servers which are not in the common header types.
 */
export type HeaderTypesExtended = (typeof HeaderTypesExtended)[keyof typeof HeaderTypesExtended];
