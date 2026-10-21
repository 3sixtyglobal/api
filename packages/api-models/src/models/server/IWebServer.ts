// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IComponent } from "@3sixty/core";
import type { IRestRouteProcessor } from "./IRestRouteProcessor.js";
import type { ISocketRouteProcessor } from "./ISocketRouteProcessor.js";
import type { IWebServerOptions } from "./IWebServerOptions.js";
import type { IRestRoute } from "../routes/IRestRoute.js";
import type { ISocketRoute } from "../routes/ISocketRoute.js";

/**
 * Interface describing a web server.
 */
export interface IWebServer<T> extends IComponent {
	/**
	 * Get the web server instance.
	 * @returns The web server instance.
	 */
	getInstance(): T;

	/**
	 * Build the server.
	 * @param restRouteProcessors The processors for incoming requests over REST.
	 * @param restRoutes The REST routes.
	 * @param socketRouteProcessors The processors for incoming requests over Sockets.
	 * @param socketRoutes The socket routes.
	 * @param options Options for building the server.
	 * @returns A promise that resolves when the server is fully built and ready to start.
	 */
	build(
		restRouteProcessors?: IRestRouteProcessor[],
		restRoutes?: IRestRoute[],
		socketRouteProcessors?: ISocketRouteProcessor[],
		socketRoutes?: ISocketRoute[],
		options?: IWebServerOptions
	): Promise<void>;

	/**
	 * Start the server.
	 * @returns A promise that resolves when the server is listening for connections.
	 */
	start(): Promise<void>;

	/**
	 * Stop the server.
	 * @returns A promise that resolves when the server has shut down all connections.
	 */
	stop(): Promise<void>;
}
