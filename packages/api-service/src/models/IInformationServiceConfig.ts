// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IServerInfo } from "@3sixty/api-models";

/**
 * Configuration for the information service.
 */
export interface IInformationServiceConfig {
	/**
	 * The server information.
	 */
	serverInfo: IServerInfo;

	/**
	 * The path to the OpenAPI Spec.
	 */
	openApiSpecPath?: string;

	/**
	 * The path to the favicon.
	 */
	favIconPath?: string;
}
