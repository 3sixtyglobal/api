// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { readFile } from "node:fs/promises";
import type { IInformationComponent, IServerInfo } from "@3sixty/api-models";
import { Factory, Guards, Is } from "@3sixty/core";
import { nameof } from "@3sixty/nameof";
import type { IInformationServiceConstructorOptions } from "./models/IInformationServiceConstructorOptions.js";

/**
 * The information service for the server.
 */
export class InformationService implements IInformationComponent {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<InformationService>();

	/**
	 * The server information.
	 * @internal
	 */
	private readonly _serverInfo: IServerInfo;

	/**
	 * The path to the favicon Spec.
	 * @internal
	 */
	private readonly _faviconPath?: string;

	/**
	 * The favicon.
	 * @internal
	 */
	private _favicon?: Uint8Array;

	/**
	 * The path to the OpenAPI Spec.
	 * @internal
	 */
	private readonly _openApiSpecPath?: string;

	/**
	 * The OpenAPI spec.
	 * @internal
	 */
	private _openApiSpec?: string;

	/**
	 * Create a new instance of InformationService.
	 * @param options The options to create the service.
	 */
	constructor(options: IInformationServiceConstructorOptions) {
		Guards.object(InformationService.CLASS_NAME, nameof(options), options);
		Guards.object(InformationService.CLASS_NAME, nameof(options.config), options.config);
		Guards.object(
			InformationService.CLASS_NAME,
			nameof(options.config.serverInfo),
			options.config.serverInfo
		);

		this._serverInfo = options.config.serverInfo;
		this._faviconPath = options.config.favIconPath;
		this._openApiSpecPath = options.config.openApiSpecPath;
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return InformationService.CLASS_NAME;
	}

	/**
	 * The service needs to be started when the application is initialized.
	 * @returns A promise that resolves when the OpenAPI spec and favicon have been loaded from disk.
	 */
	public async start(): Promise<void> {
		const openApiPath = this._openApiSpecPath;
		if (Is.stringValue(openApiPath)) {
			const contentBuffer = await readFile(openApiPath, "utf8");
			this._openApiSpec = JSON.parse(contentBuffer);
		}

		const favIconPath = this._faviconPath;
		if (Is.stringValue(favIconPath)) {
			this._favicon = await readFile(favIconPath);
		}
	}

	/**
	 * Get the root information.
	 * @returns The root information.
	 */
	public async root(): Promise<string> {
		return `${this._serverInfo.name} - ${this._serverInfo.version}`;
	}

	/**
	 * Get the server information.
	 * @returns The service information.
	 */
	public async info(): Promise<IServerInfo> {
		return this._serverInfo;
	}

	/**
	 * Get the favicon.
	 * @returns The favicon.
	 */
	public async favicon(): Promise<Uint8Array | undefined> {
		return this._favicon;
	}

	/**
	 * Get the OpenAPI spec.
	 * @returns The OpenAPI spec.
	 */
	public async spec(): Promise<unknown> {
		return this._openApiSpec;
	}

	/**
	 * Is the server live.
	 * @returns The liveness status of the server.
	 */
	public async livez(): Promise<{
		status: "alive" | "dead";
	}> {
		return { status: "alive" };
	}

	/**
	 * Is the server ready.
	 * @returns The readyz status of the server.
	 */
	public async readyz(): Promise<{
		status: "ready" | "not ready";
	}> {
		const engineCoreFactory = Factory.getFactory("engine-core");

		if (engineCoreFactory) {
			// Use a replica of the IEngineCore interface to avoid a circular dependency on the engine-core package.
			const engine = engineCoreFactory.getIfExists<{ isStarted: () => boolean }>("engine");

			if (engine?.isStarted()) {
				return { status: "ready" };
			}
		}

		return { status: "not ready" };
	}
}
