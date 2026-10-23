# Interface: IRestProcessorChains

The REST processor phase chains, bound to their processors when the server is built.

## Properties

### pre {#pre}

> **pre**: (`request`, `response`, `route`, `contextIds`, `processorState`, `componentTypes?`) => `Promise`\<`void`\>[]

The pre processing phase.

Pre process the REST request for the specified route.

#### Parameters

##### request

`IHttpServerRequest`

The request to handle.

##### response

`IHttpResponse`

The response data to send if any.

##### route

`IRestRoute`\<`any`, `any`\> \| `undefined`

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

***

### process {#process}

> **process**: (`request`, `response`, `route`, `processorState`, `componentTypes?`) => `Promise`\<`void`\>[]

The main processing phase.

Process the REST request for the specified route.

#### Parameters

##### request

`IHttpServerRequest`

The request to handle.

##### response

`IHttpResponse`

The response data to send if any.

##### route

`IRestRoute`\<`any`, `any`\> \| `undefined`

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

***

### post {#post}

> **post**: (`request`, `response`, `route`, `contextIds`, `processorState`, `componentTypes?`) => `Promise`\<`void`\>[]

The post processing phase.

Post process the REST request for the specified route.

#### Parameters

##### request

`IHttpServerRequest`

The request to handle.

##### response

`IHttpResponse`

The response data to send if any.

##### route

`IRestRoute`\<`any`, `any`\> \| `undefined`

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
