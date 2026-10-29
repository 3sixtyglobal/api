// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IOriginCheckProcessorConfig } from "./IOriginCheckProcessorConfig.js";

/**
 * Options for the OriginCheckProcessor constructor.
 */
export interface IOriginCheckProcessorConstructorOptions {
	/**
	 * The configuration for the processor.
	 */
	config?: IOriginCheckProcessorConfig;
}
