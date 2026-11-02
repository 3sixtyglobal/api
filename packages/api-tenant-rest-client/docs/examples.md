# Tenant REST Client Examples

Use these snippets to manage the tenants of a multi-tenant node from administration tools.

## TenantAdminRestClient

```typescript
import { TenantAdminRestClient } from '@3sixty/api-tenant-rest-client';

const client = new TenantAdminRestClient({
  endpoint: 'https://api.example.org'
});

const tenantId = await client.create({
  apiKey: 'ad7a5b0b816ca314b69c813ae1368232',
  label: 'node',
  publicOrigin: 'https://node.example.org',
  organizationId: 'org-1'
});

await client.update({ id: tenantId, label: 'renamed', organizationId: 'org-1' });

const tenant = await client.get(tenantId);
console.log(tenant.label); // renamed

await client.remove(tenantId);
```

```typescript
import { TenantAdminRestClient } from '@3sixty/api-tenant-rest-client';
import { ComparisonOperator } from '@3sixty/entity';

const client = new TenantAdminRestClient({
  endpoint: 'https://api.example.org'
});

const byApiKey = await client.getByApiKey('ad7a5b0b816ca314b69c813ae1368232');
const byOrigin = await client.getByPublicOrigin('https://node.example.org');
const byOrganization = await client.getTenantByOrganizationId('org-legacy', true);

const page = await client.query(
  { property: 'label', comparison: ComparisonOperator.Equals, value: 'node' },
  ['id', 'label'],
  undefined,
  10
);

console.log(page.tenants.length); // 1
console.log(page.cursor); // undefined
```
