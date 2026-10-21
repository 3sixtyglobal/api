# Tenant Processor Examples

These snippets show tenant lifecycle management and request context routing for multi-tenant deployments.

## TenantAdminService

```typescript
import { TenantAdminService } from '@3sixty/api-tenant-processor';

const tenantAdmin = new TenantAdminService();

console.log(tenantAdmin.className()); // TenantAdminService

const createdTenantId = await tenantAdmin.create({
  label: 'North Region',
  apiKey: '0123456789abcdef0123456789abcdef',
  publicOrigin: 'https://north.example.org'
});

await tenantAdmin.update({
  id: createdTenantId,
  label: 'North Region EU'
});

const byKey = await tenantAdmin.getByApiKey('0123456789abcdef0123456789abcdef');
console.log(byKey.id.length); // 32
```

```typescript
import { TenantAdminService } from '@3sixty/api-tenant-processor';

const tenantAdmin = new TenantAdminService();

const byId = await tenantAdmin.get('0123456789abcdef0123456789abcdef');
const byOrigin = await tenantAdmin.getByPublicOrigin('https://north.example.org');
const page = await tenantAdmin.query({ isNodeTenant: false }, '', 10);

await tenantAdmin.remove(byId.id);

console.log(byOrigin.label); // North Region EU
console.log(page.tenants.length); // 1
```

## TenantIdContextIdHandler

```typescript
import { TenantIdContextIdHandler } from '@3sixty/api-tenant-processor';

const handler = new TenantIdContextIdHandler();

console.log(handler.className()); // TenantIdContextIdHandler
console.log(handler.short('0123456789abcdef0123456789abcdef')); // ASNFZ4mrze8BI0VniavN7w

handler.guard('0123456789abcdef0123456789abcdef');
```

## TenantProcessor

```typescript
import { TenantProcessor } from '@3sixty/api-tenant-processor';

const tenantProcessor = new TenantProcessor();

console.log(tenantProcessor.className()); // TenantProcessor

const request = {
  method: 'get',
  url: '/info',
  headers: {
    'x-api-key': '0123456789abcdef0123456789abcdef'
  },
  query: {}
};

const response = {};
const contextIds = {};
const processorState: { [id: string]: unknown } = {};

await tenantProcessor.pre(request, response, { skipTenant: false }, contextIds, processorState);
console.log(typeof contextIds.tenant); // string
```
