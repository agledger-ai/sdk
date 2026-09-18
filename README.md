# @agledger/sdk

The official TypeScript SDK for [AGLedger](https://agledger.ai): change control for AI agents. Agent memory, approvals, audit trail, and notifications: one API, one signed ledger, self-hosted.

Two runtime dependencies, each used only by an opt-in entry point: `@agledger/verify-core` (offline chain verification in `@agledger/sdk/verify`, and the signature primitives behind `@agledger/sdk/webhooks`) and `http-message-signatures` (RFC 9421 webhook verification in `@agledger/sdk/webhooks`). The core client uses `fetch` and `node:crypto`, nothing else. TypeScript strict. Requires Node.js 24+ (also runs on Deno and Bun).

**Learn more**

- [agledger.ai](https://agledger.ai): what AGLedger is and who needs it
- [How it works](https://agledger.ai/how-it-works): the record, completion, and verdict lifecycle
- [Glossary](https://agledger.ai/glossary): canonical definitions of Record, Completion, SCITT Receipt, Verdict, Settlement Signal
- [Documentation](https://agledger.ai/docs): installation, integration guides, API reference

## Why AGLedger?

Enterprises deploying AI agents need to know what each agent was asked to do, what it actually did, and whether the result met expectations. AGLedger provides the accountability record -- what was agreed to, by whom, when, and the delegation of that agreement through other systems.

- Notarize what was asked and who it was delegated to (Records)
- Capture what was reported to be done (Completions)
- Capture the principal's accept/reject verdict on the result (the Gate)
- See how each agent's activity moves from one window to the next (drift)

## Vocabulary

A **Record** is a registered commitment between a principal and a performer. A **Type** is the versioned JSON Schema defining a Record's shape. A **Completion** is the performer's evidence submission. A **SCITT Receipt** is the cryptographic Merkle inclusion proof that anchors a Signed Statement into a transparency log, which is a different object from a Completion.

## Get Started

AGLedger is self-hosted. You deploy it on your own infrastructure.

1. Deploy AGLedger ([install guide](https://agledger.ai/docs/install/))
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
  type: 'principal-gate-generic-v1', // a contract type you registered (or an auto-seeded sample)
  contractVersion: '1',
  platform: 'internal-etl',
  // Agent ids are uuids of agents you have provisioned, so there is no id you
  // can invent here: mint one with `POST /v1/admin/api-keys` using a platform
  // key, then read it from your config.
  performerAgentId: process.env.AGLEDGER_PERFORMER_AGENT_ID!,
  criteria: {
    // `summary` is the one field the seeded contract requires. The schema is
    // permissive (`additionalProperties: true`), so your own domain fields
    // ride alongside it.
    summary: 'Nightly warehouse export',
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
    // `summary` is required by the seeded completionSchema; the rest is yours.
    summary: 'Exported 487,231 rows to the nightly parquet target',
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
  // A credential is required: an API key, or `bearerToken` (see
  // "OIDC workload identity" below). Pass exactly one.
  apiKey: 'your_api_key',

  // Your AGLedger instance URL. Required: every deployment is self-hosted, so
  // there is no default. Omitting it throws ConfigurationError immediately.
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

## OIDC workload identity

An agent can authenticate with a token from your own identity provider instead
of a long-lived API key. Your operator registers the IdP once as a trusted
issuer (`client.admin.trustedIssuers.create()`, platform key); from then on the
agent exchanges an OIDC token for a short-lived AGLedger cert and presents the
cert on every request. `oidcCertCredential` does the exchange, refreshes the
cert before it expires, and re-exchanges once if a request is refused with 401:

```typescript
import { AgledgerClient, oidcCertCredential } from '@agledger/sdk';

const client = new AgledgerClient({
  baseUrl: process.env.AGLEDGER_EXTERNAL_URL!,
  bearerToken: oidcCertCredential({
    // Called on every exchange, and must return a fresh token each time: the
    // Server accepts each token id once. Here, your IdP's token endpoint.
    getOidcToken: async () => (await fetch(process.env.OIDC_TOKEN_URL!)).text(),
  }),
});

const me = await client.auth.getMe();
console.log(me.authType, me.cert?.expiresAt); // 'ephemeral_cert', the cert's expiry

// Record writes are signed by the key the cert is bound to, and the Server
// seals that signature into the chain entry.
const record = await client.records.create({
  type: 'notarize-generic-v1',
  criteria: { summary: 'Rotated the staging database credentials' },
});
console.log(record.signedStatement?.chainPosition);
```

`getOidcToken` must return a new token (a new `jti`) on every call: the
Server exchanges each token id once and refuses a repeat with 409. A source
that cannot mint on demand, such as a projected Kubernetes service-account
token read with `readFile(tokenPath, 'utf8')`, changes only when the kubelet
rotates it. When such a source hands back the token it already exchanged, the
credential keeps the current cert while that cert is valid and asks again
shortly after. Once the cert has expired, or a request made with it was
refused, a repeated token throws `OidcExchangeError` (409) saying so.

The credential generates one Ed25519 key pair in memory and never writes it
anywhere. Each exchange proves possession of that key, so the cert is bound to
this process. Pass `agentId` to bind the cert to a specific agent, and
`refreshFraction` (default `0.5`) to change how far into the cert's lifetime it
re-exchanges. Concurrent requests share one exchange. Because the credential
holds the cert's key, it signs every request body (`X-Agent-Signature` over the
SHA-256 of the exact bytes sent); the Server records that signature in the
chain entry for record create, transition and verdict, completion submit, and
A2A. A refused exchange throws `OidcExchangeError` carrying the Server's
`recoveryHint`, with the OIDC token scrubbed from anything that echoed it.

`bearerToken` also takes a plain string or a function. A function is called
before every request, retries included, and its result is sent as the bearer;
the client caches nothing. Use that form to send an admin OIDC token from your
IdP directly:

```typescript
import { AgledgerClient } from '@agledger/sdk';

const admin = new AgledgerClient({
  baseUrl: process.env.AGLEDGER_EXTERNAL_URL!,
  // Called before every request; the client caches nothing.
  bearerToken: async () => (await fetch(process.env.ADMIN_OIDC_TOKEN_URL!)).text(),
});
console.log((await admin.auth.getMe()).authType); // 'oidc'
```

If the operator turned on `jtiSingleUse` for that trusted issuer, the Server
accepts each admin token once per `jti`, so the function must mint a new token
on every call instead of returning a cached one. A token without a `jti` stays
reusable either way.

## Features

- **Stripe-style client** with resource sub-clients (`client.records`, `client.completions`, etc.)
- **Automatic retries** with exponential backoff + jitter for 429/5xx errors
- **API keys or OIDC workload identity**: `oidcCertCredential` exchanges your IdP's token for a short-lived cert, refreshes it, and signs request bodies
- **Idempotency keys** auto-generated for all mutating requests, plus per-item `idempotencyKey` on bulk-create for replay-safe high-volume ingest
- **Auto-pagination** via async iterators
- **Webhook signature verification** (separate import to keep browser bundles lean)
- **TypeScript-first** with full type coverage and forward-compatible enums
- **RFC 9457 problem-details** error surface: `recoveryHint` and `refreshUrl` on 422 INVALID_ACTION steer agents back to the correct corrective endpoint
- **`client.request()` escape hatch** for unmodeled or new endpoints. Pass method + path + body and get back the API response untouched

## Resources

| Resource | Description |
|----------|-------------|
| `client.records` | Create, search, transition, delegate, fetch Records, and submit the principal verdict (`submitVerdict`) |
| `client.completions` | Submit and manage performer evidence |
| `client.gate` | Run the gate evaluation (`evaluate`) against a Record's criteria (advisory in `principal` mode, final in `auto`) |
| `client.scitt` | SCITT/SCRAPI entries (`register`, `get`) and Transparency Service key set |
| `client.predicates` | Predicate JSON Schema discovery (`list`, `get(kind)`) |
| `client.disputes` | List, file, resolve and withdraw disputes |
| `client.webhooks` | Manage webhook endpoints and deliveries |
| `client.drift` | Agent drift: what an agent did this window against the window before (`getAgent`, `listFleet`, `listAllFleet`), plus per-record history |
| `client.events` | List audit events |
| `client.schemas` | Browse, register, version, disable/enable, and validate against Type schemas |
| `client.compliance` | Compliance exports, EU AI Act assessments, SIEM stream |
| `client.audit` | Org-admin reads checkpoints (SCITT-style signed tree heads) |
| `client.auth` | `GET /v1/auth/me` + key rotation |
| `client.discovery` | Unauthenticated metadata: `getScopeProfiles()`, protocol conformance (`getConformance()`), `getLifecycle()` |
| `client.health` | Instance health and status |
| `client.admin` | Admin operations (org + agent + API-key provisioning, vault, DLQ, system health, plus `admin.records.{list, import}` and `admin.vault.{anchors, scan, signingKeys}`) |
| `client.a2a` | A2A Protocol support (AgentCard, JSON-RPC 2.0) |
| `client.capabilities` | Agent Type capability management |
| `client.federation` | Federation peer operations (peer handshake, state transitions, signals, co-sign, disputes) |
| `client.federationAdmin` | Federation server administration (peers, DLQ, peering tokens, instance identity) |
| `client.agents` | Agent identity and references |
| `client.references` | Cross-system reference lookups (Record + agent surfaces) |
| `client.verificationKeys` | Public signing-key set for offline audit verification |

## Types

There are **no built-in Types**. An org owns its entire type namespace (no reserved prefixes). A Type is a versioned JSON Schema you register that defines a Record's criteria/completion shape and gate rules; the API validates each Record server-side against it.

Every new org is auto-seeded (best-effort, idempotent) with four **editable** sample Types you can use as-is, edit, rename, or delete:

| Seeded sample | Shape |
|------|-------|
| `notarize-generic-v1` | Notarize-only (the on-ramp); terminalizes at RECORDED on create, no completion phase |
| `principal-gate-generic-v1` | Completion + principal-rendered verdict (pairs with Notify webhooks) |
| `terminal-outcome-v1` | Auto-gate child of the two-record pattern (gate on `terminalState`) |
| `delegated-workflow-v1` | Delegation-chain root; notarize-only, multi-agent via `parentRecordId` |

The canonical set for your org is always `client.schemas.list()` (empty on a fresh install if the samples were deleted). Register and manage your own Types via the Schema Development Toolkit (`client.schemas.register()`, `preview()`, `import_()`, `exportSchema()`, `disable()`/`enable()`).

### When two publishers offer the same Type

Importing a peer's manifest (`import_()`) can leave your org with two registrations of one `type`: theirs and your local one. That is supported, and it means a bare `type` no longer names a schema. The API refuses to guess, because the guess would change the moment the other publisher shipped a higher version:

```typescript
import { UnprocessableError } from '@agledger/sdk';

try {
  await client.records.create({ type: 'acme-po-v1', criteria: { poNumber: 'PO-1' } });
} catch (err) {
  if (err instanceof UnprocessableError && err.type === '/problems/ambiguous-publisher') {
    // err.publishers is the candidate list, e.g. ['acme-corp', 'local'].
    await client.records.create({
      type: 'acme-po-v1',
      publisher: 'acme-corp',
      criteria: { poNumber: 'PO-1' },
    });
  }
}
```

Branch on `err.type`, not on the message. Schema reads take the same pin (`client.schemas.get('acme-po-v1', { publisher: 'acme-corp' })`), and `client.schemas.list()` returns one row per (publisher, type) so you can choose before reading.

Every Record reports the binding the engine used, whether or not you pinned it:

```typescript
const record = await client.records.get(id);
record.publisher;  // 'acme-corp', or null (see below)
record.schemaUrl;  // '/v1/schemas/acme-po-v1?publisher=acme-corp'. Follow it verbatim.
```

`publisher` is `null` on Records the engine never validated against a local registration: federation-received ones (the originator ran the gate against its own registration) and ones backfilled through admin import. Read that as "ask the originator", not as "the schema is missing here".

Single-publisher orgs, which is nearly every install, never pass `publisher` and read their one label (usually `local`) back.

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

An unbounded walk runs to the end of the listing. Behind it is a 100-page
runaway guard, and hitting that guard throws `PaginationLimitError` rather than
returning a prefix that looks like the whole listing. Raise `limit` so the rows
arrive in fewer pages, or bound the walk yourself:

```typescript
// An explicit bound is an intentional stop, so it ends the walk quietly.
for await (const record of client.records.listAll({ limit: 500 }, { maxPages: 20 })) {
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

Error classes: `AuthenticationError`, `PermissionError`, `NotFoundError`, `ValidationError`, `UnprocessableError`, `RateLimitError`, `ConnectionError`, `TimeoutError`, and `OidcExchangeError` for a refused OIDC cert exchange.

## Webhook Verification

Webhooks ship in two signing schemes, selected per subscription via `signingAlg`:

**HMAC** (`signingAlg: 'hmac'`, the default), shared-secret HMAC-SHA256:

```typescript
import { verifySignature } from '@agledger/sdk/webhooks';

const isValid = verifySignature(
  rawBody,                    // Raw request body string
  req.headers['x-agledger-signature'], // Signature header
  process.env.WEBHOOK_SECRET!, // Your webhook secret
);
```

**Asymmetric** (`signingAlg: 'ed25519'` or `'ecdsa-p256-sha256'`) is RFC 9421
HTTP Message Signatures signed with the Server's vault key. The receiver holds
no secret and verifies against the Server's published public key, giving
non-repudiation for the Settlement Signal hop. Settlement-event subscriptions
default to this when the Server has a vault signing key. The wire `alg`
reflects the Server's active key; `verifyRfc9421` handles both.

```typescript
import { verifyRfc9421, SignatureAlgorithmUnavailableError } from '@agledger/sdk/webhooks';

// Resolve the Server's published keys once (cache them); the delivery's
// `keyid` is matched against them automatically.
const { data: keys } = await client.verificationKeys.list();

try {
  const isValid = await verifyRfc9421(
    req.headers, // must include content-digest, signature-input, signature, x-agledger-idempotency-key
    rawBody,     // raw request body string
    keys,        // or a single base64 public key string
  );
  if (!isValid) return res.status(401).end();
} catch (err) {
  // This host cannot compute the algorithm, so nothing was checked. Your
  // configuration, not the sender's: 401 would blame the wrong party.
  if (err instanceof SignatureAlgorithmUnavailableError) return res.status(500).end();
  throw err;
}
```

`verifyRfc9421` recomputes the RFC 9530 Content-Digest over the body, reconstructs
the RFC 9421 signature base, verifies the signature under the algorithm the
resolved key commits to (Ed25519 or ES256), and enforces the
`created` replay window (default/max 300s). `constructEventRfc9421` verifies and
parses in one step. This path uses `http-message-signatures` for the canonical
serialization.

If the host runtime cannot compute the key's algorithm, both functions throw
`SignatureAlgorithmUnavailableError` instead of returning `false`. The usual
cause is an active OpenSSL FIPS provider, which carries no EdDSA. This is
deliberately not a verification failure: returning `false` would make the
standard `if (!ok) return 401` reject every legitimate delivery as forged, when
the fault is in the receiver's configuration rather than the sender's
signature. Terminate the signature on an unrestricted host, or configure the
sender for `ecdsa-p256-sha256`, which FIPS does permit.

Note that on such a host **no** delivery can be classified, valid or forged.
The check has to run before signature verification, so a genuine forgery
throws too. Treat the exception as "nothing is known about this delivery",
never as evidence it was legitimate. Catch it explicitly: on Express 4 or plain
`http`, an unhandled rejection terminates the process under Node's default
`--unhandled-rejections=throw`.

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

Decodes canonical COSE_Sign1 envelopes (RFC 9052, tag 18), walks the hash
chain, and verifies the signature over each `Sig_structure` under the algorithm
the verification key commits to (Ed25519 or ES256). Format 2.0
(was 1.0 JCS + detached Ed25519). `brokenAt.code` is a canonical SCREAMING_SNAKE
`FailureCode` (e.g. `CHAIN_HASH_MISMATCH`, `CHAIN_SIGNATURE_INVALID`).

This is a thin wrapper over [`@agledger/verify-core`](https://www.npmjs.com/package/@agledger/verify-core):
the same body of logic the CLI `verify` command and the MCP `agledger_verify`
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
const { data: kinds } = await client.predicates.list();
// The JSON Schema document itself ($schema, $id, properties, ...).
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

`RECORDED` is a terminal status for notarize-only Types. Records of a Type
that did not declare a completion phase land here at create.

## API Documentation

API documentation is available at your instance's `/docs` endpoint (Swagger UI).

## Licensing

Running AGLedger in production requires a license. The Developer Edition license is free; see https://agledger.ai/license and https://agledger.ai/pricing.

## SDK License

Proprietary. Copyright (c) 2026 AGLedger LLC. All rights reserved. See [LICENSE](./LICENSE) for details.

AGLedger is a trademark of AGLedger LLC, and Settlement Signal is a pending trademark of AGLedger LLC. All other trademarks are the property of their respective owners. Patent pending.
