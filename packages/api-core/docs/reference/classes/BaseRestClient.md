# Abstract Class: BaseRestClient

Abstract client class for common REST processing.

## Constructors

### Constructor

> **new BaseRestClient**(`restClientClassName`, `config`, `pathPrefix`): `BaseRestClient`

Create a new instance of BaseRestClient.

#### Parameters

##### restClientClassName

`string`

The name of the class implementation REST calls.

##### config

`IBaseRestClientConfig`

The configuration for the client.

##### pathPrefix

`string`

The default prefix to use if none in configuration.

#### Returns

`BaseRestClient`

## Methods

### getEndpointWithPrefix() {#getendpointwithprefix}

> **getEndpointWithPrefix**(): `string`

Get the endpoint with the prefix for the namespace.

#### Returns

`string`

The endpoint with namespace prefix attached.

***

### getPathPrefix() {#getpathprefix}

> **getPathPrefix**(): `string`

Get the path prefix as a URL path string provided in the constructor.

#### Returns

`string`

The path prefix.

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
