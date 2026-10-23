# Interface: ISocketRouteProcessor

The definition for a processor for handling socket routes.

## Extends

- [`IBaseRouteProcessor`](IBaseRouteProcessor.md)\<[`ISocketRoute`](ISocketRoute.md), [`ISocketServerRequest`](ISocketServerRequest.md)\>

## Methods

### pre()? {#pre}

> `optional` **pre**(`request`, `response`, `route`, `contextIds`, `processorState`, `componentTypes?`): `Promise`\<`void`\>

Pre process the REST request for the specified route.

#### Parameters

##### request

[`ISocketServerRequest`](ISocketServerRequest.md)

The request to handle.

##### response

[`IHttpResponse`](IHttpResponse.md)

The response data to send if any.

##### route

[`ISocketRoute`](ISocketRoute.md)\<`any`, `any`\> \| `undefined`

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

[`ISocketServerRequest`](ISocketServerRequest.md)

The request to handle.

##### response

[`IHttpResponse`](IHttpResponse.md)

The response data to send if any.

##### route

[`ISocketRoute`](ISocketRoute.md)\<`any`, `any`\> \| `undefined`

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

### connected()? {#connected}

> `optional` **connected**(`request`, `route`, `loggingComponentType?`): `Promise`\<`void`\>

Process the connected event.

#### Parameters

##### request

[`ISocketServerRequest`](ISocketServerRequest.md)

The server request object containing the socket id and other parameters.

##### route

[`ISocketRoute`](ISocketRoute.md)\<`any`, `any`\> \| `undefined`

The route being requested, if a matching one was found.

##### loggingComponentType?

`string`

The logging component type for the request.

#### Returns

`Promise`\<`void`\>

Promise that resolves when the request is processed.

***

### disconnected()? {#disconnected}

> `optional` **disconnected**(`request`, `route`, `loggingComponentType?`): `Promise`\<`void`\>

Process the disconnected event.

#### Parameters

##### request

[`ISocketServerRequest`](ISocketServerRequest.md)

The server request object containing the socket id and other parameters.

##### route

[`ISocketRoute`](ISocketRoute.md)\<`any`, `any`\> \| `undefined`

The route being requested, if a matching one was found.

##### loggingComponentType?

`string`

The logging component type for the request.

#### Returns

`Promise`\<`void`\>

Promise that resolves when the request is processed.

***

### process()? {#process}

> `optional` **process**(`request`, `response`, `route`, `processorState`, `responseEmitter`, `loggingComponentType?`): `Promise`\<`void`\>

Process the REST request for the specified route.

#### Parameters

##### request

[`ISocketServerRequest`](ISocketServerRequest.md)

The server request object containing the socket id and other parameters.

##### response

[`IHttpResponse`](IHttpResponse.md)

The response data to send if any.

##### route

[`ISocketRoute`](ISocketRoute.md)\<`any`, `any`\> \| `undefined`

The route being requested, if a matching one was found.

##### processorState

The state handed through the processors.

##### responseEmitter

(`topic`, `response`) => `Promise`\<`void`\>

The function to emit a response.

##### loggingComponentType?

`string`

The logging component type for the request.

#### Returns

`Promise`\<`void`\>

Promise that resolves when the request is processed.
