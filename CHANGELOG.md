# Changelog

All notable changes to the AGLedger TypeScript SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.7.0] - 2026-04-27

Tracks AGLedger API v0.21.5. The single biggest change in the SDK's
pre-launch history: the API renamed every `/v1/mandates/*` route to
`/v1/records/*` and the data-model concept "Mandate" → "Record" / "Contract
Type" → "Type". The SDK realigns wholesale.

### Why a 0.7.0 (not a patch) — deviation from "always patch pre-launch"

The internal convention is to patch-bump pre-launch since there are no
customers. This release breaks that convention because the surface change is
too large to silently roll into a patch: every typed method, every URL, and
~80 type names move. Anyone tracking the SDK between 0.6.x and 0.7.0 sees a
real rename, not a touch-up. Patch-bump would mislead. Bump to 0.7.0; the
0.x.y track itself signals pre-launch.

### Changed (BREAKING — full rename, no compat aliases)

- **`client.mandates` → `client.records`.** `MandatesResource` →
  `RecordsResource`. Every method that referred to "mandate" now refers to
  "record" — `getSubMandates` → `getSubRecords`, `BatchGetMandatesResult` →
  `BatchGetRecordsResult`, `DelegateMandateParams` → `DelegateRecordParams`,
  etc. No deprecated `client.mandates` shim.
- **Every `/v1/mandates/*` URL → `/v1/records/*`.** Path parameter
  `{contractType}` → `{type}` on schema routes. Affects `records`, `receipts`,
  `verification`, `disputes`, `compliance`, `references`, `federation`,
  `federationAdmin`, `admin`.
- **Resource type renames.** `Mandate` → `RecordRow` (named to avoid
  colliding with TypeScript's built-in `Record<K, V>` utility — the API's
  OpenAPI schema uses `RecordRow` for the same reason). `MandateStatus` →
  `RecordStatus`, `MandateTransitionAction` → `RecordTransitionAction`,
  `CreateMandateParams` → `CreateRecordParams`, `MandateAuditExport` →
  `RecordAuditExport`, `FederationMandate` → `FederationRecord`,
  `MandateLifecycleInfo` → `RecordLifecycleInfo`, etc.
- **`contractType` → `type`** on Record bodies, responses, and search
  parameters. `ContractType` (the type alias) → `RecordType`. `ContractSchema`
  → `TypeSchema`. Schema body fields `mandateSchema` → `recordSchema`.
- **Scopes renamed.** `mandates:read` → `records:read`, `mandates:write` →
  `records:write`. `Scopes.MANDATES_READ`/`WRITE` → `Scopes.RECORDS_READ`/
  `WRITE`. All scope-profile descriptions updated.
- **`mandate.*` webhook event types → `record.*`.** `WebhookEventType` union
  drops `mandate.created` etc. and adds `record.created` etc.
- **Lifecycle module renamed.** `src/mandate-lifecycle.ts` →
  `src/record-lifecycle.ts`. Top-level export `MANDATE_TRANSITIONS` →
  `RECORD_TRANSITIONS`. `recordToContext()` replaces `mandateToContext()` in
  `prompt-context`. `getValidTransitions()` / `canTransitionTo()` /
  `isTerminalStatus()` keep their names (they take a `RecordStatus` argument).
- **Compliance method rename.** `compliance.exportMandate()` →
  `compliance.exportRecord()`.
- **Reputation method rename.** `reputation.getByContractType()` →
  `reputation.getByType()`.
- **Federation rename.** `federation.listContractTypes()` → `listTypes()`,
  `getContractType()` → `getType()`, `getMandateCriteria()` →
  `getRecordCriteria()`, `submitMandateCriteria()` → `submitRecordCriteria()`.
  `federationAdmin.queryMandates()` → `queryRecords()`.
- **References rename.** `references.addMandateReferences()` →
  `addRecordReferences()`, plus new `addAgentReferences()` /
  `getAgentReferences()` for the agent-side route.
- **Capabilities body field rename.** `SetCapabilitiesParams.contractTypes`
  → `types` (matches the API's renamed field).

### Added

- **`RECORDED` status** on `RecordStatus` and `RECORD_TRANSITIONS` (terminal
  state for notarize-only Types — Records of a Type without a receipt phase
  land here at create).
- **`vaultReceipt`** on every Record response (`{ chainPosition, leafHash,
  previousHash, signature, signingKeyId, signedCheckpointRef }`). Lets a
  notarize-only caller verify the chain head without a follow-up
  `audit-export`. New top-level `VaultReceipt` type.
- **`recordRead`** SCITT-style inclusion-proof receipt on Records returned
  via cross-party tenant-admin reads. New top-level `RecordReadReceipt` type.
- **New top-level Record fields.** `category`, `outcome`, `correlationId`,
  `requestedBy`, `parentPrincipalEnterpriseMatchesPerformer`,
  `commissionAmount`, `revisionCount`, `maxRevisions`, `disputeCount`,
  `maxDisputes`, `pastDeadline`. `acceptanceRespondedAt` and `selfCommitment`
  are now non-optional on the response.
- **`client.disputes.list()`** — backed by the new tenant-wide
  `GET /v1/disputes` route. Filter by `status` or `recordId`.
- **`client.audit.tenantReadsCheckpoints.{list, get, cosign, proof}`** —
  SCITT-style signed-tree-head surface for tenant-admin cross-party reads.
- **`client.admin.records.{list, import}`** — `list()` on
  `GET /v1/admin/records`, plus `import()` on `POST /v1/admin/records/import`
  for atomic backfill of historical Records (per-batch up to 100, terminal
  status whitelist, `BACKFILL_IMPORT` vault stamp). New types
  `BackfillRecord`, `AdminImportRecordsParams`, `AdminImportRecordsResult`,
  `QueryAdminRecordsParams`.
- **`client.admin.vault.{anchors, scan, signingKeys}`** — sub-namespaces for
  the existing vault inspection methods. Old top-level `client.admin.list…` /
  `verify…` / `start…` calls were dropped (they pointed at the same routes —
  the new structure mirrors the API's `/v1/admin/vault/{anchors,scan,signing-keys}`
  layout).
- **`client.conformance.run()`** — top-level `GET /v1/conformance` mirror
  alongside the existing `client.discovery.getConformance()`.
- **`client.records.myVerdictStatistics()`** — agent-only reputation primitive
  on `GET /v1/records/me/verdict-statistics`. New `VerdictStatistics` type.
- **Schema toolkit rename to match API endpoints.** `schemas.metaSchema()`,
  `schemas.blank()`, `schemas.import_()` (underscore avoids the JS reserved
  word). Old method names (`getMetaSchema`, `getBlankTemplate`,
  `importSchema`) preserved as `@deprecated` aliases.
- **Schema lifecycle methods.** `schemas.disable(type)` and
  `schemas.enable(type)` for the two-state ACTIVE/DISABLED catalogue.
- **Per-item bulk-create idempotency.** `bulkCreate` accepts
  `BulkCreateRecordItem[]` with optional per-item `idempotencyKey` (replay-safe
  high-volume notarize ingest; 7-day TTL scoped to caller+key).
- **RFC 9457 problem-details support on errors.** `ApiErrorResponse` now
  models the standard fields (`type`, `title`, `status`, `detail`, `instance`)
  alongside AGLedger extension fields. New error properties `recoveryHint`
  and `refreshUrl` (set by the API on `422 INVALID_ACTION` to guide the agent
  to the correct corrective endpoint). Error `message` falls back to `detail`
  → `title` if absent. `PermissionError.missingScopes` reads from the new
  RFC 9457 top-level extension first, falling back to `details.missingScopes`
  for older bodies.

### Changed

- `RecordAuditExport.exportMetadata` carries `recordId` + `type` (was
  `mandateId` + `contractType`), plus new optional `expectedEntries`,
  `chainIntegrityReason`, and `operatingMode`.
- `MetaSchema` field renames: `examples.minimalMandate` →
  `minimalRecord`, `limits.contractTypeMaxLength` → `typeMaxLength`.
- `verifyExport()` (offline verifier) now returns `recordId` on
  `VerifyExportResult` (was `mandateId`). Crypto primitives and the canonical
  hash chain are unchanged — only field names move.
- `ConformanceResponse.contractTypes` → `types`.
- Federation key/payload field renames: `mandateCount` → `recordCount` on
  heartbeat / gateway summaries; `contractTypes` → `types` on agent
  registration; `mandateId` → `recordId` and `contractType` → `type` on
  state-transition / signal payloads. Federation criteria types renamed
  (`FederationMandateCriteria` → `FederationRecordCriteria`,
  `MandateCriteriaStatus` → `RecordCriteriaStatus`).

### Removed

- **No backward-compat aliases.** `client.mandates`, `Mandate`,
  `MandateAuditExport`, `MANDATE_TRANSITIONS`, `mandateToContext`,
  `Scopes.MANDATES_READ`, etc. are gone — not deprecated, gone. Pre-launch,
  no customers; aliases would carry forward forever.
- **`events.getAuditChain()`.** The retired `/v1/mandates/{id}/audit` route
  is gone from the API; use `client.records.getAuditExport()` instead (signed,
  canonicalized export with hash chain).
- **`schemas.getRules()` parameter** kept but the response shape now uses
  `type` instead of `contractType`.

### Parity test

- `routes.json` regenerated from API v0.21.5 OpenAPI (196 routes, up from
  188 in v0.20.0). Critical routes refreshed for the records surface.
- New parity assertions: `POST /v1/records` body uses `type` (not
  `contractType`); records.bulk requires `records`; admin.records.import
  requires `enterpriseId`/`source`/`records`; tenant-reads checkpoint routes
  exist; admin vault sub-routes exist.
- Retired-routes regex now flags `/v1/mandates`, `/federation/v1/mandates`,
  and `/federation/v1/admin/mandates` — any remaining mandate URL would fail
  the resource-file scan.

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
