# Class: SingleTenantProcessor

Injects the single-tenant organization ID into every request context and validates any organization query parameter.

## Implements

- `IBaseRouteProcessor`

## Constructors

### Constructor

> **new SingleTenantProcessor**(`options?`): `SingleTenantProcessor`

Create a new instance of SingleTenantProcessor.

#### Parameters

##### options?

[`ISingleTenantProcessorConstructorOptions`](../interfaces/ISingleTenantProcessorConstructorOptions.md)

Options for the processor.

#### Returns

`SingleTenantProcessor`

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

Cache the node organization ID from the engine context so it can be injected into each
per-request context without requiring a separate ContextIdProcessor for Organization.

#### Parameters

##### nodeLoggingComponentType?

`string`

The node logging component type.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the node organization ID has been cached.

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

A promise that resolves when the organization ID has been injected and any query parameter validated.

#### Implementation of

`IBaseRouteProcessor.pre`
