# Interface: IHonoWebServerConfig

The configuration for the Hono web server.

## Properties

### web? {#web}

> `optional` **web?**: `Omit`\<`Options`, `"fetch"` \| `"port"` \| `"hostname"` \| `"websocket"`\>

The node server options, such as the server factory and TLS options.

***

### socket? {#socket}

> `optional` **socket?**: `Partial`\<`ServerOptions`\>

The socket server options.

***

### includeErrorStack? {#includeerrorstack}

> `optional` **includeErrorStack?**: `boolean`

Include the stack with errors.
