# Variable: HttpContextIdKeys

> `const` **HttpContextIdKeys**: `object`

HTTP definition of some context keys.

## Type Declaration

### IpAddress {#ipaddress}

> `readonly` **IpAddress**: `"ipAddress"` = `"ipAddress"`

IP address of the client.

### UserAgent {#useragent}

> `readonly` **UserAgent**: `"userAgent"` = `"userAgent"`

User agent of the client.

### CorrelationId {#correlationid}

> `readonly` **CorrelationId**: `"correlationId"` = `"correlationId"`

Correlation ID of the request.

### RemoteRequest {#remoterequest}

> `readonly` **RemoteRequest**: `"remoteRequest"` = `"remoteRequest"`

Is this a remote request, will be a random UUID if request arrived through a REST endpoint, otherwise undefined.

### PublicOrigin {#publicorigin}

> `readonly` **PublicOrigin**: `"publicOrigin"` = `"publicOrigin"`

Public Origin of the request.

### LocalOrigin {#localorigin}

> `readonly` **LocalOrigin**: `"localOrigin"` = `"localOrigin"`

Local Origin of the request.

### OriginalTenant {#originaltenant}

> `readonly` **OriginalTenant**: `"originalTenant"` = `"originalTenant"`

The caller's original tenant ID before an escalated privilege tenant override was applied.
Only present when overrideTenant substitution is active for the current request.
