# Interface: ITenantUpdate

The details of a tenant to update.

## Extends

- `Partial`\<`Omit`\<[`ITenant`](ITenant.md), `"dateCreated"` \| `"dateModified"`\>\>

## Properties

### apiKey? {#apikey}

> `optional` **apiKey?**: `string`

The api key for the tenant.

#### Inherited from

[`ITenant`](ITenant.md).[`apiKey`](ITenant.md#apikey)

***

### label? {#label}

> `optional` **label?**: `string`

The label of the tenant.

#### Inherited from

[`ITenant`](ITenant.md).[`label`](ITenant.md#label)

***

### publicOrigin? {#publicorigin}

> `optional` **publicOrigin?**: `string`

The public origin available to the public for accessing the API.

#### Inherited from

[`ITenant`](ITenant.md).[`publicOrigin`](ITenant.md#publicorigin)

***

### organizationId? {#organizationid}

> `optional` **organizationId?**: `string`

The organization id for the tenant.

#### Inherited from

[`ITenant`](ITenant.md).[`organizationId`](ITenant.md#organizationid)

***

### organizationIdLegacy? {#organizationidlegacy}

> `optional` **organizationIdLegacy?**: `string`[]

Optional list of organization aliases that can are used for legacy lookups.

#### Inherited from

[`ITenant`](ITenant.md).[`organizationIdLegacy`](ITenant.md#organizationidlegacy)

***

### id? {#id}

> `optional` **id?**: `string`

The unique identifier of the tenant to update.

#### Overrides

[`ITenant`](ITenant.md).[`id`](ITenant.md#id)
