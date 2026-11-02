# Interface: ITenantListRequest

The list of tenants.

## Properties

### query {#query}

> **query**: `object`

The query parameters.

#### conditions?

> `optional` **conditions?**: `string`

The condition for the query as JSON version of EntityCondition type.

#### properties?

> `optional` **properties?**: `string`

The properties to include in the returned tenants, separated by commas.
If not provided, all properties will be returned.

#### cursor?

> `optional` **cursor?**: `string`

The cursor to get the next chunk of tenants.

#### limit?

> `optional` **limit?**: `string`

The number of tenants to return.
