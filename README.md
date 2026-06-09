# @agledger/sdk

The official TypeScript SDK for [AGLedger](https://agledger.ai) -- accountability infrastructure for AI agents. The Layer 3 accountability layer of the agent stack.

Two runtime dependencies, each used only by an opt-in entry point: `cborg` (COSE_Sign1 decoding in `@agledger/sdk/verify`) and `http-message-signatures` (RFC 9421 ed25519 webhook verification in `@agledger/sdk/webhooks`). The core client has none beyond `fetch`. TypeScript strict. Requires Node.js 24+ (also runs on Deno and Bun).

**Learn more**

- [agledger.ai](https://agledger.ai) — what AGLedger is and why Layer 3 accountability matters
- [How it works](https://agledger.ai/how-it-works) — the four-endpoint lifecycle: record, completion, verdict, fulfill
- [Glossary](https://agledger.ai/glossary) — canonical definitions of Record, Completion, SCITT Receipt, Verdict, Settlement Signal
- [Documentation](https://agledger.ai/docs) — installation, integration guides, API reference

## Why AGLedger?

Enterprises deploying AI agents need to know what each agent was asked to do, what it actually did, and whether the result met expectations. AGLedger provides the accountability record -- what was agreed to, by whom, when, and the delegation of that agreement through other systems.

- Record what was asked and who it was delegated to (Records)
- Capture what was reported to be done (Completions)
- Capture the principal's accept/reject verdict on the result (the Gate)
- Track agent reliability across your organization over time (reputation)

## Vocabulary

A **Record** (formerly Mandate) is a registered commitment between a principal and a performer. A **Type** (formerly Contract Type) is the versioned JSON Schema defining a Record's shape. The rename happened in API v0.21 / SDK 0.7.0 — the underlying state machine and audit chain are unchanged. A **Completion** is the performer's evidence submission (renamed from Receipt → Completion in 0.8.0 to align with SCITT vocabulary, where "Receipt" is reserved for the cryptographic Merkle inclusion proof).

## Get Started

AGLedger is self-hosted. You deploy it on your own infrastructure.

1. Deploy AGLedger ([install guide](https://agledger.ai/docs/guides/self-hosted/install))
2. Get your API key from your instance
3. Install the SDK: `npm install @agledger/sdk`
4. Follow the Quick Start below

## Quick Start

```typescript
import { AgledgerClient } from '@agledger/sdk';

const client = new AgledgerClient({
  apiKey: process.env.AGLEDGER_API_KEY!,
  baseUrl: process.env.AGLEDGER_EXTERNAL_URL!, // your AGLedger instance URL
});

// Create a Record (what the agent is being asked to do).
// An agent key defaults principal to itself; an admin key must name a
// principal via `principalAgentId` (or implicitly via `performerAgentId`
// for a self-commitment).
const record = await client.records.create({
  type: 'notarize-generic-v1', // a contract type you registered (or an auto-seeded sample)
  contractVersion: '1',
  platform: 'internal-etl',
  performerAgentId: 'agt-123',
  criteria: {
    description: 'Nightly warehouse export',
    output_format: 'parquet',
    row_count_min: 500_000,
  },
});

// Activate the Record
await client.records.transition(record.id, 'register');
await client.records.transition(record.id, 'activate');

// Submit a completion (what the agent reported back)
const completion = await client.completions.submit(record.id, {
  evidence: {
    deliverable: '/data/exports/2026-03-10.parquet',
    deliverable_type: 'file_ref',
    row_count: 487_231,
  },
});

// Run the gate evaluation against the original criteria (advisory in
// `principal` mode; the principal then submits the accept/reject verdict).
const result = await client.gate.evaluate(record.id);

// Every Record response carries a `signedStatement` so a notarize-only caller
// can confirm the chain head without a follow-up audit-export call.
console.log(record.signedStatement?.chainPosition, record.signedStatement?.leafHash);
```

## Configuration

```typescript
const client = new AgledgerClient({
  // Required
  apiKey: 'your_api_key',

  // Your AGLedger instance URL (required for self-hosted deployments)
  baseUrl: 'https://agledger.internal.example.com',

  // Retry configuration
  maxRetries: 3,        // default: 3
  timeout: 30_000,      // default: 30s

  // Idempotency key prefix
  idempotencyKeyPrefix: 'my-app-',
});
```

Set `AGLEDGER_EXTERNAL_URL` in your environment to avoid hardcoding the URL:

```bash
export AGLEDGER_API_KEY=agl_agt_...
export AGLEDGER_EXTERNAL_URL=https://agledger.internal.example.com
```

## Features

- **Stripe-style client** with resource sub-clients (`client.records`, `client.completions`, etc.)
- **Automatic retries** with exponential backoff + jitter for 429/5xx errors
- **Idempotency keys** auto-generated for all mutating requests, plus per-item `idempotencyKey` on bulk-create for replay-safe high-volume ingest
- **Auto-pagination** via async iterators
- **Webhook signature verification** (separate import to keep browser bundles lean)
- **TypeScript-first** with full type coverage and forward-compatible enums
- **RFC 9457 problem-details** error surface — `recoveryHint` and `refreshUrl` on 422 INVALID_ACTION steer agents back to the correct corrective endpoint
- **`client.request()` escape hatch** for unmodeled or new endpoints — pass method + path + body and get back the API response untouched

## Resources

| Resource | Description |
|----------|-------------|
| `client.records` | Create, search, transition, delegate, fetch Records, and submit the principal verdict (`submitVerdict`) |
| `client.completions` | Submit and manage performer evidence (formerly `receipts`) |
| `client.gate` | Run the gate evaluation (`evaluate`) against a Record's criteria (advisory in `principal` mode, final in `auto`) |
| `client.scitt` | SCITT/SCRAPI entries (`register`, `get`) and Transparency Service key set |
| `client.predicates` | Predicate JSON Schema discovery (`list`, `get(kind)`) |
| `client.disputes` | List, file, escalate, and resolve disputes |
| `client.webhooks` | Manage webhook endpoints and deliveries |
| `client.reputation` | Query agent health scores and history |
| `client.events` | List audit events |
| `client.schemas` | Browse, register, version, disable/enable, and validate against Type schemas |
| `client.compliance` | Compliance exports, EU AI Act assessments, SIEM stream |
| `client.audit` | Org-admin reads checkpoints (SCITT-style signed tree heads) |
| `client.auth` | `GET /v1/auth/me` + key rotation |
| `client.discovery` | Unauthenticated metadata — scope profiles, protocol conformance (`conformance()`), Record lifecycle |
| `client.health` | Instance health and status |
| `client.admin` | Admin operations (org + agent + API-key provisioning, vault, DLQ, system health, plus `admin.records.{list, import}` and `admin.vault.{anchors, scan, signingKeys}`) |
| `client.a2a` | A2A Protocol support (AgentCard, JSON-RPC 2.0) |
| `client.capabilities` | Agent Type capability management |
| `client.federation` | Federation peer operations (peer handshake, state transitions, signals, co-sign, disputes, reputation) |
| `client.federationAdmin` | Federation server administration (peers, DLQ, peering tokens, instance identity) |
| `client.agents` | Agent identity and references |
| `client.references` | Cross-system reference lookups (Record + agent surfaces) |
| `client.verificationKeys` | Public signing-key set for offline audit verification |

## Types (formerly Contract Types)

There are **no built-in Types** — an org owns its entire type namespace (no reserved prefixes). A Type is a versioned JSON Schema you register that defines a Record's criteria/completion shape and gate rules; the API validates each Record server-side against it.

Every new org is auto-seeded (best-effort, idempotent) with four **editable** sample Types you can use as-is, edit, rename, or delete:

| Seeded sample | Shape |
|------|-------|
| `notarize-generic-v1` | Notarize-only (the on-ramp); terminalizes at RECORDED on create, no completion phase |
| `principal-gate-generic-v1` | Completion + principal-rendered verdict (pairs with Notify webhooks) |
| `terminal-outcome-v1` | Auto-gate child of the two-record pattern (gate on `terminalState`) |
| `delegated-workflow-v1` | Delegation-chain root; notarize-only, multi-agent via `parentRecordId` |

The canonical set for your org is always `client.schemas.list()` (empty on a fresh install if the samples were deleted). Register and manage your own Types via the Schema Development Toolkit (`client.schemas.register()`, `preview()`, `import_()`, `export()`, `disable()`/`enable()`).

## Pagination

All list methods return `Page<T>`:

```typescript
// Single page
const page = await client.records.list({ status: 'ACTIVE' });
console.log(page.data);    // RecordRow[]
console.log(page.hasMore); // boolean
console.log(page.total);   // number | undefined

// Auto-pagination with async iterator
for await (const record of client.records.listAll({ status: 'ACTIVE' })) {
  console.log(record.id);
}
```

## Error Handling

```typescript
import { AgledgerApiError, NotFoundError, RateLimitError, UnprocessableError } from '@agledger/sdk';

try {
  await client.records.get('rec-nonexistent');
} catch (err) {
  if (err instanceof NotFoundError) {
    console.log('Record not found');
  } else if (err instanceof RateLimitError) {
    console.log(`Rate limited. Retry after ${err.retryAfter}ms`);
  } else if (err instanceof UnprocessableError) {
    // 422 INVALID_ACTION carries machine-readable corrective guidance.
    console.log(err.recoveryHint); // "GET /v1/records/{id} and read nextActions..."
    console.log(err.refreshUrl);   // "/v1/records/rec-123"
  } else if (err instanceof AgledgerApiError) {
    console.log(err.status);           // HTTP status
    console.log(err.code);             // Machine-readable code
    console.log(err.retryable);        // Can this be retried?
    console.log(err.validationErrors); // Field-level details
  }
}
```

Error classes: `AuthenticationError`, `PermissionError`, `NotFoundError`, `ValidationError`, `UnprocessableError`, `RateLimitError`, `ConnectionError`, `TimeoutError`.

## Webhook Verification

Webhooks ship in two signing schemes, selected per subscription via `signingAlg`:

**HMAC** (`signingAlg: 'hmac'`, the default) — shared-secret HMAC-SHA256:

```typescript
import { verifySignature } from '@agledger/sdk/webhooks';

const isValid = verifySignature(
  rawBody,                    // Raw request body string
  req.headers['x-agledger-signature'], // Signature header
  process.env.WEBHOOK_SECRET!, // Your webhook secret
);
```

**Ed25519** (`signingAlg: 'ed25519'`) — RFC 9421 HTTP Message Signatures signed
with the Server's vault key. The receiver holds no secret and verifies against
the Server's published public key, giving non-repudiation for the Settlement
Signal hop. Settlement-event subscriptions default to this when the Server has a
vault signing key.

```typescript
import { verifyRfc9421 } from '@agledger/sdk/webhooks';

// Resolve the Server's published keys once (cache them); the delivery's
// `keyid` is matched against them automatically.
const { data: keys } = await client.verificationKeys.list();

const isValid = await verifyRfc9421(
  req.headers, // must include content-digest, signature-input, signature, x-agledger-idempotency-key
  rawBody,     // raw request body string
  keys,        // or a single base64 public key string
);
```

`verifyRfc9421` recomputes the RFC 9530 Content-Digest over the body, reconstructs
the RFC 9421 signature base, verifies the Ed25519 signature, and enforces the
`created` replay window (default/max 300s). `constructEventRfc9421` verifies and
parses in one step. This path uses `http-message-signatures` for the canonical
serialization.

## Offline Audit Export Verification

Verify a Record's hash-chained, Ed25519-signed audit export without calling the API:

```typescript
import { verifyExport } from '@agledger/sdk/verify';

const exportData = await client.records.getAuditExport('REC_123');
const result = verifyExport(exportData);

if (!result.valid) {
  console.error(
    `Broken at position ${result.brokenAt?.position}: ${result.brokenAt?.code}`,
  );
}
// { valid: true, verifiedEntries: 12, totalEntries: 12, entries: [...] }
```

Decodes canonical COSE_Sign1 envelopes (RFC 9052, tag 18, EdDSA), walks the hash
chain, and verifies the Ed25519 signature over each `Sig_structure`. Format 2.0
(was 1.0 JCS + detached Ed25519). `brokenAt.code` is a canonical SCREAMING_SNAKE
`FailureCode` (e.g. `CHAIN_HASH_MISMATCH`, `CHAIN_SIGNATURE_INVALID`).

This is a thin wrapper over [`@agledger/verify-core`](https://www.npmjs.com/package/@agledger/verify-core)
— the same body of logic the CLI `verify` command and the MCP `agledger_verify`
tool run, so a chain that passes here passes identically in all of them. Single
CBOR dependency (`cborg`); no network.

The export's embedded `signingPublicKeys` map is used by default. Pass
`{ publicKeys: {...} }` to supply keys out of band (from `GET /v1/verification-keys`
or `/.well-known/scitt-keys`) or to add keys that rotated out. Use
`{ requireKeyId: 'key-id' }` to reject exports signed by an unexpected key, or
`{ requireOutOfBandKeys: true }` for an independent audit that refuses to trust
the export's own embedded keys. `result.keyProvenance` reports how many
signatures were checked against out-of-band vs export-embedded keys.

## SCITT / SCRAPI

Register Signed Statements with the Transparency Service and retrieve Transparent
Statements (Signed Statement + Receipt(s)):

```typescript
const receipt = await client.scitt.entries.register(signedStatement);
// COSE_Sign1 Merkle inclusion proof per draft-ietf-cose-merkle-tree-proofs-18

const transparent = await client.scitt.entries.get(entryId);
// Transparent Statement: Signed Statement with one or more Receipts embedded

const keys = await client.scitt.keys.list();
// COSE_KeySet of the Transparency Service's signing keys
```

Wire format is binary `application/cose`. Errors surface as RFC 9290 CBOR
problem-details on `AgledgerApiError.rawBody`.

## Predicate Schemas

Fetch the canonical JSON Schemas for each predicate kind (record-state,
settlement-signal, vault-checkpoint, schema-event, org-read,
counter-attestation, federation-projection):

```typescript
const kinds = await client.predicates.list();
const schema = await client.predicates.get('settlement-signal');
```

## Attestation Export

Pull a Record's chain as a tagged COSE_Sign1 stream or as a sigstore-bundle v0.3.2
projection for Rekor / in-toto / sigstore-policy-controller ingest:

```typescript
const coseSequence = await client.records.getAttestation(recordId);
// application/cose-sequence bytes (tagged COSE_Sign1 stream)

const bundle = await client.records.getAttestationBundle(recordId);
// sigstore-bundle v0.3.2 projection
```

## Vault Checkpoints

Per-record signed Merkle anchors are emitted every 6 hours, letting an auditor
detect audit-vault TRUNCATE / DELETE tampering offline:

```typescript
const checkpoints = await client.audit.vaultCheckpoints.list({ recordId: 'REC_123' });
```

## Record Lifecycle

```
CREATED ──> ACTIVE ──> PROCESSING ──> FULFILLED
  │           │           │
  v           v           v
PROPOSED   EXPIRED    FAILED ──> REMEDIATED
  │        CANCELLED     │
  v                      v
REJECTED            REVISION_REQUESTED ──> PROCESSING (resubmit)
```

`RECORDED` is a terminal status for notarize-only Types — Records of a Type
that did not declare a completion phase land here at create.

## API Documentation

API documentation is available at your instance's `/docs` endpoint (Swagger UI).

## Licensing

AGLedger is **free for single-node deployments** (Docker Compose with bundled database). An Enterprise License ($8,000 one-time, per database instance) is required for external database connections, federation, and multi-node deployments. The license is perpetual -- production never stops due to licensing.

Full details: [agledger.ai/pricing](https://agledger.ai/pricing) | [License Agreement](https://agledger.ai/license)

## SDK License

Proprietary. Copyright (c) 2026 AGLedger LLC. All rights reserved. See [LICENSE](./LICENSE) for details.

AGLedger is a trademark of AGLedger LLC, and Settlement Signal is a pending trademark of AGLedger LLC. All other trademarks are the property of their respective owners. Patent pending.
