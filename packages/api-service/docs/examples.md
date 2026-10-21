# Service Examples

These snippets demonstrate how to configure service-level URL generation and expose operational information for monitoring.

## InformationService

```typescript
import { InformationService } from '@3sixty/api-service';

const infoService = new InformationService({
  config: {
    serverInfo: {
      name: '3Sixty API',
      version: '1.2.0'
    }
  }
});

await infoService.start();
console.log(infoService.className()); // InformationService

const root = await infoService.root();
const info = await infoService.info();
const favicon = await infoService.favicon();

console.log(root); // 3Sixty API - 1.2.0
console.log(info.version); // 1.2.0
console.log((favicon?.byteLength ?? 0) > 0); // true
```

```typescript
import { InformationService } from '@3sixty/api-service';

const infoService = new InformationService({
  config: {
    serverInfo: {
      name: '3Sixty API',
      version: '1.2.0'
    }
  }
});

const spec = await infoService.spec();
const live = await infoService.livez();
const health = await infoService.health();

await infoService.setComponentHealth('queue', 'ok');
await infoService.removeComponentHealth('queue');

console.log(typeof spec); // undefined
console.log(live); // true
console.log(health.status); // ok
```

## HostingService

```typescript
import { HostingService } from '@3sixty/api-service';

const hostingService = new HostingService({
  config: {
    localOrigin: 'http://localhost:3000',
    publicOrigin: 'https://api.example.org'
  }
});

console.log(hostingService.className()); // HostingService

const publicOrigin = await hostingService.getPublicOrigin('http://localhost:3000/users');
const usersUrl = await hostingService.buildPublicUrl('http://localhost:3000/users');

console.log(publicOrigin); // https://api.example.org
console.log(usersUrl); // https://api.example.org/users
```
