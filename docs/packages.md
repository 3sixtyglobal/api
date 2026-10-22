# API Packages

## api-models

This package provides shared API contracts, route types, and response models used across services and clients.

- [README](../packages/api-models/README.md)
- [Examples](../packages/api-models/docs/examples.md)
- [Changelog](../packages/api-models/docs/changelog.md)

## api-core

This package provides base client classes and common helpers for building HTTP and socket integrations.

- [README](../packages/api-core/README.md)
- [Examples](../packages/api-core/docs/examples.md)
- [Changelog](../packages/api-core/docs/changelog.md)

## api-core-server

This package provides a base server class with transport agnostic route processing for building web servers.

- [README](../packages/api-core-server/README.md)
- [Examples](../packages/api-core-server/docs/examples.md)
- [Changelog](../packages/api-core-server/docs/changelog.md)

## api-processors

This package provides reusable request and route processors for logging, context handling, and content negotiation.

- [README](../packages/api-processors/README.md)
- [Examples](../packages/api-processors/docs/examples.md)
- [Changelog](../packages/api-processors/docs/changelog.md)

## api-server-fastify

This package provides Fastify web server integration for exposing API routes with consistent runtime behaviour. It builds on the [Fastify](https://fastify.dev/) framework to offer a predictable hosting layer for API services.

- [README](../packages/api-server-fastify/README.md)
- [Examples](../packages/api-server-fastify/docs/examples.md)
- [Changelog](../packages/api-server-fastify/docs/changelog.md)

## api-server-hono

This package provides Hono web server integration for exposing API routes with consistent runtime behaviour. It builds on the [Hono](https://hono.dev/) framework, served through the Node.js adapter, with Socket.IO attached to the same HTTP server for socket routes.

- [README](../packages/api-server-hono/README.md)
- [Examples](../packages/api-server-hono/docs/examples.md)
- [Changelog](../packages/api-server-hono/docs/changelog.md)

## api-service

This package provides information and hosting service implementations with generated REST route handlers.

- [README](../packages/api-service/README.md)
- [Examples](../packages/api-service/docs/examples.md)
- [Changelog](../packages/api-service/docs/changelog.md)

## api-rest-client

This package provides a REST client implementation for consuming information and hosting endpoints.

- [README](../packages/api-rest-client/README.md)
- [Examples](../packages/api-rest-client/docs/examples.md)
- [Changelog](../packages/api-rest-client/docs/changelog.md)

## api-tenant-processor

This package provides tenant resolution services and route handlers that derive tenant context from API keys.

- [README](../packages/api-tenant-processor/README.md)
- [Examples](../packages/api-tenant-processor/docs/examples.md)
- [Changelog](../packages/api-tenant-processor/docs/changelog.md)
