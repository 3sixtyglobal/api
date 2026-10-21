// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IError } from "@3sixty/core";
import type { IHttpHeaders } from "@3sixty/web";

/**
 * Definition for the configuration of a rest client.
 */
export interface IBaseRestClientConfig {
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

	/**
	 * Timeout for requests in ms.
	 */
	timeout?: number;

	/**
	 * Include credentials in the request, defaults to true.
	 */
	includeCredentials?: boolean;

	/**
	 * The types of the processors to run around each request, resolved from the `RestClientProcessorFactory`.
	 */
	processorTypes?: string[];

	/**
	 * Hook to provide headers asynchronously.
	 * @returns A promise that resolves to the headers.
	 */
	customHeaders?: () => Promise<IHttpHeaders>;

	/**
	 * Hook to provide an authorization header value asynchronously.
	 * @returns A promise that resolves to the authorization header value.
	 */
	customAuthHeader?: () => Promise<string>;

	/**
	 * Hook to handle authorization failures asynchronously.
	 * @returns A promise that resolves when the auth failure handling is complete.
	 */
	onAuthFailure?: (err: IError) => Promise<void>;
}
