# Class: TooManyRequestsError

Class to handle errors which are triggered by too many requests.

## Extends

- `BaseError`

## Constructors

### Constructor

> **new TooManyRequestsError**(`source`, `message`, `requestCount`, `nextRequestTime`, `properties?`, `cause?`): `TooManyRequestsError`

Create a new instance of TooManyRequestsError.

#### Parameters

##### source

`string`

The source of the error.

##### message

`string`

The message as a code.

##### requestCount

`number`

The current request count.

##### nextRequestTime

`string`

The time when the next request can be made, as date ISO string.

##### properties?

\{\[`id`: `string`\]: `unknown`; \}

Any additional information for the error.

##### cause?

`unknown`

The cause of the error if we have wrapped another error.

#### Returns

`TooManyRequestsError`

#### Overrides

`BaseError.constructor`

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.
