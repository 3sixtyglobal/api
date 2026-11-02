# Interface: ITenantGetByOrganizationIdRequest

The tenant to get by organization id.

## Properties

### pathParams {#pathparams}

> **pathParams**: `object`

The path parameters.

#### organizationId

> **organizationId**: `string`

The organization id of the tenant to get.

***

### query? {#query}

> `optional` **query?**: `object`

The query parameters.

#### includeLegacy?

> `optional` **includeLegacy?**: `string`

Whether to also search the legacy organization ids, defaults to false.
