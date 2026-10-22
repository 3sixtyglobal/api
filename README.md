# 3Sixty API

This repository provides a modular API stack for defining contracts, implementing services, exposing server endpoints, and consuming those endpoints from client applications. The packages are designed to work together so teams can compose reliable API capabilities without duplicating cross-cutting concerns such as routing, request processing, authentication, and tenant context handling.

Alongside the core API building blocks, the repository also includes entity storage authentication and tenant processing components that can be adopted independently or integrated into a broader platform architecture. The overall goal is to keep API development consistent, maintainable, and straightforward to extend across different deployment contexts.

## Packages

- [api-models](packages/api-models/README.md) - Shared API contracts, route types, and response models used across services and clients.
- [api-core](packages/api-core/README.md) - Base client classes and common helpers for building HTTP and socket integrations.
- [api-core-server](packages/api-core-server/README.md) - Base server class with transport agnostic route processing for building web servers.
- [api-processors](packages/api-processors/README.md) - Reusable request and route processors for logging, context handling, and content negotiation.
- [api-server-fastify](packages/api-server-fastify/README.md) - Fastify web server integration for exposing API routes with consistent runtime behaviour.
- [api-service](packages/api-service/README.md) - Information and hosting service implementations with generated REST route handlers.
- [api-rest-client](packages/api-rest-client/README.md) - REST client implementation for consuming information and hosting endpoints.
- [api-tenant-processor](packages/api-tenant-processor/README.md) - Tenant resolution services and route handlers that derive tenant context from API keys.

## Contributing

To contribute to this package see the guidelines for building and publishing in [CONTRIBUTING](./CONTRIBUTING.md)

## Origin

This repository is derived from the original [iotaledger/twin-api](https://github.com/iotaledger/twin-api) repository.
