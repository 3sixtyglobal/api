# Interface: IBaseServerConstructorOptions

Options for constructing a base server.

## Properties

### loggingComponentType? {#loggingcomponenttype}

> `optional` **loggingComponentType?**: `string`

The type of the logging component to use, defaults to no logging.

***

### mimeTypeProcessors? {#mimetypeprocessors}

> `optional` **mimeTypeProcessors?**: `IMimeTypeProcessor`[]

The mime type processors to use for the request bodies.

***

### includeErrorStack? {#includeerrorstack}

> `optional` **includeErrorStack?**: `boolean`

Include the stack with errors.

#### Default

```ts
false
```
