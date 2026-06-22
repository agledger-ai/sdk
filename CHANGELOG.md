# Changelog

All notable changes to the AGLedger TypeScript SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.0.4] - 2026-06-22

Tracks AGLedger API **v1.0.3** (was pinned to v1.0.0). A full route + field-level drift sweep against the live v1.0.3 OpenAPI surfaced four additive gaps and one spec removal; parity snapshots regenerated to `apiVersion 1.0.3` (193 routes). All additions are backward-compatible.

### Added

- **`records.get(id, { integrity: true })`** — re-verify the Record's audit chain and cross-check the served row against it (API #732). The result is exposed on the new `RecordRow.integrity` field (typed `RecordIntegrity`: `verified`, `integrityLevel`, `reason`, `entries`, `projectionChecked`, `driftFields`).
- **`records.list({ actionable: true })`** — the agent-recovery query: every Record whose next action awaits the caller's structural side, across all statuses (API #731). Agent keys only.
- **`auth.rotateKey({ gracePeriodSeconds })`** — keep the old key valid for an overlap window instead of an immediate hard cutover (API #793).
- **`compliance.export({ embed })`** — inline cryptographic evidence into the export packet so a regulator can verify each claim offline (API #771).
- New exported types: `RecordIntegrity`, `GetRecordParams`, `RotateKeyParams`.

### Changed

- `records.get` signature is now `get(id, params?, options?)` (was `get(id, options?)`) to carry the `integrity` query param. Source-compatible for all existing single-argument call sites.
- `admin.createOrg()` is documented as **dev/test-only** — `POST /v1/admin/orgs` was dropped from the canonical API spec in v1.0.1 (never registered in production; provision prod orgs via operator `provisioning/` YAML). The route-parity test no longer asserts it as a canonical route.
- Refreshed runtime-dependency lockfile pins in range: `cborg` 5.1.1 → 5.1.3, `http-message-signatures` 1.0.5 → 1.0.6. No behavior change. `npm audit`: 0 vulnerabilities.

## [1.0.3] - 2026-06-20

### Changed

- Bumped `@agledger/verify-core` to `^1.0.0` (now GA at 1.0.0 alongside the API and this SDK). No SDK-surface or behavior changes — the verification core is byte-for-byte identical to the previous 0.1.x line.

## [1.0.2] - 2026-06-18

### Fixed

- **CodeQL `js/polynomial-redos`.** Replaced a regex-based trailing-slash strip with a linear scan, removing the polynomial-backtracking vector flagged by CodeQL. No public-API or behavior change.

## [1.0.1] - 2026-06-10

### Changed

- **License re-sync.** `LICENSE` is now a verbatim copy of the canonical AGLedger SDK license template **v1.5**: §7 trademarks trimmed to **AGLedger + Settlement Signal (pending)** (removed the retired "Agentic Ledger" / AOAP claims), §6 export language modernized to ENC §740.17(b)(1) mass-market self-classification, and §1 carries the no-inspection / no-training / no-usage-data representation. README: dropped the retired AOAP protocol link and trimmed the trademark footer to match LICENSE §7.
- No code changes; republished so the distributed tarball carries the corrected license text.

## [1.0.0] - 2026-06-08

General-availability release, tracking AGLedger API **v1.0.0 GA**. No breaking changes from the 0.8.x line — the `agentId`→`performerAgentId` rename and the COSE_Sign1 chain envelope landed earlier in the 0.8.x series and are unchanged here. Route surface and the field-level parity snapshots are verified identical to API v1.0.0 (194/194 routes, zero drift across tracked models); parity snapshots bumped to `apiVersion 1.0.0`.

### Added

- `WebhookEventType`: `record.proposal_counter_proposed`, `record.ai_impact_assessment_filed`, `record.compliance_attestation_filed` — now advertised in the API's subscribable event enum.
- `DisputeGrounds`: `verdict_disagreement`.
- `defaultGateMode?: GateMode` on `TypeSchema`, `RegisterSchemaParams`, and `SchemaPreviewInput` — the per-contract-type default gate mode (API #704). Live-validated: registering a type with `defaultGateMode: 'principal'` propagates to a created record's `gateMode`.

## [0.8.16] - 2026-06-04

### Fixed

- The SDK version string (`User-Agent` / `X-SDK-Version` telemetry headers) is now derived from `package.json` at runtime instead of a hardcoded literal — it had drifted to a stale value and can no longer fall out of sync. A guard test asserts the emitted header equals the package version.

### Changed

- Parity-test comments (`parity.test.ts`, `schema-parity.test.ts`) corrected to reflect that `routes.json` / `schema-fields.json` are regenerated **manually** from the production OpenAPI and committed — removed dead references to a regeneration workflow/script that do not exist in this repo.

### Build

- `declarationMap` disabled for the published build so shipped `.d.ts` files no longer carry `sourceMappingURL` comments pointing at unshipped `.d.ts.map` sources.

## [0.8.15] - 2026-06-04

No functional change. First release published from CI with **build provenance** via npm trusted publishing (OIDC) — npm attaches a Sigstore provenance attestation automatically; verify with `npm audit signatures`. A CycloneDX SBOM is attached to the release. This package now lives in its own source-of-truth repo `agledger-ai/sdk` and resolves `@agledger/verify-core@0.1.4`.

## [0.8.14] - 2026-06-02

### Changed — EU AI Act sync to API v0.27.0/v0.27.1 (validated live)

- `RiskClassification` gains `unacceptable` (Article 5 prohibited tier); the AI-impact-assessment `domain` enum is reconciled to the API's Annex III high-risk set. `AiImpactAssessment` / `CreateAiImpactAssessmentParams` typed against the canonical `EuAiActRiskTier` + `EuAiActDomain` taxonomy.
- `WebhookEventType` reconciled to the API set (37 event types + the `*` wildcard; open literal).
- Backfilled three federation request-body fields that had drifted out of the typed surface.
- Dropped the retired ACH-* built-in contract-type model (the API deleted the built-ins; orgs own their entire type namespace, with four editable samples auto-seeded).

### Fixed

- `X-SDK-Version` / `User-Agent` headers reported a stale `0.8.11`; now track the package version.

### Build

- Added a pre-publish package-correctness gate (`publint --strict` + `@arethetypeswrong/cli --pack`, run in `prepublishOnly`) — catches exports-map / dual-resolution defects a `tsc` build can't.

## [0.8.13] - 2026-06-02

### Fixed — 0.26.x response/field drift sweep (validated live against API v0.26.5)

A full minor of API field-shape drift had accumulated while the route surface stayed 194/194 in sync. Swept every drifted response/request field across the typed surface:

- **`RecordRow`**: renamed `vaultCompletion` → `signedStatement` (the create-record chain head — previously resolved to `undefined` against a live ≥0.26 Server; closes #87) and `selfCommitment` → `selfPrincipal`; dropped `noOp` (removed API-side). Added 17 fields the API returns: `settlementSignal`, `counterSignature`, `coSignRequired`, `coSignStatus`, `federationStatus`, `disputeId`, `disputeStatus`, `hasDispute`, `hasChildren`, `latestCompletionId`, `terminalReason`, `expiredAt`, `awaitingActor`, `share`, `sharedToPeers`, `source`, `imported`.
- **Type rename** `VaultCompletion` → `SignedStatement` (drops `signature`, adds `url`). New `SettlementSignalSummary` type for the Record-projected signal.
- **`Completion`**: added `verdict`, `lastVerdictReason`.
- **`NextStep`**: added `afterThis`, `workflowLabel`, `workflowStep`, `workflowTotal` (the workflow-progress hints, embedded in nearly every response).
- **`Webhook`**: added `lastFailureAt`. **`WebhookDelivery`**: renamed `eventType` → `type`.
- **`WebhookEventType`**: added `dispute.escalated`, `dispute.evidence_window_closed`, `record.released`, `record.settled` (35 → 39).
- **`EntityReference`**: full shape (`id`, `uri`, `displayName`, `attributes`, `createdBy`, `createdAt`; `metadata` → `attributes`); `RecordRow.references` now reuses it. New `DisputeEvidence` type backing `DisputeResponse.evidence`.
- **`ListRecordsParams`**: added `type`, `performerAgentId`, `role`, `from`, `to`, `hasDispute`, `disputeStatus`, `imported`, `source` filters.

### Added

- **Schema-field parity guard** (`schema-fields.json` + `schema-parity.test.ts`) — the field-level analogue of the route manifest. Route-only parity was 194/194 clean while 20+ fields had drifted; this test fails CI the moment the API adds/renames/removes a field a mapped SDK model carries. Regenerated weekly by the `update-route-manifest` workflow.

## [0.8.12] - 2026-05-29

Closes [agledger-agents#83 (F-730)](https://github.com/agledger-ai/agledger-agents/issues/83); inherits the export-path binding fix via `@agledger/verify-core@^0.1.3` (F-731).

### Fixed

- **`records.getChain()` returned the paginated envelope, not the row array.** The `/chain` endpoint returns `{ data, total, hasMore }`; the SDK cast it as `RecordRow[]` with no runtime validation, so callers got the envelope object instead of the chain. It now unwraps `data` (tolerant of a bare-array shape too). The Python SDK crashed on the identical bug (F-730); TS was silently wrong.

### Changed

- `/verify` (re-export of `@agledger/verify-core@^0.1.3`) now runs export-path binding-integrity — a denormalised `payload` rewritten while `coseSign1` stays intact fails `CHAIN_PAYLOAD_BINDING_MISMATCH` (F-731) — and reports the `not-checked` signature state when a chain break short-circuits before the signature (F-732).

## [0.8.11] - 2026-05-28

Parity follow-on to the Python SDK 0.8.9 fix wave ([agledger-agents#82 (F-713)](https://github.com/agledger-ai/agledger-agents/issues/82), [#80 (F-710)](https://github.com/agledger-ai/agledger-agents/issues/80)). The Python SDK *crashed* on these (Pydantic validates at runtime); the TS types were silently wrong (structural typing erases at runtime) but yielded `undefined` for renamed fields. Both are now corrected to the live API contract. Verified against the API schemas.

### Fixed

- **Response-type drift** — interfaces corrected to the actual wire shape:
  - `AuditExportEntry`: `description` → optional `humanReadableLabel` (F-711); added the F-705 actor-display fields (`actorOwnerId`, `actorDisplayName`, `actorOwnerType`); `timestamp` is now the deprecated alias and `createdAt` the canonical.
  - `AgledgerEvent`: `eventType` → `type`, `payload` → `data`.
  - `AgentProfile` / `AgentDirectoryEntry`: dropped non-existent `name`/`slug`/`updatedAt`/`isActive`; the engine emits `displayName`.
  - `OrgReadsCheckpoint`: `createdAt` → `checkpointAt`, `sthBytes`/`signature` → `coseSign1Base64` + witness fields. `OrgReadsInclusionProof`: `proof` → `path`, dropped `checkpointId`.
  - `ReputationScore`: scores are `number | null`; `confidenceLevel` is `number | null`; `formulaVersion` is `number`; lifetime counters (`lifetimeRecords`/`lifetimeVerdicts`/`lifetimeAccepted`/`lifetimeCompletions`/`reversals`) replace the old `total*` names.
- **Request-param drift** — params the API rejects (`additionalProperties: false`) removed:
  - `CreateRecordParams`: dropped `category` and `proposalMessage`.
  - `records.reject(id, message?)`: sends `message` (the reject route's only accepted key), not `reason`.
  - `webhooks.update()` now takes a dedicated `UpdateWebhookParams` (`url` / `eventTypes` / `isPaused`) instead of `Partial<CreateWebhookParams>`, which leaked the create-only `format` / `signingAlg`.
  - `UpdateApiKeyParams`: trimmed to `{ isActive?, reason?, scopes?, scopeProfile? }`; dropped the create-only `label` / `expiresAt` / `allowedIps`.

## [0.8.10] - 2026-05-28

Closes [agledger-agents#77 (F-698)](https://github.com/agledger-ai/agledger-agents/issues/77) and [#78 (F-702)](https://github.com/agledger-ai/agledger-agents/issues/78); also lands a [#79 (F-706)](https://github.com/agledger-ai/agledger-agents/issues/79)-class consistency tweak.

### Fixed

- **F-698 (HIGH, audit-independence)**: `verifyExport({ publicKeys })` now accepts both the compact `Record<keyId, base64SpkiDer>` map AND the natural `VerificationKey[]` shape returned by `client.verificationKeys.list().data`. Previously, passing the array form silently fell through to the export's embedded keys (`keyProvenance.outOfBand === 0` with `valid: true`) — a false independence claim. The fix is in the shared `@agledger/verify-core` 0.1.2; wrong shapes now throw `TypeError` at the boundary (fail-closed). Closes the temporal axis too: `signingKeyWindows` from the export's own (untrusted) metadata no longer overrides activation/retirement windows the auditor supplied on OOB entries.
- **F-706-class**: `VerificationKeysResponse.hashAlgorithm` is now optional — the engine does not emit it on every build. Previously, the `agledger-python` model crashed Pydantic on `c.verificationKeys.list()`; for consistency the TS type also widens.

### Changed

- Republished against `@agledger/verify-core` 0.1.2. `@agledger/sdk/verify` re-exports the new `OutOfBandKeyEntry` type for callers that want to type their OOB key catalogue explicitly.

## [0.8.9] - 2026-05-28

Wire-parity follow-on to the verifier consolidation: the offline export verifier now exercises OIDC-actor and temporal key-validity checks when the API supplies their inputs.

### Changed

- `verifyExport` now flips `optionalChecks.oidc_actor` and `optionalChecks.key_temporal` from `skipped_no_input` to `applied` when the export wire carries the new fields (engine ≥ v0.26.x: per-entry `actorOidcIss/Sub/Synthesized` + `createdAt`, `exportMetadata.signingKeyWindows`). This exercises `CHAIN_OIDC_ACTOR_MISMATCH` and `CHAIN_KEY_EXPIRED` on the per-record export path, not just on the full-vault dump path. `payload_binding` stays dump-only by design (the export re-projects payload from the signed bytes).
- `AuditExportEntry` gained the new wire fields (`actorOidcIss`, `actorOidcSub`, `actorOidcSynthesized`) and `RecordAuditExport.exportMetadata` gained `signingKeyWindows: Record<string, { activatedAt, retiredAt }>`. Older exports without these fields still verify cleanly; the optional checks stay `skipped_no_input`.

## [0.8.8] - 2026-05-27

Verifier consolidation (Pass 1). The `@agledger/sdk/verify` subpath is now a thin re-export of the new shared verification core, `@agledger/verify-core` — the same hash-chain + COSE_Sign1 + Ed25519 body of logic the CLI, the MCP server, and `@agledger/verify` all run. This removes the SDK's private copy of `verify-export.ts` and the duplicated failure taxonomy.

### Changed (BREAKING — `@agledger/sdk/verify` result shape, pre-1.0)

- Failure reasons are now canonical SCREAMING_SNAKE `FailureCode` values from `@agledger/verify-core`. `brokenAt.reason` is renamed to **`brokenAt.code`**.
- The result now surfaces **`keyProvenance`** — whether each verified entry's public key came from out-of-band (caller-supplied) keys or was embedded in the export — so auditors can distinguish a self-attesting export from an independently keyed one.
- The result now surfaces **`optionalChecks`** — the input-gated checks that ran versus were skipped (e.g. OIDC-actor cross-check, temporal key validity).
- New **`requireOutOfBandKeys`** option: when set, the verifier fails closed unless every signature is checked against a caller-supplied (out-of-band) key, rejecting export-embedded keys. For high-assurance audits that must not trust keys carried by the artifact under inspection.

### Changed

- Now depends on `@agledger/verify-core`. The SDK remains otherwise dependency-light; `cborg` is pulled transitively by the core for COSE_Sign1 decoding.

## [0.8.7] - 2026-05-27

### Fixed

- **Build hygiene: removed an orphaned compiled file from the published tarball.** The build script was a bare `tsc` with no clean step, so a stale `dist/resources/verification.js` + `.d.ts` (the pre-rename `VerificationResource`, renamed to `GateResource` in 0.8.5) lingered in `dist/` and shipped in the 0.8.5 and 0.8.6 tarballs. It was dead weight — not exposed by the `exports` map and not importable — but present. Added `prebuild: rm -rf dist` (matching `@agledger/cli` and `@agledger/mcp-server`) so renamed/removed source can never leave orphans in a published tarball again. No API or behavior change.

## [0.8.6] - 2026-05-27

### Fixed

- **Offline audit verifier rejected valid exports (F-682).** `@agledger/sdk/verify` read the legacy `position` field on each export entry, but current exports (v0.25+) emit `chainPosition`. With `position` absent, every valid export failed with a false `position_gap` on the first entry. The verifier now reads `chainPosition`, falling back to `position` for pre-v0.25 exports. `AuditExportEntry.chainPosition` is now the canonical field; `position` is retained as a deprecated optional alias. Verified end-to-end against a live export. (Same root cause was present in `@agledger/cli` and `@agledger/mcp-server`, fixed in lockstep.)

## [0.8.5] - 2026-05-27

Tracks AGLedger API v0.25.5. The API renamed its second pillar **Verify → Gate** and now reserves "verify" exclusively for cryptographic verification. This release renames the gate/verdict surface to match. Cryptographic verify surfaces — `@agledger/sdk/verify`, webhook signature verification (`verifySignature`/`verifyRfc9421`), and `client.verificationKeys` — are **unchanged**.

### Breaking — Verify → Gate

- `client.verification` → **`client.gate`**. `verification.verify()` → **`gate.evaluate()`** (`POST /v1/records/{id}/verify` → `/evaluate`). `verification.getStatus()` now hits `/gate-status` (was `/verification-status`); response field `lastVerifiedAt` → `lastEvaluatedAt`.
- `records.reportOutcome()` → **`records.submitVerdict()`** (`POST /v1/records/{id}/outcome` → `/verdict`); body field `outcome` → `verdict`; values `PASS`/`FAIL` → `accept`/`reject`; adds optional `notes` / `reason`.
- Type `VerificationMode` → **`GateMode`** (`'auto' | 'principal'`; `'gated'` removed — `principal` subsumes it). Record field `verificationMode` → `gateMode` on create, search, and `RecordRow`.
- `RecordRow.verificationChecks` → `verdictChecks`; `RecordRow.verificationOutcome` (PASS/FAIL) → `verdict` (accept/reject).
- Renamed types: `VerificationResult` → `GateEvaluationResult`; `VerificationStatus` → `GateStatus`; `ReportOutcomeParams` → `SubmitVerdictParams`; `OutcomeResult` → `VerdictResult`; `VerificationOutcome` → `Verdict`; `FederationVerificationOutcome` → `FederationVerdict` (PASS/FAIL → accept/reject).
- `VerdictStatistics` reshaped to `{ agentId, asPrincipal: { data, total }, asPerformer: { data, total } }` carrying `verdictAcceptCount` / `verdictRejectCount` per pair (was a flat `data[]` with `verdictPassCount` / `verdictFailCount`); adds `VerdictStatisticsRow`.
- Webhook event types `record.verification_complete` → `record.gate_complete`, `cascading.verification.complete` → `cascading.gate.complete`.

### Fixed

- `gate.evaluate()` now always sends a JSON body — the `/evaluate` route requires one, so calling without completion IDs previously returned a 400.
- `VerdictResult` (was `OutcomeResult`) exposes the API's actual `recommendation` field (it was incorrectly typed as `signal`).
- `User-Agent` / `X-SDK-Version` now report the real package version (was pinned at a stale `0.8.3`).

## [0.8.4] - 2026-05-25

Tracks AGLedger API v0.25.4. Adds RFC 9421 ed25519 webhook verification (the asymmetric, non-repudiable signing tier for Settlement Signals) and catches the typed surface up with the v0.25.3/v0.25.4 additive changes.

### Added

- **`verifyRfc9421()` + `constructEventRfc9421()`** in `@agledger/sdk/webhooks` — verify opt-in ed25519 webhook deliveries (RFC 9421 HTTP Message Signatures signed with the Server vault key) against the published `/v1/verification-keys`, matched by `keyid`. Recomputes the RFC 9530 Content-Digest, reconstructs the signature base, verifies Ed25519, and enforces the `created` replay window (default/max 300s). Closes the gap where only the HMAC path had an SDK helper. New exports: `Rfc9421PublicKey`, `Rfc9421VerifyOptions`.
- **`Webhook.signingAlg` / `CreateWebhookParams.signingAlg`** (`'hmac' | 'ed25519'`) — select the delivery signing scheme. Settlement-event subscriptions default to `ed25519` when the Server has a vault signing key; requesting `ed25519` without one returns 422.
- **`VerificationKey.publicKeyRaw`** — base64 of the raw 32-byte Ed25519 key (what RFC 9421 / Standard-Webhooks-style verifiers consume), alongside the SPKI-DER `publicKey`.
- **`OpsSummary.partitions`** — audit-log partition runway (`table`, `runwayDays`, `defaultRows`) for capacity planning.
- **`AccountProfile.authType` / `cert` / `oidc`** — introspection for OIDC ephemeral-cert (Mode 2) and OIDC bearer sessions, distinguishing them from long-lived `agl_` keys.
- **9 webhook event types** reconciled to the API's authoritative set (now 35): added `signal.received`, `federation.dispute`, and the eight `record.federation_*` projected-lifecycle events; removed two values the API never emits (`record.settled`, `record.remediated`).

### Changed

- Adds a second runtime dependency, `http-message-signatures` (one transitive dep, `structured-headers`), used **only** by the `@agledger/sdk/webhooks` entry point for the RFC 9421 canonical serialization. The core client and other entry points are unaffected.

## [0.8.3] - 2026-05-25

Follow-up to 0.8.2 from a full response-schema diff of every route shared between API v0.24.0 and v0.25.2.

### Fixed

- **Audit-export chain-integrity enums were missing values.** `chainIntegrityReason` and `chainIntegrityDetail.failure` (on both `RecordAuditExport` and `exportMetadata`) were missing `oidc_actor_drift` (since v0.24.0) and the v0.25.x cert/signature modes `cert_actor_drift`, `cert_expired`, `cert_missing`, `agent_signature_invalid`. The three duplicated inline unions are now the shared `AuditChainIntegrityReason` and `AuditChainFailure` types, so they can't drift independently again.

### Added

- `ConformanceResponse.capabilities` — feature flags including `oidcWorkloadIdentity`, `ephemeralCerts`, `trustedIssuers`, `agentSignatureCoSign` (open-ended).
- `VerificationKeysResponse.signatureInputTemplate` — canonical signature-input template (v0.25.x).

## [0.8.2] - 2026-05-25

Tracks AGLedger API v0.25.2. Catches the SDK up with the v0.25.x route surface (OIDC ephemeral-cert auth + trusted issuers + ops surfaces) and the dead-code audit that removed the string-override admin feature. Validated end-to-end against a live v0.25.2 instance.

### Added

- `auth.issueEphemeralCert()` — exchange an OIDC token for a short-lived ephemeral signing cert (`POST /v1/auth/oidc/cert`).
- `admin.trustedIssuers` sub-resource — `list` / `create` / `get` / `update` / `delete` / `revokeCerts` over `/v1/admin/trusted-issuers` (platform-scoped). New types: `TrustedIssuer`, `TrustedIssuerAppliesTo`, `CreateTrustedIssuerParams`, `UpdateTrustedIssuerParams`, `ListTrustedIssuersParams`, `RevokeTrustedIssuerCertsResult`.
- `admin.revokeEphemeralCert(certId)` — revoke a single ephemeral cert (`POST /v1/admin/ephemeral-certs/{id}/revoke`). New types: `EphemeralCert`, `IssueEphemeralCertParams`, `IssueEphemeralCertResult`, `RevokeEphemeralCertResult`.
- `admin.getOpsSummary()` — consolidated ops snapshot (`GET /v1/admin/ops-summary`). New type: `OpsSummary`.
- `admin.vault.scan.list()` — list current and recent vault scan jobs (`GET /v1/admin/vault/scan`). New types: `VaultScanList`, `VaultScanSummary`.
- `agents.listPeers()` — federated agents synced from peers (`GET /v1/peer-agents`). New types: `PeerAgent`, `ListPeerAgentsParams`, `PeerAgentsResponse`.
- `scitt.getConfiguration()` (`GET /.well-known/scitt-configuration`, unauthenticated) and `scitt.getCheckpoint()` (`GET /v1/scitt/checkpoint`). New types: `ScittConfiguration`, `ScittCheckpoint`.

### Changed

- `VaultScanJob` retyped to match the wire: `status` → `state` (`VaultScanState`: created/active/completed/failed/expired), and `entriesScanned`/`errorsFound` replaced by a structured `result` (`VaultScanResult`). Resolves a long-standing type drift (API F-651).

### Fixed

- **API errors now surface every documented field.** `mapError` previously whitelisted error-body fields and silently dropped `recoveryHint`, `refreshUrl`, top-level `missingScopes`, and the RFC 9457 `detail`/`title` message fallbacks. The full body is now forwarded to the error classes. Found via live integration testing.
- `User-Agent` / `X-SDK-Version` reported a stale `0.8.0`; now tracks the package version.

### Removed

- `admin.strings` sub-resource (`listKeys` / `listOverrides` / `getOverride` / `setOverride` / `deleteOverride` / `listDrift`) and types `StringOverride` / `SetStringOverrideParams` — the backing `/v1/admin/strings/*` routes were removed in the API's v0.25 dead-code audit.

## [0.8.1] - 2026-05-21

Tracks AGLedger API v0.24.0. Pre-launch rename sweep — `tenant`/`enterprise` collapsed into `org` across paths, types, and methods; record-performer alias `agentId` becomes `performerAgentId`; account-deactivation endpoint split into org + agent variants; federation surface trimmed to v0.24.0 reality (peer servers + consolidated DLQ; gateway/hub-keys/registration removed).

### Changed (BREAKING — pre-launch, no compat aliases)

- Admin resource: `listEnterprises` → `listOrgs`, `createEnterprise` → `createOrg`, `getEnterpriseConfig` → `getOrgConfig`, `updateEnterpriseConfig` → `updateOrgConfig`. `deactivateAccount(id, { accountType })` split into `deactivateOrg(id, params)` + `deactivateAgent(id, params)` (path determines type; `accountType` body field removed).
- Types renamed: `AdminEnterprise` → `AdminOrg`, `CreateEnterpriseParams` → `CreateOrgParams`, `EnterpriseConfig` → `OrgConfig`, `SetEnterpriseConfigParams` → `SetOrgConfigParams`, `DeactivateAccountParams` → `DeactivateOrgParams` + `DeactivateAgentParams`. `CreateOrgParams` + `CreateAgentParams` shape matches v0.24.0 — `slug`, `email`, `contactEmail` dropped.
- Audit checkpoints resource: `TenantReadsCheckpointsResource` → `OrgReadsCheckpointsResource`, attribute `audit.tenantReadsCheckpoints` → `audit.orgReadsCheckpoints`. Paths `/v1/audit/tenant-reads/*` → `/v1/audit/org-reads/*`. Types `TenantReadsCheckpoint` / `TenantReadsInclusionProof` → `OrgReadsCheckpoint` / `OrgReadsInclusionProof`.
- Field rename: `enterpriseId` → `orgId` everywhere it referred to the org/tenant (RecordRow, list/search filters, admin import body, schema export/import options, admin api-key scope).
- Field rename: record-performer alias `agentId` → `performerAgentId` on RecordRow, create body, list/search filters, webhook event payloads. The `agentId` create-body alias is dropped — no back-compat. `agentId` is still valid in agent-identity contexts (`getAgent(agentId)`, reputation, references).
- Predicate kind `tenant-read` → `org-read`.
- LicenseInfo shape updated to match v0.24.0 (`validity` / `tier` / `customerId` / `instanceId` / `licensedThrough` / `licenseId` etc.; removed `plan` / `status` / `maxEnterprises` / `maxAgents` / `expiresAt`).
- `parentPrincipalEnterpriseMatchesPerformer` → `parentPrincipalOrgMatchesPerformer` on RecordRow.

### Removed (federation surface trimmed to v0.24.0)

`FederationResource`: `register()`, `heartbeat()`, `registerAgent()`, `listAgents()`, `catchUp()`, `stream()`, `listTypes()`, `getType()`, `publishSchema()`, `confirmSchemaPublish()`, `getRecordCriteria()`, `submitRecordCriteria()`, `broadcastRevocations()`, `rotateKey()`, `revoke()` — backing endpoints retired.

`FederationAdminResource`: `createRegistrationToken()`, `listGateways()`, `revokeGateway()`, `getHealth()`, `getGatewayStatus()`, `queryRecords()`, `getAuditLog()`, `resetSequence()`, `rotateHubKey()`, `listHubKeys()`, `activateHubKey()`, `expireHubKey()`, `registerPeer()`, `deleteSchemaVersion()`, `listReputationContributions()`, `resetReputation()`, `getRecordCriteriaEncryptionMetadata()` — backing endpoints retired. Old `listDlq()` (outbound-dlq) + `retryDlq()` + `deleteDlq()` replaced by the consolidated DLQ surface below.

### Added

- `FederationResource.peerHandshake()` — `POST /federation/v1/peer` (peer onboarding via single-use peering token).
- `FederationResource.submitCoSignRequest()` — `POST /federation/v1/co-sign-requests`.
- `FederationResource.submitDisputeProtocol()` — `POST /federation/v1/disputes`.
- `FederationAdminResource.listDlq()` — `GET /federation/v1/admin/dlq` (consolidated DLQ).
- `FederationAdminResource.recoverDlq()` — `POST /federation/v1/admin/dlq/recover`.
- `FederationAdminResource.getInstance()` — `GET /federation/v1/admin/instance` (this server's federation identity).
- `FederationAdminResource.deletePeer()` — `DELETE /federation/v1/admin/peers/{hubId}` (cleanup for revoked peers).
- `FederationAdminResource.createPeeringToken({ label })` now requires `label`.
- `FederationAdminResource.revokePeer(hubId, { reason })` now requires `reason`.

### Fixed (post-review sweep)

- **`RecordRow.agentId` (string|null) renamed to `RecordRow.performerAgentId`** to match the v0.24.0 wire shape — the previous field name silently returned null on every v0.24.0 record fetch.
- **`SearchRecordsParams.agentId` removed.** The v0.24.0 search endpoint only accepts `performerAgentId`; the stale field caused a silent broken filter (API dropped the unknown query and returned unfiltered results).
- **`CreateOrgParams.name` / `.displayName` made required** (was optional). **`CreateAgentParams.name` / `.displayName` made required.** Matches the v0.24.0 OpenAPI required-fields list — the wider types caused runtime 400s when callers passed only the previously-required fields.
- **Federation request shapes rewritten against v0.24.0 OpenAPI**:
  - `SubmitStateTransitionParams` now declares `recordId, state, type, idempotencyKey` (required) + `schemaRef, principalAgentId, performerAgentId, coSignRequired, correlationId, projectRef, externalTaskId, operatingMode`. Removed v0.21-era fields `gatewayId/criteriaHash/role/seq/timestamp/nonce/signature/performerGatewayId`.
  - `RelaySignalParams` now declares `recordId, recommendation, outcomeHash, validUntil, idempotencyKey` (required) + `outcome, counterSignature, schemaRef`. Removed v0.21-era fields `signal/signalSeq/performerGatewayId/timestamp/nonce/performerSignature`.
  - New typed `SubmitCoSignRequestParams` (`recordId, recommendation, outcomeHash, state, performerHubId, validUntil, idempotencyKey` + optional `outcome`) replacing the prior `Record<string, unknown>` placeholder on `federation.submitCoSignRequest`.
  - New typed `SubmitDisputeProtocolParams` (`recordId, action, disputeId, disputeStatus, idempotencyKey` + optional `tier/grounds/outcome/initiatedByRole/schemaRef`) replacing `Record<string, unknown>` on `federation.submitDisputeProtocol`.
  - New typed `PeerHandshakeParams` (`peerHubId, peerUrl, signingPublicKey, encryptionPublicKey, peeringToken, boundOrgId, agentDirectory`) replacing `Record<string, unknown>` on `federation.peerHandshake`.
  - `ContributeReputationParams` rewritten as the aggregated-period shape: `agentId, type, period, totalRecords, totalVerified, totalPassed` (+ optional `signature`). Previous `outcome, recordId` fields were stale.
  - `AgentDirectorySyncParams` expanded to `peerHubId, agents, directoryHash` (+ optional `since`); was previously only `{ agents }`, missing two required fields.
- **Removed dead federation interfaces** that no longer have backing API routes: `HubState`, `GatewayStatus`, `FederationAuditEntryType`, `RegisterGatewayParams/Result`, `HeartbeatParams/Result`, `RegisterFederatedAgentParams`, `FederationAgent`, `ListFederatedAgentsParams`, `RotateGatewayKeyParams`, `RevokeGatewayParams`, `FederationCatchUpParams`, `CreateRegistrationTokenParams`, `FederationRegistrationToken`, `ListFederationGatewaysParams`, `FederationGateway`, `AdminRevokeGatewayParams`, `ResetSequenceParams`, `QueryFederationRecordsParams`, `FederationRecord`, `FederationAuditLogParams`, `FederationAuditEntry`, `FederationHealthSummary`, `ListOutboundDlqParams`, `FederationGatewayStatus`, `HubSigningKey`, `SchemaPublishParams`, `SchemaConfirmParams`, `FederationRecordCriteria`, `SubmitRecordCriteriaParams`, `RecordCriteriaStatus`, `ReputationContribution`, `RevocationBroadcastParams`, `PeerRegistrationParams`. `ListOutboundDlqParams` → `ListFederationDlqParams` (consolidated DLQ).
- **`createFederationClient` JSDoc + @example** rewritten to use `peerHandshake` flow + `submitStateTransition` (was referencing the deleted `register()` / `heartbeat()` methods).
- **Doc sweep**: webhook event names corrected (`verification.complete` → `record.verification_complete`, `settlement.signal` → `signal.emitted`); `examples/standalone/basic-verification.ts` rewritten against v0.24.0 (was using pre-0.7.0 `mandates`/`receipts`); architecture.md self-commitment definition updated to `principalAgentId === performerAgentId` + `selfPrincipal: true`; CLAUDE.md residual "mandate" vocab swept; TS `prompt-context.ts` renders `performer=` not `agent=`.
- **Vocab sweep finalized**: `types.ts` comments, Python `scopes.py`/`disputes.py`/`agents.py` docstrings, Python test function names (`test_audit_tenant_reads_*` → `test_audit_org_reads_*`), MCP integration test label (`submit receipt` → `submit completion`), test fixtures (verify-export.test.ts, prompt-context.test.ts, test_pagination/retry/verify.py, server.test.ts) all renamed.
- **Verifier vectors**: `testdata/verifier/*.json` (5 fixtures) updated to use `orgId`; `scripts/generate-verifier-vectors.ts` field names aligned with v0.24.0 + stale-format note added.

### Internal

- Route manifest (`src/__tests__/routes.json`) regenerated from the v0.24.0 OpenAPI spec (187 routes).
- Parity test updated: critical routes now reference `/v1/admin/orgs`, `/v1/audit/org-reads/*`, deactivate split; `POST /v1/admin/records/import` requires `orgId` (not `enterpriseId`).

## [0.8.0] - 2026-05-19

Tracks AGLedger API v0.23.0. Major SCITT vocabulary alignment + canonical COSE_Sign1 chain envelope + new SCITT Transparency Service (SCRAPI) surface. Closes cross-repo issue agledger-agents#68.

### Why a 0.8.0 (not a patch)

Same rationale as the 0.7.0 wave: a wholesale rename ("Receipt" → "Completion") plus a load-bearing crypto-format cutover. Anyone tracking between 0.7.x and 0.8.0 sees real breaking changes — patch-bump would mislead. The 0.x.y track still signals pre-launch.

### Changed (BREAKING — Receipt → Completion rename, no compat aliases)

"Receipt" is now reserved for the SCITT cryptographic Merkle-inclusion-proof concept (RFC 9162 in COSE_Sign1). The performer's evidence submission — the thing that used to be a Receipt — is now a **Completion**.

- `client.receipts` → `client.completions`
- `ReceiptsResource` → `CompletionsResource`
- `Receipt` → `Completion`, `SubmitReceiptParams` → `SubmitCompletionParams`, `TypedSubmitReceiptParams` → `TypedSubmitCompletionParams`
- Route paths: `/v1/records/{id}/receipts` → `/v1/records/{id}/completions`
- Inline proofs on responses: `vaultReceipt` → `vaultCompletion`, `VaultReceipt` → `VaultCompletion`, `RecordReadReceipt` → `RecordReadCompletion`, `receiptHint` → `completionHint`, `minimalReceipt` → `minimalCompletion`
- ID fields on `OutcomeResult` / `VerificationResult` / `ReportOutcomeParams`: `receiptId` → `completionId`
- Scope strings + constants: `receipts:read`/`receipts:write` → `completions:read`/`completions:write`; `Scopes.RECEIPTS_READ`/`RECEIPTS_WRITE` → `Scopes.COMPLETIONS_READ`/`COMPLETIONS_WRITE`
- Webhook event types: `record.receipt_submitted` → `record.completion_submitted`, `record.receipt_invalid` → `record.completion_invalid`. The full set of 27 customer-facing events is now declared on `WebhookEventType` (added `record.recorded`, `record.registered`, `record.activated`, `record.remediated`, `record.revision_requested`, `cascading.verification.complete`, `dispute.withdrawn`).
- Schema types: `receiptSchema` → `completionSchema`, schema kind `'receipt'` → `'completion'`. `SchemaDiffResult.receipt` → `.completion`, `SchemaCompatibilityResult.receipt` → `.completion`. `MetaSchema.examples.minimalReceipt` → `.minimalCompletion`.
- Record fields: `cancelAfterReceiptCount` → `cancelAfterCompletionCount` (on `VerdictStatistics`). Doc-comment `RESUBMIT_RECEIPT` → `RESUBMIT_COMPLETION`.
- Dispute grounds: `fraudulent_receipt` → `fraudulent_completion`.
- Method `schemas.validateReceipt(...)` → `schemas.validateCompletion(...)`. `verification.verify({ receiptIds })` → `verify({ completionIds })`.
- Prompt-context helper: `receiptToContext` → `completionToContext`; mock ID prefix in tests `rct-` → `cmp-`.

PRESERVED uses of "Receipt" — these are the SCITT cryptographic concept:
- `AuditExportEntry.integrity.receipt` (optional base64-encoded COSE_Sign1 Receipt carrying an RFC 9162 inclusion proof, opt-in via `?receipts=true` on `getAuditExport`)
- `CommunicationEvidence.delivery_receipt` (real-world SMS/email delivery receipt, unrelated to AGLedger Receipt)

### Changed (BREAKING — offline verifier: format 1.0 → 2.0)

The audit-export verifier moved from JCS + detached-Ed25519 to canonical **COSE_Sign1** (RFC 9052, tag 18, EdDSA) over an in-toto v1 Statement payload, deterministically CBOR-encoded per RFC 8949 §4.2.1.

- `RecordAuditExport.exportMetadata.exportFormatVersion` is now **`'2.0'`** (was `'1.0'`).
- `RecordAuditExport.exportMetadata.canonicalization` is now **`'RFC8949-CDE'`** (was `'RFC8785'`).
- Per-entry `integrity` shape on `AuditExportEntry`: dropped `signature`, `signatureAlg`, `hashAlg`; added `coseSign1` (base64-encoded canonical envelope, signature lives inside) and optional `receipt` (SCITT Receipt when `?receipts=true`).
- `verifyExport()` decodes the COSE_Sign1 envelope, walks the hash chain over envelope bytes (sha256), cross-checks the protected-header chain claim at private label `-65537` against the row columns, and verifies the COSE signature against `Sig_structure = ["Signature1", protected_bstr, h'', payload_bstr]`.
- New `EntryFailureReason` values: `'cose_decode_failed'`, `'cose_header_mismatch'`. Old `'signature_invalid'` retained but now refers to the COSE signature.
- New `VerifyExportResult.signatureCoverage` discriminator — distinguishes "hash chain valid + 0/N signed" from "chain valid + N/N signed". Auditors should not conclude "Ed25519-verified" from `chainIntegrity: true` alone — read `signatureCoverage` or the new `RecordAuditExport.integrityLevel`.
- New `chainIntegrityReason` value: `'payload_drift'` — emitted when the visible `payload` jsonb diverges from the predicate signed in `coseSign1` (a privileged-DBA-bypass tamper of the denormalized view that hash + link checks alone would miss).
- New `RecordAuditExport.chainIntegrityDetail` — localizes a chain break with `brokenAtPosition`, `expectedPreviousHash`, `actualPreviousHash`, `failure` sub-classification.
- **The SDK is no longer zero-dependency.** `cborg` is a runtime dependency. The trade is intentional — COSE_Sign1 verification is fundamentally a CBOR operation, and `cborg` is the same lib the engine uses on the write side, which keeps the two implementations byte-compatible.

### Added — SCITT Transparency Service surface (`client.scitt`)

Implements `draft-ietf-scitt-scrapi-09`. Binary `application/cose` wire on entries; CBOR `application/cose-key-set` on keys. Errors are `application/concise-problem-details+cbor` per RFC 9290.

- `client.scitt.entries.register(signedStatement)` — POST a tagged COSE_Sign1 Signed Statement, returns a Receipt (COSE_Sign1 carrying RFC 9162 inclusion proof at unprotected label 396). Per SCITT spec, posting the same bytes twice creates two distinct entries.
- `client.scitt.entries.get(entryId)` — read a Transparent Statement (Signed Statement + Receipt(s) composed at unprotected label 394).
- `client.scitt.keys.list()` + `client.scitt.keys.get(kid)` — fetch the Transparency Service's COSE_KeySet for offline Receipt verification. Unauthenticated.

Errors are surfaced as `AgledgerApiError` with the raw CBOR body on the new `rawBody?: Uint8Array` field for caller-side `cborg`-decoding.

### Added — predicate schema discovery (`client.predicates`)

Each chain entry is an in-toto v1 Statement; the predicate body shape varies by entry type. The new resource publishes the canonical predicate JSON Schemas.

- `client.predicates.list()` — list available predicate kinds.
- `client.predicates.get(kind, version = 'v1')` — fetch the JSON Schema for a kind. Known kinds: `record-state`, `settlement-signal`, `vault-checkpoint`, `schema-event`, `tenant-read`, `counter-attestation`, `federation-projection`.

### Added — attestation export on `client.records`

- `client.records.getAttestation(recordId)` — fetch the chain as `application/cose-sequence` bytes (concatenated tagged COSE_Sign1 messages, each beginning `0xd2 0x84 …`). Cryptographically verifiable end-to-end.
- `client.records.getAttestationBundle(recordId)` — sigstore-bundle v0.3.2 projection for Rekor / in-toto / sigstore-policy-controller ingest. NOT cryptographically verifiable end-to-end (DSSE inner signature is byte-incompatible with the canonical COSE_Sign1 signature); structural interop only. Verify cryptographically via `getAttestation` instead.

### Added — vault checkpoints on `client.audit`

- `client.audit.vaultCheckpoints.list({ recordId, cursor, limit })` — paginated list of per-record 6h signed Merkle anchors that survive `audit_vault TRUNCATE/DELETE`. Pair with `records.getAuditExport()` for offline checkpoint cross-check.

### Added — `?receipts=true` on `records.getAuditExport`

Opt-in SCITT Receipts at `integrity.receipt` on each entry. Emitted only when the engine has a `VAULT_SIGNING_KEY`.

### Added — binary I/O on `HttpClient` + `client.request`

- `requestBinary(method, path, opts)` — full retry / idempotency / abort semantics matching the JSON path. `body` is a `Uint8Array`, response is `Uint8Array`. SCITT errors capture the raw CBOR problem-details bytes on `AgledgerApiError.rawBody`.
- `AgledgerApiError.rawBody?: Uint8Array` declared as a first-class field (was a monkey-patched property in early development).

### Internal

- Build pipeline unchanged; ESM output to `dist/`.
- Tests use a self-contained COSE_Sign1 builder for fixtures + shared 2.0 fixtures regenerated by `scripts/generate-verifier-vectors.mjs` (in the monorepo). All 391 SDK tests pass.

## [0.7.2] - 2026-05-02

Patch fix for a wrong-shape annotation in `BulkCreateResult`.

### Fixed
- **`BulkCreateResult.results[].status` is now `'created' | 'replayed' | 'error'`** (was `number`). The API has always returned the string token; the TS interface had it typed as `number`, breaking strict consumers. Fixed in parallel with the Python SDK 0.7.3 regression (where the same wrong shape caused a runtime Pydantic validation error). Resolves cross-repo issue agledger-agents#64 (testbed F-526).

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
