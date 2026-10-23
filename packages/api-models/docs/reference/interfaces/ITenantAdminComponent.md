# Interface: ITenantAdminComponent

Configuration for the tenant admin component

## Extends

- `IComponent`

## Methods

### create() {#create}

> **create**(`tenant`): `Promise`\<`string`\>

Create a tenant.

#### Parameters

##### tenant

`Omit`\<[`ITenant`](ITenant.md), `"id"` \| `"dateCreated"` \| `"dateModified"`\> & `object`

The tenant to store.

#### Returns

`Promise`\<`string`\>

The tenant id.

***

### update() {#update}

> **update**(`tenant`): `Promise`\<`void`\>

Update a tenant.

#### Parameters

##### tenant

`Partial`\<`Omit`\<[`ITenant`](ITenant.md), `"dateCreated"` \| `"dateModified"`\>\>

The tenant to update.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the tenant has been updated.

***

### get() {#get}

> **get**(`tenantId`): `Promise`\<[`ITenant`](ITenant.md)\>

Get a tenant by its id.

#### Parameters

##### tenantId

`string`

The id of the tenant.

#### Returns

`Promise`\<[`ITenant`](ITenant.md)\>

The tenant.

#### Throws

Error if the tenant is not found.

***

### getByApiKey() {#getbyapikey}

> **getByApiKey**(`apiKey`): `Promise`\<[`ITenant`](ITenant.md)\>

Get a tenant by its api key.

#### Parameters

##### apiKey

`string`

The api key of the tenant.

#### Returns

`Promise`\<[`ITenant`](ITenant.md)\>

The tenant.

#### Throws

Error if the tenant is not found.

***

### getByPublicOrigin() {#getbypublicorigin}

> **getByPublicOrigin**(`publicOrigin`): `Promise`\<[`ITenant`](ITenant.md)\>

Get a tenant by its public origin.

#### Parameters

##### publicOrigin

`string`

The origin of the tenant.

#### Returns

`Promise`\<[`ITenant`](ITenant.md)\>

The tenant.

#### Throws

Error if the tenant is not found.

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

A promise that resolves when the tenant has been removed.

#### Throws

Error if the tenant is not found.

***

### getTenantByOrganizationId() {#gettenantbyorganizationid}

> **getTenantByOrganizationId**(`organizationId`, `includeLegacy?`): `Promise`\<[`ITenant`](ITenant.md)\>

Get a tenant by its organization id, optionally searching legacy ids.

#### Parameters

##### organizationId

`string`

The organization id of the tenant.

##### includeLegacy?

`boolean`

Whether to also search the legacy organization id array.

#### Returns

`Promise`\<[`ITenant`](ITenant.md)\>

The tenant.

#### Throws

Error if the tenant is not found.

***

### query() {#query}

> **query**(`conditions?`, `properties?`, `cursor?`, `limit?`): `Promise`\<\{ `tenants`: [`ITenant`](ITenant.md)[]; `cursor?`: `string`; \}\>

Query tenants with pagination.

#### Parameters

##### conditions?

`EntityCondition`\<[`ITenant`](ITenant.md)\>

The conditions to filter the tenants.

##### properties?

(keyof [`ITenant`](ITenant.md))[]

The properties to include in the returned tenants.

##### cursor?

`string`

The cursor to start from.

##### limit?

`number`

The maximum number of tenants to return.

#### Returns

`Promise`\<\{ `tenants`: [`ITenant`](ITenant.md)[]; `cursor?`: `string`; \}\>

The tenants and the next cursor if more tenants are available.
