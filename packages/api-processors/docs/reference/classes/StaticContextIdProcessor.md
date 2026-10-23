# Class: StaticContextIdProcessor

Adds a static context id to the request context.

## Implements

- `IBaseRouteProcessor`

## Constructors

### Constructor

> **new StaticContextIdProcessor**(`options`): `StaticContextIdProcessor`

Create a new instance of StaticContextIdProcessor.

#### Parameters

##### options

[`IStaticContextIdProcessorConstructorOptions`](../interfaces/IStaticContextIdProcessorConstructorOptions.md)

Options for the processor.

#### Returns

`StaticContextIdProcessor`

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

A promise that resolves when the static context ID has been injected into the request.

#### Implementation of

`IBaseRouteProcessor.pre`
