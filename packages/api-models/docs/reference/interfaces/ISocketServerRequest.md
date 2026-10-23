# Interface: ISocketServerRequest\<T\>

Model for the standard parameters for an http request.

## Extends

- [`IHttpServerRequest`](IHttpServerRequest.md)\<`T`\>

## Type Parameters

### T {#t}

`T` = `any`

## Properties

### headers? {#headers}

> `optional` **headers?**: `IHttpHeaders`

Incoming Http Headers.

#### Inherited from

[`IHttpServerRequest`](IHttpServerRequest.md).[`headers`](IHttpServerRequest.md#headers)

***

### pathParams? {#pathparams}

> `optional` **pathParams?**: [`IHttpRequestPathParams`](IHttpRequestPathParams.md)

The path parameters.

#### Inherited from

[`IHttpServerRequest`](IHttpServerRequest.md).[`pathParams`](IHttpServerRequest.md#pathparams)

***

### query? {#query}

> `optional` **query?**: [`IHttpRequestQuery`](IHttpRequestQuery.md)

The query parameters.

#### Inherited from

[`IHttpServerRequest`](IHttpServerRequest.md).[`query`](IHttpServerRequest.md#query)

***

### body? {#body}

> `optional` **body?**: `T`

Data to return send as the body.

#### Inherited from

[`IHttpServerRequest`](IHttpServerRequest.md).[`body`](IHttpServerRequest.md#body)

***

### url {#url}

> **url**: `string`

The request url.

#### Inherited from

[`IHttpServerRequest`](IHttpServerRequest.md).[`url`](IHttpServerRequest.md#url)

***

### method? {#method}

> `optional` **method?**: `HttpMethod`

The request method.

#### Inherited from

[`IHttpServerRequest`](IHttpServerRequest.md).[`method`](IHttpServerRequest.md#method)

***

### socketId {#socketid}

> **socketId**: `string`

The socket id.
