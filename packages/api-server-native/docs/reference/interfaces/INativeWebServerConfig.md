# Interface: INativeWebServerConfig

The configuration for the native web server.

## Properties

### web? {#web}

> `optional` **web?**: `object`

The web server options.

#### serverOptions?

> `optional` **serverOptions?**: `ServerOptions`\<*typeof* `IncomingMessage`, *typeof* `ServerResponse`\>

The options for the Node.js HTTP server, such as the timeouts.

#### https?

> `optional` **https?**: `ServerOptions`\<*typeof* `IncomingMessage`, *typeof* `ServerResponse`\>

The TLS options, when provided the server is served over HTTPS.

#### maxParamLength?

> `optional` **maxParamLength?**: `number`

The maximum length of a path parameter, defaults to 2000.

***

### socket? {#socket}

> `optional` **socket?**: `Partial`\<`ServerOptions`\>

The socket server options.

***

### includeErrorStack? {#includeerrorstack}

> `optional` **includeErrorStack?**: `boolean`

Include the stack with errors.
