# Core Server Examples

Use these snippets as a starting point when building a web server on a new transport.

## BaseServer

```typescript
import { BaseServer } from '@3sixty/api-core-server';
import type {
  IRestRoute,
  IRestRouteProcessor,
  ISocketRoute,
  ISocketRouteProcessor,
  IWebServerOptions
} from '@3sixty/api-models';

class MyWebServer extends BaseServer<MyTransport> {
  private readonly _transport: MyTransport;

  public constructor() {
    super({ loggingComponentType: 'logging' });
    this._transport = new MyTransport();
  }

  public className(): string {
    return 'MyWebServer';
  }

  public getInstance(): MyTransport {
    return this._transport;
  }

  public async build(
    restRouteProcessors?: IRestRouteProcessor[],
    restRoutes?: IRestRoute[],
    socketRouteProcessors?: ISocketRouteProcessor[],
    socketRoutes?: ISocketRoute[],
    options?: IWebServerOptions
  ): Promise<void> {
    await this.prepareBuild(
      restRouteProcessors,
      restRoutes,
      socketRouteProcessors,
      socketRoutes,
      options
    );
    // Register the routes on the transport, calling this.runProcessorsRest for each request
  }

  protected async serverListen(host: string, port: number): Promise<void> {
    await this._transport.listen(host, port);
  }

  protected async serverClose(): Promise<void> {
    await this._transport.close();
  }

  protected serverAddresses(): { address: string; family?: string; port: number }[] {
    return this._transport.addresses();
  }

  protected serverIsSecure(): boolean {
    return false;
  }

  protected serverIsListening(): boolean {
    return this._transport.listening;
  }

  protected serverHasRootRoute(): boolean {
    return this._transport.hasRoute('GET', '/');
  }
}

const server = new MyWebServer();
await server.build(restProcessors, restRoutes, undefined, undefined, { port: 3000 });
await server.start();
```
