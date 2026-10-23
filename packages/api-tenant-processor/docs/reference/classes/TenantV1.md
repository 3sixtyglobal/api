# Class: TenantV1

Class defining the storage for node tenants.

## Constructors

### Constructor

> **new TenantV1**(): `TenantV1`

#### Returns

`TenantV1`

## Properties

### id {#id}

> **id**: `string`

The unique identifier for the tenant.

***

### apiKey {#apikey}

> **apiKey**: `string`

The api key for the tenant.

***

### label {#label}

> **label**: `string`

The label of the tenant.

***

### dateCreated {#datecreated}

> **dateCreated**: `string`

The date the tenant was created.

***

### dateModified {#datemodified}

> **dateModified**: `string`

The date the tenant was modified.

***

### publicOrigin? {#publicorigin}

> `optional` **publicOrigin?**: `string`

The origin available to the public for accessing the API.

***

### organizationId {#organizationid}

> **organizationId**: `string`

The organization id for the tenant.

***

### organizationIdLegacy? {#organizationidlegacy}

> `optional` **organizationIdLegacy?**: `string`

Optional list of organization aliases that can be used for legacy lookups, indexed format.
