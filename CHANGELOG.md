# Changelog

All notable changes to the AGLedger TypeScript SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [3.2.0] - 2026-11-18

Tracks AGLedger Server 3.0.0.

### Added

- **Checkpoint key windows on an audit export.** `AuditChainIntegrityReasonCode` adds `checkpoint_key_expired`, `checkpoint_key_not_yet_active` (a vault checkpoint whose signature verifies but was written after its key's `retiredAt` or before its `activatedAt`) and `checkpoint_accounted_run_exceeded`. The union is closed, so an exhaustive `switch` over it needs the three new cases.
- **The vault scan lists what a distrusted key signed beyond chain entries.** `VaultScanResult.distrustedCheckpoints` and `distrustedCheckpointsTotal`; `VaultScanOrgAdminReads.distrustedEntries` (`VaultScanOrgReadsDistrustedEntry`), `distrustedEntriesTotal` and `distrustedSigned`. None of them fails `healthy`.
- `VaultScanBreakReason` adds `accounted_checkpoint_only`, `checkpoint_accounted_run_exceeded`, `checkpoint_key_expired` and `checkpoint_key_not_yet_active`. `OrgReadsBreakReason` adds `checkpoint_key_expired`, `checkpoint_key_not_yet_active`, `leaf_key_expired` and `leaf_key_not_yet_active`.
- `OpsSummary.federation.peers.stalled`: active peers with a delivery queued for over 180 seconds and no outbound attempt made. With it, four delivery counts partition `active`.
- **`ComplianceExport.resumeTo`** on a truncated export: re-run with the same filters and `filters.to` set to it, copied verbatim, and the next export holds exactly the matching records this one left out.
- **`ExportComplianceParams.filters` takes `ref`, `recordIds` and `rootRecordId`**: scope an export to the records tagged with an entity reference, to a list of up to 1000 record ids, or to one delegation tree.
- **`producedBy` says what produced the work.** `ProducedBy` (`modelProvider`, `modelId`, `modelVersion`, `agentSoftware`, `agentSoftwareVersion`, `promptDigest`, `configDigest`, each an optional string) goes on `CreateRecordParams`, each bulk-create item and `SubmitCompletionParams`, and reads back on `RecordRow.producedBy` and `Completion.producedBy`. The Server signs it into the create entry and into an accepted completion's entry. A digest is `sha256:`, `sha384:` or `sha512:` followed by lowercase hex.
- **Search filters.** `records.search()` takes `traceId`, `originRecordId`, `producedBy` (up to two keys) and the numeric bounds `criteriaGt`, `criteriaGte`, `criteriaLt`, `criteriaLte` and their four `metadata` twins, each a `Record<string, string>`. The shared filter set is `RecordFilterParams`.
- **`records.counts(params)`** reads `GET /v1/records/counts`: the search filters plus `groupBy` (one `RecordCountGroupBy` or an array of up to two) and `limit`, returning `RecordCounts` without paging the set.
- **Federation fields on a Record.** `RecordRow.traceId`, `federationOrigin` (`{ peerHubId, recordId }`, null on a Record this Server created) and `federationLegs` (`FederationLeg`). `CoSignPeerLeg` carries `attempts`, `lastAttemptedAt`, `lastError` and `lastErrorReason`. Agent reads carry `originAgentId` and `originPeerHubId`.
- **Verdict signature.** `SubmitVerdictParams.signatureMeaning` (`authorship`, `review`, `approval` or `responsibility`) signs the verdict as a person, on an ephemeral cert from the OIDC exchange only. `VerdictResult.signature` is `{ meaning, signerName, signerIss, signerSub, signedAt }`, or null when no meaning was sent. An API key, or a request carrying `AGLedger-On-Behalf-Of`, is refused with 422 `signature_requires_oidc_identity`, and an IdP token with no `name` claim with 422 `signature_requires_signer_name`. `AccountProfile.oidc.name` is the name a cert's signature would carry.
- **`records.getAuditExportHtml(recordId)`** returns the audit export as the HTML page the Server serves for `format=html`. The page holds the full JSON export in its `agledger-audit-export` script element.
- **`compliance.downloadExportText(exportId)`** returns a compliance export created with `format: 'csv'` or `'html'` as text. `downloadExport()` parses JSON, so it reads only a `json` export.
- Smaller fields: `FederationDlqEntry.attempts`, `lastAttemptedAt` and `lastError`; `OpsSummary.federation.legs`; `ComplianceExport.nextFrom`, the `filters.from` for the next incremental export; `ConformanceResponse.limits.jsonBodyMaxDepth` and `paginationLimitMaxByRoute`; `WebhookDelivery.signatureInput` and `idempotencyKey`; `DisputeCreateEnvelope` and `DisputeAutoReadjudication` (with `failingRuleIds`) for the dispute-create body read through `client.request()`.

### Removed

Each of these routes is gone from AGLedger Server 3.0.0, so the method that called it is removed.

- `admin.uploadSupportBundle()`, with `SupportBundleUploadResult`. `admin.getSupportBundle()` stays.
- `admin.flushAuthCache()` and `admin.flushSchemaCache()`.
- `schemas.checkCompatibility()`, with `SchemaCompatibilityResult`. `schemas.preview()` runs the same check and reports each incompatibility as a `COMPATIBILITY` error.
- `schemas.exportSchema()`, with `SchemaExportResult` and `ExportSchemaOptions`. `schemas.getManifest()` and `schemas.import_()` move a named-publisher Type; a `local` Type is registered on the target from `schemas.getVersion()`.

### Changed

- **`@agledger/sdk/webhooks` verifies RFC 9421 deliveries with no third-party dependency.** `http-message-signatures` is no longer a dependency; `@agledger/verify-core` is the only runtime dependency left. A delivery the Server signs verifies exactly as before. Anything else is held to a stricter rule: a signature must cover exactly `content-digest` and `x-agledger-idempotency-key`, in that order and without component parameters, and name `created` as an Integer and `keyid` as a String; an `expires` parameter is enforced when present; an ES256 signature must be 64 bytes. When a delivery carries several signatures, it verifies when one of them does.
- **A query parameter that is a nested object or array is refused with `ConfigurationError`.** The bracket form goes one level deep (`criteriaGte[amount]=500`); a deeper value used to be sent as `[object Object]`.
- **`maxRetries` must be an integer, 0 or more.** A negative value used to let a request make no attempt and reject with `undefined`; the constructor now throws `ConfigurationError`.
- **`verifyExport` (`@agledger/sdk/verify`) runs on `@agledger/verify-core` 2.2.0.** A sealed federation message signed within 300 seconds of a key change now verifies on the key it names, where it used to fail or be counted in `federationWire.afterRetirement`. A signed payload string that begins with U+FEFF no longer fails `CHAIN_PAYLOAD_BINDING_MISMATCH` against its row.
- **`verifyExport` fails an export cut from the end, and reports `result.entryCount`.** Fewer entries than `exportMetadata.expectedEntries` is `CHECKPOINT_ROW_MISSING`, and fewer than `exportMetadata.totalEntries` is `CHAIN_POSITION_GAP`. `result.entryCount` carries both counts, each null when the export does not state it. An export that verified on 3.1.0 with its tail removed now fails.
- **`RelaySignalParams.reasonCode` is a closed set**: `AUTO_FAIL`, `AUTO_SETTLE`, `AUTO_SETTLE_WITHIN_TOLERANCE`, `DISPUTE_OVERTURNED`, `PRINCIPAL_ACCEPT`, `PRINCIPAL_REJECT`, or null. Server 3.0.0 refuses any other value with a 400, and code passing a plain `string` no longer typechecks. The docs on `relaySignal()` state the receiver's bounds: `failingRuleIds` at most 220 ids of at most 100 characters, `counterSignature` exactly 128 lowercase hex characters, `validUntil` within the 24-hour signal window.
- **A 409 the Server marks `retryable: true` is retried.** `IDEMPOTENCY_KEY_IN_FLIGHT` and `GATE_PASS_IN_FLIGHT` are resent under the same key after the `Retry-After` the Server named, within `maxRetries`. `IDEMPOTENT_WRITE_COMMITTED` is `retryable: false`: it throws at once, with `refreshUrl` on the error, because a resend would run the work again.
- **`ScopeProfiles['admin-iac']` holds `agents:read` and `webhooks:read`**, as the Server's profile does. Every profile's `description` equals the text the Server serves. Scopes and roles are otherwise unchanged.
- **`WebhookEvent.timestamp` is optional.** `constructEvent` and `constructEventRfc9421` leave it `undefined` when the body carries none, where they used to fill in the time of parsing.
- The README leads the offline verification example with `result.verdict`, and no longer claims Deno and Bun support.
- `federation.recoverDlq({ dryRun: true })` is documented as answering `recovered: 0` with the eligible count in `inspected`. `ExpressionHelperDoc` no longer says `daysBetween` returns 0 on an unparseable date: the rule fails and names the argument.

### Fixed

- **An empty `idempotencyKey` no longer drops the `Idempotency-Key` header.** It is treated as unset, so the POST carries a generated key. A caller's own key is still sent as given; `idempotencyKeyPrefix` applies to generated keys only, now in both SDKs.
- **`timeout` is checked.** A value that is not a finite number of milliseconds above 0 and at most 2147483647 (what a timer can hold) throws `ConfigurationError`, on the client and per request. 0, `NaN`, `Infinity` and larger values used to fire at once and fail every call as a `TimeoutError`.
- **`maxPages` that is not an integer, 1 or more, throws `RangeError`**, as `maxItems` does. 0 and `NaN` used to end the walk with nothing.
- **A request body holding `NaN` or `Infinity` throws `ConfigurationError`** instead of sending `null`.
- **A `Set`, `Map` or other non-plain object as a query value throws `ConfigurationError`**; it used to send nothing.
- **`Retry-After` is read as ASCII decimal seconds only.** `0x10` was read as 16 seconds and an empty header as 0.
- **An HMAC webhook signature is compared as the exact lowercase hex the Server sends.** The header was hex-decoded first, which stops at the first character that is not hex, so a signature with anything appended still verified. A header part now splits at its first `=`, and an empty `v1` slot is passed over.
- **`verifyRfc9421` takes a public key only as standard padded base64**, as the key surfaces publish it; base64url or unpadded keys verify nothing.
- **`oidcCertCredential` refuses a `refreshFraction` that is not a number**, and a token from `getOidcToken` must have exactly three segments.
- **An empty or blank webhook secret throws `ConfigurationError`** from `verifySignature` and `constructEvent`, as the Python SDK raises. An empty string is a valid HMAC key, so a receiver deployed with `WEBHOOK_SECRET=` set but empty accepted any delivery signed with an empty key. An empty list, or any blank entry in a rotation list, is refused the same way. A secret that is not a string (`null`, a number, a `Buffer`) throws `ConfigurationError` naming its type, and an empty list is named as an empty list.
- **An untampered export checked against another Server's pin is `unanchored`, not `failed`**, through `@agledger/sdk/verify` (verify-core 2.2.0). When the pin reaches none of the export's keys and the export verifies without it, `verdict` is `unanchored` and `valid` stays false.
- **Path parameters are percent-encoded.** An id such as `../admin/x?y=1` passed to `records.get()` (or any method that puts an identifier in the URL) reached a different route. Every interpolated path segment is now encoded, so it names that literal identifier.
- **`toleranceSeconds` that is `NaN`, `Infinity` or negative throws a `RangeError`** from `verifySignature`, `constructEvent`, `verifyRfc9421` and `constructEventRfc9421`. `NaN` used to switch the replay window off, so a signature of any age verified.
- **`verifyRfc9421` and `constructEventRfc9421` enforce the replay window themselves.** With `http-message-signatures` 1.0.10 or later, an RFC 9421 delivery was accepted up to three times `toleranceSeconds` old: 900 seconds at the default, where 300 is documented. The signature's `created` time is now compared with the clock directly, symmetric and to the second. HMAC verification (`verifySignature`, `constructEvent`) was never affected.
- **`verifyRfc9421` and `constructEventRfc9421` hold a delivery to its signing key's window.** Given the list from `client.verificationKeys.list()`, a delivery signed with a retired key was accepted long after its retirement. The delivery's `created` time must now fall inside that key's `[activatedAt, retiredAt]` window, with 300 seconds allowed at each edge. `status` is not consulted, so a key retired between signing and your fetch still verifies what it signed while active. A listed key whose `activatedAt` is missing or is not an RFC 3339 instant verifies nothing. A single key passed as a string carries no window and behaves as before.
- **`verifyRfc9421` tries every signature label in the delivery.** An unusable key on one label no longer stops a later label that verifies from being tried.
- **`timeout` covers reading the response body**, including `getNdjson`, not only the wait for the response headers.
- **A caller's `AbortSignal` ends the call at once.** The abort throws `ConnectionError` ("Request aborted"), is no longer reported as a `TimeoutError` and retried, and interrupts the wait between retries.
- **`Retry-After` is capped at 30 seconds.** A 429 or 503 asking for longer is thrown as the error it is (its `retryAfter` carries the requested wait) instead of the call sleeping through it.
- **`paginate()` throws `PaginationLimitError` when a page says more rows exist but carries no cursor**, instead of ending the walk as though the listing were complete. `maxItems: 0` (or any value that is not an integer, 1 or more) throws a `RangeError` instead of meaning unlimited.
- **A 204 response updates `lastRequestId` and `rateLimitInfo`** like every other response.
- **A signature header whose timestamp is not all digits (`t=12abc`) is rejected** by `parseSignatureHeader`.
- Corrected documentation: `RateLimitInfo.reset` is the seconds until the window resets, not a Unix timestamp; a truncated `ComplianceExport` ends at a millisecond boundary and can hold fewer than 10000 rows, so continue with `resumeTo`; `OpsSummary.federation.peers.active` is partitioned by four delivery counts; `RelaySignalParams.reasonCode` no longer lists causes the Server never stamps; `VaultScanResult.healthy` requires every key registry finding to be `standing`; `AutoReadjudicateConfig.deadlineGraceSeconds` is added to the record's `tolerance.graceSeconds`, and a dispute with no re-check goes to the evidence window; `SchemaKeywordWarning` also covers `keyword: 'format'` warnings on date rules; `serverSignature` and `counterSignature` are 128 lowercase hex characters, with `serverSignature` empty when the receiving Server holds no federation key.

## [3.1.0] - 2026-11-05

### Added

- **Every field of an error body is on the error.** `AgledgerApiError` and its subclasses carry the whole served `ErrorResponse`: the 400 rebuild kit (`requiredFields`, `optionalFields`, `examplePayload`, `schemaUrl`, `recordType`, `validationErrors`), the 404 `hint`, the 422 `attemptedAction` / `attemptedTransition` / `attemptedState`, `title`, `instance`, `allowedValues`, `allowedActors`, `constraintViolations`, the license tier fields, `nextSteps`, the cap counters and digests, and `body`, the parsed body itself, so a field added later is readable without a new release.
- **`rawBody` on a JSON route's error, when the body was not JSON.** A load balancer's or proxy's 502 page now reaches the caller (`new TextDecoder().decode(err.rawBody)`); `body` stays the status line.
- **`retryAfter` on every API error, and the SDK waits it out on any status.** The retry backoff used to read `Retry-After` only off a 429; it is read on every status now and the backoff waits at least that long.
- **`admin.vault.signingKeys.list()` returns `{ data, total, signer }`**, typed `VaultSigningKeyList`: `signer` says whether the vault key is local or in AWS KMS (`keyArn`, `maxSignsPerSecond`). It used to report `hasMore` and `nextCursor` the route never sends and dropped `signer`.
- **Four more lists return `{ data, total }`** as the new `Listing<T>`, with `nextSteps` and `recordRead` where the route sends them: `discovery.getScopeProfiles()`, `admin.listRateLimitExemptions()`, `admin.vault.anchors.list()` and `admin.getFleetCapabilities()`. Code that read `hasMore` off one of them no longer typechecks; every row was already in `data`.
- **`a2a.cancelTask()`**, the `CancelTask` call. `reason` rides in `metadata["agledger:reason"]` and lands as the record's `lastTransitionReason`.
- **`federationKeys` on `verifyExport`** (`@agledger/sdk/verify`): every sealed federation message is held to its body hash and to its entry, and one from a hub whose federation key is given is also re-verified under it. `result.federationWire` counts them (`present`, `verified`, `failed`); a failure is `CHAIN_FEDERATION_WIRE_INVALID`. After a peer changes its federation key, give a list entry its `history` (from `discovery.getFederationKeys()`) beside the key you pinned, and every key the history links to it through successions both keys signed is trusted inside its window. `federationWire.afterRetirement` counts messages a peer signed under a key it had already retired. Needs `@agledger/verify-core` 2.1.0.
- **`verifyExport` re-binds inlined evidence.** On an export taken with `?evidence=true`, each completion's evidence body and each dispute's filed payload is hashed (SHA-256 over RFC 8785) against the hash its entry signs; an edited body fails `CHAIN_EVIDENCE_BINDING_MISMATCH` where it used to pass. `result.evidenceBinding` counts them and `evidence_binding` joins `optionalChecks`. Needs `@agledger/verify-core` 2.1.0.
- **`schemas.import_()` takes a `schemas.getManifest()` response whole** and sends its `manifestDigest`; the Server refuses the import with 400, writing nothing, when the manifest does not hash to it. `SchemaImportParams.manifestDigest` sets the digest by hand. A bare manifest imports as before. Sending a digest needs an AGLedger Server 2.2 or later.
- **`discovery.getFederationKeys()`** reads `GET /.well-known/agledger-federation-keys.json` (no auth): every federation signing key the Server has held, with its validity window and the signed statements linking them (`FederationKeyHistory`). Needs a Server 2.2 or later.
- **`inapplicableFields`** on `AgledgerApiError`: the fields a 422 `notarize_only_field` refused on a notarize-only create (`deadline`, `gateMode`, `maxSubmissions`, `maxRevisions`).
- `FederationPeer.signingPublicKey`; `SchemaVersionDetail.current` on `schemas.versions()` rows; `capabilities.federation` on the conformance summary.
- Types the Server now serves: `SystemHealth.backgroundMigrations` and `process.heapLimitMb`, the per-item rebuild kit on `BulkCreateResult.results[]`, `SchemaQuickStart.unsatisfied`, `ComplianceExport.bulkExport`, `connections_overcommitted` on `StatusComponentReason`, `keyRegistry.standing` on the ops summary and `standing` on each scan finding.

### Changed

- **`RecordRow.gateMode`, `maxRevisions` and `maxDisputes` are typed `| null`, and so is `GateStatus.gateMode`.** A notarize-only Record (status `RECORDED`) has no gate and no completion phase, and a Server 2.2 sends the three as null on it. Code that reads `maxRevisions` as a number has to handle null.
- The `reason` doc on errors names the thirteen 409 reason codes the Server can send, and says a 409 does not always carry one.
- The README says the package needs an AGLedger Server 2.0 or later and names the last release for a 1.x Server.

## [3.0.0] - 2026-10-05

Targets AGLedger API 2.0 only: every shape the Server removed is removed here, with no 1.x fallback.

### Breaking changes

- **Error bodies carry `detail`, not `message`.** `AgledgerApiError.message` is the body's `detail`, falling back to `title`. `ApiErrorResponse` drops `message`, `code`, `docs`, `docUrl`, `signInputTemplate` and `migratedTo`, none of which the Server sends, and `AgledgerApiError` drops `docs` and `docUrl`. `AgledgerApiError.code` stays, read from the body's `error`.
- **`IdempotencyError` is removed.** Reusing an `Idempotency-Key` with a different body is a 400 `ValidationError`; a key whose first request is still in flight is a 409 `ConflictError`.
- **Keyset listings take cursor only.** The Server refuses `offset` on every keyset listing (400). `ListRecordsParams`, `SearchRecordsParams`, `ListCompletionsParams`, `ListDisputesParams`, `ListEventsParams`, `QueryAdminRecordsParams`, `ListWebhooksParams`, `ListApiKeysParams` and `ReferenceLookupParams` extend `CursorListParams`, and `ListOrgReadsCheckpointsParams` drops `offset`. `records.listProposals`, `compliance.listRecords`, `webhooks.listDeliveries`, `webhooks.listDlq` and `admin.getWebhookHealth` take `CursorListParams`. `ListParams`, which still offers `offset`, stays for sub-Records, schemas and federation peers. `OffsetListParams` is gone.
- **`EventType` drops `record.settled`, `dispute.escalated` and `record.proposal_counter_proposed`.** `GET /v1/events` refuses them with a 400 carrying `allowedValues`. Query `record.fulfilled`, the type `record.settled` stood for, or `signal.emitted` for every settlement-signal variant.
- **Federation request types follow what the receiver requires.** Every `POST /federation/v1/*` body refuses unknown fields. `RelaySignalParams` drops `reason` and requires `outcome`, `schemaRef`, `reasonCode` and `failingRuleIds` (send null where there is none). `SubmitStateTransitionParams` requires `schemaRef`, `principalAgentId`, `performerAgentId` and `operatingMode` (now `OperatingMode`), and gains `platformRef`, `riskClassification` and `euAiActDomain`. `SubmitCoSignRequestParams` and `SubmitDisputeProtocolParams` require `schemaRef`. `SubmitDisputeProtocolParams` drops `tier`, and its `grounds` and `outcome` are closed sets. `DisputeProtocolAction` drops `escalated`.
- **`DisputeProtocolResult` declares what the receiver sends**: `ack: true`, and `applied`, `serverSignature` and `serverTimestamp` required. `StateTransitionResult.reason` drops `missing_agent_ids`.
- **Federation peering tokens bind at mint.** `federationAdmin.createPeeringToken` takes `CreatePeeringTokenParams`: `peerHubId` (the initiating Server's `instanceId`) and `boundOrgId` (the local org its records project into) are required, and `label` is optional. The Server answers 404 for an org it does not hold and 409 for a hub id already registered, and the 201 (`PeeringToken`) echoes both. `PeerHandshakeParams` drops `boundOrgId`: the token carries the org. A `peerHubId` other than the one the token was minted for is a 422 that leaves the token unconsumed, and an unknown, consumed or expired token is a 401.
- **Scope profiles.** `Scopes.DISPUTES_WRITE` (`disputes:write`) is new: opening a dispute, submitting evidence, withdrawing and resolving need it, and `disputes:read` only reads. `agent-full` and `admin-standard` carry it. `admin-iac` carries `schemas:read`, which `schemas.validateCompletion` requires. A key minted before this change gets a 403 on every dispute mutation.
- **`WebhookTestResult` drops `httpStatus` and `latencyMs`**, which duplicated `statusCode` and `durationMs`.
- **`RecordRow.createdByKeyId` is `string | null`**: null on a federation-received Record (`federationStatus: 'inbound'`).
- **`VerdictResult.recommendation` is `'SETTLE' | 'HOLD'`** and `reporterType` is `'principal'`. `RELEASE` exists only on the dispute-overturn settlement signal.
- **`EphemeralCert.agentId` is `string`.** A token that binds no agent gets no cert.
- **`Dispute.context` is `string | null`.**
- **`VaultAnchor` is the anchor object the route lists**: `key`, `chainPosition`, `lastModified`, `size`, `versions` and `hidden`. The previous `id`, `entryHash`, `previousHash` and `createdAt` were never served.
- **Vault unions gain new members**, which breaks an exhaustive `switch`: `VaultAnchorReconcileResult.status` adds `incomplete` and `acknowledged`, `VaultAnchorReconcileFinding.finding` adds `fork`, and `VaultRewindState.source` adds `acknowledgement_check`.
- **`VerificationKey.statements` is required**, and `VerificationKeysResponse` requires `anchoredFrom` and `keyStatementFormat`. `verifyRfc9421` accepts a key list without `statements`.
- **`OpsSummary.vault.chainWrites` is required**, and carries `refusedBecause` (`signing_key_unusable`, `chain_rewind_detected`) and `signingKeyGate` (`signer_unreachable`, `unanchored`, `retired`, or null). `OpsSummary.vault.anchoring.instanceId` and `OpsSummary.webhooks.inactive` are required too.
- **`Completion.agentId` is `string | null`**: null on the completion the Server synthesizes for a delegation parent from its children's failure rollup, which carries `rollupSynthesized: true`. A principal cannot accept that completion; the Server answers with the reject, revise and resubmit path.
- **`CreateApiKeyParams` pairs each role with its owner kind** (`ApiKeyRoleOwner`): `admin` with `org`, `agent` with `agent`, `platform` with `platform`. A mismatched pair is now a compile error.
- **`UpdateApiKeyResult` names the key `keyId`**, as `POST /v1/admin/api-keys` does; `id` is gone, so reading it from `admin.updateApiKey` or `toggleApiKey` was `undefined`.
- **`webhooks.delete` resolves to `WebhookDeleteResult`** (`webhookId`, `isActive: false`, `deadLetters`, `nextSteps`) rather than `void`. Each dead-lettered delivery the subscription still holds keeps system health degraded until it is discarded, and a retry of one is refused.
- **`SigningKeyStatement` requires `id` and `createdAt`**, on `VerificationKey.statements` and `exportMetadata.signingKeyStatements`.
- **`ComplianceExport.status` is `'ready'`, and `compliance.waitForExport` is removed.** The Server assembles an export inside the create call; follow `downloadUrl`.
- **`schemas.checkCompatibility` requires `completionSchema`.**
- **`RecordStatusSummary` is removed**: `GET /v1/records/summary` is gone from the Server.
- **`verifyExport` runs on `@agledger/verify-core` 2.0.0, and out-of-band keys are supplied keys.** `requireOutOfBandKeys` is `requireSuppliedKeys`, `result.keyProvenance.outOfBand` is `result.keyProvenance.supplied`, and the re-exported `OutOfBandKeyEntry` is `SuppliedKeyEntry`. Behaviour is unchanged; what makes a key trusted is the new `trustAnchors`. `result.optionalChecks` carries one more member, `key_anchoring`, and every result carries `keyTrust`. An entry whose `signingKeyId` disagrees with its signed kid, and whose key's declared algorithm contradicts its material, now reports `CHAIN_SIGNING_KEY_DRIFT` rather than `CHAIN_ALG_MISMATCH`. `verifyExport` throws `TypeError` on an option it does not read, naming `requireSuppliedKeys` for `requireOutOfBandKeys`: a caller keeping the old name, or a misspelt one, used to lose the check silently. It also throws on a pinned key distrusted with no instant.

### Added

- **Discarding dead letters.** `webhooks.discardDlq(webhookId, dlqId)` and `admin.discardDlq(dlqId)` (platform key, any subscription) remove a dead-lettered delivery without delivering it and resolve to `DlqDiscardResult`. On an inactive subscription this is the only way to clear an entry. `AdminWebhookDlqEntry.subscriptionActive` says which entries those are, and `DlqRetryAllResult.skippedInactive` counts the entries a retry-all left in place.
- **Health fields.** `SystemHealth.workerConnections` (and the support bundle's `health.workerConnections`) counts connections held by workers; `0` degrades `status`. `StatusComponent.reason` names `database_unavailable` and `signing_key_unusable` on Chain writes, and `no_worker_connected`, `worker_not_consuming` and `not_checked` on Workers. `HealthResponse.signingKey` names the process's signing gate (`usable`, `retired`, `unregistered`, `signer_unreachable`, `unanchored`, `unsigned`) and `status` may be `degraded`. `SystemHealth.database.failure` and `SystemHealth.connectedVersions` (`ConnectedVersion`) name why the probe failed and which AGLedger releases are connected. `VaultRewindOpenFinding.previousAcknowledgement` describes an earlier acknowledgement that holds the finding's position and does not cover it.
- **Unanchored-key chain codes.** `AuditChainIntegrityReasonCode` gains `signing_key_unanchored` and `checkpoint_key_unanchored`, and `AuditChainFailureCode` gains `signing_key_unanchored`: an entry, or a checkpoint, signed by a key the registry holds and no signed key statement anchors. `VaultScanBreakReason` gains both, and `OrgReadsBreakReason` gains `checkpoint_key_unanchored` and `leaf_key_unanchored`.
- **Signed key statements.** `VerificationKey.statements` and `RecordAuditExport.exportMetadata.signingKeyStatements` carry the `SigningKeyStatement`s (`succession`, `genesis`, `closure`; base64 COSE_Sign1 in signing order) that admit each key. `VerificationKeysResponse.anchoredFrom` and `exportMetadata.anchoredFrom` name the key the serving process signs with, to compare against a pin taken out of band.
- **Vault key trust.** A `VaultSigningKey` row carries `trust` (`anchored`, `unanchored`, `undecided`) and `admittedBy`. `VaultSigningKeyRetirement` carries `alreadyRetired`, `unanchoredKeyIds`, `closureDigest`, `retiredSpkiSha256` and `revokedCertCount`. `VaultScanResult.keyRegistry` (`VaultScanKeyRegistry`) is the key-registry trust walk of a full scan, and its findings fail `healthy`.
- **Anchors and rewinds.** `VaultAnchorVerifyRow` names the `fork`, `superseded`, `hidden` and `missing_or_hidden` outcomes and carries `storedVersions`, `versionsNote` and `signedForIssuer`. `VaultAnchorReconcileResult` carries `hidden`, `hiddenAnchors` (`VaultHiddenAnchor`), `forked` and `acknowledged`. `VaultRewindStatus` carries `openFindings` and `nextSteps`, and `VaultRewindAcknowledgement` carries `coveredFindings`. `OpsSummary.vault.chainWrites` says whether a detected rewind refuses chain writes.
- **`events.list` resolves to `EventPage`**, carrying `visibleBefore`: send it as the next window's `since` so consecutive windows neither overlap nor skip.
- **`LicenseValidity` names `marketplace_refused`.**
- **Keys.** `AdminApiKey.scopeProfile` is back on the listing row, and `RotateKeyResult` carries `keyId` and `scopeProfile`.
- **Records.** `VerdictResult.reporterRole` says whether the principal or an org admin rendered the verdict. Bulk-create items carry `constraintViolations`, and bulk and batch results carry `nextSteps`. `BackfillImportedRecord.advisoryWarnings` lists what an import was allowed past. `AcceptanceStatus` names `BYPASSED`.
- **Schemas.** `SchemaQuickStart.recordFields` names the top-level Record fields that belong beside `criteria`. `SchemaValidationResult` carries `publisher` and `nextSteps`, and its `errors` may be null. `RegisterSchemaParams` and `SchemaPreviewInput` take `defaultShare`, `coSignRequired`, `flipRecordStatusOnDispute`, `federateDisputes` and `publisher`, and `displayName` is optional on both.
- **Provisioning.** `ProvisioningStatus` carries `loadWarnings` and `trustedIssuersWarnings`, and `ProvisioningReloadResult` carries `loadWarnings` and `trustedIssuers.warnings`.
- `PeerHandshakeResult.serverHubId`, the receiving Server's hub id, to name when you mint the reverse peering token.
- `ApiErrorResponse.submissionCount` and `maxSubmissions`, on the submission-cap refusal.
- `nextSteps` on trusted issuers, circuit-breaker updates, agent updates, reference writes, org-read cosigns, AI impact assessments, compliance records, schema previews and compatibility checks, and audit exports; `recordRead` on AI impact assessments and compliance records.
- **`view: 'compact'` on `records.get`, `list`, `listAll` and `search`.** The Server leaves out every top-level null and trims each `nextSteps` entry to `action`, `method` and `href`. Those calls resolve to `RecordRowCompact` (or `RecordCompactPage`), with `NextStepCompact` steps. Without `view`, or with `view: 'full'`, the methods resolve to `RecordRow`. New types: `RecordView`, `RecordRowCompact`, `RecordCompactPage`, `NextStepCompact`.
- **`verifyExport` reports an unsigned entry written while the vault was signing.** An entry with no signing key fails with `CHAIN_ENTRY_UNSIGNED` when an earlier entry in its chain names a key, or when it was written at or after the earliest activation time among the keys the verifier holds. An unsigned history written before the first key stays reduced coverage. An entry that names a key but carries an all-zero signature fails `CHAIN_SIGNATURE_INVALID`.
- `signature_missing` and `checkpoint_unsigned` in `AuditChainIntegrityReasonCode`, and `signature_missing` in `AuditChainFailureCode`.
- Vault scan findings: `VaultScanBrokenRecord` and `VaultScanBrokenChain` carry `firstFinding` (`VaultScanFirstFinding`), and their `reason` is the open `VaultScanBreakReason`. `VaultScanResult` carries `unsupportedAlgorithm` and `orgAdminReads` (`VaultScanOrgAdminReads`); `VaultScanGlobalChains` carries `unsupportedAlgorithm`.
- `AgledgerApiError` forwards `reason`, `currentState`, `allowedActions` and `existingId` from the error body, and `ApiErrorResponse` gains `existingId`.
- `ComplianceExport.format`, `TrustedIssuerAlg` for `allowedAlgs`, and the JWKS fetch fields on `TrustedIssuer` (`jwksLastFetchAt`, `jwksLastFetchOutcome`, `jwksLastFetchError`, `jwksLastSuccessAt`).
- **`result.verdict`**: `'trusted'`, `'unanchored'` or `'failed'` (`Verdict`, re-exported from `@agledger/sdk/verify`), the word every AGLedger verifier prints. A valid result with no pin, or none that anchored a signature, is `'unanchored'`; read `verdict`, not `valid` alone. `publicKeys` also takes the `client.verificationKeys.list()` result as it comes, not only its `.data`.
- **`verifyExport(exp, { trustAnchors, distrustedKeys })` anchors the vault keys.** `trustAnchors` takes the SPKI digests (`sha256:<hex>`) of vault keys you took out of band; the signed key statements the export carries are walked from them. An entry signed by a key the walk does not reach fails `CHAIN_SIGNING_KEY_UNANCHORED`, each anchored key is held to the window its statements sign, and a statement that does not hold is `KEY_STATEMENT_INVALID`, `KEY_CLOSURE_INVALID` or `CHAIN_KEY_WINDOW_DRIFT` in `result.keyTrust.findings`. `distrustedKeys` takes the operator's `VAULT_DISTRUSTED_KEYS` entries; passing them without `trustAnchors` throws `TypeError`, as does a pinned key distrusted with no instant. A pin beside a dated entry for the same key (`sha256:<hex>@<instant>`) vouches for what the key signed before the instant. Without `trustAnchors`, `result.keyTrust.status` is `'no_anchor'` and `optionalChecks.key_anchoring` is `'skipped_no_input'`: `valid` then means the chain is intact against keys nobody pinned. With `trustAnchors`, a run in which no signature verified under an anchored key is `'no_anchored_signature'` (`KeyTrustStatus`), which is no more trusted than `'no_anchor'`: a chain is trusted only when `valid` is true and the status is `'walked'`. An entry with no readable `createdAt` where the walk needs one, or a null payload or key, fails with a failure code such as `CHAIN_MALFORMED_ENTRY` rather than passing or throwing, and `optionalChecks.key_anchoring` is `'not_checked'` when `trustAnchors` were given but no entry reached the check. `@agledger/sdk/verify` re-exports `DistrustedKey`, `KeyTrustReport`, `KeyTrustNote`, `KeyTrustStatus`, `KeyRegistryFinding`, `KeyRegistryFindingCode`, `OptionalCheck` and `CheckApplicability`.
- **Distrusted keys and key material.** `AuditChainIntegrityReasonCode` gains `signing_key_distrusted` (an entry a `VAULT_DISTRUSTED_KEYS` key signed before a key the Server trusts retired it: accounted for, never verified) and `signing_key_material_invalid` (every entry verified, and the key material the export carries does not verify as a set). `AuditChainFailureCode`, `VaultScanBreakReason` and `VaultScanFirstFindingReason` gain `signing_key_distrusted`. A vault scan lists what such a key signed: `VaultScanResult.distrustedSigned`, `distrustedEntries` (`VaultScanDistrustedEntry`) and `distrustedEntriesTotal`, `VaultScanGlobalChains.distrustedSigned`, and `VaultScanKeyRegistry.distrustedStatements`; none of them fails `healthy`.
- **A scan that is not being picked up says so.** `VaultScanJob.waitingOn` (`VaultScanWaitingOn`, reason `VaultScanWaitingReason`) is set on `admin.vault.scan.run()` and `status()` while no worker is connected, a connected worker has stopped taking jobs (`workerHolds` says why), or one is attached but stalled.
- **Health.** `StatusComponent.reason` is the open `StatusComponentReason` and gains `privilege_missing` and `worker_stalled`. `OpsSummary.vault` carries `keyRegistry.findings` and `appendOnly` (`enforced`, `role`, `held`).
- **The lifecycle table is the graph `GET /lifecycle` serves.** `RECORD_TRANSITIONS` gains the dispute edges (FULFILLED, FAILED and REMEDIATED reach DISPUTED; DISPUTED reaches REMEDIATED), the deadline edges (CREATED and PROPOSED reach EXPIRED, PROCESSING reaches EXPIRED and CANCELLED) and the rollup's PROCESSING and REVISION_REQUESTED to ACTIVE, and drops FAILED to REMEDIATED, PROCESSING to REVISION_REQUESTED and PROCESSING to DISPUTED, which no Record takes. `TERMINAL_STATUSES` and `isTerminalStatus` follow the Server's terminal flag, so FULFILLED and REMEDIATED stay terminal although a dispute can reopen them. `records.getValidTransitions(record)` returns the Record's own `validTransitions` when the row carries them.
- `schemas.checkCompatibility` takes the `publisher` option and checks within that publisher, as `register()` does. `SubmitVerdictParams.message` is the third wire alias of `notes`. Bulk-create items carry `allowedValues`, and `AgledgerApiError.validTransitions` forwards the targets reachable now from a 422 refusal.
- **`verifyExport` names the distrust entry an export says the Server applied.** Where the Server's `VAULT_DISTRUSTED_KEYS` entry cut a key's listed retirement and the run was not given the same `distrustedKeys` entry, the `CHAIN_KEY_WINDOW_DRIFT` (or `KEY_CLOSURE_INVALID`) finding names the entry to confirm with the Server's operator. The verdict is as before.
- `VerificationKey` and the `signingKeyWindows` entries declare `distrustedFrom?: string`. `SchemaPreviewResult` declares `unchanged?: boolean`, true when the body repeats the latest version.
- The conformance corpus is regenerated for API 2.0: 35 export vectors, including three new ones for unsigned entries.

### Fixed

- **`VaultScanList.lastCompleted` has no `state`.** It is the new `VaultScanLastCompleted` (`{ jobId, completedAt, result }`) rather than `VaultScanSummary`. `VaultScanSummary` (`active` and `recent[]`) drops `result`.
- **An `/a2a` HTTP 4xx maps onto the usual error fields.** `code` is now the ErrorInfo `reason` (`VALIDATION_ERROR`, `UNAUTHORIZED`), or the JSON-RPC number as a string when there is none; `message`, `recoveryHint`, `requestId` and `retryable` come from `error.data[0].metadata`, and the JSON-RPC error object stays on `details`.
- **A JSON error on a binary route maps like any other.** A request refused before the handler on the SCITT and attestation routes, such as a malformed entry id, is answered in JSON; it now gives `code`, `detail` and `type` as on every JSON route, and `rawBody` still holds the bytes. A CBOR problem body's `code` is `'unknown'`, as for every other unparsed error body, rather than `'binary-error'`.
- **`TimeoutError` and `ConnectionError` carry `idempotencyKey`**, the `Idempotency-Key` the failed request sent (reused across the SDK's own retries). Pass it back as the `idempotencyKey` request option to retry a write that may have been applied without applying it twice.
- **Key statements are walked in write order.** `verifyExport` orders the walk by each statement's `createdAt`, then `id`, so `keyTrust.order` is `'written'` and findings name the statement row. A listed window the walk grades more loosely than the export states is `CHAIN_KEY_WINDOW_DRIFT`. A key statement signed by a key in `distrustedKeys` counts for nothing whatever time it carries. A statement that counts for nothing only because its signer is distrusted, dated before the cutoff by the export's own unsigned write time, is a `keyTrust.notes` entry rather than a finding, so an honest rotation away from a key distrusted after it still passes pinned on its successor.
- **A Record received from a federation peer type-checks.** `RecordRow.federationStatus` is the open `RecordFederationStatus`, which names `inbound`.

### Documentation

- The README's HMAC webhook example narrows `req.headers['x-agledger-signature']` before verifying, so it compiles under `tsc --strict`.
- The README Quick Start runs the principal and the performer as two clients, and ends with the principal's accept verdict. It used to submit the completion with the principal's key, which the Server refuses with a 403 `WRONG_STRUCTURAL_ROLE`.
- `Completion.verdict` is the auto gate's verdict on that completion, null in principal mode, on encrypted Records, when the gate was deferred, and on a completion read.
- `oidcCertCredential({ agentId })` and `IssueEphemeralCertParams.agentId` are an assertion, not a choice: the token decides the agent, and a different `agentId`, or any `agentId` on a token that binds no agent, is a 403 `CERT_AGENT_BINDING_MISMATCH` whose `recoveryHint` names the binding to make.
- `SettlementSignalSummary.reason` is null on an inbound signal.
- `a2a.call('SendMessage', ...)` shows the action in a data part of the message; an `action` on `params` is refused with `-32602`.
- `Webhook.secret` is absent on an `Idempotency-Key` replay of the create.
- `oidcCertCredential` and the README say the Server verifies the body signature on every authenticated route and seals it into every chain entry the request writes. The headers are sent only by the cert credential and only with a body, since the Server refuses them with 400 under any other credential.
- `constraintInheritance` on a create: omitted, the Record inherits the org's `enforcement.constraintInheritanceDefault`.
- `routes.json` and `schema-fields.json` are regenerated from the final API 2.0 spec (195 routes).

## [1.12.0] - 2026-09-21

Reconciled against API 1.8.0. Adds OIDC workload identity to the client, and removes fields and methods the SDK declared that the Server never sent; code that read one of those fields was reading `undefined`.

### Added

- **`bearerToken` and `oidcCertCredential`.** `AgledgerClientOptions` takes `bearerToken` beside `apiKey`, and exactly one of the two is required (`ConfigurationError` otherwise). A string is sent as is. A function is called before every request, retries included, and nothing is cached, which is the form for handing the Server an admin OIDC token from your IdP; when the operator turns on `jtiSingleUse` for that trusted issuer, each token is accepted once, so the function must mint a fresh one per call. `oidcCertCredential({ getOidcToken, agentId?, refreshFraction? })` exchanges a fresh OIDC token for a short-lived cert (`POST /v1/auth/oidc/cert`), presents the cert as the bearer, re-exchanges once `refreshFraction` (default 0.5) of the cert's lifetime has passed, and re-exchanges and retries once when a request made with the cert is refused with 401. Concurrent requests share one exchange. `getOidcToken` must return a new token on every call, since the Server exchanges each token id once; when a source that rotates on its own schedule hands back the token it already exchanged, the credential keeps the current cert while it is valid, and once the cert has expired or was refused it throws `OidcExchangeError` (409) naming the reused token. The credential holds one Ed25519 key pair generated in memory and never persisted; `publicKeyJwk` exposes the public half for offline verification.
- **Request body signing under a cert.** A client using `oidcCertCredential` signs every request body: `X-Agent-Signature-Content-Hash` is `sha256:<hex>` of the exact bytes sent and `X-Agent-Signature` an Ed25519 signature. The Server seals it into the chain entry on record create, transition and verdict, completion submit, and A2A. The body is serialized once per request, so every retry sends the bytes that were signed.
- **`OidcExchangeError`**, thrown when the Server refuses the exchange. It carries the Server's status and `recoveryHint`, and the OIDC token is scrubbed from the message and details.
- **`RequestOptions.onBehalfOf`**, sent as the `AGLedger-On-Behalf-Of` header: an RFC 8693 delegation token for work done on behalf of a person or another party, accepted on record create, transition and verdict, completion submit, and A2A.
- **API key dormancy.** `ListApiKeysParams` takes `lastUsedBefore` and `neverUsed`. `admin.bulkRevokeApiKeys` takes either key ids (as before) or a `BulkRevokeApiKeysParams` filter object (`keyIds`, `ownerId`, `role`, `createdBefore`, `lastUsedBefore`, `neverUsed`, `reason`), and resolves to `BulkRevokeApiKeysResult` with `alreadyInactive` and `notFound` beside `revoked`. `UpdateApiKeyParams.allowedIps` replaces a key's IP allow-list (CIDR blocks allowed; `null` clears it).
- **`AdminApiKey` reports revocation**: `revokedAt`, `revokedByKeyId`, `revocationReason`, `rotatedFromKeyId`, plus `orgId` and `allowedIps`.
- **Trusted issuers**: `jtiSingleUse` and `subjectAllowlist` on the row and on create and update, and `enabled` on the row. `UpdateTrustedIssuerParams.managedBy: null` takes admin ownership of a provisioning-managed row.
- **License notice.** `LicenseTier` names `unlicensed`. `LicenseInfo.validity` is the typed `LicenseValidity`, and `LicenseInfo.notice` (`LicenseNotice | null`) names the state an operator has to act on: no key, a Developer Edition key on an external database, or a key that failed validation. The same notice is on `OpsSummary.license` and `SupportBundle.license`, and `ConformanceResponse.license` carries `validity`, the notice kind and `escalated` without a platform key. `admin.reloadLicense({ license })` or `({ licenseKey })` applies a key from the request body.
- **Admin vault routes.** `admin.vault.signingKeys.retire(keyId, { force? })` retires one key by its 16-hex fingerprint (retiring the only key able to sign is refused, so rotate first; `force` skips the quiet period for a compromised key). `admin.vault.anchors.reconcile({ maxKeys?, deadlineMs? })` walks the anchor bucket against the Server's records and reports counters beside a capped `findings` sample and a `truncated` flag. `admin.vault.rewind.get()` reads the chain-rewind state, whose `blocked` says whether chain writes are currently refused, and `admin.vault.rewind.acknowledge({ note? })` lifts that refusal. New types: `VaultSigningKeyRetirement`, `RetireVaultSigningKeyParams`, `VaultAnchorReconcileResult`, `VaultAnchorReconcileFinding`, `ReconcileVaultAnchorsParams`, `VaultRewindStatus`, `VaultRewindState`, `VaultRewindAcknowledgement`, `AcknowledgeVaultRewindParams`, `VaultAnchorPosture`.
- **Nine chain-integrity codes the Server declares and the SDK did not.** `AuditChainIntegrityReasonCode` gains `checkpoint_signature_invalid`, `checkpoint_key_unknown`, `checkpoint_claim_mismatch`, `key_expired`, `key_not_yet_active` and `signing_key_unpublished`; `AuditChainFailureCode` gains the last three. `cert_window_drift` is added to `AuditChainIntegrityReason` and `AuditChainFailure`.
- **`recordRead`** on `GateStatus`, `GateEvaluationResult`, `Completion`, `DisputeResponse`, `RecordAuditExport`, and the new `RecordGraph` and `EntityReferencesResult`: the chain entry an org-admin cross-party read appended.
- **`managedBy`** on `Webhook` and `WebhookHealthEntry`: a provisioning-managed subscription answers 409 to delete, update and rotate.
- **Provisioning**: `ProvisioningStatus.managed.trustedIssuers` and `trustedIssuersUnchangedSinceLastLoad`, and on a reload `trustedIssuers.loadedAt` and `trustedIssuers.unchangedSinceLastLoad`.
- **`admin.listOrgs({ search })`, `admin.listAgents({ orgId, search })`, `admin.getFleetCapabilities({ type })`** and **`references.lookupAll()`**.
- Typed results where a method returned `Record<string, unknown>`: `records.getGraph` (`RecordGraph`), the four reference methods on `references` and `agents` (`EntityReferencesResult`), `capabilities.get` and `set` and `admin.setCapabilities` (`AgentCapabilities`), `disputes.submitEvidence`, `federationAdmin.getInstance`, and the DLQ retry methods (`DlqRetryResult`, `DlqRetryAllResult`).
- `BulkCreateResult` items carry `errorCode` and the summary `replayed`; `BatchGetRecordsResult` carries `notFound`; `RecordAuditExport` carries `verificationGuide`; `SchemaQuickStart` carries `tolerance` and `gateMode`; `MetaSchema` carries `fieldMappingValueTypeSpec`, `expressionBindings`, `verbVocabulary` and the rest the route serves.
- **`verifyExport(exp, { agentKeys })`** re-checks, offline, the agent signatures an OIDC cert sealed into the chain, against the cert keys you supply (`oidcCertCredential().publicKeyJwk`). `result.agentSignatures` counts those present and verified, and one that does not verify is `CHAIN_AGENT_SIGNATURE_INVALID`. `AgentPublicKeyJwk` is re-exported from `@agledger/sdk/verify`. Needs `@agledger/verify-core` 1.5.0, which the dependency range now names.
- The conformance corpus is regenerated for API 1.8.0 (export slice from 23 to 32 vectors, dump slice from 12 to 18), with new vectors for actor attribution and agent signatures.

### Removed (the Server never sent the field or served the route)

- **`environment` is gone from `CreateApiKeyParams`.** The Server refuses it now (400).
- **`AdminApiKey` is the row the listing serves.** The key's id is `keyId`; `id`, `environment`, `rateLimitTier`, `prefix` and `scopeProfile` were never on the row.
- **`admin.updateApiKey` and `toggleApiKey` resolve to `UpdateApiKeyResult`** (`id`, `isActive`, `scopes`, `scopeProfile`, `allowedIps`), not a whole key row.
- **`admin.getRateLimitExemption` is removed**: `GET /v1/admin/rate-limit-exemptions/{ownerId}` does not exist and every call was a 404. `listRateLimitExemptions` resolves to a page of owner ids, `setRateLimitExemption(ownerId, options?)` sends no body, and both writes resolve to `{ ownerId, exempt, nextSteps }`.
- **`admin.records.list` resolves to `Page<AdminRecordSummary>`**, the ten-field summary the route serves, not full `RecordRow`s.
- **`admin.createAgent` resolves to `CreateAgentResult`**, and `AdminAgent` loses `nextSteps`. `admin.getFleetCapabilities` rows are `{ agentId, displayName, contractTypes }`.
- **`admin.listDlq` rows are `AdminWebhookDlqEntry`, and `webhooks.listDlq` rows are `WebhookDlqEntry`** as each route serves them (`subscriptionId`, `eventId`, `eventType` or `type`, `errorMessage`, `attempts`).
- **`references.lookup` resolves to `Page<ReferenceLookupMatch>`** (`entityType`, `entityId`, `reference` per match) and takes `limit` and `cursor`.
- **`discovery.getLifecycle` resolves to `{ record, dispute }`**, each with `states` (valid transitions, actions, terminal) and its paths. `statuses`, `transitions` and `terminalStatuses` were never served.
- **`predicates.list` resolves to `{ data: [{ kind, predicateType, schemaUrl }] }`**, not `kinds`. **`predicates.get` resolves to the JSON Schema document itself**, and its version is the literal `v1`.
- **`federationAdmin.createPeeringToken` resolves to `peeringToken`** (with `label` and `createdAt`), not `token`. `FederationDlqEntry` is `{ id, data, createdOn, firstFailedAt, kind, peerHubId, recordId }`. `recoverDlq` takes `{ limit?, dryRun? }` and reports `inspected` and `dryRun`. `deletePeer` reports `peerHubId`.
- **Federation results match the wire**: `CoSignRequestResult` is `{ coSigned, counterSignature, serverTimestamp }`, and `SignalRelayResult` and `StateTransitionResult` carry `serverSignature`, `serverTimestamp`, `applied`, `reason` and `schemaRef`.
- **`HealthResponse` loses `uptime` and `database`, and `StatusResponse` loses `activeIncidents`.** `AuthCacheStats` is `{ size, max, ttl }`. `SupportBundle` is the sectioned document the route serves (`manifest`, `version`, `license`, `health`, `authCache`, `config`, `database`, `environment`, `guidance`). `LicenseInstanceInfo` loses `createdAt`. `ProvisioningReloadResult` loses its top-level `loadedAt`, which lives under `trustedIssuers`. `VerificationKeysResponse` loses `hashAlgorithm` and gains `envelope` and `payloadFormat`. `MetaSchema.limits.typeMaxLength` is `contractTypeMaxLength`. `uploadSupportBundle` resolves to `{ bundleId, receivedAt, sizeBytes }`.
- **The vault signing-key registry is typed as the Server sends it.** `VaultSigningKey` is `{keyId, algorithm, status, activatedAt, retiredAt, lastSignedAt}`; `id`, `publicKey`, `createdAt` and `rotatedAt` were never on the row. The ungated `GET /v1/verification-keys` (`VerificationKey`) is where an auditor gets key material. `admin.vault.signingKeys.rotate()` resolves to the new `VaultSigningKeyRotation` (`newKeyId`, `status: 'staged' | 'already_active'`, `activeKeys`, `nextSteps`).
- **`AuditExportEntry` loses `position`, `timestamp` and `actor`**, pre-0.25 aliases no current Server sends, and the `AuditActor` type with them. Read `chainPosition`, `createdAt` and the `actor*` fields.

### Fixed

- **A 401 the cert did not cause no longer triggers a re-exchange.** The Server also answers 401 for an `AGLedger-On-Behalf-Of` delegation token it cannot validate and for an `X-Agent-Signature` that does not verify. On a 401 to a cert bearer the client now makes one `GET /v1/auth/me` with the same cert: if that succeeds the 401 surfaces as the Server sent it, and only if it fails does the credential re-exchange and retry once.
- **A failed exchange at the refresh point keeps the current cert.** When the IdP is unreachable, or the Server answers 5xx, 429, 409 or anything else at a refresh ahead of expiry, the request goes out with the cert that is still valid and the next attempt waits a quarter of the cert's remaining lifetime, at least 1 second and at most 30. Only an exchange forced by a 401, or one after the cert has expired, fails the request.
- `IssueEphemeralCertParams.proofOfPossession` was documented as base64url; the Server requires standard base64 with `==` padding.

### Changed

- **An audit export re-attributed to another actor no longer verifies.** `verifyExport` runs on `@agledger/verify-core` 1.5.0, which cross-checks an entry's `actorId`, `actorRole` and `actorOwnerId` against the signature-covered actor claim in the COSE protected header and fails `CHAIN_ACTOR_ATTRIBUTION_MISMATCH` on a divergence. `result.optionalChecks.actor_attribution` says whether the check applied.
- `LICENSE` follows SDK License Template 1.9.

## [1.11.0] - 2026-09-10

Two things are gone from the Server and this release removes both without aliases: agent reputation, which agent drift replaced, and the dispute tier ladder, which a single principal rendering replaced. Commission, the peer agent-directory sync and proposal counter-offers went with them.

### Removed

- **`records.counterPropose` and `records.acceptCounter`**, with `CounterProposeParams`. Negotiation is propose, then accept or reject: a performer who wants different terms rejects and the principal creates the Record it means. `AcceptanceStatus` no longer names `COUNTER_PROPOSED`, and `record.proposal_counter_proposed` is no longer a webhook event type.
- **`disputes.escalate`, and the tier ladder behind it.** `DisputeStatus` is `EVIDENCE_WINDOW`, `PENDING_RESOLUTION`, `RESOLVED`, `WITHDRAWN`: the tier values (`TIER_2_REVIEW`, `ESCALATED`, `TIER_3_ARBITRATION`) are gone from the type, from `RecordRow.disputeStatus`, and from the `status` and `disputeStatus` query filters, where a retired value is a 400. `Dispute` loses `currentTier`, `feeChargedTo`, `feeAmount` and `feeCurrency`. `dispute.escalated` is no longer subscribable.
- **`PENDING_ARBITRATION` is gone from `RecordStatus`**, from `RECORD_TRANSITIONS` and `TERMINAL_STATUSES` in `record-lifecycle`, from `BackfillRecord.terminalStatus`, and from `RecordRow.awaitingActor`, which is now `principal`, `performer`, `system` or null. `DISPUTED` transitions to `FULFILLED` or `FAILED`. `federation.submitStateTransition` still accepts the label, because a peer on the previous version may still send it.
- **Commission is gone from every Record surface.** `RecordRow.commissionPct` and `commissionAmount`, `CreateRecordParams.commissionPct` (and the bulk item that extends it), `DelegateRecordParams.commissionPct`, and `SchemaRulesConfig.commissionSourceField` are removed.
- **`federation.syncAgentDirectory` and `federationAdmin.resyncPeer`**, with `AgentDirectorySyncParams`. `FederationPeer` loses `agentDirectoryHash` and `lastSyncAt`; reachability is `lastDeliveryAt` with `consecutiveDeliveryFailures`.
- **The peer handshake body is exactly five fields.** `PeerHandshakeParams` is `peerHubId`, `peerUrl`, `signingPublicKey`, `peeringToken` and `boundOrgId`, all required; `encryptionPublicKey` and `agentDirectory` are gone. The route is unauthenticated: the single-use peering token in the body admits the call. `PeerHandshakeResult` loses `serverEncryptionPublicKey`.
- **`FederationPeerStatus` no longer names `suspended`**, and `OpsSummary.federation.peers` loses its `suspended` counter. A peer is `active` or `revoked`.
- **`AiImpactAssessment.overseerName`.** The assessment records the oversight configuration, not a named individual.
- **`Scopes.DISPUTES_MANAGE`.** The Server has never had a `disputes:manage` scope, so a key request that named it was refused.

### Changed (breaking)

- **`client.reputation` is `client.drift`.** The Server no longer computes a reputation score, composite or confidence level. It serves drift: counts of what an agent did in the current window (records, completions, verdicts, accepted, rejected, overturned, acceptance rate, median completion time), the same counts for the window before it, and the difference. `drift.getAgent(agentId, { window?, type? })` reads one agent, overall and per type. `drift.listFleet({ window?, limit?, cursor? })` is the org-wide roll-up for an org-bound admin key, one row per agent; `drift.listAllFleet` walks it. `drift.getAgentHistory` is the per-record history that used to be `reputation.getHistory`, now with its filters typed. `ReputationScore` and `ReputationHistoryEntry` are gone; `AgentDrift`, `DriftBucket`, `DriftChange`, `FleetDriftRow`, `FleetDriftPage` and `AgentHistoryEntry` are the new types.
- **`Scopes.REPUTATION_READ` is `Scopes.DRIFT_READ`, and the string is `drift:read`.** The Server refuses `reputation:read` everywhere a scope is validated.
- **`federation.contributeReputation` and `federation.getAgentReputation` are removed**, with `ContributeReputationParams` and `FederationAgentReputation`.
- **`CreateAgentParams` no longer has `name`.** `POST /v1/admin/agents` accepts `displayName` only (unique within the org) and refuses `name`.
- **`ConformanceResponse.capabilities.reputationScoring` is `agentDrift`.**
- **Types that named fields the wire never carried are corrected.** `auth.rotateKey` resolves to `RotateKeyResult`, which has no `keyId` and does have `role`, `previousKeyDeactivated`, `previousKeyDeactivatesAt` and the new `expiresAt`. `ProvisioningStatus` is the shape the route serves (`configured`, `configPath`, `dryRun`, `prune`, `lastReloadAt`, `managed`, `loadErrors`, `pruneSuppressed`). `admin.reloadLicense` resolves to `LicenseInfo` and `admin.reloadProvisioning` to `ProvisioningReloadResult`; neither route returns a `reloaded` flag. `admin.deactivateOrg` and `admin.deactivateAgent` resolve to `DeactivateResult`.

### Added

- **`disputes.resolve(disputeId, { outcome, rationale? })`** (`POST /v1/disputes/{id}/resolve`), which replaces the tier ladder: the principal renders the outcome. `OVERTURNED` means the disputed verdict does not stand, so a Record that had FAILED settles at FULFILLED with the verdict re-rendered as accept (one already FULFILLED or REMEDIATED is restored to that terminal) and a RELEASE Settlement Signal follows carrying `reasonCode: DISPUTE_OVERTURNED`. `UPHELD` returns the Record to the status it held before the dispute and emits no signal. Accepted while the dispute is in `EVIDENCE_WINDOW` or `PENDING_RESOLUTION`; one already `RESOLVED` or `WITHDRAWN` is refused with 422. `DisputeOutcome` and `ResolveDisputeParams` are new. The path parameter is the dispute id, unlike every other dispute method on this resource, which takes the Record id: read it from `disputes.list()` or from `RecordRow.disputeId`.
- **`CreateRecordParams.maxRevisions`** (1-20): the rework cap for this Record. Omit it to inherit the org default `enforcement.defaultMaxRevisions` (3 unless the org set it). Immutable once the Record is created. Reaching the cap refuses the next resubmit with 422 and leaves the Record where it was. Bulk create takes it too.
- **`agents.list` and `agents.listAll` take `includeDeactivated`** via the new `ListAgentsParams`, and `AgentProfile` and `AgentDirectoryEntry` carry `deactivatedAt`. The default drops deactivated agents. The flag is bound into `nextCursor`, so set it before a walk starts.
- **Org config is typed.** `OrgConfig` has `config` (the overrides an operator stored, as `OrgConfigDocument`), `enforcement` (the values in force, as `EnforcementSettings`), `enforcementDefaults` and `enforcementSource` (per field, `org` or `default`). `SetOrgConfigParams` types the PATCH the same way, with every enforcement key nullable (`null` drops an override), plus the new `disputes.autoReadjudicate` (`toleranceExpansion`, `deadlineGraceSeconds`) and `enforcement.defaultMaxRevisions`. `approvedSuppliers` is a string array.
- **`CoSignStatus` is a named, exported union, and it knows `partial`**: some co-signers answered and some did not. `RecordRow.coSignStatus` and `settlementSignal.coSignStatus` both use it.
- **`EventType` gains `system.cascading_gate_enqueue_failed` and `system.verification_enqueue_failed`**, both queryable and neither subscribable.
- **`FederationDlqEntry.firstFailedAt`**: when the message first failed, as distinct from when the row was written.
- **`AgentHistoryEntry.status` is the `RecordStatus` union.**
- **`DisputeResponse` carries `nextSteps`.**
- **`admin.reactivateOrg` and `admin.reactivateAgent`** (`POST /v1/admin/{orgs,agents}/{id}/reactivate`). Idempotent: an already-active account returns `wasDeactivated: false`. Reactivation does not restore the keys deactivation revoked. `AdminOrg` and `AdminAgent` rows carry `deactivatedAt` and `managedBy`, and a provisioning-managed row refuses both verbs with a 409.
- **Agents can be bound to an external identity.** `CreateAgentParams` and `UpdateAgentParams` take `oidcIss` and `oidcSub` together (a half-set pair is refused), and `AgentProfile` reports them. With both set, `POST /v1/auth/oidc/cert` resolves the agent from a token carrying that issuer and subject. `UpdateAgentParams` also gains `agentCardUrl`, and `agentClass` is typed as the `AgentClass` union.
- **Trusted issuers can auto-provision agents.** `TrustedIssuer`, `CreateTrustedIssuerParams` and `UpdateTrustedIssuerParams` carry `autoProvisionAgents`, `autoProvisionScopeProfile` (an `AutoProvisionScopeProfile`, also the scope ceiling for every cert the issuer mints) and `autoProvisionMaxAgents`.
- **`ListApiKeysParams.expiresBefore` and `neverExpires`**: the rotation queue and the no-expiry inventory.
- **`RotateKeyResult.expiresAt`**: when the replacement key expires under an install-wide key lifetime cap. Rotation is not a way around the cap.
- **`LicenseInfo.source` knows `compact`**, the key form a Helm values file carries.
- **`ProvisioningReloadResult.apiKeys.generated[].keyId` and `.source`**: which key rows the reconcile created and whether the Server minted the material (`generated`, with a one-shot `apiKey` readout) or the YAML supplied it.
- **`AuditChainIntegrityReason` names `audit_vault_empty`**: the record exists but its chain holds no entries.

### Fixed

- **`ScopeProfiles` matches what the Server grants.** The three agent profiles gain `audit:read` and `compliance:read`, `agent-full` gains `drift:read`, `admin-standard` drops `admin:backfill` and `schemas:admin`, and `admin-iac` carries `schemas:write` in place of `schemas:admin`. The live source is `GET /v1/scope-profiles`.
- **`disputes.create` says what the create envelope carries.** The 201 is `{ dispute, autoReadjudication, nextSteps }` and the method returns the dispute; `autoReadjudication` (renamed from `tier1Result` on the wire) says whether the automatic re-check already resolved the dispute and, when it did not, why. Reach it with `client.request()` when that matters.
- **`federationAdmin.revokePeer` resolves to `{ revoked: true; nextSteps? }`.** The `remoteAgentsDeleted` count it used to carry is gone.

## [1.10.0] - 2026-08-30

Reconciled against API 1.6.0.

### Fixed

- **`compliance.streamAll` no longer drops audit events at a page boundary.** It used to rebuild `since` from the stream cursor, so a page boundary landing inside a group of rows written together skipped the rest of the group. Those events were never delivered and nothing reported a gap. The walk now sends the cursor back verbatim. Anyone forwarding audit events with `streamAll` should re-pull the window they care about: the rows are still on the Server.
- **A page yielding rows with no cursor to resume from raises `PaginationLimitError` rather than returning quietly.** A bound you set with `maxPages` still ends the walk quietly.
- **`WebhookEventType` is the set a subscription can fire on.** It named `record.settled`, `record.released` and `dispute.evidence_window_closed`, which `POST /v1/webhooks` has never accepted (a 400). Settlement outcomes reach subscribers as `signal.emitted` and `signal.received`. Removing them is a breaking type change for anyone who named one.
- **`EventType` is new, and carries the wider set** queryable on `GET /v1/events`, including the three removed above. Use it when filtering the event listing. It has no `*` member.
- **`audit.orgReadsCheckpoints.proof()` takes the leaf index as a number**, matching `OrgAdminRead.leafIndex`.
- **`compliance.stream` rejects a call that sends neither `since` nor `cursor`** with `ConfigurationError`, where it was a guaranteed 400.
- **A fractional `X-AGLedger-Stream-Holdback-Seconds` reads as null.**

### Changed

- **`AuditStreamParams.since` is optional and `cursor` is new.** Send one or the other: `since` opens a walk, `cursor` continues one. Passing both throws `ConfigurationError`.
- **`AuditStreamResult.hasMore` means "this page produced rows".** A short page is not the end of the stream, because the Server holds back rows from open transactions.
- **`AuditStreamResult.holdbackSeconds` is new.** Whole seconds by which the page stops short of now. `0` means the page runs up to the present; a large value means an empty page is not evidence that nothing has happened, so hold the cursor and keep polling. Null when the Server sends no header.
- **`FederationPeer` is the row the endpoint serves**: `peerId`, `peerHubId`, `peerUrl`, `status` and `createdAt`, plus optional `agentDirectoryHash`, `consecutiveDeliveryFailures`, `lastDeliveryAt`, `lastDeliveryError` and `lastSyncAt`. The previous `hubId`, `name`, `endpoint`, `publicKey` and `registeredAt` were never served.
- **`PeerHandshakeResult` is declared.** The 201 carries `peered` (always `true`), `peerId`, `peerHubId`, `status`, `serverSigningPublicKey`, `serverEncryptionPublicKey` and optional `nextSteps`. `peerHubId` is the identifier every `/federation/v1/admin/peers/{peerHubId}` path takes.
- **The federation peer methods name their parameter `peerHubId`.** `getPeer`, `revokePeer`, `resyncPeer` and `deletePeer` take it positionally, so no call site has to move.
- **`audit.orgReadsCheckpoints.list` returns the whole envelope**, including the `checkpointing` sweep schedule, `hasMore`, `nextCursor` and `total`, and takes `offset` and `cursor`.

### Added

- **`audit.orgReadsCheckpoints.listReads()`** for `GET /v1/audit/org-reads`, the read-transparency log entries the checkpoints cover, oldest first. Verify one against a checkpoint with `proof()`.
- **`events.list` and `events.listAll` take `until`**, returning events created strictly before that instant, plus `recordId` and `eventType`, via the named `ListEventsParams`.
- **`FederationPeerStatus` and `OrgReadsCheckpointingSource` are named types.**
- **`OpsSummary.vault.orgReadsCheckpoints`**: `cron`, `lastCheckpointAt` across all orgs, and `workerScheduled`.

## [1.9.0] - 2026-08-21

### Fixed

- **Enum members that named values the API has never had** (each a 400 when sent). `DisputeStatus` drops `OPENED` and `TIER_1_REVIEW`. `SchemaCompatibilityMode` is lowercase (`none`, `backward`, `forward`, `full`). `SchemaVersionStatus` is `ACTIVE | DISABLED`. `UpdateSchemaVersionParams` takes only `compatibilityMode`, and requires it; disabling a Type is `schemas.disable()`. `SubmitDisputeProtocolParams.action` is `DisputeProtocolAction` (exported) and `disputeStatus` is a dispute status.
- **Object query params are expanded into the API's bracket notation.** `search({ metadata: { state: 'blocked' } })` used to go out as `metadata=[object Object]` and fail with a 400, so metadata-filtered search never worked from this SDK.
- **A `Date` passed to a date-time query param** (`from`, `to`, `updatedAfter`, `updatedBefore`) serializes as ISO-8601.
- **`SearchRecordsParams.principalAgentId` is removed.** No record endpoint accepts it. On an agent key, `role: 'principal'` narrows the caller's own auto-scope to the Records it is principal on. On an admin or platform key `role` is a 400, so narrow with `performerAgentId` instead.
- **`AuditVaultExportParams.since` / `.until` are replaced by the `from` / `to`** the route takes. The type gains `recordId` and `agentId`, and `format` drops `'csv'`.
- **Pagination params match each route.** Methods take `LimitParams`, `CursorListParams`, or `ListParams` as appropriate, starting with `agents.list`/`listAll` (cursor only).
- **`CreateApiKeyParams.ownerType` and `AdminApiKey.ownerType` are `KeyOwnerType`** (`org | agent | platform`), not `ApiKeyRole`. `RateLimitExemption.ownerType` moves too, and `AccountProfile.ownerType` narrows from `string`.
- **`records.getChain` walks every page**, where it returned only the first (up to 1000 rows). `maxPages` caps the walk.
- **`records.getSubRecords` and `records.listProposals` take paging params**, and `records.listAllSubRecords` walks the listing.
- **`cursor` on every listing that accepts it**: `admin.getWebhookHealth`, `reputation.getHistory` and `ListTrustedIssuersParams`. `OffsetListParams` is deprecated.
- **`RateLimitError.retryAfter` reads the 429 body** (`retryAfterSeconds`) when the header is absent. The header still wins where both are present.
- **`Page` carries `nextSteps` and `recordRead`.**
- **`HealthResponse.uptime` and `.database` are deprecated**: `GET /health` has never sent them. Process uptime and database state are on `SystemHealth`.
- **`SystemHealth` matches the payload.** `database` is an object (`status`, `latencyMs`, `pool`); `cache` and `activeConnections` are gone; `status`, `degradedReasons`, `queues`, `webhookDeadLetters` and `process` are new. `status` reads `degraded` when the database cannot serve or anything is dead-lettered.
- **`OpsSummary` gains three blocks.** `system.degradedReasons`; `federation.peers.delivering`, `failing` and `neverDelivered`, which partition `active`; and `vault.anchoring`, the external-anchoring posture. `queues` is `Record<string, QueueCounts>`.
- **Nine types a caller can reach are now exported**: `QueueCounts`, `AuditChainFailure`, `AuditChainIntegrityDetail`, `AuditChainIntegrityReason`, `AuditSignatureCoverage`, `BackfillImportedRecord`, `FederationSchemaRef`, `SchemaKeywordWarning` and `WebhookSigningAlg`.

### Changed

- **An auto-paginating walk that hits the page ceiling throws `PaginationLimitError` instead of returning a prefix.** `paginate` used to stop at 100 pages and return, so a truncated walk looked complete. `compliance.streamAll` is treated the same. To walk a large listing, raise `limit` or pass a `maxPages` that fits it. A bound you set yourself (`maxPages`, `maxItems`) still ends the walk quietly.
- **`ListRecordsParams.role` and `SearchRecordsParams.role` are agent-key only**, and narrow to `'performer' | 'principal'` on the list params.
- **`npm run parity:refresh` regenerates the parity snapshots** from an OpenAPI spec (`--url` or `--spec`), and `parity:check` reports drift without writing.

### Added

- **Supersession.** `RecordRow.supersedesRecordId` (create-only, immutable, inside the create-time signature) and `supersededByCount` (above 1 is a fork, not an error), and `CreateRecordParams.supersedesRecordId` (and the bulk item). Pair it with `parentRecordId` for checkpoint-style patterns.
- **`SearchRecordsParams` gains `superseded`, `supersedesRecordId` and `criteria`**, plus `role`, `category`, `projectRef`, `hasDispute`, `disputeStatus`, `imported`, `source`, and `ref.system` / `ref.type` / `ref.id`. `criteria` filters on signed bytes; `metadata` filters on an unsigned annotation an offline verifier cannot see.
- **`CreateRecordParams.references` and `.share`**, typed by the new `EntityReferenceInput`, which `references.addRecordReferences` and `addAgentReferences` now take.
- **`ConformanceResponse.limits`**: the numeric caps this install enforces, including `cursorMaxLength`, `paginationLimitMax` and `searchCursorMaxLength`.
- **`recoveryHint` on bulk per-item results**, and **`AgledgerApiError.registryVersion`** for the `CONFLICTING_VERSION` 409.
- **`ListApiKeysParams`, and `admin.listAllApiKeys`.** `admin.listApiKeys` now takes the six filters the route accepts (`ownerId`, `orgId`, `ownerType`, `role`, `isActive`, `createdBefore`) and pages; an install with more than 200 keys used to report exactly 200 and call itself complete. `listAllApiKeys` walks the whole listing and resends the filters with each cursor.
- **`ListSchemasParams` and `ListPeersParams`**, with the `cursor` their routes declare, alongside `compliance.listRecords`.

### Removed

- **`EuAiActReport`.** No API route produces that shape.

## [1.8.0] - 2026-08-08

### Added

- **Multi-publisher schemas.** Two publishers offering the same `record_type` in one org is a supported state. Record creation then refuses a bare `type` with `422 /problems/ambiguous-publisher`, listing the candidates.
  - `CreateRecordParams.publisher` pins which registration of `type` a Record binds to; each item of a bulk create can pin its own. `BackfillRecord.publisher` is the import-side counterpart.
  - `RecordRow.publisher` reports the binding actually used. `null` means a federation-received Record that was judged by the originator against its own registration: ask the originator.
  - `AgledgerApiError.publishers` carries the candidate labels, and `AgledgerApiError.type` carries the RFC 9457 problem URI. Branch on `type`, not on message text. Per-item bulk failures carry `problemType` and `context`.
  - Schema methods take a `publisher` option: `get`, `delete`, `getRules`, `getTemplate`, `getVersions`, `getVersion`, `updateVersion`, `disable`, `enable`, `validateCompletion`, `diff` and `exportSchema`. `schemas.list()` returns one row per (publisher, type).
  - **`schemas.getManifest()`** for `GET /v1/schemas/{type}/manifest`, returning the canonical manifest plus its `manifestDigest`.
  - `schemaUrl` on a Record and on `completionHint` carries `?publisher=` whenever the publisher is known; single-publisher orgs get `?publisher=local` where they used to get a bare path. Follow it verbatim rather than rebuilding it from `type`.
  - Pinning `publisher` against a Server older than API 1.8.0 is rejected as an unknown body field.
- **`WebhookSigningAlg`** replaces the inline `'hmac' | 'ed25519'` union and adds `ecdsa-p256-sha256`. Read `capabilities.signingAlgorithms` from `getConformance()` rather than assuming a Server offers `ed25519`.
- **`unsupported_algorithm`** on `AuditChainIntegrityReason` and `AuditChainFailure`: an entry signed under a COSE algorithm the Server cannot verify. Not a tamper signal. Check `minVerifierVersion` on the key.
- **`VaultCheckpointingSchedule`**, returned by `audit.vaultCheckpoints.list()` and on `VaultScanResult.checkpointing`. An empty checkpoint list on a fresh install means the first sweep has not run yet.
- **`SchemaKeywordWarning`** on `SchemaPreviewResult` and `SchemaVersionDetail`: keywords in a submitted schema that are ignored, usually a misspelling such as `maxLenght`.
- **`ProvisioningStatus.loadErrors`**: provisioning files that cannot be loaded. This list is the only signal that config-as-code is partially applied.
- **`VerificationKeysResponse.coseAlgorithm`**, and `signatureAlgorithm` is nullable. Both describe the active key only.
- Twenty-three error-body fields now modelled, including the dispute-cap set (`disputeCount`, `maxDisputes`, `openDisputeId`, `disputeableWhen`, `currentStatus`), the schema-conflict digests (`existingDigest`, `incomingDigest`, `localDigest`, `peerDigest`), and `jobId`, `terminalReason`, `migratedTo`, `signInputTemplate`.
- **`SignatureAlgorithmUnavailableError`**, carrying the `algorithm` that could not be computed.

### Fixed

- **A FIPS-locked receiver no longer rejects every legitimate webhook as forged.** The FIPS provider carries no EdDSA, so verifying an ed25519 delivery threw inside `verifyRfc9421`, was caught and returned as `false`, and every documented caller turned that into a 401. `verifyRfc9421` and `constructEventRfc9421` now throw `SignatureAlgorithmUnavailableError` when the host cannot compute the key's algorithm. On such a host no ed25519 delivery can be classified, valid or forged, so do not read the exception as evidence a delivery was legitimate. On every other host, bad deliveries still return `false`.
- **Four methods claimed to return a bare array and returned a `Page` envelope**: `discovery.getScopeProfiles()`, `admin.vault.anchors.list()`, `admin.vault.signingKeys.list()` and `admin.listRateLimitExemptions()`. All four now return `Page<T>`.
- **`admin.vault.anchors.list()` requires `recordId`**: `list(params: { recordId: string })`.
- **`admin.records.import()` returns the real shape**: `AdminImportRecordsResult` is `{ source, count, imported[] }`, each entry `{ index, recordId, chainPosition }` aligned with the request. Its doc now names the correct role: the route is platform-tier and answers an org admin key with a 403.
- **`AccountProfile.agentId` is removed**; `GET /v1/auth/me` has never returned it. The agent id is `ownerId` when `ownerType === 'agent'`. `AccountProfile` gains `expiresAt` and `allowedIps`.
- **`schemas.delete()` returns `SchemaDeleteResult`** (`type`, `publisher`, `versionsDeleted`) instead of `void`. On an ambiguous type, rows under the other publisher survive.
- **`AgledgerApiError` carries `pinnedRecords` and `unattributableRecords`**, the two counts that say why a schema delete was refused.
- `ApiErrorResponse.docUrl` is deprecated: no route emits it.
- `AuditChainFailure` gains `signature_invalid`, `signing_key_unknown` and `signing_key_drift`.
- `VaultScanState` no longer claims `expired`, adds `cancelled` and `retry`, and is open-ended. Branch on `completed` and `failed`, and treat anything else as still running.
- `RecordRow.schemaUrl` is `string | null`: null on a federation-received Record whose schema this Server does not hold.
- `TypeSchema` carries the full row the Server sends, including `publisher`, `manifestDigest`, `trustClass`, `federatable`, `defaultShare`, `coSignRequired`, `flipRecordStatusOnDispute` and `federateDisputes`; `displayName`, `description`, `category` and `defaultGateMode` are nullable; `quickStart` is nullable.
- `schemas.getRules()`, `disable()` and `enable()` return `SchemaRulesResult` and `SchemaLifecycleResult`, which carry `publisher` and the other fields the Server sends. `SchemaExportResult.publisher` reports what was exported.
- Public types that a method returned but a caller could not name are now exported from the package entry point, including `SchemaDeleteResult`, `SchemaScopeOptions`, `SchemaManifestExport`, `VaultCheckpointPage` and `VaultCheckpointingSchedule`.

### Changed

- **`verifyRfc9421` can now throw**, where before it only returned a boolean. The standard `if (!ok) return 401` becomes an unhandled rejection on a host that cannot compute the algorithm, which can terminate the process on Express 4 or plain `http` under Node's default. The README and JSDoc examples now show the `catch`.
- The build no longer emits source maps, which pointed at files the tarball does not ship.
- Documentation: the resource table named `client.discovery.conformance()`; the method is `getConformance()`.

## [1.7.0] - 2026-08-07

### Changed

- **`baseUrl` is now required.** The client used to fall back to a placeholder host that resolves nowhere, so every call failed with a generic network error. Omitting it now throws `ConfigurationError` at construction.
- **`ConnectionError` names the request and the underlying cause**: the method, the full URL, and the cause code (`ENOTFOUND`, `ECONNREFUSED`, and so on) or message.
- **`CHAIN_KEY_NOT_YET_ACTIVE`** is reported by the `/verify` subpath for an entry written before its signing key's activation; `CHAIN_KEY_EXPIRED` now means the retirement side only. `FailureCode` gains a member, so exhaustive switches need the new case. Verdicts are unchanged. (Via `@agledger/verify-core` 1.3.0.)

### Added

- **`ConfigurationError`**, raised when the client is constructed with unusable options.

### Fixed

- The README Quick Start now runs: it reads the performer id from the environment and uses `criteria` and evidence shapes that validate against the seeded `principal-gate-generic-v1` contract.

## [1.6.0] - 2026-08-05

ES256 verification across the SDK's offline and webhook surfaces. Ed25519 paths are unchanged.

### Added

- **`/verify` subpath verifies ES256 chains** via `@agledger/verify-core` 1.2.0. Algorithms past this build still fail closed as `CHAIN_UNSUPPORTED_ALGORITHM`.
- **`verifyRfc9421` / `constructEventRfc9421` accept `ecdsa-p256-sha256` deliveries** from Servers signing with a P-256 vault key. The algorithm is dispatched from the resolved key's type; the delivery's `alg` parameter is asserted against it, never trusted.
- **`VerificationKey` carries `coseAlgorithm` and `minVerifierVersion`**; `publicKeyRaw` is optional (present only on Ed25519 keys).
- **`ConformanceResponse.capabilities.signingAlgorithms`**, the algorithms the Server can sign chain envelopes with. The capabilities index signature widens to `boolean | string[] | undefined` to admit it.

### Fixed

- **`verifyRfc9421` rejected every delivery older than about a second.** The replay window is now the symmetric `[-t, +t]` the HMAC path enforces (default 300 seconds). The old behaviour failed closed, but was unusable behind any real latency.

## [1.5.0] - 2026-08-05

### Changed

- **`/verify` takes `@agledger/verify-core` `^1.1.0`.** Algorithm dispatch binds to the trusted verification key rather than the unverified protected header: a tampered or missing header `alg` fails as `CHAIN_ALG_MISMATCH`, a key algorithm beyond the build fails closed as `CHAIN_UNSUPPORTED_ALGORITHM`, the signature-covered kid is cross-checked against `signingKeyId` (`CHAIN_SIGNING_KEY_DRIFT`), untagged COSE_Sign1 is rejected, and an all-zero signature on a key-claiming entry fails under `requireKeyId` / `requireOutOfBandKeys`. Legitimate Ed25519 exports verify identically. `FailureCode` and the per-entry `signature` state are wider; exhaustive switches need the new members.

## [1.4.0] - 2026-08-01

Tracks API 1.3.4. Type-only; no wire or runtime change.

### Added

- `ComplianceExport.truncated` and `.totalRecords`. The org-wide export is capped at 10000 rows, newest first; before this a truncated export looked complete. On a download the same answer rides the `X-AGLedger-Export-Truncated` and `X-AGLedger-Export-Total-Records` headers, the only carriers for a `csv` download.
- `ComplianceExport.nextSteps`.
- `VaultCheckpoint.chain` plus the `VaultCheckpointChain` union (`'record' | 'schema' | 'admin'`). Only `chain: 'record'` is keyed by a real record id; on the other two, `recordId` is a derived key that resolves to no record.
- `ExpressionHelperDoc`, exported from the package root along with `VaultCheckpointChain`.

### Changed

- **`MetaSchema.expressionHelpers` is `Record<string, ExpressionHelperDoc>`, was `string[]`**, with a `signature` and `semantics` per helper. `daysBetween` counts whole elapsed 24-hour periods between UTC instants (floored, order-independent) rather than calendar days. Code that iterated the old array needs `Object.keys(...)`.

### Fixed

- **`VaultCheckpoint` no longer demands `signature` and `signatureAlg`**, which the endpoint never returned, so a real checkpoint row typechecks without a cast. `ListVaultCheckpointsParams` is `recordId` / `cursor` / `limit`; it no longer advertises an `offset` the route does not implement.

## [1.3.3] - 2026-07-20

Tracks API 1.3.3. Type-only; no wire or runtime change.

### Added

- **`VaultScanResult.globalChains`**. A full vault scan walks the record-less chains (the platform-ops `admin` chain and each org's `schema`-registration chain) and reports them (`total`, `verified`, `broken`, `signatureErrors`, `brokenChains`, `brokenChainsTruncated`). A break there folds into `result.healthy`. New types `VaultScanGlobalChains` and `VaultScanBrokenChain`.

## [1.3.2] - 2026-07-16

Documentation only.

### Fixed

- The README Quick Start no longer fails at runtime: it now uses `principal-gate-generic-v1`, which has the completion and verdict phases the walkthrough exercises, instead of the notarize-only `notarize-generic-v1`.
- The licensing description is corrected: the database is the license line. Every feature and topology, federation and multi-node included, is free on the bundled database; only an external or managed database requires an Enterprise license.

## [1.3.1] - 2026-07-13

### Changed

- **`SignedStatement.signedAt` is optional** (`signedAt?: string | null`), so a 1.3.x SDK pointed at an older Server that does not return the field still typechecks.

## [1.3.0] - 2026-07-13

Tracks AGLedger API 1.3.2. The route surface is unchanged; the delta is additive response fields, a new event type, and a new audit-export option.

### Added

- **`SignedStatement.signedAt`**: the signed instant of the head Signed Statement (the CWT `iat` claim, second precision), the authoritative timestamp for time-anchored contracts. Nullable.
- **`VerdictResult.recordStatus`**: the settled record status (`FULFILLED` on accept, `FAILED` on reject) returned inline on `records.submitVerdict()`.
- **`record.gate_held` webhook event**: a principal-mode record held at PROCESSING awaiting the verdict emits this event, with the `completionId` to verdict against. Added to `WebhookEventType`.
- **`records.getAuditExport(id, { evidence: true })`** inlines the completion evidence body at each COMPLETION_SUBMITTED entry (`AuditExportEntry.evidence`). It is an unsigned projection the chain binds by hash via `payload.evidenceHash`. JSON/NDJSON only.
- **`ApiErrorResponse.deadline`**: the passed record deadline on the system TIME_OUT 422.
- **`AuditChainIntegrityReason`** gains `signature_invalid`, `signing_key_unknown`, `signing_key_drift`.

## [1.2.0] - 2026-07-06

Tracks AGLedger API 1.2.0. The route surface is identical; the delta is additive, and this release replaces a schema-import surface that could not work against any shipped API.

### Added

- **Webhook `recordTypes` filter**: `webhooks.create()` and `webhooks.update()` accept `recordTypes`, and the `Webhook` row carries it back. `["*"]` means all record types; any other array means record-scoped events are delivered only for the listed types. Omit for no filter.
- **`records.accept(id, message?)`**: optional acceptance rationale, symmetric with `reject()`. `reason` and `notes` are wire-level aliases of `message` on all four handshake endpoints.
- **`SchemaFieldMapping.maxTolerance`**: per-rule cap on the per-record tolerance. `0` forbids any tolerance; a positive value pins the widest band a record may declare; omitted means uncapped.
- **`rulesConfig` echoed on schema writes**: `schemas.register()`, `schemas.import_()`, `schemas.updateVersion()` and `getVersions()` rows carry the compiled `rulesConfig`. New type `SchemaRulesConfig`.

### Fixed

- **`schemas.import_()` now works.** It used to send a schema export bundle, which the API rejected with 400 on every call. It takes a `SchemaManifest` plus row-only options (`SchemaImportParams`: `orgId`, `federatable`, `defaultShare`, `defaultGateMode`, `coSignRequired`, `flipRecordStatusOnDispute`, `federateDisputes`) and returns the created or existing `SchemaVersionDetail` row (200 on an idempotent re-post, 201 on create).
- **`SchemaVersionDetail` matches the wire**, including `publisher`, `manifestDigest`, `trustClass`, `federatable`, `defaultShare`, `defaultGateMode`, `coSignRequired`, `flipRecordStatusOnDispute`, `federateDisputes`, `rulesConfig`, `quickStart` and `nextSteps`. The fictional `isBuiltin` is gone.
- `SchemaExportResult.nextSteps` added; the README names `exportSchema()` correctly.

### Removed

- **`schemas.previewImport()` and the `dryRun` option.** The API has no dry-run on `/v1/schemas/import`. Use `schemas.preview()` to validate locally authored schemas.
- Types `SchemaImportPayload`, `SchemaImportResult`, `SchemaImportDryRunResult`, `ImportSchemaOptions` (replaced by `SchemaManifest` + `SchemaImportParams`).

## [1.0.6] - 2026-06-29

### Changed

- Documentation wording.

## [1.0.5] - 2026-06-29

Tracks AGLedger API 1.1.0. Field- and doc-level changes only; all backward-compatible.

### Added

- **`Completion.settlementSignal`**: the auto-gate's settle, hold or reject decision on a submitted Completion (`CompletionSettlementSignal`: `recommendation`, `outcome`, `reasonCode`). Null when the gate did not render inline (encrypted Records, principal mode held awaiting a verdict, or skipped).
- **`schemas.list()` returns typed catalog rows** (`Page<SchemaListItem>`), including **`defaultGateMode`**, which tells a gated type from a notarize-only one.

### Changed

- `reasonCode` docs note the new `AUTO_SETTLE_WITHIN_TOLERANCE` value: an auto-settle that cleared only via a non-zero tolerance band.
- Gate-mode docs say that in auto mode the principal's pre-configured predicates settle the record; AGLedger holds the signed decision.
- The licensing section points at the pricing page for current terms.

## [1.0.4] - 2026-06-22

Tracks AGLedger API 1.0.3. All additions are backward-compatible.

### Added

- **`records.get(id, { integrity: true })`** re-verifies the Record's audit chain and cross-checks the served row against it. The result is on `RecordRow.integrity` (`RecordIntegrity`: `verified`, `integrityLevel`, `reason`, `entries`, `projectionChecked`, `driftFields`).
- **`records.list({ actionable: true })`**: every Record whose next action awaits the caller's structural side, across all statuses. Agent keys only.
- **`auth.rotateKey({ gracePeriodSeconds })`**: keep the old key valid for an overlap window.
- **`compliance.export({ embed })`**: inline cryptographic evidence (currently `signed-statements`) into the export packet so a regulator can verify each claim offline.
- New types: `RecordIntegrity`, `GetRecordParams`, `RotateKeyParams`.

### Changed

- `records.get` is now `get(id, params?, options?)`. Source-compatible for single-argument call sites.
- `admin.createOrg()` is documented as dev/test-only: `POST /v1/admin/orgs` is not registered in production. Provision production orgs from operator `provisioning/` YAML.

## [1.0.3] - 2026-06-20

### Changed

- Bumped `@agledger/verify-core` to `^1.0.0`. No SDK-surface or behavior changes.

## [1.0.2] - 2026-06-18

### Fixed

- Replaced a regex-based trailing-slash strip with a linear scan, removing a polynomial-backtracking vector. No public-API or behavior change.

## [1.0.1] - 2026-06-10

### Changed

- `LICENSE` and README trademark text updated to the current license template. No code changes.

## [1.0.0] - 2026-06-08

General availability, tracking AGLedger API 1.0.0. No breaking changes from the 0.8.x line.

### Added

- `WebhookEventType`: `record.proposal_counter_proposed`, `record.ai_impact_assessment_filed`, `record.compliance_attestation_filed`.
- `DisputeGrounds`: `verdict_disagreement`.
- `defaultGateMode?: GateMode` on `TypeSchema`, `RegisterSchemaParams`, and `SchemaPreviewInput`: the per-contract-type default gate mode. Registering a type with `defaultGateMode: 'principal'` propagates to a created record's `gateMode`.

Releases before 1.0.0 are listed on npm (https://www.npmjs.com/package/@agledger/sdk?activeTab=versions).
