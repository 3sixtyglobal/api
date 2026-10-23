# Interface: IHttpRequest\<T\>

Model for the standard parameters for an http request.

## Extended by

- [`IHttpServerRequest`](IHttpServerRequest.md)
- [`INoContentRequest`](INoContentRequest.md)

## Type Parameters

### T {#t}

`T` = `any`

## Properties

### headers? {#headers}

> `optional` **headers?**: `IHttpHeaders`

Incoming Http Headers.

***

### pathParams? {#pathparams}

> `optional` **pathParams?**: [`IHttpRequestPathParams`](IHttpRequestPathParams.md)

The path parameters.

***

### query? {#query}

> `optional` **query?**: [`IHttpRequestQuery`](IHttpRequestQuery.md)

The query parameters.

***

### body? {#body}

> `optional` **body?**: `T`

Data to return send as the body.
