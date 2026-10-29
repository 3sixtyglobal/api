// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import {
	ForbiddenError,
	HeaderTypesExtended,
	HttpContextIdKeys,
	HttpUrlHelper,
	type IHttpResponse,
	type IHttpServerRequest,
	type IRestRoute,
	type IRestRouteProcessor,
	type ISocketRoute,
	type ISocketRouteProcessor,
	type ISocketServerRequest
} from "@3sixty/api-models";
import type { IContextIds } from "@3sixty/context";
import { Is } from "@3sixty/core";
import { nameof } from "@3sixty/nameof";
import { HeaderHelper, HeaderTypes, HttpMethod, type IHttpHeaders } from "@3sixty/web";
import type { IOriginCheckProcessorConstructorOptions } from "../models/IOriginCheckProcessorConstructorOptions.js";

/**
 * Rejects cookie authenticated state changing requests, and cookie authenticated socket
 * connections and messages, from other origins, to prevent cross site request forgery. Requests
 * with a bearer token, or without cookies, are not checked, and requests with neither Origin nor
 * Sec-Fetch-Site, such as server to server calls, are allowed.
 */
export class OriginCheckProcessor implements IRestRouteProcessor, ISocketRouteProcessor {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<OriginCheckProcessor>();

	/**
	 * The methods which change state.
	 * @internal
	 */
	private static readonly _STATE_CHANGING_METHODS: string[] = [
		HttpMethod.POST,
		HttpMethod.PUT,
		HttpMethod.PATCH,
		HttpMethod.DELETE
	];

	/**
	 * The Sec-Fetch-Site values which are allowed.
	 * @internal
	 */
	private static readonly _ALLOWED_FETCH_SITES: string[] = ["same-origin", "none"];

	/**
	 * The Host header, which is not in the common header types.
	 * @internal
	 */
	private static readonly _HOST_HEADER: string = "host";

	/**
	 * The allowed cross origins, in lower case.
	 * @internal
	 */
	private readonly _allowedOrigins: string[];

	/**
	 * Create a new instance of OriginCheckProcessor.
	 * @param options Options for the processor.
	 */
	constructor(options?: IOriginCheckProcessorConstructorOptions) {
		const allowedOrigins = options?.config?.allowedOrigins;
		this._allowedOrigins = (
			Is.string(allowedOrigins) ? allowedOrigins.split(",") : (allowedOrigins ?? [])
		)
			.map(origin => origin.trim().toLowerCase())
			.filter(origin => origin.length > 0 && origin !== "*");
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return OriginCheckProcessor.CLASS_NAME;
	}

	/**
	 * Check the socket handshake when a socket connects, rejecting cross origin cookie authenticated connections.
	 * @param request The socket request with the handshake headers.
	 * @param route The route being requested, if a matching one was found.
	 * @param loggingComponentType The logging component type for the request.
	 * @returns A promise that resolves when the connection has been checked.
	 * @throws ForbiddenError If the connection is from an origin which is not allowed.
	 */
	public async connected(
		request: ISocketServerRequest,
		route: ISocketRoute | undefined,
		loggingComponentType?: string
	): Promise<void> {
		this.checkSocket(request, {});
	}

	/**
	 * Pre process the REST or socket request, rejecting cross origin cookie authenticated requests.
	 * @param request The incoming request.
	 * @param response The outgoing response.
	 * @param route The route to process.
	 * @param contextIds The context IDs of the request.
	 * @param processorState The state handed through the processors.
	 * @returns A promise that resolves when the request has been checked.
	 * @throws ForbiddenError If the request is from an origin which is not allowed.
	 */
	public async pre(
		request: IHttpServerRequest | ISocketServerRequest,
		response: IHttpResponse,
		route: IRestRoute | ISocketRoute | undefined,
		contextIds: IContextIds,
		processorState: { [id: string]: unknown }
	): Promise<void> {
		if ("socketId" in request && Is.stringValue(request.socketId)) {
			this.checkSocket(request, contextIds);
		} else if (OriginCheckProcessor._STATE_CHANGING_METHODS.includes(request.method ?? "")) {
			this.checkOrigin(request.headers ?? {}, [
				HttpUrlHelper.extractOrigin(request.url),
				contextIds[HttpContextIdKeys.PublicOrigin],
				contextIds[HttpContextIdKeys.LocalOrigin]
			]);
		}
	}

	/**
	 * Check a socket request, its own origin is taken from the handshake Host header as the
	 * request url and context ids may not carry an origin.
	 * @param request The socket request with the handshake headers.
	 * @param contextIds The context IDs of the request.
	 * @throws ForbiddenError If the request is from an origin which is not allowed.
	 * @internal
	 */
	private checkSocket(request: ISocketServerRequest, contextIds: IContextIds): void {
		const headers = request.headers ?? {};
		const host = this.getFirstHeader(headers[OriginCheckProcessor._HOST_HEADER]);
		this.checkOrigin(headers, [
			Is.stringValue(host) ? `https://${host}` : undefined,
			Is.stringValue(host) ? `http://${host}` : undefined,
			HttpUrlHelper.extractOrigin(request.url),
			contextIds[HttpContextIdKeys.PublicOrigin],
			contextIds[HttpContextIdKeys.LocalOrigin]
		]);
	}

	/**
	 * Reject a cookie authenticated request without a bearer token from an origin which is not allowed.
	 * @param headers The request headers.
	 * @param sameOrigins The origins which count as the request's own.
	 * @throws ForbiddenError If the request is from an origin which is not allowed.
	 * @internal
	 */
	private checkOrigin(headers: IHttpHeaders, sameOrigins: (string | undefined)[]): void {
		if (
			!Is.stringValue(this.getFirstHeader(headers[HeaderTypes.Cookie])) ||
			Is.stringValue(HeaderHelper.extractBearer(headers[HeaderTypes.Authorization]))
		) {
			return;
		}

		const origin = this.getFirstHeader(headers[HeaderTypes.Origin])?.toLowerCase();
		if (Is.stringValue(origin)) {
			const ownOrigins = sameOrigins.filter(o => Is.stringValue(o)).map(o => o.toLowerCase());

			if (!ownOrigins.includes(origin) && !this._allowedOrigins.includes(origin)) {
				throw new ForbiddenError(OriginCheckProcessor.CLASS_NAME, "originNotAllowed", {
					origin
				});
			}
			return;
		}

		const fetchSite = this.getFirstHeader(headers[HeaderTypesExtended.SecFetchSite])?.toLowerCase();
		if (
			Is.stringValue(fetchSite) &&
			!OriginCheckProcessor._ALLOWED_FETCH_SITES.includes(fetchSite)
		) {
			throw new ForbiddenError(OriginCheckProcessor.CLASS_NAME, "crossSiteRequest", {
				fetchSite
			});
		}
	}

	/**
	 * Get the first value of a header.
	 * @param value The header value.
	 * @returns The first value.
	 * @internal
	 */
	private getFirstHeader(value?: string | string[]): string | undefined {
		return Is.array(value) ? value[0] : value;
	}
}
