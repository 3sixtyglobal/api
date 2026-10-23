# Type Alias: TenantEventCallback

> **TenantEventCallback** = (`tenantId`, `eventType`) => `Promise`\<`void`\>

Callback invoked when a tenant event occurs.
Failures in the callback will be logged but will not prevent other callbacks from being invoked.

## Parameters

### tenantId

`string`

### eventType

[`TenantEventType`](TenantEventType.md)

## Returns

`Promise`\<`void`\>
