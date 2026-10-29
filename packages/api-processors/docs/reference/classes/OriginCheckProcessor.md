# Class: OriginCheckProcessor

Rejects cookie authenticated state changing requests, and cookie authenticated socket
connections and messages, from other origins, to prevent cross site request forgery. Requests
with a bearer token, or without cookies, are not checked, and requests with neither Origin nor
Sec-Fetch-Site, such as server to server calls, are allowed.

## Implements

- `IRestRouteProcessor`
- `ISocketRouteProcessor`

## Constructors

### Constructor

> **new OriginCheckProcessor**(`options?`): `OriginCheckProcessor`

Create a new instance of OriginCheckProcessor.

#### Parameters

##### options?

[`IOriginCheckProcessorConstructorOptions`](../interfaces/IOriginCheckProcessorConstructorOptions.md)

Options for the processor.

#### Returns

`OriginCheckProcessor`

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

`IRestRouteProcessor.className`

***

### connected() {#connected}

> **connected**(`request`, `route`, `loggingComponentType?`): `Promise`\<`void`\>

Check the socket handshake when a socket connects, rejecting cross origin cookie authenticated connections.

#### Parameters

##### request

`ISocketServerRequest`

The socket request with the handshake headers.

##### route

`ISocketRoute`\<`any`, `any`\> \| `undefined`

The route being requested, if a matching one was found.

##### loggingComponentType?

`string`

The logging component type for the request.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the connection has been checked.

#### Throws

ForbiddenError If the connection is from an origin which is not allowed.

#### Implementation of

`ISocketRouteProcessor.connected`

***

### pre() {#pre}

> **pre**(`request`, `response`, `route`, `contextIds`, `processorState`): `Promise`\<`void`\>

Pre process the REST or socket request, rejecting cross origin cookie authenticated requests.

#### Parameters

##### request

`IHttpServerRequest`\<`any`\> \| `ISocketServerRequest`\<`any`\>

The incoming request.

##### response

`IHttpResponse`

The outgoing response.

##### route

`IRestRoute`\<`any`, `any`\> \| `ISocketRoute`\<`any`, `any`\> \| `undefined`

The route to process.

##### contextIds

`IContextIds`

The context IDs of the request.

##### processorState

\{\[`id`: `string`\]: `unknown`; \}

The state handed through the processors.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the request has been checked.

#### Throws

ForbiddenError If the request is from an origin which is not allowed.

#### Implementation of

`IRestRouteProcessor.pre`
