# Class: InformationRestClient

The client to connect to the information service.

## Extends

- `BaseRestClient`

## Implements

- `IInformationComponent`

## Constructors

### Constructor

> **new InformationRestClient**(`config`): `InformationRestClient`

Create a new instance of InformationRestClient.

#### Parameters

##### config

`IBaseRestClientConfig`

The configuration for the client.

#### Returns

`InformationRestClient`

#### Overrides

`BaseRestClient.constructor`

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

## Methods

### getEndpointWithPrefix() {#getendpointwithprefix}

> **getEndpointWithPrefix**(): `string`

Get the endpoint with the prefix for the namespace.

#### Returns

`string`

The endpoint with namespace prefix attached.

#### Inherited from

`BaseRestClient.getEndpointWithPrefix`

***

### getPathPrefix() {#getpathprefix}

> **getPathPrefix**(): `string`

Get the path prefix as a URL path string provided in the constructor.

#### Returns

`string`

The path prefix.

#### Inherited from

`BaseRestClient.getPathPrefix`

***

### fetch() {#fetch}

> **fetch**\<`T`, `U`\>(`route`, `method`, `request?`, `options?`): `Promise`\<`U`\>

Perform a request in json format.

#### Type Parameters

##### T {#t}

`T` *extends* `IHttpRequest`\<`any`\>

##### U {#u}

`U` *extends* `IHttpResponse`\<`any`\>

#### Parameters

##### route

`string`

The route of the request.

##### method

`HttpMethod`

The http method.

##### request?

`T`

Request to send to the endpoint.

##### options?

Optional override options for the request.

###### overridePrefix?

`string`

Optional override prefix to use for this request instead of the default prefix.

#### Returns

`Promise`\<`U`\>

The response.

#### Inherited from

`BaseRestClient.fetch`

***

### className() {#classname}

> **className**(): `string`

Returns the class name of the component.

#### Returns

`string`

The class name of the component.

#### Implementation of

`IInformationComponent.className`

***

### root() {#root}

> **root**(): `Promise`\<`string`\>

Get the server root.

#### Returns

`Promise`\<`string`\>

The root text page content.

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

> **livez**(): `Promise`\<\{ `status`: `"alive"` \| `"dead"`; \}\>

Is the server live.

#### Returns

`Promise`\<\{ `status`: `"alive"` \| `"dead"`; \}\>

The liveness status of the server.

#### Implementation of

`IInformationComponent.livez`

***

### readyz() {#readyz}

> **readyz**(): `Promise`\<\{ `status`: `"ready"` \| `"not ready"`; \}\>

Is the server ready.

#### Returns

`Promise`\<\{ `status`: `"ready"` \| `"not ready"`; \}\>

The readiness status of the server.

#### Implementation of

`IInformationComponent.readyz`
