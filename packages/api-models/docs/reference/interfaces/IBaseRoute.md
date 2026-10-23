# Interface: IBaseRoute

Interface which defines a route.

## Extended by

- [`IRestRoute`](IRestRoute.md)
- [`ISocketRoute`](ISocketRoute.md)

## Properties

### operationId {#operationid}

> **operationId**: `string`

The id of the operation.

***

### path {#path}

> **path**: `string`

The path to use for routing.

***

### skipAuth? {#skipauth}

> `optional` **skipAuth?**: `boolean`

Skips the authentication requirement for this route.

#### Default

```ts
false
```

***

### skipTenant? {#skiptenant}

> `optional` **skipTenant?**: `boolean`

Skips the tenant requirement for this route.

#### Default

```ts
false
```

***

### requiresAuthorization? {#requiresauthorization}

> `optional` **requiresAuthorization?**: `boolean`

Requires authorization for this route.

#### Default

```ts
true
```

***

### defaultAuthorization? {#defaultauthorization}

> `optional` **defaultAuthorization?**: [`IRouteAuthorization`](IRouteAuthorization.md)

The default authorization which can access this route, used to seed the RBAC rules.

***

### disableTenantOverride? {#disabletenantoverride}

> `optional` **disableTenantOverride?**: `boolean`

Set to true to prevent callers from using the overrideTenant query parameter on this route.
Tenant override is allowed by default, but you must hold the escalated privilege role to use it.

#### Default

```ts
false
```
