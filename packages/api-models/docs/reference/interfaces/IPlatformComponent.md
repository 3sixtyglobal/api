# Interface: IPlatformComponent

Interface for the platform component.

## Extends

- `IComponent`

## Methods

### isMultiTenant() {#ismultitenant}

> **isMultiTenant**(): `boolean`

Indicates whether the component is running in a multi-tenant environment.

#### Returns

`boolean`

True if the component is running in a multi-tenant environment, false otherwise.

***

### execute() {#execute}

> **execute**(`method`): `Promise`\<`void`\>

Execute a method, if single tenant will run once, if multi-tenant will run for each tenant.

#### Parameters

##### method

() => `Promise`\<`void`\> \| `Promise`\<`boolean` \| `undefined`\>

The method to run for each tenant, returning false will stop any further iterations.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the method has been executed for all applicable tenants.

***

### getLocalOriginContext() {#getlocalorigincontext}

> **getLocalOriginContext**(`url`): `Promise`\<`IContextIds` \| `undefined`\>

Get the local origin context IDs for the given URL.

#### Parameters

##### url

`string`

The URL to check.

#### Returns

`Promise`\<`IContextIds` \| `undefined`\>

A promise that resolves to the context IDs if the URL is a local origin, undefined otherwise.

***

### registerTenantEventCallback() {#registertenanteventcallback}

> **registerTenantEventCallback**(`callbackId`, `callback`): `void`

Registers a callback to be invoked when a tenant event occurs.

#### Parameters

##### callbackId

`string`

A unique identifier for the callback.

##### callback

[`TenantEventCallback`](../type-aliases/TenantEventCallback.md)

The callback to invoke when a tenant event occurs.

#### Returns

`void`

***

### unregisterTenantEventCallback() {#unregistertenanteventcallback}

> **unregisterTenantEventCallback**(`callbackId`): `void`

Unregisters a previously registered tenant event callback.

#### Parameters

##### callbackId

`string`

The identifier of the callback to unregister.

#### Returns

`void`

***

### fireTenantEvent() {#firetenantevent}

> **fireTenantEvent**(`tenantId`, `eventType`): `Promise`\<`void`\>

Fires all registered tenant event callbacks.

#### Parameters

##### tenantId

`string`

The ID of the tenant for which the event occurred.

##### eventType

[`TenantEventType`](../type-aliases/TenantEventType.md)

The type of event that occurred.

#### Returns

`Promise`\<`void`\>

A promise that resolves when all callbacks have been invoked.
