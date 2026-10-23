# Interface: IHttpResponse\<T\>

Model for the standard parameters for an http response.

## Type Parameters

### T {#t}

`T` = `any`

## Properties

### statusCode? {#statuscode}

> `optional` **statusCode?**: `HttpStatusCode`

Response status code.

***

### headers? {#headers}

> `optional` **headers?**: `IHttpHeaders`

Response headers.

***

### body? {#body}

> `optional` **body?**: `T`

Data to return as the main payload.
