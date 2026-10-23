# Interface: INativeWebServerConstructorOptions

The options for the native web server constructor.

## Properties

### loggingComponentType? {#loggingcomponenttype}

> `optional` **loggingComponentType?**: `string`

The type of the logging component to use, if undefined, no logging will happen.

***

### config? {#config}

> `optional` **config?**: [`INativeWebServerConfig`](INativeWebServerConfig.md)

Additional configuration for the server.

***

### mimeTypeProcessors? {#mimetypeprocessors}

> `optional` **mimeTypeProcessors?**: `IMimeTypeProcessor`[]

Additional MIME type processors.
