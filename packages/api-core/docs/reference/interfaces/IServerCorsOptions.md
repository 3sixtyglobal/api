# Interface: IServerCorsOptions

The resolved CORS options for a server.

## Properties

### origins {#origins}

> **origins**: `string`[]

The allowed origins.

***

### hasWildcardOrigin {#haswildcardorigin}

> **hasWildcardOrigin**: `boolean`

Whether the allowed origins include the wildcard, in which case any origin is allowed.

***

### methods {#methods}

> **methods**: `HttpMethod`[]

The allowed methods.

***

### allowedHeaders {#allowedheaders}

> **allowedHeaders**: `string`[]

The allowed headers.

***

### exposedHeaders {#exposedheaders}

> **exposedHeaders**: `string`[]

The exposed headers.
