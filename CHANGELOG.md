# Changelog

All notable changes to the AGLedger TypeScript SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-04-02

### Added
- `AgledgerClient` with 23 resource sub-clients: mandates, receipts, verification, disputes, webhooks, reputation, events, schemas, dashboard, compliance, registration, health, proxy, admin, a2a, capabilities, notarize, enterprises, projects, federation, federationAdmin, agents, references
- `createFederationClient()` factory for gateway-only clients with bearer token auth
- Full error hierarchy: `AgledgerApiError`, `AuthenticationError`, `PermissionError` (with `missingScopes`), `NotFoundError`, `ConflictError`, `IdempotencyError`, `ValidationError`, `UnprocessableError`, `RateLimitError`, `ConnectionError`, `TimeoutError`, `SignatureVerificationError`
- `docUrl` and `suggestion` on all API errors for agent-friendly recovery
- Auto-pagination via async iterators (`listAll()` methods)
- Retry with exponential backoff + jitter for 429/5xx, respects `Retry-After`
- Auto-generated idempotency keys on POST/PATCH/DELETE
- Webhook signature verification via `@agledger/sdk/webhooks` subpath export
- Forward-compatible enum types with `| (string & {})` pattern
- Discriminated union types for webhook events
- Typed criteria/evidence interfaces for all 11 contract types
- Client-side mandate state machine validation (`canTransitionTo`, `getValidTransitions`)
- `RequestOptions` with `signal` (AbortSignal), `headers`, `timeout`, `authOverride`
- `@agledger/sdk/types` subpath export for type-only consumers
- 31 typed interfaces for admin, federation, vault, dashboard, agent, and reference operations
- 379 tests across 10 test files
- SECURITY.md with CVE disclosure policy
- Zero runtime dependencies (native `fetch` + `crypto`)

### Technical
- ES2024 target, Node.js >=22.0.0
- TypeScript ^5.8.0 strict mode
- `"sideEffects": false` for tree-shaking
- ESM-only with `.js` extensions
