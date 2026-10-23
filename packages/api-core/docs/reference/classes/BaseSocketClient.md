# Abstract Class: BaseSocketClient

Event bus which publishes using web-sockets.

## Constructors

### Constructor

> **new BaseSocketClient**(`restClientClassName`, `config`, `pathPrefix`): `BaseSocketClient`

Create a new instance of BaseSocketClient.

#### Parameters

##### restClientClassName

`string`

The name of the class implementation socket calls.

##### config

`IBaseSocketClientConfig`

The configuration for the client.

##### pathPrefix

`string`

The default prefix to use if none in configuration.

#### Returns

`BaseSocketClient`

## Methods

### onEvent() {#onevent}

> `protected` **onEvent**\<`T`\>(`event`, `callback`): `void`

Setup a handler for an event from the socket.

#### Type Parameters

##### T {#t}

`T` *extends* `IHttpResponse`\<`any`\>

#### Parameters

##### event

`string`

The event to look for.

##### callback

(`response`) => `Promise`\<`void`\>

The method to call when the event arrives.

#### Returns

`void`

***

### offEvent() {#offevent}

> `protected` **offEvent**(`event`): `void`

Remove a handler for a event from the socket.

#### Parameters

##### event

`string`

The event to look for.

#### Returns

`void`

***

### sendEvent() {#sendevent}

> `protected` **sendEvent**\<`T`\>(`event`, `data`): `void`

Send a event on the socket.

#### Type Parameters

##### T {#t-1}

`T` *extends* `IHttpRequest`\<`any`\>

#### Parameters

##### event

`string`

The event to send.

##### data

`T`

The data to send with the event.

#### Returns

`void`

***

### socketConnect() {#socketconnect}

> `protected` **socketConnect**(): `boolean`

Connect the socket if its not already connected.

#### Returns

`boolean`

True if the socket is already connected.

***

### socketDisconnect() {#socketdisconnect}

> `protected` **socketDisconnect**(): `void`

Disconnect the socket if its connected.

#### Returns

`void`

***

### isConnected() {#isconnected}

> `protected` **isConnected**(): `boolean`

Is the socket connected.

#### Returns

`boolean`

True if the socket is connected.

***

### handleConnected() {#handleconnected}

> `abstract` `protected` **handleConnected**(): `Promise`\<`void`\>

Handle the socket connection.

#### Returns

`Promise`\<`void`\>

***

### handleError() {#handleerror}

> `abstract` `protected` **handleError**(`err`): `Promise`\<`void`\>

Handle an error.

#### Parameters

##### err

`IError`

The error to handle.

#### Returns

`Promise`\<`void`\>
