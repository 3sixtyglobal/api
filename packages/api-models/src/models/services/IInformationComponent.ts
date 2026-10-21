// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IComponent } from "@3sixty/core";
import type { IServerInfo } from "./IServerInfo.js";

/**
 * The information component for the server.
 */
export interface IInformationComponent extends IComponent {
	/**
	 * Get the root information.
	 * @returns The root information.
	 */
	root(): Promise<string>;

	/**
	 * Get the server information.
	 * @returns The service information.
	 */
	info(): Promise<IServerInfo>;

	/**
	 * Get the favicon.
	 * @returns The favicon.
	 */
	favicon(): Promise<Uint8Array | undefined>;

	/**
	 * Get the OpenAPI spec.
	 * @returns The OpenAPI spec.
	 */
	spec(): Promise<unknown>;

	/**
	 * Is the server live.
	 * @returns The livez status of the server.
	 */
	livez(): Promise<{ status: "alive" | "dead" }>;

	/**
	 * Is the server ready.
	 * @returns The readyz status of the server.
	 */
	readyz(): Promise<{ status: "ready" | "not ready" }>;
}
