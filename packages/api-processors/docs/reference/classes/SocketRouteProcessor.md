# Class: SocketRouteProcessor

Process the socket request and hands it on to the route handler.

## Implements

- `ISocketRouteProcessor`

## Constructors

### Constructor

> **new SocketRouteProcessor**(`options?`): `SocketRouteProcessor`

Create a new instance of SocketRouteProcessor.

#### Parameters

##### options?

[`ISocketRouteProcessorConstructorOptions`](../interfaces/ISocketRouteProcessorConstructorOptions.md)

Options for the processor.

#### Returns

`SocketRouteProcessor`

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

## Methods

### className() {#classname}

> **className**(): `string`

Returns the class name of the component.

#### Returns

`string`

The class name of the component.

#### Implementation of

`ISocketRouteProcessor.className`

***

### connected() {#connected}

> **connected**(`request`, `route`, `loggingComponentType?`): `Promise`\<`void`\>

Process the connected event.

#### Parameters

##### request

`ISocketServerRequest`

The server request object containing the socket id and other parameters.

##### route

`ISocketRoute`\<`any`, `any`\> \| `undefined`

The route being requested, if a matching one was found.

##### loggingComponentType?

`string`

The logging component type for the request.

#### Returns

`Promise`\<`void`\>

Promise that resolves when the request is processed.

#### Implementation of

`ISocketRouteProcessor.connected`

***

### disconnected() {#disconnected}

> **disconnected**(`request`, `route`, `loggingComponentType?`): `Promise`\<`void`\>

Process the disconnected event.

#### Parameters

##### request

`ISocketServerRequest`

The server request object containing the socket id and other parameters.

##### route

`ISocketRoute`\<`any`, `any`\> \| `undefined`

The route being requested, if a matching one was found.

##### loggingComponentType?

`string`

The logging component type for the request.

#### Returns

`Promise`\<`void`\>

Promise that resolves when the request is processed.

#### Implementation of

`ISocketRouteProcessor.disconnected`

***

### process() {#process}

> **process**(`request`, `response`, `route`, `processorState`, `responseEmitter`, `loggingComponentType?`): `Promise`\<`void`\>

Process the socket request for the specified route.

#### Parameters

##### request

`ISocketServerRequest`

The incoming request.

##### response

`IHttpResponse`

The outgoing response.

##### route

`ISocketRoute`\<`any`, `any`\> \| `undefined`

The route to process.

##### processorState

\{\[`id`: `string`\]: `unknown`; \}

The state handed through the processors.

##### responseEmitter

(`topic`, `response`) => `Promise`\<`void`\>

The function to emit a response.

##### loggingComponentType?

`string`

The logging component type for the request.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the request has been processed and the response emitted.

#### Implementation of

`ISocketRouteProcessor.process`
