// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { BaseRestClient } from "@3sixty/api-core";
import type {
	HealthStatus,
	IBaseRestClientConfig,
	IHealth,
	IHealthComponent,
	INoContentRequest,
	IServerHealthResponse
} from "@3sixty/api-models";
import { nameof } from "@3sixty/nameof";

/**
 * The client to connect to the health service.
 */
export class HealthRestClient extends BaseRestClient implements IHealthComponent {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<HealthRestClient>();

	/**
	 * Create a new instance of HealthRestClient.
	 * @param config The configuration for the client.
	 */
	constructor(config: IBaseRestClientConfig) {
		super(nameof<HealthRestClient>(), config, "");
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return HealthRestClient.CLASS_NAME;
	}

	/**
	 * Get the server health.
	 * @returns The service health.
	 */
	public async healthStatus(): Promise<{
		status: HealthStatus;
		components: IHealth[];
	}> {
		const response = await this.fetch<INoContentRequest, IServerHealthResponse>("/health", "GET");
		return response.body;
	}
}
