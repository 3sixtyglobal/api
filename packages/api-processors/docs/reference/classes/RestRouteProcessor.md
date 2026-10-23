# Class: RestRouteProcessor

Process the REST request and hands it on to the route handler.

## Implements

- `IRestRouteProcessor`

## Constructors

### Constructor

> **new RestRouteProcessor**(`options?`): `RestRouteProcessor`

Create a new instance of RouteProcessor.

#### Parameters

##### options?

[`IRestRouteProcessorConstructorOptions`](../interfaces/IRestRouteProcessorConstructorOptions.md)

Options for the processor.

#### Returns

`RestRouteProcessor`

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

### process() {#process}

> **process**(`request`, `response`, `route`, `processorState`, `componentTypes?`): `Promise`\<`void`\>

Process the REST request for the specified route.

#### Parameters

##### request

`IHttpServerRequest`

The incoming request.

##### response

`IHttpResponse`

The outgoing response.

##### route

`IRestRoute`\<`any`, `any`\> \| `undefined`

The route to process.

##### processorState

\{\[`id`: `string`\]: `unknown`; \}

The state handed through the processors.

##### componentTypes?

The component types for the request.

###### loggingComponentType?

`string`

The logging component type.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the request has been processed and the response populated.

#### Implementation of

`IRestRouteProcessor.process`
