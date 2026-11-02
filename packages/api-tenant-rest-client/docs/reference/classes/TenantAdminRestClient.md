# Class: TenantAdminRestClient

The client to connect to the tenant admin service.

## Extends

- `BaseRestClient`

## Implements

- `ITenantAdminComponent`

## Constructors

### Constructor

> **new TenantAdminRestClient**(`config`): `TenantAdminRestClient`

Create a new instance of TenantAdminRestClient.

#### Parameters

##### config

`IBaseRestClientConfig`

The configuration for the client.

#### Returns

`TenantAdminRestClient`

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

`ITenantAdminComponent.className`

***

### create() {#create}

> **create**(`tenant`): `Promise`\<`string`\>

Create a tenant.

#### Parameters

##### tenant

`ITenantCreate`

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

`ITenantUpdate`

The tenant to update.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the tenant has been updated.

#### Implementation of

`ITenantAdminComponent.update`

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

#### Implementation of

`ITenantAdminComponent.remove`

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
