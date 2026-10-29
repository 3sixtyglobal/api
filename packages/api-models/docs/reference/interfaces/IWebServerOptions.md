# Interface: IWebServerOptions

Options for the web server.

## Properties

### port? {#port}

> `optional` **port?**: `number`

The port to bind the web server to.

#### Default

```ts
3000
```

***

### host? {#host}

> `optional` **host?**: `string`

The address to bind the web server to.

#### Default

```ts
localhost
```

***

### methods? {#methods}

> `optional` **methods?**: `HttpMethod`[]

The methods that the server accepts.

#### Default

```ts
["GET", "PUT", "POST", "PATCH", "DELETE", "OPTIONS"]
```

***

### allowedHeaders? {#allowedheaders}

> `optional` **allowedHeaders?**: `string`[]

Any additional allowed headers.

***

### exposedHeaders? {#exposedheaders}

> `optional` **exposedHeaders?**: `string`[]

And additional exposed headers.

***

### corsOrigins? {#corsorigins}

> `optional` **corsOrigins?**: `string` \| `string`[]

The allowed CORS domains.

#### Default

```ts
["*"]
```

***

### corsWildcardCredentials? {#corswildcardcredentials}

> `optional` **corsWildcardCredentials?**: `boolean`

Reflect any origin with credentials when the CORS origins include the wildcard. Set false to
answer a wildcard origin with "*" and no credentials, so credentials are only allowed for
explicitly configured origins.

#### Default

```ts
true
```

***

### trustedProxies? {#trustedproxies}

> `optional` **trustedProxies?**: `string` \| `string`[]

The proxies trusted to set the X-Forwarded-For and X-Real-IP headers, as IP addresses or CIDR
ranges, a string can be comma separated. Use "*" to trust any proxy. When the immediate peer is
not trusted, or no proxies are configured, the client IP is the socket address.

***

### publicOrigin? {#publicorigin}

> `optional` **publicOrigin?**: `string`

The public origin of the server, used for constructing the request URL.
If not provided, it will be determined from the incoming request.

***

### bodyLimits? {#bodylimits}

> `optional` **bodyLimits?**: `object`

Named body size limits in bytes for REST routes, referenced by a route's bodyLimit name.
Merged over the server's built-in limits; the "default" entry applies to routes with no bodyLimit name.

#### Index Signature

\[`name`: `string`\]: `number`

***

### customWebConfig? {#customwebconfig}

> `optional` **customWebConfig?**: `unknown`

Custom configuration for the web server.

***

### customSocketConfig? {#customsocketconfig}

> `optional` **customSocketConfig?**: `unknown`

Custom configuration for the socket server.
