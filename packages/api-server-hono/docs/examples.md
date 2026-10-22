# Server Hono Examples

Use these snippets to build and run the Hono server with explicit lifecycle control in scripts and integration tests.

## HonoWebServer

```typescript
import { HonoWebServer } from '@3sixty/api-server-hono';

const webServer = new HonoWebServer();

await webServer.build(undefined, undefined, undefined, undefined, {
  port: 8080,
  host: '0.0.0.0'
});

await webServer.start();
const app = webServer.getInstance();

console.log(app.routes.length >= 0); // true

await webServer.stop();
```

```typescript
import { RestRouteProcessor, SocketRouteProcessor } from '@3sixty/api-processors';
import { HonoWebServer } from '@3sixty/api-server-hono';
import { HttpMethod } from '@3sixty/web';

const webServer = new HonoWebServer({
  config: { socket: { path: '/socket' } }
});

await webServer.build(
  [new RestRouteProcessor()],
  [
    {
      operationId: 'info',
      path: '/info',
      method: HttpMethod.GET,
      tag: 'info',
      summary: 'Get the server information',
      handler: async () => ({ body: { name: 'example' } })
    }
  ],
  [new SocketRouteProcessor()],
  [
    {
      operationId: 'echo',
      path: '/events/echo',
      handler: async (socketRequestContext, request, responseEmitter) => {
        await responseEmitter('echo', { body: request.body });
      }
    }
  ],
  { port: 3000, host: 'localhost' }
);

await webServer.start();
await webServer.stop();
```
