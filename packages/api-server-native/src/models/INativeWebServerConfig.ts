// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { ServerOptions as HttpServerOptions } from "node:http";
import type { ServerOptions as HttpsServerOptions } from "node:https";
import type { ServerOptions as SocketServerOptions } from "socket.io";

/**
 * The configuration for the native web server.
 */
export interface INativeWebServerConfig {
	/**
	 * The web server options.
	 */
	web?: {
		/**
		 * The options for the Node.js HTTP server, such as the timeouts.
		 */
		serverOptions?: HttpServerOptions;

		/**
		 * The TLS options, when provided the server is served over HTTPS.
		 */
		https?: HttpsServerOptions;

		/**
		 * The maximum length of a path parameter, defaults to 2000.
		 */
		maxParamLength?: number;
	};

	/**
	 * The socket server options.
	 */
	socket?: Partial<SocketServerOptions>;

	/**
	 * Include the stack with errors.
	 */
	includeErrorStack?: boolean;
}
