# Interface: ISocketRoute\<T, U\>

Interface which defines a socket route.

## Extends

- [`IBaseRoute`](IBaseRoute.md)

## Type Parameters

### T

`T` *extends* [`IHttpRequest`](IHttpRequest.md) = `any`

### U

`U` *extends* [`IHttpResponse`](IHttpResponse.md) = `any`

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

### handler {#handler}

> **handler**: (`socketRequestContext`, `request`, `emit`) => `Promise`\<`void`\>

The handler module.

#### Parameters

##### socketRequestContext

[`ISocketRequestContext`](ISocketRequestContext.md)

The request context.

##### request

`T`

The request object.

##### emit

(`event`, `response`) => `Promise`\<`void`\>

The function to emit an event.

#### Returns

`Promise`\<`void`\>

***

### connected? {#connected}

> `optional` **connected?**: (`socketRequestContext`) => `Promise`\<`void`\>

The connected handler.

#### Parameters

##### socketRequestContext

[`ISocketRequestContext`](ISocketRequestContext.md)

The request context.

#### Returns

`Promise`\<`void`\>

***

### disconnected? {#disconnected}

> `optional` **disconnected?**: (`socketRequestContext`) => `Promise`\<`void`\>

The disconnected handler.

#### Parameters

##### socketRequestContext

[`ISocketRequestContext`](ISocketRequestContext.md)

The request context.

#### Returns

`Promise`\<`void`\>
