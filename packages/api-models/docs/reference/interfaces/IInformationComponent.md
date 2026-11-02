# Interface: IInformationComponent

The information component for the server.

## Extends

- `IComponent`

## Methods

### root() {#root}

> **root**(): `Promise`\<`string`\>

Get the root information.

#### Returns

`Promise`\<`string`\>

The root information.

***

### info() {#info}

> **info**(): `Promise`\<[`IServerInfo`](IServerInfo.md)\>

Get the server information.

#### Returns

`Promise`\<[`IServerInfo`](IServerInfo.md)\>

The service information.

***

### favicon() {#favicon}

> **favicon**(): `Promise`\<`Uint8Array`\<`ArrayBufferLike`\> \| `undefined`\>

Get the favicon.

#### Returns

`Promise`\<`Uint8Array`\<`ArrayBufferLike`\> \| `undefined`\>

The favicon.

***

### spec() {#spec}

> **spec**(): `Promise`\<`unknown`\>

Get the OpenAPI spec.

#### Returns

`Promise`\<`unknown`\>

The OpenAPI spec.

***

### livez() {#livez}

> **livez**(): `Promise`\<\{ `status`: [`LivenessStatus`](../type-aliases/LivenessStatus.md); \}\>

Is the server live.

#### Returns

`Promise`\<\{ `status`: [`LivenessStatus`](../type-aliases/LivenessStatus.md); \}\>

The livez status of the server.

***

### readyz() {#readyz}

> **readyz**(): `Promise`\<\{ `status`: `"ready"` \| `"not ready"`; \}\>

Is the server ready.

#### Returns

`Promise`\<\{ `status`: `"ready"` \| `"not ready"`; \}\>

The readyz status of the server.
