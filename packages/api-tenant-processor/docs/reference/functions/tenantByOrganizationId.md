# Function: tenantByOrganizationId()

> **tenantByOrganizationId**(`httpRequestContext`, `componentName`, `request`): `Promise`\<[`ITenantGetResponse`](../interfaces/ITenantGetResponse.md)\>

Get the tenant by organization id.

## Parameters

### httpRequestContext

`IHttpRequestContext`

The request context for the API.

### componentName

`string`

The name of the component to use in the routes.

### request

[`ITenantGetByOrganizationIdRequest`](../interfaces/ITenantGetByOrganizationIdRequest.md)

The request.

## Returns

`Promise`\<[`ITenantGetResponse`](../interfaces/ITenantGetResponse.md)\>

The response object with additional http response properties.
