// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { BaseRestClient } from "@3sixty/api-core";
import type {
	IBaseRestClientConfig,
	IInformationComponent,
	INoContentRequest,
	IServerFavIconResponse,
	IServerInfo,
	IServerInfoResponse,
	IServerLivezResponse,
	IServerReadyzResponse,
	IServerRootResponse,
	IServerSpecResponse
} from "@3sixty/api-models";
import { nameof } from "@3sixty/nameof";

/**
 * The client to connect to the information service.
 */
export class InformationRestClient extends BaseRestClient implements IInformationComponent {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<InformationRestClient>();

	/**
	 * Create a new instance of InformationRestClient.
	 * @param config The configuration for the client.
	 */
	constructor(config: IBaseRestClientConfig) {
		super(nameof<InformationRestClient>(), config, "");
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return InformationRestClient.CLASS_NAME;
	}

	/**
	 * Get the server root.
	 * @returns The root text page content.
	 */
	public async root(): Promise<string> {
		const response = await this.fetch<INoContentRequest, IServerRootResponse>("/", "GET");
		return response.body;
	}

	/**
	 * Get the server information.
	 * @returns The service information.
	 */
	public async info(): Promise<IServerInfo> {
		const response = await this.fetch<INoContentRequest, IServerInfoResponse>("/info", "GET");
		return response.body;
	}

	/**
	 * Get the favicon.
	 * @returns The favicon.
	 */
	public async favicon(): Promise<Uint8Array | undefined> {
		const response = await this.fetch<INoContentRequest, IServerFavIconResponse>(
			"/favicon.ico",
			"GET"
		);
		return response.body;
	}

	/**
	 * Get the OpenAPI spec.
	 * @returns The OpenAPI spec.
	 */
	public async spec(): Promise<unknown> {
		const response = await this.fetch<INoContentRequest, IServerSpecResponse>("/spec", "GET");
		return response.body;
	}

	/**
	 * Is the server live.
	 * @returns The liveness status of the server.
	 */
	public async livez(): Promise<{ status: "alive" | "dead" }> {
		const response = await this.fetch<INoContentRequest, IServerLivezResponse>("/livez", "GET");
		return { status: response.body };
	}

	/**
	 * Is the server ready.
	 * @returns The readiness status of the server.
	 */
	public async readyz(): Promise<{ status: "ready" | "not ready" }> {
		const response = await this.fetch<INoContentRequest, IServerReadyzResponse>("/readyz", "GET");
		return { status: response.body };
	}
}
