# Server Native Examples

Use these snippets to build and run the native server with explicit lifecycle control in scripts and integration tests.

## NativeWebServer

```typescript
import { NativeWebServer } from '@3sixty/api-server-native';

const webServer = new NativeWebServer();

await webServer.build(undefined, undefined, undefined, undefined, {
  port: 8080,
  host: '0.0.0.0'
});

await webServer.start();
const router = webServer.getInstance();

console.log(router.hasRoute('GET', '/')); // false

await webServer.stop();
```

```typescript
import { readFile } from 'node:fs/promises';
import { RestRouteProcessor, SocketRouteProcessor } from '@3sixty/api-processors';
import { NativeWebServer } from '@3sixty/api-server-native';
import { HttpMethod } from '@3sixty/web';

const webServer = new NativeWebServer({
  config: {
    web: {
      https: {
        key: await readFile('server.key'),
        cert: await readFile('server.crt')
      }
    },
    socket: { path: '/socket' }
  }
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
