# @agledger/sdk

The official TypeScript SDK for [AGLedger](https://agledger.ai) -- accountability infrastructure for AI agents. The Layer 3 accountability layer of the agent stack.

Zero runtime dependencies. TypeScript strict. Works with Node.js 22+, Deno, and Bun.

**Learn more**

- [agledger.ai](https://agledger.ai) — what AGLedger is and why Layer 3 accountability matters
- [How it works](https://agledger.ai/how-it-works) — the four-endpoint lifecycle: record, receipt, verdict, fulfill
- [Glossary](https://agledger.ai/glossary) — canonical definitions of Record, Receipt, Verdict, Settlement Signal
- [Documentation](https://agledger.ai/docs) — installation, integration guides, API reference
- [Protocol (AOAP)](https://agledger.ai/protocol) — the coordination language behind AGLedger

## Why AGLedger?

Enterprises deploying AI agents need to know what each agent was asked to do, what it actually did, and whether the result met expectations. AGLedger provides the accountability record -- what was agreed to, by whom, when, and the delegation of that agreement through other systems.

- Record what was asked and who it was delegated to (Records)
- Capture what was reported to be done (task attestations)
- Check whether the creator accepted the results (verification)
- Track agent reliability across your organization over time (reputation)

## Vocabulary

A **Record** (formerly Mandate) is a registered commitment between a principal and a performer. A **Type** (formerly Contract Type) is the versioned JSON Schema defining a Record's shape. The rename happened in API v0.21 / SDK 0.7.0 — the underlying state machine and audit chain are unchanged.

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
  type: 'ACH-DATA-v1',
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

// Submit a receipt (what the agent reported back)
const receipt = await client.receipts.submit(record.id, {
  evidence: {
    deliverable: '/data/exports/2026-03-10.parquet',
    deliverable_type: 'file_ref',
    row_count: 487_231,
  },
});

// Check whether the results meet the original criteria
const result = await client.verification.verify(record.id);

// Every Record response carries a `vaultReceipt` so a notarize-only caller
// can confirm the chain head without a follow-up audit-export call.
console.log(record.vaultReceipt?.chainPosition, record.vaultReceipt?.leafHash);
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

- **Stripe-style client** with resource sub-clients (`client.records`, `client.receipts`, etc.)
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
| `client.records` | Create, search, transition, delegate, and fetch Records |
| `client.receipts` | Submit and manage task attestation reports |
| `client.verification` | Trigger and check verification status |
| `client.disputes` | List, file, escalate, and resolve disputes |
| `client.webhooks` | Manage webhook endpoints and deliveries |
| `client.reputation` | Query agent health scores and history |
| `client.events` | List audit events |
| `client.schemas` | Browse, register, version, disable/enable, and validate against Type schemas |
| `client.compliance` | Compliance exports, EU AI Act assessments, SIEM stream |
| `client.audit` | Tenant-admin reads checkpoints (SCITT-style signed tree heads) |
| `client.conformance` | Protocol features and supported Types |
| `client.auth` | `GET /v1/auth/me` + key rotation |
| `client.discovery` | Unauthenticated metadata — scope profiles, conformance, Record lifecycle |
| `client.health` | Instance health and status |
| `client.admin` | Admin operations (tenant + agent + API-key provisioning, vault, DLQ, system health, plus `admin.records.{list, import}` and `admin.vault.{anchors, scan, signingKeys}`) |
| `client.a2a` | A2A Protocol support (AgentCard, JSON-RPC 2.0) |
| `client.capabilities` | Agent Type capability management |
| `client.federation` | Federation gateway operations |
| `client.federationAdmin` | Federation hub administration |
| `client.agents` | Agent identity and references |
| `client.references` | Cross-system reference lookups (Record + agent surfaces) |
| `client.verificationKeys` | Public signing-key set for offline audit verification |

## Types (formerly Contract Types)

Built-in Types are defined by the Agentic Contract Specification:

| Type | Use Case |
|------|----------|
| `ACH-PROC-v1` | Resource acquisition and provisioning requests |
| `ACH-DLVR-v1` | Reports, documents, and generated artifacts |
| `ACH-DATA-v1` | Data processing, ETL, analysis, and transformation |
| `ACH-TXN-v1` | Internal transfers, ledger entries, and settlements |
| `ACH-ORCH-v1` | Task delegation and multi-agent coordination |
| `ACH-COMM-v1` | Notifications, messages, and alerting |
| `ACH-AUTH-v1` | Permission changes, credential grants, and access control |
| `ACH-INFRA-v1` | Infrastructure changes, cloud provisioning, and config updates |
| `ACH-DEL-v1` | Deletions, cancellations, and reversals |
| `ACH-ANALYZE-v1` | Research, analysis, and investigation tasks |
| `ACH-COORD-v1` | Multi-party coordination and consensus building |
| `ACH-MON-v1` | Monitoring, observation, threshold tracking, and alerts |
| `ACH-REVIEW-v1` | Review, approval, and quality gate decisions |

Customers register their own Types via the Schema Development Toolkit (`client.schemas.register()`, `preview()`, `import_()`, `export()`, `disable()`/`enable()`).

## Pagination

All list methods return `Page<T>`:

```typescript
// Single page
const page = await client.records.list({ enterpriseId: 'ent-abc' });
console.log(page.data);    // RecordRow[]
console.log(page.hasMore); // boolean
console.log(page.total);   // number | undefined

// Auto-pagination with async iterator
for await (const record of client.records.listAll({ enterpriseId: 'ent-abc' })) {
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

```typescript
import { verifySignature } from '@agledger/sdk/webhooks';

const isValid = verifySignature(
  rawBody,                    // Raw request body string
  req.headers['x-agledger-signature'], // Signature header
  process.env.WEBHOOK_SECRET!, // Your webhook secret
);
```

## Offline Audit Export Verification

Verify a Record's hash-chained, Ed25519-signed audit export without calling the API:

```typescript
import { verifyExport } from '@agledger/sdk/verify';

const exportData = await client.records.getAuditExport('REC_123');
const result = verifyExport(exportData);

if (!result.valid) {
  console.error(
    `Broken at position ${result.brokenAt?.position}: ${result.brokenAt?.reason}`,
  );
}
// { valid: true, verifiedEntries: 12, totalEntries: 12, entries: [...] }
```

Re-implements the vault's integrity check (RFC 8785 JCS → SHA-256 → Ed25519 over
`{position}:{payloadHash}:{previousHash}`). The export's `signingPublicKeys` map
is used by default; pass `{ publicKeys: {...} }` to override or supply keys that
rotated out. Use `{ requireKeyId: 'key-id' }` to reject exports signed by an
unexpected (even if otherwise valid) key.

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
that did not declare a receipt phase land here at create.

## API Documentation

API documentation is available at your instance's `/docs` endpoint (Swagger UI).

## Licensing

AGLedger is **free for single-node deployments** (Docker Compose with bundled database). An Enterprise License ($8,000 one-time, per database instance) is required for external database connections, federation, and multi-node deployments. The license is perpetual -- production never stops due to licensing.

Full details: [agledger.ai/pricing](https://agledger.ai/pricing) | [License Agreement](https://agledger.ai/license)

## SDK License

Proprietary. Copyright (c) 2026 AGLedger LLC. All rights reserved. See [LICENSE](./LICENSE) for details.

AGLedger, Agentic Ledger, Settlement Signal, and Agentic Operations and Accountability Protocol (AOAP) are trademarks of AGLedger LLC. Patent pending.
