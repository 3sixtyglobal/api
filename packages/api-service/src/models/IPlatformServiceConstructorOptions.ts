// Copyright 2026 IOTA Stiftung.
// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IPlatformServiceConfig } from "./IPlatformServiceConfig.js";

/**
 * Options for the Platform Service constructor.
 */
export interface IPlatformServiceConstructorOptions {
	/**
	 * The entity storage for the tenants.
	 * @default tenant
	 */
	tenantEntityStorageType?: string;

	/**
	 * The logging component type to use for error logging.
	 */
	loggingComponentType?: string;

	/**
	 * Configuration for the service.
	 */
	config?: IPlatformServiceConfig;
}
