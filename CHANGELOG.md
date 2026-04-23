# Changelog

All notable changes to the AGLedger TypeScript SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.6.0] - 2026-04-23

Tracks AGLedger API v0.20.0 — the pre-launch principal-model rewrite. This
release is a breaking realignment of the SDK to the new API surface. No
migration shims are provided; there are no production customers yet.

### Changed (BREAKING)
- **API key role `enterprise` → `admin`.** The `ApiKeyRole` type is now
  `'admin' | 'agent' | 'platform'`. All scopes, profiles, and type hints updated.
- **API key prefix `ach_(ent|age|pla)_*` → `agl_(adm|agt|plt)_*`.** Old-prefix
  keys are not valid against a v0.20.0 API; the SDK no longer accepts them as
  examples or in docs.
- **Scope profiles renamed and trimmed to 7.** New names: `admin-standard`
  (default admin), `admin-observer`, `admin-iac`, `admin-schema`, `agent-full`
  (default agent), `agent-readonly`, `agent-performer-only`. Retired:
  `standard`, `restrictive`, `iac-pipeline`, `schema-manager`, `monitor`,
  `dashboard`, `sidecar`. `ScopeProfile` now exposes `allowedRoles`.
- **Scope constants `DASHBOARD_READ` and `AUDIT_ANALYZE` removed.**
  `ADMIN_TRUST` renamed to `ADMIN_BACKFILL` (`admin:backfill`).
- **Principal model collapsed.** `principalType` field gone from `Mandate` and
  `CreateMandateParams`. Every mandate has a single named `principalAgentId`.
  Agent keys default principal to themselves; admin keys must name the
  principal (explicitly or via `agentId`/`performerAgentId` for implicit
  self-commitment). Self-commitment (principal === performer) is valid and
  carries a `selfCommitment: true` flag on the vault entry.
- **Unified `POST /v1/mandates`.** `POST /v1/mandates/agent` and
  `GET /v1/mandates/agent/principal` are gone; use the unified endpoint and
  filter by principal.
- **Audit route rename `/v1/audit/stream` → `/v1/siem/stream`.**
- **Admin agent-approval flow replaces `/v1/enterprises/{id}/agents/*`.**
  The `EnterprisesResource` is removed; admin agent provisioning moves onto
  `AdminResource` (create/list/update/bulk-revoke agents and API keys via
  `/v1/admin/*`).
- **Auth surface trimmed.** Only `GET /v1/auth/me` and
  `POST /v1/auth/keys/rotate` remain, surfaced on a new `AuthResource`.

### Added
- **`AuthResource`** — `client.auth.getMe()` and `client.auth.rotateKey()`.
- **`DiscoveryResource`** — `client.discovery.getScopeProfiles()`,
  `getConformance()`, `getLifecycle()`. Backs unauthenticated / onboarding
  probes.
- Audit-vault `_actor` envelope visibility on `MandateAuditExport` types
  (hash-chained `actor_key_id`, `actor_role`, `actor_owner_id` per state
  change).
- `agent-performer-only` scope profile — performer that can deliver receipts
  and read mandates but cannot be a principal.

### Removed
- Resources: `dashboard`, `proxy` (governance sidecar sync), `notarize`
  (OpenClaw legacy), `projects`, `registration` (self-service signup),
  `enterprises`.
- Methods: `compliance.analyze()`, `mandates.getSummary()`, all
  trust-level methods (`admin/accounts/{id}/trust-level`), all IP-specific
  rate-limit-exemption methods, `/v1/audit/enterprise-report*`.
- Trust-level types (`TrustLevel`, `AgentVerificationMethod`, `verifiedAt`).

### Parity test
- The hand-curated `SDK_METHODS` table is gone — replaced by a smaller set of
  invariant checks (critical routes present, retired routes absent,
  resource-file prose doesn't mention retired paths or the `ach_*` prefix).
  Exhaustive per-method coverage is enforced by `resources.test.ts` and
  `integration.test.ts`.
- `routes.json` regenerated from API v0.20.0 OpenAPI (188 routes).

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
