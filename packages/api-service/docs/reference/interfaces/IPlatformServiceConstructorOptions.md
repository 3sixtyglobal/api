# Interface: IPlatformServiceConstructorOptions

Options for the Platform Service constructor.

## Properties

### tenantEntityStorageType? {#tenantentitystoragetype}

> `optional` **tenantEntityStorageType?**: `string`

The entity storage for the tenants.

#### Default

```ts
tenant
```

***

### loggingComponentType? {#loggingcomponenttype}

> `optional` **loggingComponentType?**: `string`

The logging component type to use for error logging.

***

### config? {#config}

> `optional` **config?**: [`IPlatformServiceConfig`](IPlatformServiceConfig.md)

Configuration for the service.
