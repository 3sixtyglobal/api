// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IHttpHeaders } from "@3sixty/web";

/**
 * Definition for the configuration of a socket service.
 */
export interface IBaseSocketClientConfig {
	/**
	 * Base path for the socket service, defaults to /socket.
	 */
	basePath?: string;

	/**
	 * The endpoint where the api is hosted.
	 */
	endpoint: string;

	/**
	 * The prefix to the routes.
	 */
	pathPrefix?: string;

	/**
	 * The headers to include in requests.
	 */
	headers?: IHttpHeaders;
}
