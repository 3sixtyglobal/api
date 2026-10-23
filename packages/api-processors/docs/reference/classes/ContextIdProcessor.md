# Class: ContextIdProcessor

Adds an id to the request context ids.

## Implements

- `IBaseRouteProcessor`

## Constructors

### Constructor

> **new ContextIdProcessor**(`options`): `ContextIdProcessor`

Create a new instance of ContextIdProcessor.

#### Parameters

##### options

[`IContextIdProcessorConstructorOptions`](../interfaces/IContextIdProcessorConstructorOptions.md)

Options for the processor.

#### Returns

`ContextIdProcessor`

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

### start() {#start}

> **start**(`nodeLoggingComponentType?`): `Promise`\<`void`\>

The service needs to be started when the application is initialized.

#### Parameters

##### nodeLoggingComponentType?

`string`

The node logging component type.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the context ID has been loaded from the store.

#### Implementation of

`IBaseRouteProcessor.start`

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

A promise that resolves when the context ID has been injected into the request.

#### Implementation of

`IBaseRouteProcessor.pre`
