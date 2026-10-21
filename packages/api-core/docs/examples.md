# Core Examples

Use these snippets as a starting point when building custom clients, overriding connection behaviour, and standardising event handling.

## BaseSocketClient

```typescript
import { BaseSocketClient } from '@3sixty/api-core';

class NotificationsSocketClient extends BaseSocketClient {
  public constructor() {
    super('NotificationsSocketClient', { endpoint: 'wss://api.example.org' }, 'notifications');
  }

  public async handleConnected(): Promise<void> {
    this.sendEvent('subscribe', { channel: 'orders' });
  }

  public handleError(error: unknown): void {
    console.log(error); // Error: network timeout
  }

  public connect(): boolean {
    return this.socketConnect();
  }

  public disconnect(): void {
    this.socketDisconnect();
  }

  public connected(): boolean {
    return this.isConnected();
  }

  public subscribeOrders(): void {
    this.onEvent('order.updated', async payload => {
      const body = payload.body as { orderId: string };
      console.log(body.orderId); // ord-123
    });
  }
}

const socketClient = new NotificationsSocketClient();

socketClient.subscribeOrders();
socketClient.connect();
console.log(socketClient.connected()); // true
socketClient.disconnect();
```

```typescript
import { BaseSocketClient } from '@3sixty/api-core';

class MetricsSocketClient extends BaseSocketClient {
  public constructor() {
    super('MetricsSocketClient', { endpoint: 'wss://api.example.org' }, 'metrics');
  }

  public async handleConnected(): Promise<void> {
    this.sendEvent('ping', { ts: Date.now() });
  }

  public handleError(error: unknown): void {
    console.log(error); // Error: socket closed
  }

  public publishPing(): void {
    this.sendEvent('ping', {
      body: {
        ts: Date.now()
      }
    });
  }

  public clearTelemetryHandlers(): void {
    this.offEvent('telemetry');
  }
}

const metrics = new MetricsSocketClient();

metrics.publishPing();
metrics.clearTelemetryHandlers();
```

## BaseRestClient

```typescript
import { BaseRestClient } from '@3sixty/api-core';

class CatalogueRestClient extends BaseRestClient {
  public constructor() {
    super('CatalogueRestClient', { endpoint: 'https://api.example.org' }, 'catalogue');
  }

  public async list(): Promise<string[]> {
    return this.fetch('/items', 'get');
  }

  public endpoint(): string {
    return this.getEndpointWithPrefix();
  }
}

const catalogue = new CatalogueRestClient();
const items = await catalogue.list();
console.log(items.length); // 3
console.log(catalogue.endpoint()); // https://api.example.org/catalogue
```
