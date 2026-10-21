// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type {
	IBaseRoute,
	IBaseRouteProcessor,
	IHttpResponse,
	IHttpServerRequest
} from "@3sixty/api-models";
import type { IContextIds } from "@3sixty/context";
import { Coerce, ComponentFactory, Is, ObjectHelper } from "@3sixty/core";
import type { ILoggingComponent } from "@3sixty/logging-models";
import { nameof } from "@3sixty/nameof";
import { HeaderTypes, HttpStatusCode, MimeTypes } from "@3sixty/web";
import type { ILoggingProcessorConstructorOptions } from "../models/ILoggingProcessorConstructorOptions.js";

/**
 * Process the REST request and log its information.
 */
export class LoggingProcessor implements IBaseRouteProcessor {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<LoggingProcessor>();

	/**
	 * The component for logging the information.
	 * @internal
	 */
	private readonly _logging?: ILoggingComponent;

	/**
	 * Include the body objects when logging the information.
	 * @internal
	 */
	private readonly _includeBody: boolean;

	/**
	 * Show the full base64 content for data, default to abbreviate.
	 * @internal
	 */
	private readonly _fullBase64: boolean;

	/**
	 * List of property names to obfuscate, defaults to "password".
	 * @internal
	 */
	private readonly _obfuscateProperties: string[];

	/**
	 * Request URL path prefixes to skip logging, defaults to ["/logging"].
	 * @internal
	 */
	private readonly _excludePaths: string[];

	/**
	 * Create a new instance of LoggingProcessor.
	 * @param options Options for the processor.
	 */
	constructor(options?: ILoggingProcessorConstructorOptions) {
		this._logging = ComponentFactory.getIfExists(options?.loggingComponentType);
		this._includeBody = options?.config?.includeBody ?? false;
		this._fullBase64 = options?.config?.fullBase64 ?? false;
		this._obfuscateProperties = options?.config?.obfuscateProperties ?? ["password"];
		this._excludePaths = options?.config?.excludePaths ?? ["/logging"];
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return LoggingProcessor.CLASS_NAME;
	}

	/**
	 * Pre process the REST request for the specified route.
	 * @param request The incoming request.
	 * @param response The outgoing response.
	 * @param route The route to process.
	 * @param contextIds The context IDs of the request.
	 * @param processorState The state handed through the processors.
	 * @returns A promise that resolves when the pre-processing log entry has been written.
	 */
	public async pre(
		request: IHttpServerRequest,
		response: IHttpResponse,
		route: IBaseRoute | undefined,
		contextIds: IContextIds,
		processorState: { [id: string]: unknown }
	): Promise<void> {
		let requestUrl = "";
		if (Is.stringValue(request.url)) {
			// Socket paths do not have a prefix so just use the whole url.
			if (request.url.startsWith("http")) {
				requestUrl = new URL(request.url).pathname;
			} else {
				requestUrl = request.url;
			}
		}

		if (this._excludePaths.some(p => requestUrl.startsWith(p))) {
			return;
		}

		const now = process.hrtime.bigint();
		processorState.requestStart = now;

		const contentType = request.headers?.[HeaderTypes.ContentType];
		const isJson = this.isMimeJson(contentType);

		await this._logging?.log({
			level: "info",
			source: LoggingProcessor.CLASS_NAME,
			ts: Date.now(),
			message: "requestMessage",
			data: {
				method: request.method,
				requestUrl,
				body:
					this._includeBody && isJson
						? this.processJson("body", ObjectHelper.clone(request?.body))
						: undefined
			}
		});
	}

	/**
	 * Post process the REST request for the specified route.
	 * @param request The incoming request.
	 * @param response The outgoing response.
	 * @param route The route to process.
	 * @param contextIds The context IDs of the request.
	 * @param processorState The state handed through the processors.
	 * @returns A promise that resolves when the post-processing log entry has been written.
	 */
	public async post(
		request: IHttpServerRequest,
		response: IHttpResponse,
		route: IBaseRoute | undefined,
		contextIds: IContextIds,
		processorState: { [id: string]: unknown }
	): Promise<void> {
		let requestUrl = "";
		if (Is.stringValue(request.url)) {
			// Socket paths do not have a prefix so just use the whole url.
			if (request.url.startsWith("http")) {
				requestUrl = new URL(request.url).pathname;
			} else {
				requestUrl = request.url;
			}
		}

		if (this._excludePaths.some(p => requestUrl.startsWith(p))) {
			return;
		}

		let data: { [id: string]: unknown } | undefined;
		if (this._includeBody) {
			const contentType = response.headers?.[HeaderTypes.ContentType];
			const isJson = this.isMimeJson(contentType);
			const contentLength = response.headers?.[HeaderTypes.ContentLength];
			if (isJson) {
				data = {
					body: this.processJson("body", ObjectHelper.clone(response.body))
				};
			} else {
				const dataParts: { [id: string]: string } = {};
				if (Is.stringValue(contentType)) {
					dataParts["Content Type"] = contentType;
				}
				if (Is.stringValue(contentLength)) {
					dataParts["Content Length"] = contentLength;
				}
				if (Object.keys(dataParts).length > 0) {
					data = {
						headers: dataParts
					};
				}
			}
		}
		const now = process.hrtime.bigint();
		const start = Coerce.bigint(processorState.requestStart) ?? now;
		const elapsed = now - start;
		const elapsedMicroSeconds = Math.floor(Number(elapsed) / 1000);

		if (Is.number(response.statusCode) && response.statusCode >= HttpStatusCode.badRequest) {
			await this._logging?.log({
				level: "error",
				source: LoggingProcessor.CLASS_NAME,
				ts: Date.now(),
				message: "responseMessage",
				data: {
					statusCode: response.statusCode,
					method: request.method,
					requestUrl: requestUrl ?? "",
					elapsedMicroSeconds,
					...data
				}
			});
		} else {
			await this._logging?.log({
				level: "info",
				source: LoggingProcessor.CLASS_NAME,
				ts: Date.now(),
				message: "responseMessage",
				data: {
					statusCode: response.statusCode,
					method: request.method,
					requestUrl: requestUrl ?? "",
					elapsedMicroSeconds,
					...data
				}
			});
		}
	}

	/**
	 * Process the JSON.
	 * @param propName The property name to process.
	 * @param propValue The property to process.
	 * @returns The processed property.
	 * @internal
	 */
	private processJson(propName: string, propValue: unknown): unknown {
		if (Is.array(propValue)) {
			for (let i = 0; i < propValue.length; i++) {
				propValue[i] = this.processJson(`${i}`, propValue[i]);
			}
		} else if (Is.object(propValue)) {
			for (const key of Object.keys(propValue)) {
				propValue[key] = this.processJson(key, propValue[key]);
			}
		} else if (!this._fullBase64 && Is.stringBase64(propValue) && propValue.length > 256) {
			propValue = "<base64>";
		} else if (
			Is.string(propValue) &&
			this._obfuscateProperties.some(op => new RegExp(op).test(propName))
		) {
			propValue = "**************";
		}

		return propValue;
	}

	/**
	 * Check if the content type is JSON.
	 * @param contentType The content type to check.
	 * @returns True if the content type is JSON, false otherwise.
	 * @internal
	 */
	private isMimeJson(contentType: string | string[] | undefined): boolean {
		return Is.stringValue(contentType)
			? contentType.includes(MimeTypes.Json) || contentType.includes(MimeTypes.JsonLd)
			: false;
	}
}
