// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IError } from "@3sixty/core";
import type { HealthCategory } from "./healthCategory.js";
import type { HealthStatus } from "./healthStatus.js";

/**
 * Provides health information for a component.
 */
export interface IHealth {
	/**
	 * The source of the health information.
	 */
	source: string;

	/**
	 * The description of the component as an i18n key.
	 */
	description?: string;

	/**
	 * The category of the health check.
	 */
	category?: HealthCategory;

	/**
	 * The overall status of the component, the entries can also report their own health.
	 */
	status: HealthStatus;

	/**
	 * The error details when the status is not Ok.
	 */
	error?: IError;

	/**
	 * The message for the status if there are further details to provide as an i18n key.
	 */
	message?: string;

	/**
	 * Data to substitute in the i18n key for the message.
	 */
	data?: { [id: string]: unknown };

	/**
	 * The grouped child components, if any.
	 */
	grouped?: IHealth[];
}
