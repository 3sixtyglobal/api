// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type {
	IBaseRoute,
	IBaseRouteProcessor,
	IHttpResponse,
	IHttpServerRequest
} from "@3sixty/api-models";
import { ContextIdStore, ContextIdHelper, type IContextIds } from "@3sixty/context";
import { Guards, Is } from "@3sixty/core";
import { nameof } from "@3sixty/nameof";
import type { IContextIdProcessorConfig } from "../models/IContextIdProcessorConfig.js";
import type { IContextIdProcessorConstructorOptions } from "../models/IContextIdProcessorConstructorOptions.js";

/**
 * Adds an id to the request context ids.
 */
export class ContextIdProcessor implements IBaseRouteProcessor {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<ContextIdProcessor>();

	/**
	 * The fixed identity key for request context.
	 * @internal
	 */
	private readonly _key: string;

	/**
	 * Only add the identity if the request is authenticated.
	 * @internal
	 */
	private readonly _authOnly: boolean;

	/**
	 * The identity value for request context.
	 * @internal
	 */
	private _value?: string;

	/**
	 * Create a new instance of ContextIdProcessor.
	 * @param options Options for the processor.
	 */
	constructor(options: IContextIdProcessorConstructorOptions) {
		Guards.object(ContextIdProcessor.CLASS_NAME, nameof(options), options);
		Guards.object<IContextIdProcessorConfig>(
			ContextIdProcessor.CLASS_NAME,
			nameof(options.config),
			options.config
		);
		Guards.stringValue(
			ContextIdProcessor.CLASS_NAME,
			nameof(options.config.key),
			options.config.key
		);
		this._key = options.config.key;
		this._authOnly = options.config.authOnly ?? false;
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return ContextIdProcessor.CLASS_NAME;
	}

	/**
	 * The service needs to be started when the application is initialized.
	 * @param nodeLoggingComponentType The node logging component type.
	 * @returns A promise that resolves when the context ID has been loaded from the store.
	 */
	public async start(nodeLoggingComponentType?: string): Promise<void> {
		const contextIds = await ContextIdStore.getContextIds();
		ContextIdHelper.guard(contextIds, this._key);
		this._value = contextIds[this._key];
	}

	/**
	 * Pre process the REST request for the specified route.
	 * @param request The incoming request.
	 * @param response The outgoing response.
	 * @param route The route to process.
	 * @param contextIds The context IDs of the request.
	 * @param processorState The state handed through the processors.
	 * @returns A promise that resolves when the context ID has been injected into the request.
	 */
	public async pre(
		request: IHttpServerRequest,
		response: IHttpResponse,
		route: IBaseRoute | undefined,
		contextIds: IContextIds,
		processorState: { [id: string]: unknown }
	): Promise<void> {
		if (!this._authOnly || (!Is.empty(route) && !(route.skipAuth ?? false))) {
			contextIds[this._key] = this._value;
		}
	}
}
