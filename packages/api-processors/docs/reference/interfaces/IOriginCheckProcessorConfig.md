# Interface: IOriginCheckProcessorConfig

Configuration for the origin check processor.

## Properties

### allowedOrigins? {#allowedorigins}

> `optional` **allowedOrigins?**: `string` \| `string`[]

The cross origins allowed to make cookie authenticated requests, normally the CORS origins,
a string can be comma separated. The wildcard "*" is ignored.
