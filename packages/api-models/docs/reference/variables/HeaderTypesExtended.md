# Variable: HeaderTypesExtended

> `const` **HeaderTypesExtended**: `object`

Http header types used by the servers which are not in the common header types.

## Type Declaration

### XForwardedFor {#xforwardedfor}

> `readonly` **XForwardedFor**: `"x-forwarded-for"` = `"x-forwarded-for"`

The client and proxy addresses a request was forwarded through.

#### See

https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Forwarded-For

### XRealIp {#xrealip}

> `readonly` **XRealIp**: `"x-real-ip"` = `"x-real-ip"`

The client address set by a reverse proxy.

### SecFetchSite {#secfetchsite}

> `readonly` **SecFetchSite**: `"sec-fetch-site"` = `"sec-fetch-site"`

The relationship between the origin of the request initiator and the requested resource.

#### See

https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Sec-Fetch-Site
