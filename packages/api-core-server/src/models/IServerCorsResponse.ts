// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The CORS response for a request origin.
 */
export interface IServerCorsResponse {
	/**
	 * The value for the Access-Control-Allow-Origin header, omitted if the header is not sent.
	 */
	allowOrigin?: string;

	/**
	 * Whether to send Access-Control-Allow-Credentials.
	 */
	credentials: boolean;
}
