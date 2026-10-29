# Interface: ILoggingProcessorConfig

Configuration for the request logging processor.

## Properties

### includeBody? {#includebody}

> `optional` **includeBody?**: `boolean`

Include the body objects when logging the information.

***

### fullBase64? {#fullbase64}

> `optional` **fullBase64?**: `boolean`

Show the full base64 content for data, default to abbreviate.

***

### obfuscateProperties? {#obfuscateproperties}

> `optional` **obfuscateProperties?**: `string`[]

List of property names to obfuscate, can be regex, defaults to password, privateKey,
mnemonic, seed, documentSignature, token and refreshToken.

***

### excludePaths? {#excludepaths}

> `optional` **excludePaths?**: `string`[]

Request URL path prefixes to exclude from logging, defaults to ["/logging"].
Use this to prevent the logging endpoint itself from appearing in its own output.
