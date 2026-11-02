# Class: InformationService

The information service for the server.

## Implements

- `IInformationComponent`

## Constructors

### Constructor

> **new InformationService**(`options`): `InformationService`

Create a new instance of InformationService.

#### Parameters

##### options

[`IInformationServiceConstructorOptions`](../interfaces/IInformationServiceConstructorOptions.md)

The options to create the service.

#### Returns

`InformationService`

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

`IInformationComponent.className`

***

### start() {#start}

> **start**(): `Promise`\<`void`\>

The service needs to be started when the application is initialized.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the OpenAPI spec and favicon have been loaded from disk.

#### Implementation of

`IInformationComponent.start`

***

### root() {#root}

> **root**(): `Promise`\<`string`\>

Get the root information.

#### Returns

`Promise`\<`string`\>

The root information.

#### Implementation of

`IInformationComponent.root`

***

### info() {#info}

> **info**(): `Promise`\<`IServerInfo`\>

Get the server information.

#### Returns

`Promise`\<`IServerInfo`\>

The service information.

#### Implementation of

`IInformationComponent.info`

***

### favicon() {#favicon}

> **favicon**(): `Promise`\<`Uint8Array`\<`ArrayBufferLike`\> \| `undefined`\>

Get the favicon.

#### Returns

`Promise`\<`Uint8Array`\<`ArrayBufferLike`\> \| `undefined`\>

The favicon.

#### Implementation of

`IInformationComponent.favicon`

***

### spec() {#spec}

> **spec**(): `Promise`\<`unknown`\>

Get the OpenAPI spec.

#### Returns

`Promise`\<`unknown`\>

The OpenAPI spec.

#### Implementation of

`IInformationComponent.spec`

***

### livez() {#livez}

> **livez**(): `Promise`\<\{ `status`: `LivenessStatus`; \}\>

Is the server live.

#### Returns

`Promise`\<\{ `status`: `LivenessStatus`; \}\>

The liveness status of the server.

#### Implementation of

`IInformationComponent.livez`

***

### readyz() {#readyz}

> **readyz**(): `Promise`\<\{ `status`: `"ready"` \| `"not ready"`; \}\>

Is the server ready.

#### Returns

`Promise`\<\{ `status`: `"ready"` \| `"not ready"`; \}\>

The readyz status of the server.

#### Implementation of

`IInformationComponent.readyz`
