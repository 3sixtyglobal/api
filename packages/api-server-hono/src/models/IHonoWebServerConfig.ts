// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { createAdaptorServer } from "@hono/node-server";
import type { ServerOptions } from "socket.io";

/**
 * The configuration for the Hono web server.
 */
export interface IHonoWebServerConfig {
	/**
	 * The node server options, such as the server factory and TLS options.
	 */
	web?: Omit<
		Parameters<typeof createAdaptorServer>[0],
		"fetch" | "port" | "hostname" | "websocket"
	>;

	/**
	 * The socket server options.
	 */
	socket?: Partial<ServerOptions>;

	/**
	 * Include the stack with errors.
	 */
	includeErrorStack?: boolean;
}
