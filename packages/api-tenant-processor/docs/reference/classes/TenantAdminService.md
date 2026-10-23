# Class: TenantAdminService

Service for performing tenant administration operations.

## Implements

- `ITenantAdminComponent`
- `IHealthProviderComponent`

## Constructors

### Constructor

> **new TenantAdminService**(`options?`): `TenantAdminService`

Create a new instance of TenantAdminService.

#### Parameters

##### options?

[`ITenantAdminServiceConstructorOptions`](../interfaces/ITenantAdminServiceConstructorOptions.md)

The options for the connector.

#### Returns

`TenantAdminService`

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

`ITenantAdminComponent.className`

***

### stop() {#stop}

> **stop**(): `Promise`\<`void`\>

Stop the service and release the tenant cache.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the service has stopped.

#### Implementation of

`ITenantAdminComponent.stop`

***

### get() {#get}

> **get**(`tenantId`): `Promise`\<`ITenant`\>

Get a tenant by its id.

#### Parameters

##### tenantId

`string`

The id of the tenant.

#### Returns

`Promise`\<`ITenant`\>

The tenant.

#### Throws

Error if the tenant is not found.

#### Implementation of

`ITenantAdminComponent.get`

***

### getByApiKey() {#getbyapikey}

> **getByApiKey**(`apiKey`): `Promise`\<`ITenant`\>

Get a tenant by its api key.

#### Parameters

##### apiKey

`string`

The api key of the tenant.

#### Returns

`Promise`\<`ITenant`\>

The tenant.

#### Throws

Error if the tenant is not found.

#### Implementation of

`ITenantAdminComponent.getByApiKey`

***

### getByPublicOrigin() {#getbypublicorigin}

> **getByPublicOrigin**(`publicOrigin`): `Promise`\<`ITenant`\>

Get a tenant by its public origin.

#### Parameters

##### publicOrigin

`string`

The origin of the tenant.

#### Returns

`Promise`\<`ITenant`\>

The tenant.

#### Throws

Error if the tenant is not found.

#### Implementation of

`ITenantAdminComponent.getByPublicOrigin`

***

### getTenantByOrganizationId() {#gettenantbyorganizationid}

> **getTenantByOrganizationId**(`organizationId`, `includeLegacy?`): `Promise`\<`ITenant`\>

Get a tenant by its organization id, optionally searching legacy ids.

#### Parameters

##### organizationId

`string`

The organization id of the tenant.

##### includeLegacy?

`boolean`

Whether to also search the legacy organization id array.

#### Returns

`Promise`\<`ITenant`\>

The tenant.

#### Throws

Error if the tenant is not found.

#### Implementation of

`ITenantAdminComponent.getTenantByOrganizationId`

***

### create() {#create}

> **create**(`tenant`): `Promise`\<`string`\>

Create a tenant.

#### Parameters

##### tenant

`Omit`\<`ITenant`, `"id"` \| `"dateCreated"` \| `"dateModified"`\> & `object`

The tenant to store.

#### Returns

`Promise`\<`string`\>

The tenant id.

#### Implementation of

`ITenantAdminComponent.create`

***

### update() {#update}

> **update**(`tenant`): `Promise`\<`void`\>

Update a tenant.

#### Parameters

##### tenant

`Partial`\<`Omit`\<`ITenant`, `"dateCreated"` \| `"dateModified"`\>\>

The tenant to update.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the tenant has been updated.

#### Implementation of

`ITenantAdminComponent.update`

***

### remove() {#remove}

> **remove**(`tenantId`): `Promise`\<`void`\>

Remove a tenant by its id.

#### Parameters

##### tenantId

`string`

The id of the tenant.

#### Returns

`Promise`\<`void`\>

Nothing.

#### Implementation of

`ITenantAdminComponent.remove`

***

### query() {#query}

> **query**(`conditions?`, `properties?`, `cursor?`, `limit?`): `Promise`\<\{ `tenants`: `ITenant`[]; `cursor?`: `string`; \}\>

Query tenants with pagination.

#### Parameters

##### conditions?

`EntityCondition`\<`ITenant`\>

The conditions to filter the tenants.

##### properties?

(keyof `ITenant`)[]

The properties to include in the returned tenants.

##### cursor?

`string`

The cursor to start from.

##### limit?

`number`

The maximum number of tenants to return.

#### Returns

`Promise`\<\{ `tenants`: `ITenant`[]; `cursor?`: `string`; \}\>

The tenants and the next cursor if more tenants are available.

#### Implementation of

`ITenantAdminComponent.query`

***

### healthApplicationInit() {#healthapplicationinit}

> **healthApplicationInit**(`contextIds`): `Promise`\<`void`\>

Provision a temporary tenant for the application health cycle.

#### Parameters

##### contextIds

`IContextIds`

Accumulated context IDs; receives the provisional tenant ID.

#### Returns

`Promise`\<`void`\>

A promise that resolves when provisioning is complete.

#### Implementation of

`IHealthProviderComponent.healthApplicationInit`

***

### healthApplication() {#healthapplication}

> **healthApplication**(`callback`): `Promise`\<`IHealth`[] \| `undefined`\>

Verify the provisioned tenant can be retrieved.
The tenant ID is read from the active context set by the init pass.

#### Parameters

##### callback

`HealthApplicationCallback`

The callback to invoke when a deferred health result is ready.

#### Returns

`Promise`\<`IHealth`[] \| `undefined`\>

The health entries for this component.

#### Implementation of

`IHealthProviderComponent.healthApplication`

***

### healthApplicationTeardown() {#healthapplicationteardown}

> **healthApplicationTeardown**(): `Promise`\<`void`\>

Remove the temporary tenant provisioned during init.
The tenant ID is read from the active context set by the init pass.
Does nothing when no tenant ID is present.

#### Returns

`Promise`\<`void`\>

A promise that resolves when teardown is complete.

#### Implementation of

`IHealthProviderComponent.healthApplicationTeardown`
