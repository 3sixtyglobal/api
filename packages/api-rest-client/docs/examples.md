# Rest Client Examples

Use these snippets to call health, metadata, and specification endpoints from operational tools and integration tests.

## InformationRestClient

```typescript
import { InformationRestClient } from '@3sixty/api-rest-client';

const client = new InformationRestClient({
  endpoint: 'https://api.example.org',
  pathPrefix: 'v1'
});

console.log(client.className()); // InformationRestClient

const root = await client.root();
const info = await client.info();
const icon = await client.favicon();

console.log(root); // 3sixty-api - 1.2.0
console.log(info.version); // 1.2.0
console.log((icon?.byteLength ?? 0) > 0); // true
```

```typescript
import { InformationRestClient } from '@3sixty/api-rest-client';

const client = new InformationRestClient({
  endpoint: 'https://api.example.org',
  pathPrefix: 'v1'
});

const openApi = await client.spec();
const live = await client.livez();
const health = await client.health();

console.log(typeof openApi); // object
console.log(live); // true
console.log(health.status); // ok
```

```typescript
import { InformationRestClient } from '@3sixty/api-rest-client';

const client = new InformationRestClient({
  endpoint: 'https://api.example.org',
  pathPrefix: 'v1'
});

try {
  await client.setComponentHealth('database', 'ok');
} catch (err) {
  const errorName = err instanceof Error ? err.name : 'Error';
  console.log(errorName); // NotSupportedError
}

try {
  await client.removeComponentHealth('database');
} catch (err) {
  const errorName = err instanceof Error ? err.name : 'Error';
  console.log(errorName); // NotSupportedError
}
```
