# Interface: IRestRoute\<T, U\>

Interface which defines a REST route.

## Extends

- [`IBaseRoute`](IBaseRoute.md)

## Type Parameters

### T

`T` *extends* [`IHttpRequest`](IHttpRequest.md) = `any`

### U

`U` *extends* [`IHttpResponse`](IHttpResponse.md) & [`IRestRouteResponseOptions`](IRestRouteResponseOptions.md) = `any`

## Properties

### operationId {#operationid}

> **operationId**: `string`

The id of the operation.

#### Inherited from

[`IBaseRoute`](IBaseRoute.md).[`operationId`](IBaseRoute.md#operationid)

***

### path {#path}

> **path**: `string`

The path to use for routing.

#### Inherited from

[`IBaseRoute`](IBaseRoute.md).[`path`](IBaseRoute.md#path)

***

### skipAuth? {#skipauth}

> `optional` **skipAuth?**: `boolean`

Skips the authentication requirement for this route.

#### Default

```ts
false
```

#### Inherited from

[`IBaseRoute`](IBaseRoute.md).[`skipAuth`](IBaseRoute.md#skipauth)

***

### skipTenant? {#skiptenant}

> `optional` **skipTenant?**: `boolean`

Skips the tenant requirement for this route.

#### Default

```ts
false
```

#### Inherited from

[`IBaseRoute`](IBaseRoute.md).[`skipTenant`](IBaseRoute.md#skiptenant)

***

### requiresAuthorization? {#requiresauthorization}

> `optional` **requiresAuthorization?**: `boolean`

Requires authorization for this route.

#### Default

```ts
true
```

#### Inherited from

[`IBaseRoute`](IBaseRoute.md).[`requiresAuthorization`](IBaseRoute.md#requiresauthorization)

***

### defaultAuthorization? {#defaultauthorization}

> `optional` **defaultAuthorization?**: [`IRouteAuthorization`](IRouteAuthorization.md)

The default authorization which can access this route, used to seed the RBAC rules.

#### Inherited from

[`IBaseRoute`](IBaseRoute.md).[`defaultAuthorization`](IBaseRoute.md#defaultauthorization)

***

### disableTenantOverride? {#disabletenantoverride}

> `optional` **disableTenantOverride?**: `boolean`

Set to true to prevent callers from using the overrideTenant query parameter on this route.
Tenant override is allowed by default, but you must hold the escalated privilege role to use it.

#### Default

```ts
false
```

#### Inherited from

[`IBaseRoute`](IBaseRoute.md).[`disableTenantOverride`](IBaseRoute.md#disabletenantoverride)

***

### summary {#summary}

> **summary**: `string`

Summary of what task the operation performs.

***

### tag {#tag}

> **tag**: `string`

Tag for the operation.

***

### method {#method}

> **method**: `HttpMethod`

The http method.

***

### handler {#handler}

> **handler**: (`httpRequestContext`, `request`) => `Promise`\<`U`\>

The handler module.

#### Parameters

##### httpRequestContext

[`IHttpRequestContext`](IHttpRequestContext.md)

The http request context.

##### request

`T`

The request object, combined query param, path params and body.

#### Returns

`Promise`\<`U`\>

***

### requestType? {#requesttype}

> `optional` **requestType?**: `object`

The type of the request object.

#### type

> **type**: `string`

The object type for the request.

#### mimeType?

> `optional` **mimeType?**: `string`

The mime type of the request, defaults to "application/json" if there is a body.

#### examples?

> `optional` **examples?**: [`IRestRouteRequestExample`](IRestRouteRequestExample.md)\<`T`\>[]

Example objects for the request.

***

### responseType? {#responsetype}

> `optional` **responseType?**: `object`[]

The type of the response object.

#### type

> **type**: `string`

The object type of the response.

#### mimeType?

> `optional` **mimeType?**: `string`

The mime type of the response, defaults to "application/json" if there is a body.

#### examples?

> `optional` **examples?**: [`IRestRouteResponseExample`](IRestRouteResponseExample.md)\<`U`\>[]

Example objects of the response.

***

### excludeFromSpec? {#excludefromspec}

> `optional` **excludeFromSpec?**: `boolean`

Exclude the route from being included in the spec file.

***

### bodyLimit? {#bodylimit}

> `optional` **bodyLimit?**: `string`

The name of the body size limit to apply to the route, only used by methods that carry a body.
If not provided, the default body size limit will be used. The body size limits are defined in the web server options.
