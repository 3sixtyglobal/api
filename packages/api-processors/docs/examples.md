# Processors Examples

These snippets demonstrate request and response processors that can be composed into REST, socket, and MIME handling pipelines.

## SocketRouteProcessor

```typescript
import { SocketRouteProcessor } from '@3sixty/api-processors';

const socketProcessor = new SocketRouteProcessor();

console.log(socketProcessor.className()); // SocketRouteProcessor

const socketRoute = {
  event: 'tenant.updated',
  handler: async () => ({
    body: {
      ok: true
    }
  })
};

const socketRequest = {
  socketId: 'conn-1',
  url: '/tenant.updated',
  pathParams: {},
  query: {},
  body: {
    tenantId: '0123456789abcdef0123456789abcdef'
  }
};

const socketResponse = {};
const socketProcessorState = {};

await socketProcessor.connected(socketRequest, socketRoute);

await socketProcessor.process(
  socketRequest,
  socketResponse,
  socketRoute,
  socketProcessorState,
  async (topic, response) => {
    console.log(topic); // tenant.updated
    console.log(response.statusCode ?? 200); // 200
  }
);

await socketProcessor.disconnected(socketRequest, socketRoute);
```

## ContextIdProcessor

```typescript
import { ContextIdProcessor } from '@3sixty/api-processors';

const contextProcessor = new ContextIdProcessor({
  config: {
    key: 'node'
  }
});

await contextProcessor.start('default');
console.log(contextProcessor.className()); // ContextIdProcessor

const contextIds = {};
await contextProcessor.pre(
  { method: 'get', url: '/health', headers: {} },
  {},
  undefined,
  contextIds,
  {}
);
console.log(typeof contextIds.node); // string
```

## LoggingProcessor

```typescript
import { LoggingProcessor } from '@3sixty/api-processors';

const logging = new LoggingProcessor();

console.log(logging.className()); // LoggingProcessor

const request = {
  method: 'get',
  url: 'http://localhost:3000/health',
  headers: {}
};

const response = {
  statusCode: 200,
  headers: {}
};

const processorState: { [id: string]: unknown } = {};

await logging.pre(request, response, undefined, {}, processorState);
await logging.post(request, response, undefined, {}, processorState);
```

## JsonLdMimeTypeProcessor

```typescript
import { JsonLdMimeTypeProcessor } from '@3sixty/api-processors';

const jsonLd = new JsonLdMimeTypeProcessor();

const mediaTypes = jsonLd.getTypes();
const body = new TextEncoder().encode('{"@context":"https://schema.org","name":"Tenant"}');
const handled = await jsonLd.handle(body);

console.log(mediaTypes[0]); // application/ld+json
console.log(typeof handled); // object
```

## JwtMimeTypeProcessor

```typescript
import { JwtMimeTypeProcessor } from '@3sixty/api-processors';

const jwt = new JwtMimeTypeProcessor();

const mediaTypes = jwt.getTypes();
const body = new TextEncoder().encode('eyJhbGciOiJIUzI1NiJ9.payload.signature');
const handled = await jwt.handle(body);

console.log(mediaTypes[0]); // application/jwt
console.log(typeof handled); // string
```

## RestRouteProcessor

```typescript
import { RestRouteProcessor } from '@3sixty/api-processors';

const restProcessor = new RestRouteProcessor();

console.log(restProcessor.className()); // RestRouteProcessor

const request = {
  method: 'get',
  url: '/info',
  headers: {},
  pathParams: {},
  query: {}
};

const response = {};

const route = {
  method: 'get',
  path: '/info',
  handler: async () => ({
    body: {
      name: '3Sixty API'
    }
  })
};

await restProcessor.process(request, response, route, {});
console.log(response.statusCode ?? 200); // 200
```

## StaticContextIdProcessor

```typescript
import { StaticContextIdProcessor } from '@3sixty/api-processors';

const staticContext = new StaticContextIdProcessor({
  config: {
    key: 'environment',
    value: 'test'
  }
});

console.log(staticContext.className()); // StaticContextIdProcessor

const contextIds = {};
await staticContext.pre(
  { method: 'get', url: '/health', headers: {} },
  {},
  undefined,
  contextIds,
  {}
);
console.log(contextIds.environment); // test
```
