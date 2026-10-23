# Abstract Class: BaseServer\<T\>

Base class for web servers, containing the transport agnostic route processing.
Derived classes supply the transport specific behaviour through the abstract server methods.

## Type Parameters

### T

`T`

## Implements

- `IWebServer`\<`T`\>
- `IHealthProviderComponent`

## Constructors

### Constructor

> **new BaseServer**\<`T`\>(`options?`): `BaseServer`\<`T`\>

Create a new instance of BaseServer.

#### Parameters

##### options?

[`IBaseServerConstructorOptions`](../interfaces/IBaseServerConstructorOptions.md)

The options for the server.

#### Returns

`BaseServer`\<`T`\>

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

***

### \_loggingComponentType? {#_loggingcomponenttype}

> `protected` `readonly` `optional` **\_loggingComponentType?**: `string`

The logging component type.

***

### \_logging? {#_logging}

> `protected` `readonly` `optional` **\_logging?**: `ILoggingComponent`

The logging component.

***

### \_options? {#_options}

> `protected` `optional` **\_options?**: `IWebServerOptions`

The options for the server.

***

### \_started {#_started}

> `protected` **\_started**: `boolean`

Whether the server has been started.

***

### \_mimeTypeProcessors {#_mimetypeprocessors}

> `protected` `readonly` **\_mimeTypeProcessors**: `IMimeTypeProcessor`[]

The mime type processors.

***

### \_includeErrorStack {#_includeerrorstack}

> `protected` `readonly` **\_includeErrorStack**: `boolean`

Include the stack with errors.

***

### \_publicOrigin? {#_publicorigin}

> `protected` `optional` **\_publicOrigin?**: `string`

The public origin of the server, used for constructing the request URL and for CORS.

***

### \_localOrigin? {#_localorigin}

> `protected` `optional` **\_localOrigin?**: `string`

The local origin of the server, used for constructing the request URL and for CORS.

***

### \_restChains {#_restchains}

> `protected` **\_restChains**: [`IRestProcessorChains`](../interfaces/IRestProcessorChains.md)

The REST processor chains resolved when the server is built.

***

### \_socketChains {#_socketchains}

> `protected` **\_socketChains**: [`ISocketProcessorChains`](../interfaces/ISocketProcessorChains.md)

The socket processor chains resolved when the server is built.

## Methods

### start() {#start}

> **start**(): `Promise`\<`void`\>

Start the server.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the server is listening for connections.

#### Implementation of

`IWebServer.start`

***

### stop() {#stop}

> **stop**(): `Promise`\<`void`\>

Stop the server.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the server has shut down all connections.

#### Implementation of

`IWebServer.stop`

***

### health() {#health}

> **health**(): `Promise`\<`IHealth`[]\>

Returns the health status of the component.

#### Returns

`Promise`\<`IHealth`[]\>

The health status of the component, can return multiple entries for elements within the component.

#### Implementation of

`IHealthProviderComponent.health`

***

### healthApplication() {#healthapplication}

> **healthApplication**(`callback`): `Promise`\<`IHealth`[] \| `undefined`\>

Verify the root endpoint is reachable and returns a body by making a real HTTP request.
Skipped when GET / is not registered on this server instance.

#### Parameters

##### callback

`HealthApplicationCallback`

The callback to invoke when a deferred health result is ready.

#### Returns

`Promise`\<`IHealth`[] \| `undefined`\>

The application health status of the component.

#### Implementation of

`IHealthProviderComponent.healthApplication`

***

### prepareBuild() {#preparebuild}

> `protected` **prepareBuild**(`restRouteProcessors?`, `restRoutes?`, `socketRouteProcessors?`, `socketRoutes?`, `options?`): `Promise`\<`void`\>

Perform the transport agnostic part of building the server, validating the routes and
processors, resolving the origins and resolving the processor chains.

#### Parameters

##### restRouteProcessors?

`IRestRouteProcessor`[]

The processors for incoming requests over REST.

##### restRoutes?

`IRestRoute`\<`any`, `any`\>[]

The REST routes.

##### socketRouteProcessors?

`ISocketRouteProcessor`[]

The processors for incoming requests over Sockets.

##### socketRoutes?

`ISocketRoute`\<`any`, `any`\>[]

The socket routes.

##### options?

`IWebServerOptions`

Options for building the server.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the shared build steps are complete.

***

### buildProcessorChains() {#buildprocessorchains}

> `protected` **buildProcessorChains**(`restRouteProcessors?`, `socketRouteProcessors?`): `void`

Resolve the route processors in to per phase chains, so that the lookups and bindings
are performed once when the server is built instead of on every request.

#### Parameters

##### restRouteProcessors?

`IRestRouteProcessor`[]

The processors for the incoming REST requests.

##### socketRouteProcessors?

`ISocketRouteProcessor`[]

The processors for the incoming socket requests.

#### Returns

`void`

***

### resolveBodyLimits() {#resolvebodylimits}

> `protected` **resolveBodyLimits**(): `object`

Merge the configured body limits over the built-in ones and validate them.

#### Returns

`object`

The named body limits in bytes.

#### Throws

GeneralError If a limit is not a positive integer.

***

### resolveCorsOptions() {#resolvecorsoptions}

> `protected` **resolveCorsOptions**(`options?`): [`IServerCorsOptions`](../interfaces/IServerCorsOptions.md)

Resolve the CORS options from the web server options, merging in the defaults.

#### Parameters

##### options?

`IWebServerOptions`

The web server options.

#### Returns

[`IServerCorsOptions`](../interfaces/IServerCorsOptions.md)

The resolved CORS options.

***

### buildServerRequest() {#buildserverrequest}

> `protected` **buildServerRequest**(`method`, `url`, `body`, `query?`, `pathParams?`, `headers?`): `IHttpServerRequest`

Build the server request from the transport values, decoding the path params and query.

#### Parameters

##### method

`HttpMethod`

The request method.

##### url

`string`

The full request url, including the origin.

##### body

`unknown`

The request body.

##### query?

`IHttpRequestQuery`

The request query params.

##### pathParams?

`IHttpRequestPathParams`

The request path params.

##### headers?

`IHttpHeaders`

The request headers.

#### Returns

`IHttpServerRequest`

The server request.

***

### buildContextIds() {#buildcontextids}

> `protected` **buildContextIds**(`requestOrigin`, `headers?`): `IContextIds`

Build the context ids for an incoming request.

#### Parameters

##### requestOrigin

`string`

The origin the request was received on.

##### headers?

`IHttpHeaders`

The request headers.

#### Returns

`IContextIds`

The context ids.

***

### runProcessorsRest() {#runprocessorsrest}

> `protected` **runProcessorsRest**(`restRoute`, `httpServerRequest`, `httpResponse`, `contextIds`, `processorState`): `Promise`\<`void`\>

Run the REST processors for the route.

#### Parameters

##### restRoute

`IRestRoute`\<`any`, `any`\> \| `undefined`

The route to process.

##### httpServerRequest

`IHttpServerRequest`

The incoming request.

##### httpResponse

`IHttpResponse`

The outgoing response.

##### contextIds

`IContextIds`

The context IDs of the request.

##### processorState

The state handed through the processors.

#### Returns

`Promise`\<`void`\>

***

### runProcessorsSocket() {#runprocessorssocket}

> `protected` **runProcessorsSocket**(`socketRoute`, `socketServerRequest`, `httpResponse`, `contextIds`, `processorState`, `requestTopic`, `responseEmitter`): `Promise`\<`void`\>

Run the socket processors for the route.

#### Parameters

##### socketRoute

`ISocketRoute`

The route to process.

##### socketServerRequest

`ISocketServerRequest`

The incoming request.

##### httpResponse

`IHttpResponse`

The outgoing response.

##### contextIds

`IContextIds`

The context IDs of the request.

##### processorState

The state handed through the processors.

##### requestTopic

`string`

The topic of the request.

##### responseEmitter

(`topic`, `response`) => `Promise`\<`void`\>

The emitter to send the response on.

#### Returns

`Promise`\<`void`\>

***

### className() {#classname}

> `abstract` **className**(): `string`

Returns the class name of the component.

#### Returns

`string`

The class name of the component.

#### Implementation of

`IWebServer.className`

***

### getInstance() {#getinstance}

> `abstract` **getInstance**(): `T`

Get the web server instance.

#### Returns

`T`

The web server instance.

#### Implementation of

`IWebServer.getInstance`

***

### build() {#build}

> `abstract` **build**(`restRouteProcessors?`, `restRoutes?`, `socketRouteProcessors?`, `socketRoutes?`, `options?`): `Promise`\<`void`\>

Build the server.

#### Parameters

##### restRouteProcessors?

`IRestRouteProcessor`[]

The processors for incoming requests over REST.

##### restRoutes?

`IRestRoute`\<`any`, `any`\>[]

The REST routes.

##### socketRouteProcessors?

`ISocketRouteProcessor`[]

The processors for incoming requests over Sockets.

##### socketRoutes?

`ISocketRoute`\<`any`, `any`\>[]

The socket routes.

##### options?

`IWebServerOptions`

Options for building the server.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the server is fully built and ready to start.

#### Implementation of

`IWebServer.build`

***

### serverListen() {#serverlisten}

> `abstract` `protected` **serverListen**(`host`, `port`): `Promise`\<`void`\>

Start listening for connections on the transport.

#### Parameters

##### host

`string`

The host to bind to.

##### port

`number`

The port to bind to.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the transport is listening.

***

### serverClose() {#serverclose}

> `abstract` `protected` **serverClose**(): `Promise`\<`void`\>

Close the transport and all of its connections.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the transport has closed.

***

### serverAddresses() {#serveraddresses}

> `abstract` `protected` **serverAddresses**(): `object`[]

Get the addresses the transport is bound to.

#### Returns

`object`[]

The bound addresses.

***

### serverIsSecure() {#serverissecure}

> `abstract` `protected` **serverIsSecure**(): `boolean`

Whether the transport is serving over TLS.

#### Returns

`boolean`

True if the transport is secure.

***

### serverIsListening() {#serverislistening}

> `abstract` `protected` **serverIsListening**(): `boolean`

Whether the transport is currently listening for connections.

#### Returns

`boolean`

True if the transport is listening.

***

### serverHasRootRoute() {#serverhasrootroute}

> `abstract` `protected` **serverHasRootRoute**(): `boolean`

Whether a GET route is registered for the root path.

#### Returns

`boolean`

True if the root route is registered.
