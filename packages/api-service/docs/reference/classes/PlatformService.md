# Class: PlatformService

Service for performing platform operations.

## Implements

- `IPlatformComponent`

## Constructors

### Constructor

> **new PlatformService**(`options?`): `PlatformService`

Create a new instance of PlatformService.

#### Parameters

##### options?

[`IPlatformServiceConstructorOptions`](../interfaces/IPlatformServiceConstructorOptions.md)

The options for the connector.

#### Returns

`PlatformService`

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

`IPlatformComponent.className`

***

### isMultiTenant() {#ismultitenant}

> **isMultiTenant**(): `boolean`

Indicates whether the component is running in a multi-tenant environment.

#### Returns

`boolean`

True if the component is running in a multi-tenant environment, false otherwise.

#### Implementation of

`IPlatformComponent.isMultiTenant`

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

#### Implementation of

`IPlatformComponent.execute`

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

#### Implementation of

`IPlatformComponent.getLocalOriginContext`

***

### registerTenantEventCallback() {#registertenanteventcallback}

> **registerTenantEventCallback**(`callbackId`, `callback`): `void`

Registers a callback to be invoked when a tenant event occurs.

#### Parameters

##### callbackId

`string`

A unique identifier for the callback.

##### callback

`TenantEventCallback`

The callback to invoke when a tenant event occurs.

#### Returns

`void`

#### Implementation of

`IPlatformComponent.registerTenantEventCallback`

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

#### Implementation of

`IPlatformComponent.unregisterTenantEventCallback`

***

### fireTenantEvent() {#firetenantevent}

> **fireTenantEvent**(`tenantId`, `eventType`): `Promise`\<`void`\>

Fires all registered tenant event callbacks.

#### Parameters

##### tenantId

`string`

The ID of the tenant for which the event occurred.

##### eventType

`TenantEventType`

The type of event that occurred.

#### Returns

`Promise`\<`void`\>

A promise that resolves when all callbacks have been invoked.

#### Implementation of

`IPlatformComponent.fireTenantEvent`
