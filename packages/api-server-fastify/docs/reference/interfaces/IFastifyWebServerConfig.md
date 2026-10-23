# Interface: IFastifyWebServerConfig

The configuration for the Fastify web server.

## Properties

### web? {#web}

> `optional` **web?**: `Partial`\<`FastifyServerOptions`\> & `object`

The web server options, providing the https options serves over HTTPS.

#### Type Declaration

##### https?

> `optional` **https?**: `ServerOptions`\<*typeof* `IncomingMessage`, *typeof* `ServerResponse`\>

***

### socket? {#socket}

> `optional` **socket?**: `Partial`\<`ServerOptions`\>

The socket server options.

***

### includeErrorStack? {#includeerrorstack}

> `optional` **includeErrorStack?**: `boolean`

Include the stack with errors.
