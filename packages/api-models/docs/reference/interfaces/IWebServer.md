# Interface: IWebServer\<T\>

Interface describing a web server.

## Extends

- `IComponent`

## Type Parameters

### T {#t}

`T`

## Methods

### getInstance() {#getinstance}

> **getInstance**(): `T`

Get the web server instance.

#### Returns

`T`

The web server instance.

***

### build() {#build}

> **build**(`restRouteProcessors?`, `restRoutes?`, `socketRouteProcessors?`, `socketRoutes?`, `options?`): `Promise`\<`void`\>

Build the server.

#### Parameters

##### restRouteProcessors?

[`IRestRouteProcessor`](IRestRouteProcessor.md)[]

The processors for incoming requests over REST.

##### restRoutes?

[`IRestRoute`](IRestRoute.md)\<`any`, `any`\>[]

The REST routes.

##### socketRouteProcessors?

[`ISocketRouteProcessor`](ISocketRouteProcessor.md)[]

The processors for incoming requests over Sockets.

##### socketRoutes?

[`ISocketRoute`](ISocketRoute.md)\<`any`, `any`\>[]

The socket routes.

##### options?

[`IWebServerOptions`](IWebServerOptions.md)

Options for building the server.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the server is fully built and ready to start.

***

### start() {#start}

> **start**(): `Promise`\<`void`\>

Start the server.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the server is listening for connections.

#### Overrides

`IComponent.start`

***

### stop() {#stop}

> **stop**(): `Promise`\<`void`\>

Stop the server.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the server has shut down all connections.

#### Overrides

`IComponent.stop`
