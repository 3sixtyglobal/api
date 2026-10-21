// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type {
	IBaseRoute,
	IBaseRouteProcessor,
	IHttpResponse,
	IHttpServerRequest
} from "@3sixty/api-models";
import type { IContextIds } from "@3sixty/context";
import { Guards, Is } from "@3sixty/core";
import { nameof } from "@3sixty/nameof";
import type { IStaticContextIdProcessorConfig } from "../models/IStaticContextIdProcessorConfig.js";
import type { IStaticContextIdProcessorConstructorOptions } from "../models/IStaticContextIdProcessorConstructorOptions.js";

/**
 * Adds a static context id to the request context.
 */
export class StaticContextIdProcessor implements IBaseRouteProcessor {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<StaticContextIdProcessor>();

	/**
	 * The fixed identity key for request context.
	 * @internal
	 */
	private readonly _key: string;

	/**
	 * The fixed identity value for request context.
	 * @internal
	 */
	private readonly _value: string;

	/**
	 * Only add the identity if the request is authenticated.
	 * @internal
	 */
	private readonly _authOnly: boolean;

	/**
	 * Create a new instance of StaticContextIdProcessor.
	 * @param options Options for the processor.
	 */
	constructor(options: IStaticContextIdProcessorConstructorOptions) {
		Guards.object(StaticContextIdProcessor.CLASS_NAME, nameof(options), options);
		Guards.object<IStaticContextIdProcessorConfig>(
			StaticContextIdProcessor.CLASS_NAME,
			nameof(options.config),
			options.config
		);
		Guards.stringValue(
			StaticContextIdProcessor.CLASS_NAME,
			nameof(options.config.key),
			options.config.key
		);
		Guards.stringValue(
			StaticContextIdProcessor.CLASS_NAME,
			nameof(options.config.value),
			options.config.value
		);
		this._key = options.config.key;
		this._value = options.config.value;
		this._authOnly = options.config.authOnly ?? false;
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return StaticContextIdProcessor.CLASS_NAME;
	}

	/**
	 * Pre process the REST request for the specified route.
	 * @param request The incoming request.
	 * @param response The outgoing response.
	 * @param route The route to process.
	 * @param contextIds The context IDs of the request.
	 * @param processorState The state handed through the processors.
	 * @returns A promise that resolves when the static context ID has been injected into the request.
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
