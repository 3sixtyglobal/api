# Interface: IRestRouteResponseExample\<T\>

Interface which defines a REST route response example.

## Extends

- [`IRestRouteExample`](IRestRouteExample.md)

## Type Parameters

### T {#t}

`T`

## Properties

### id {#id}

> **id**: `string`

Example objects for the request.

#### Inherited from

[`IRestRouteExample`](IRestRouteExample.md).[`id`](IRestRouteExample.md#id)

***

### description? {#description}

> `optional` **description?**: `string`

Description of the example.

#### Inherited from

[`IRestRouteExample`](IRestRouteExample.md).[`description`](IRestRouteExample.md#description)

***

### response {#response}

> **response**: `T`

The example response object.
