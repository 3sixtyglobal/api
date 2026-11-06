# Class: FormUrlEncodedMimeTypeProcessor

Process the application/x-www-form-urlencoded mime type, such as an OAuth 2.0 token request,
into an object of its fields. A field given more than once becomes an array of its values.

## Implements

- `IMimeTypeProcessor`

## Constructors

### Constructor

> **new FormUrlEncodedMimeTypeProcessor**(): `FormUrlEncodedMimeTypeProcessor`

#### Returns

`FormUrlEncodedMimeTypeProcessor`

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

## Methods

### className() {#classname}

> **className**(): `string`

Returns the class name of the component.

#### Returns

`string`

The class name of the component.

#### Implementation of

`IMimeTypeProcessor.className`

***

### getTypes() {#gettypes}

> **getTypes**(): `string`[]

Get the MIME types that this handler can handle.

#### Returns

`string`[]

The MIME types that this handler can handle.

#### Implementation of

`IMimeTypeProcessor.getTypes`

***

### handle() {#handle}

> **handle**(`body`): `Promise`\<`unknown`\>

Handle content.

#### Parameters

##### body

`Uint8Array`

The body to process.

#### Returns

`Promise`\<`unknown`\>

The fields of the form.

#### Implementation of

`IMimeTypeProcessor.handle`
