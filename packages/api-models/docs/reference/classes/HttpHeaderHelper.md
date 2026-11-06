# Class: HttpHeaderHelper

Class to help with handling http headers.

## Constructors

### Constructor

> **new HttpHeaderHelper**(): `HttpHeaderHelper`

#### Returns

`HttpHeaderHelper`

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

## Methods

### buildCursor() {#buildcursor}

> `static` **buildCursor**(`headers`, `url`, `publicOrigin`, `cursor?`): `asserts headers is IHttpHeaders & { link?: string }`

Set the Link header with a next cursor relation when a cursor is present.

#### Parameters

##### headers

`IHttpHeaders`

The response headers to mutate.

##### url

`string`

The request URL used as the base for the link.

##### publicOrigin

`string` \| `undefined`

The public origin to substitute into the URL, if any.

##### cursor?

`string`

The cursor value; when undefined or empty the header is not set.

#### Returns

`asserts headers is IHttpHeaders & { link?: string }`

***

### buildId() {#buildid}

> `static` **buildId**(`headers`, `id`, `urlTemplate?`): `asserts headers is IHttpHeaders & { location: string }`

Set the Location header to the encoded ID, optionally placed within a URL template.
When the template contains `:id` (e.g. "/path1/:id/path2" or "/path?p=:id") the
encoded ID is substituted at that position; otherwise it is appended.
When no template is provided the bare encoded ID is used.
Callers that need to combine a public origin with a path should use
HttpUrlHelper.combineOriginPath to build the template before calling this method.

#### Parameters

##### headers

`IHttpHeaders`

The response headers to mutate.

##### id

`string`

The resource ID to encode and place.

##### urlTemplate?

`string`

The optional URL template (absolute or relative).

#### Returns

`asserts headers is IHttpHeaders & { location: string }`

***

### buildJsonContentType() {#buildjsoncontenttype}

> `static` **buildJsonContentType**(`headers`, `requestHeaders?`): asserts headers is IHttpHeaders & \{ content-type: "application/json" \| "application/ld+json" \}

Set the Content-Type header to JSON-LD or JSON depending on the request Accept header.
Uses HeaderHelper.extractAccept which parses the Accept header per RFC 7231 and returns
entries ordered by quality descending, preserving original order for equal q-values.

#### Parameters

##### headers

`IHttpHeaders`

The response headers to mutate.

##### requestHeaders?

`IHttpHeaders`

The request headers to inspect for the Accept value.

#### Returns

asserts headers is IHttpHeaders & \{ content-type: "application/json" \| "application/ld+json" \}

***

### extractCursor() {#extractcursor}

> `static` **extractCursor**(`headers?`): `string` \| `undefined`

Extract the cursor from the Link header's next relation.

#### Parameters

##### headers?

`IHttpHeaders`

The response headers to extract the cursor from.

#### Returns

`string` \| `undefined`

The cursor value or undefined if not present.

***

### extractId() {#extractid}

> `static` **extractId**(`headers?`, `templateUrl?`): `string`

Extract the resource ID from the Location response header.
Handles absolute URLs, relative paths, and bare ID values.
When a templateUrl containing ':id' is supplied (e.g. "/path1/:id/path2" or
"https://host/path/:id") the ID is extracted via pattern matching at the ':id'
position. Without a matching template the last path segment is returned.

#### Parameters

##### headers?

`IHttpHeaders`

The response headers containing the Location header.

##### templateUrl?

`string`

Optional URL template containing the ':id' placeholder, e.g. "/path1/:id/path2".

#### Returns

`string`

The extracted ID string.

#### Throws

GeneralError If the Location header is missing or the ID cannot be extracted.
