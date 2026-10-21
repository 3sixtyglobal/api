# Server Fastify Examples

Use these snippets to build and run the Fastify server with explicit lifecycle control in scripts and integration tests.

## FastifyWebServer

```typescript
import { FastifyWebServer } from '@3sixty/api-server-fastify';

const webServer = new FastifyWebServer();

await webServer.build(undefined, undefined, undefined, undefined, {
  port: 8080,
  host: '0.0.0.0'
});

await webServer.start();
const instance = webServer.getInstance();

console.log(instance.server.address() !== null); // true

await webServer.stop();
```

```typescript
import { FastifyWebServer } from '@3sixty/api-server-fastify';

const webServer = new FastifyWebServer();

await webServer.build(undefined, undefined, undefined, undefined, {
  port: 3000,
  host: '127.0.0.1'
});

await webServer.start();
await webServer.stop();
```
