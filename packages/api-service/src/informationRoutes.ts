// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type {
	IHttpRequestContext,
	IInformationComponent,
	INoContentRequest,
	IRestRoute,
	IServerFavIconResponse,
	IServerInfoResponse,
	IServerLivezResponse,
	IServerReadyzResponse,
	IServerRootResponse,
	IServerSpecResponse,
	ITag
} from "@3sixty/api-models";
import { ComponentFactory, Is } from "@3sixty/core";
import { nameof } from "@3sixty/nameof";
import { HeaderTypes, HttpStatusCode, MimeTypes } from "@3sixty/web";

/**
 * The tag to associate with the routes.
 */
export const tagsInformation: ITag[] = [
	{
		name: "Info",
		description: "Information endpoints for the REST server."
	}
];

/**
 * The REST routes for server information.
 * @param baseRouteName Prefix to prepend to the paths.
 * @param componentName The name of the component to use in the routes stored in the ComponentFactory.
 * @returns The generated routes.
 */
export function generateRestRoutesInformation(
	baseRouteName: string,
	componentName: string
): IRestRoute[] {
	const rootRoute: IRestRoute = {
		operationId: "serverRoot",
		summary: "Get the root text page",
		tag: tagsInformation[0].name,
		method: "GET",
		path: `${baseRouteName}/`,
		handler: async (httpRequestContext, request) =>
			serverRoot(httpRequestContext, componentName, request),
		responseType: [
			{
				type: nameof<IServerRootResponse>(),
				mimeType: MimeTypes.PlainText,
				examples: [
					{
						id: "serverRootResponse",
						description: "The response for the root request.",
						response: {
							headers: {
								[HeaderTypes.ContentType]: MimeTypes.PlainText
							},
							body: "API Server - 1.0.0"
						}
					}
				]
			}
		],
		skipAuth: true,
		skipTenant: true
	};

	const informationRoute: IRestRoute<INoContentRequest, IServerInfoResponse> = {
		operationId: "serverInformation",
		summary: "Get the information for the server",
		tag: tagsInformation[0].name,
		method: "GET",
		path: `${baseRouteName}/info`,
		handler: async (httpRequestContext, request) =>
			serverInfo(httpRequestContext, componentName, request),
		responseType: [
			{
				type: nameof<IServerInfoResponse>(),
				examples: [
					{
						id: "informationResponse",
						description: "The response for the information request.",
						response: {
							body: {
								name: "API Server",
								version: "1.0.0"
							}
						}
					}
				]
			}
		],
		skipAuth: true,
		skipTenant: true
	};

	const favIconRoute: IRestRoute<INoContentRequest, IServerFavIconResponse> = {
		operationId: "serverFavIcon",
		summary: "Get the favicon for the server",
		tag: tagsInformation[0].name,
		method: "GET",
		path: `${baseRouteName}/favicon.ico`,
		handler: async (httpRequestContext, request) =>
			serverFavIcon(httpRequestContext, componentName, request),
		responseType: [
			{
				type: nameof<IServerFavIconResponse>(),
				mimeType: "image/x-icon"
			}
		],
		skipAuth: true,
		skipTenant: true
	};

	const livezRoute: IRestRoute<INoContentRequest, IServerLivezResponse> = {
		operationId: "serverLivez",
		summary: "Get the livez status for the server",
		tag: tagsInformation[0].name,
		method: "GET",
		path: `${baseRouteName}/livez`,
		handler: async (httpRequestContext, request) =>
			serverLivez(httpRequestContext, componentName, request),
		responseType: [
			{
				type: nameof<IServerLivezResponse>(),
				mimeType: MimeTypes.PlainText,
				examples: [
					{
						id: "livezResponseOK",
						description: "The response for the liveness request.",
						response: {
							headers: {
								[HeaderTypes.ContentType]: MimeTypes.PlainText
							},
							body: "alive"
						}
					},
					{
						id: "livezResponseFailure",
						description: "The response for the liveness request with errors.",
						response: {
							headers: {
								[HeaderTypes.ContentType]: MimeTypes.PlainText
							},
							body: "dead"
						}
					}
				]
			}
		],
		skipAuth: true,
		skipTenant: true
	};

	const readyzRoute: IRestRoute<INoContentRequest, IServerReadyzResponse> = {
		operationId: "serverReadyz",
		summary: "Get the readyz status for the server",
		tag: tagsInformation[0].name,
		method: "GET",
		path: `${baseRouteName}/readyz`,
		handler: async (httpRequestContext, request) =>
			serverReadyz(httpRequestContext, componentName, request),
		responseType: [
			{
				type: nameof<IServerReadyzResponse>(),
				mimeType: MimeTypes.PlainText,
				examples: [
					{
						id: "readyzResponseOK",
						description: "The response for the readiness request.",
						response: {
							headers: {
								[HeaderTypes.ContentType]: MimeTypes.PlainText
							},
							body: "ready"
						}
					},
					{
						id: "readyzResponseFailure",
						description: "The response for the readiness request with errors.",
						response: {
							headers: {
								[HeaderTypes.ContentType]: MimeTypes.PlainText
							},
							body: "not ready"
						}
					}
				]
			}
		],
		skipAuth: true,
		skipTenant: true
	};

	const specRoute: IRestRoute<INoContentRequest, IServerSpecResponse> = {
		operationId: "serverSpec",
		summary: "Get the OpenAPI specification for the endpoints",
		tag: tagsInformation[0].name,
		method: "GET",
		path: `${baseRouteName}/spec`,
		handler: async (httpRequestContext, request) =>
			serverSpec(httpRequestContext, componentName, request),
		responseType: [
			{
				type: nameof<IServerSpecResponse>(),
				examples: [
					{
						id: "specResponse",
						description: "The response for the spec request.",
						response: {
							body: {
								openapi: "3.1.0",
								info: {},
								paths: {}
							}
						}
					}
				]
			}
		],
		skipAuth: true,
		skipTenant: true
	};

	return [rootRoute, favIconRoute, informationRoute, livezRoute, readyzRoute, specRoute];
}

/**
 * Get the root for the server.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function serverRoot(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: INoContentRequest
): Promise<IServerRootResponse> {
	const component = ComponentFactory.get<IInformationComponent>(componentName);
	return {
		headers: {
			[HeaderTypes.ContentType]: MimeTypes.PlainText
		},
		body: await component.root()
	};
}

/**
 * Get the information for the server.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function serverInfo(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: INoContentRequest
): Promise<IServerInfoResponse> {
	const component = ComponentFactory.get<IInformationComponent>(componentName);
	return {
		body: await component.info()
	};
}

/**
 * Get the livez for the server.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function serverLivez(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: INoContentRequest
): Promise<IServerLivezResponse> {
	const component = ComponentFactory.get<IInformationComponent>(componentName);
	return {
		headers: {
			[HeaderTypes.ContentType]: MimeTypes.PlainText
		},
		body: (await component.livez()).status
	};
}

/**
 * Get the readyz for the server.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function serverReadyz(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: INoContentRequest
): Promise<IServerReadyzResponse> {
	const component = ComponentFactory.get<IInformationComponent>(componentName);
	return {
		headers: {
			[HeaderTypes.ContentType]: MimeTypes.PlainText
		},
		body: (await component.readyz()).status
	};
}

/**
 * Get the favicon for the server.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function serverFavIcon(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: INoContentRequest
): Promise<IServerFavIconResponse> {
	const component = ComponentFactory.get<IInformationComponent>(componentName);
	const favIcon = await component.favicon();

	if (Is.uint8Array(favIcon)) {
		return {
			headers: {
				[HeaderTypes.ContentType]: "image/x-icon"
			},
			body: favIcon
		};
	}
	return {
		statusCode: HttpStatusCode.notFound
	};
}

/**
 * Get the spec for the server.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function serverSpec(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: INoContentRequest
): Promise<IServerSpecResponse> {
	const component = ComponentFactory.get<IInformationComponent>(componentName);
	const spec = await component.spec();

	if (Is.objectValue(spec)) {
		return {
			body: spec
		};
	}
	return {
		statusCode: HttpStatusCode.notFound
	};
}
