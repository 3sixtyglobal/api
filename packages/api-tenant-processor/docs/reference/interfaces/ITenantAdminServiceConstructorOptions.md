# Interface: ITenantAdminServiceConstructorOptions

Options for the Tenant Admin Service constructor.

## Properties

### tenantEntityStorageType? {#tenantentitystoragetype}

> `optional` **tenantEntityStorageType?**: `string`

The entity storage for the tenants.

#### Default

```ts
tenant
```

***

### platformComponentType? {#platformcomponenttype}

> `optional` **platformComponentType?**: `string`

The component type to use for firing tenant events.

#### Default

```ts
platform
```

***

### config? {#config}

> `optional` **config?**: [`ITenantAdminServiceConfig`](ITenantAdminServiceConfig.md)

Configuration for the service.
