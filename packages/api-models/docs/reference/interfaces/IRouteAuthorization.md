# Interface: IRouteAuthorization

Type which defines the default authorization permission for a route used to seed the RBAC rules.

## Properties

### permission {#permission}

> **permission**: `string`

The permission string for the route.

***

### role? {#role}

> `optional` **role?**: `string`

The optional role string for the route.

***

### inherits? {#inherits}

> `optional` **inherits?**: `string`[]

The optional array of inherited permissions for the route.
