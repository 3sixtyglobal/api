# Interface: IBaseRouteEntryPoint\<T\>

Route entry points are used for exposing the routes from a package.

## Type Parameters

### T {#t}

`T`

## Properties

### name {#name}

> **name**: `string`

The name of the routes.

***

### defaultBaseRoute {#defaultbaseroute}

> **defaultBaseRoute**: `string`

The default base route name for the routes.

***

### tags {#tags}

> **tags**: [`ITag`](ITag.md)[]

The tags for the routes.

***

### generateRoutes {#generateroutes}

> **generateRoutes**: (`baseRouteName`, `componentName`) => `T`[]

The method to generate the routes.

#### Parameters

##### baseRouteName

`string`

##### componentName

`string`

#### Returns

`T`[]
