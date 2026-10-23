// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { ServerOptions as HttpsServerOptions } from "node:https";
import type { FastifyServerOptions } from "fastify";
import type { ServerOptions } from "socket.io";

/**
 * The configuration for the Fastify web server.
 */
export interface IFastifyWebServerConfig {
	/**
	 * The web server options, providing the https options serves over HTTPS.
	 */
	web?: Partial<FastifyServerOptions> & { https?: HttpsServerOptions };

	/**
	 * The socket server options.
	 */
	socket?: Partial<ServerOptions>;

	/**
	 * Include the stack with errors.
	 */
	includeErrorStack?: boolean;
}
