// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IComponent } from "@3sixty/core";
import type { HealthStatus } from "../healthStatus.js";
import type { IHealth } from "../IHealth.js";

/**
 * The health component for the server.
 */
export interface IHealthComponent extends IComponent {
	/**
	 * Get the server health.
	 * @returns The service health.
	 */
	healthStatus(): Promise<{ status: HealthStatus; components: IHealth[] }>;
}
