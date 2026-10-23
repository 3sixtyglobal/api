# Interface: IRestRouteProcessor

The definition for a processor for handling REST routes.

## Extends

- [`IBaseRouteProcessor`](IBaseRouteProcessor.md)\<[`IRestRoute`](IRestRoute.md)\>

## Methods

### pre()? {#pre}

> `optional` **pre**(`request`, `response`, `route`, `contextIds`, `processorState`, `componentTypes?`): `Promise`\<`void`\>

Pre process the REST request for the specified route.

#### Parameters

##### request

[`IHttpServerRequest`](IHttpServerRequest.md)

The request to handle.

##### response

[`IHttpResponse`](IHttpResponse.md)

The response data to send if any.

##### route

[`IRestRoute`](IRestRoute.md)\<`any`, `any`\> \| `undefined`

The route being requested, if a matching one was found.

##### contextIds

`IContextIds`

The context IDs of the request.

##### processorState

The state handed through the processors.

##### componentTypes?

The component types for the request.

###### loggingComponentType?

`string`

The logging component type.

#### Returns

`Promise`\<`void`\>

Promise that resolves when the request is processed.

#### Inherited from

[`IBaseRouteProcessor`](IBaseRouteProcessor.md).[`pre`](IBaseRouteProcessor.md#pre)

***

### post()? {#post}

> `optional` **post**(`request`, `response`, `route`, `contextIds`, `processorState`, `componentTypes?`): `Promise`\<`void`\>

Post process the REST request for the specified route.

#### Parameters

##### request

[`IHttpServerRequest`](IHttpServerRequest.md)

The request to handle.

##### response

[`IHttpResponse`](IHttpResponse.md)

The response data to send if any.

##### route

[`IRestRoute`](IRestRoute.md)\<`any`, `any`\> \| `undefined`

The route being requested, if a matching one was found.

##### contextIds

`IContextIds`

The context IDs of the request.

##### processorState

The state handed through the processors.

##### componentTypes?

The component types for the request.

###### loggingComponentType?

`string`

The logging component type.

#### Returns

`Promise`\<`void`\>

Promise that resolves when the request is processed.

#### Inherited from

[`IBaseRouteProcessor`](IBaseRouteProcessor.md).[`post`](IBaseRouteProcessor.md#post)

***

### process()? {#process}

> `optional` **process**(`request`, `response`, `route`, `processorState`, `componentTypes?`): `Promise`\<`void`\>

Process the REST request for the specified route.

#### Parameters

##### request

[`IHttpServerRequest`](IHttpServerRequest.md)

The request to handle.

##### response

[`IHttpResponse`](IHttpResponse.md)

The response data to send if any.

##### route

[`IRestRoute`](IRestRoute.md)\<`any`, `any`\> \| `undefined`

The route being requested, if a matching one was found.

##### processorState

The state handed through the processors.

##### componentTypes?

The component types for the request.

###### loggingComponentType?

`string`

The logging component type.

#### Returns

`Promise`\<`void`\>

Promise that resolves when the request is processed.
