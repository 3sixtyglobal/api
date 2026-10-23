# Class: ForbiddenError

Class to handle errors which are triggered by forbidden actions.

## Extends

- `BaseError`

## Constructors

### Constructor

> **new ForbiddenError**(`source`, `message`, `properties?`, `cause?`): `ForbiddenError`

Create a new instance of ForbiddenError.

#### Parameters

##### source

`string`

The source of the error.

##### message

`string`

The message as a code.

##### properties?

\{\[`id`: `string`\]: `unknown`; \}

Any additional information for the error.

##### cause?

`unknown`

The cause of the error if we have wrapped another error.

#### Returns

`ForbiddenError`

#### Overrides

`BaseError.constructor`

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.
