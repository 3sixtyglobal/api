# Class: LoggingProcessor

Process the REST request and log its information.

## Implements

- `IBaseRouteProcessor`

## Constructors

### Constructor

> **new LoggingProcessor**(`options?`): `LoggingProcessor`

Create a new instance of LoggingProcessor.

#### Parameters

##### options?

[`ILoggingProcessorConstructorOptions`](../interfaces/ILoggingProcessorConstructorOptions.md)

Options for the processor.

#### Returns

`LoggingProcessor`

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

`IBaseRouteProcessor.className`

***

### pre() {#pre}

> **pre**(`request`, `response`, `route`, `contextIds`, `processorState`): `Promise`\<`void`\>

Pre process the REST request for the specified route.

#### Parameters

##### request

`IHttpServerRequest`

The incoming request.

##### response

`IHttpResponse`

The outgoing response.

##### route

`IBaseRoute` \| `undefined`

The route to process.

##### contextIds

`IContextIds`

The context IDs of the request.

##### processorState

\{\[`id`: `string`\]: `unknown`; \}

The state handed through the processors.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the pre-processing log entry has been written.

#### Implementation of

`IBaseRouteProcessor.pre`

***

### post() {#post}

> **post**(`request`, `response`, `route`, `contextIds`, `processorState`): `Promise`\<`void`\>

Post process the REST request for the specified route.

#### Parameters

##### request

`IHttpServerRequest`

The incoming request.

##### response

`IHttpResponse`

The outgoing response.

##### route

`IBaseRoute` \| `undefined`

The route to process.

##### contextIds

`IContextIds`

The context IDs of the request.

##### processorState

\{\[`id`: `string`\]: `unknown`; \}

The state handed through the processors.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the post-processing log entry has been written.

#### Implementation of

`IBaseRouteProcessor.post`
