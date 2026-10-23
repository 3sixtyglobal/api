# Class: HealthRestClient

The client to connect to the health service.

## Extends

- `BaseRestClient`

## Implements

- `IHealthComponent`

## Constructors

### Constructor

> **new HealthRestClient**(`config`): `HealthRestClient`

Create a new instance of HealthRestClient.

#### Parameters

##### config

`IBaseRestClientConfig`

The configuration for the client.

#### Returns

`HealthRestClient`

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

`IHealthComponent.className`

***

### healthStatus() {#healthstatus}

> **healthStatus**(): `Promise`\<\{ `status`: `HealthStatus`; `components`: `IHealth`[]; \}\>

Get the server health.

#### Returns

`Promise`\<\{ `status`: `HealthStatus`; `components`: `IHealth`[]; \}\>

The service health.

#### Implementation of

`IHealthComponent.healthStatus`
