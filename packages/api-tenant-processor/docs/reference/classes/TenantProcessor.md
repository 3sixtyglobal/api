# Class: TenantProcessor

Handles incoming api keys and maps them to tenant ids.

## Implements

- `IBaseRouteProcessor`

## Constructors

### Constructor

> **new TenantProcessor**(`options?`): `TenantProcessor`

Create a new instance of TenantProcessor.

#### Parameters

##### options?

[`ITenantProcessorConstructorOptions`](../interfaces/ITenantProcessorConstructorOptions.md)

Options for the processor.

#### Returns

`TenantProcessor`

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

A promise that resolves when the tenant context has been resolved and injected, or an error response set.

#### Implementation of

`IBaseRouteProcessor.pre`
