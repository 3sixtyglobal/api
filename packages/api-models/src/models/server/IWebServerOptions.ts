// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { HttpMethod } from "@3sixty/web";

/**
 * Options for the web server.
 */
export interface IWebServerOptions {
	/**
	 * The port to bind the web server to.
	 * @default 3000
	 */
	port?: number;

	/**
	 * The address to bind the web server to.
	 * @default localhost
	 */
	host?: string;

	/**
	 * The methods that the server accepts.
	 * @default ["GET", "PUT", "POST", "PATCH", "DELETE", "OPTIONS"]
	 */
	methods?: HttpMethod[];

	/**
	 * Any additional allowed headers.
	 */
	allowedHeaders?: string[];

	/**
	 * And additional exposed headers.
	 */
	exposedHeaders?: string[];

	/**
	 * The allowed CORS domains.
	 * @default ["*"]
	 */
	corsOrigins?: string | string[];

	/**
	 * The public origin of the server, used for constructing the request URL.
	 * If not provided, it will be determined from the incoming request.
	 */
	publicOrigin?: string;

	/**
	 * Named body size limits in bytes for REST routes, referenced by a route's bodyLimit name.
	 * Merged over the server's built-in limits; the "default" entry applies to routes with no bodyLimit name.
	 */
	bodyLimits?: { [name: string]: number };

	/**
	 * Custom configuration for the web server.
	 */
	customWebConfig?: unknown;

	/**
	 * Custom configuration for the socket server.
	 */
	customSocketConfig?: unknown;
}
