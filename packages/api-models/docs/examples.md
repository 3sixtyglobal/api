# Models Examples

These snippets show practical helpers for URL manipulation, request parameter conversion, consistent error responses, and secure parameter encryption.

## HttpUrlHelper

```typescript
import { HttpUrlHelper } from '@3sixty/api-models';

const fullUrl = 'https://tenant.example.org/orders?page=2';

console.log(HttpUrlHelper.extractOrigin(fullUrl)); // https://tenant.example.org
console.log(HttpUrlHelper.extractPath(fullUrl)); // /orders
console.log(HttpUrlHelper.extractSearch(fullUrl)); // ?page=2
console.log(HttpUrlHelper.extractPathAndSearch(fullUrl)); // /orders?page=2
```

```typescript
import { HttpUrlHelper } from '@3sixty/api-models';

const combined = HttpUrlHelper.combineParts('https://tenant.example.org/', '/api/v1/orders');
const replaced = HttpUrlHelper.replaceOrigin(combined ?? '', 'https://edge.example.org');

console.log(combined); // https://tenant.example.org/api/v1/orders
console.log(replaced); // https://edge.example.org/api/v1/orders
```

## HttpParameterHelper

```typescript
import { HttpParameterHelper } from '@3sixty/api-models';

const ids = HttpParameterHelper.arrayFromString('id-1,id-2,id-3');
const idsAsString = HttpParameterHelper.arrayToString(ids);

const filterObject = HttpParameterHelper.objectFromString('{"status":"active"}');
const filterString = HttpParameterHelper.objectToString(filterObject);

console.log(ids.length); // 3
console.log(idsAsString); // id-1,id-2,id-3
console.log(filterString); // {"status":"active"}
```

## HttpErrorHelper

```typescript
import { HttpErrorHelper } from '@3sixty/api-models';

try {
  throw new Error('Invalid request');
} catch (err) {
  const mapped = HttpErrorHelper.processError(err, false);
  const response: {
    body?: unknown;
    statusCode?: number;
    headers?: { [id: string]: string };
  } = {};
  HttpErrorHelper.buildResponse(response, mapped.error, mapped.httpStatusCode);

  console.log(response.statusCode); // 500
  console.log(mapped.error.message); // Error: Invalid request
}
```

## IHostingComponent

When working with the hosting component, you can encrypt and decrypt query parameters for secure transmission. The encryption mechanism automatically handles salt generation to prevent rainbow table attacks.

```typescript
import type { IComponent, IHttpRequestQuery } from '@3sixty/api-models';
import { ComponentFactory } from '@3sixty/core';

interface IHostingComponent extends IComponent {
  addEncryptedParamsToUrl(url: string, params: IHttpRequestQuery): Promise<string>;
  getDecryptedParamsFromQueryParams(
    queryParams: IHttpRequestQuery | undefined,
    keys: string[]
  ): Promise<IHttpRequestQuery>;
  encryptParam(paramValue: string): Promise<string>;
  decryptParam(encryptedValue: string): Promise<string>;
}

// Get the hosting component from the component factory
const hosting = ComponentFactory.get<IHostingComponent>('hosting');

// Encrypt parameters and add them to a URL
const baseUrl = 'https://api.example.com/callback';
const encrypted = await hosting.addEncryptedParamsToUrl(baseUrl, {
  token: 'secret-token-123',
  userId: 'user-456'
});
console.log(encrypted); // https://api.example.com/callback?x-enc-token=...&x-enc-userId=...
```

```typescript
import type { IHttpRequestQuery } from '@3sixty/api-models';
import { ComponentFactory } from '@3sixty/core';

interface IHostingComponent {
  addEncryptedParamsToUrl(url: string, params: IHttpRequestQuery): Promise<string>;
  getDecryptedParamsFromQueryParams(
    queryParams: IHttpRequestQuery | undefined,
    keys: string[]
  ): Promise<IHttpRequestQuery>;
  encryptQueryParams(
    httpRequestQuery: IHttpRequestQuery | undefined,
    keys: string[]
  ): Promise<void>;
  decryptQueryParams(
    httpRequestQuery: IHttpRequestQuery | undefined,
    keys: string[]
  ): Promise<void>;
}

const hosting = ComponentFactory.get<IHostingComponent>('hosting');

// Decrypt specific parameters from a query object
const queryParams: IHttpRequestQuery = {
  'x-enc-token': 'CngBAgMEBQYH...',
  'x-enc-userId': 'CxgICSoLDAwN...',
  status: 'active'
};

const decrypted = await hosting.getDecryptedParamsFromQueryParams(queryParams, ['token', 'userId']);
console.log(decrypted); // { token: 'secret-token-123', userId: 'user-456' }
```

```typescript
import type { IHttpRequestQuery } from '@3sixty/api-models';
import { ComponentFactory } from '@3sixty/core';

interface IHostingComponent {
  addTenantTokenToUrl(url: string, tenantId: string): Promise<string>;
  getTenantTokenFromQueryParams(
    queryParams: IHttpRequestQuery | undefined
  ): Promise<string | undefined>;
}

const hosting = ComponentFactory.get<IHostingComponent>('hosting');

// Add encrypted tenant token to a URL
const redirectUrl = 'https://tenant.example.com/dashboard';
const urlWithTenant = await hosting.addTenantTokenToUrl(
  redirectUrl,
  'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6'
);
console.log(urlWithTenant); // https://tenant.example.com/dashboard?x-enc-tenant-token=...
```

```typescript
import type { IHttpRequestQuery } from '@3sixty/api-models';
import { ComponentFactory } from '@3sixty/core';

interface IHostingComponent {
  encryptQueryParams(
    httpRequestQuery: IHttpRequestQuery | undefined,
    keys: string[]
  ): Promise<void>;
  decryptQueryParams(
    httpRequestQuery: IHttpRequestQuery | undefined,
    keys: string[]
  ): Promise<void>;
}

const hosting = ComponentFactory.get<IHostingComponent>('hosting');

// Encrypt specific query parameters in place
const query: IHttpRequestQuery = {
  token: 'secret-123',
  apiKey: 'key-456',
  status: 'active'
};

await hosting.encryptQueryParams(query, ['token', 'apiKey']);
console.log(query); // { 'x-enc-token': '...', 'x-enc-apiKey': '...', status: 'active' }

// Decrypt the parameters back to their original keys
await hosting.decryptQueryParams(query, ['token', 'apiKey']);
console.log(query); // { token: 'secret-123', apiKey: 'key-456', status: 'active' }
```

```typescript
import { ComponentFactory } from '@3sixty/core';

interface IHostingComponent {
  encryptParam(paramValue: string): Promise<string>;
  decryptParam(encryptedValue: string): Promise<string>;
}

const hosting = ComponentFactory.get<IHostingComponent>('hosting');

// Encrypt a single parameter value
const plainText = 'confidential-data';
const encrypted = await hosting.encryptParam(plainText);
console.log(encrypted); // CngBAgMEBQYHCAkKCwwNDg8QERAh...

// Decrypt the parameter value
const decrypted = await hosting.decryptParam(encrypted);
console.log(decrypted); // confidential-data
```
