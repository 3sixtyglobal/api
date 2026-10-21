// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IContextIds } from "@3sixty/context";
import type { IHealth } from "../IHealth.js";
import type { HealthApplicationCallback } from "./IHealthApplicationCallback.js";

/**
 * The health provider component for the server.
 */
export interface IHealthProviderComponent {
	/**
	 * Returns the health status of the component.
	 * @returns The health status of the component, can return multiple entries for elements within the component.
	 */
	health?(): Promise<IHealth[]>;

	/**
	 * Initialize the application health processing for a component.
	 * @param contextIds The context IDs provisioned during the init pass.
	 * @returns A promise that resolves when the initialization is complete.
	 */
	healthApplicationInit?(contextIds: IContextIds): Promise<void>;

	/**
	 * Returns the application health status of the component, context IDs from init are set in the current context.
	 * Returns undefined when the result will be provided asynchronously via the callback.
	 * @param callback The callback to invoke when a deferred health result is ready.
	 * @returns The health status, or undefined if the result will be provided via the callback.
	 */
	healthApplication?(callback: HealthApplicationCallback): Promise<IHealth[] | undefined>;

	/**
	 * Teardown the application health processing for a component.
	 * @returns A promise that resolves when the teardown is complete.
	 */
	healthApplicationTeardown?(): Promise<void>;
}
