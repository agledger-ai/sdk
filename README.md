# @agledger/sdk

The official TypeScript SDK for [AGLedger](https://agledger.ai) -- accountability infrastructure for AI agents. The Layer 3 accountability layer of the agent stack.

Zero runtime dependencies. TypeScript strict. 421 tests. Works with Node.js 18+, Deno, and Bun.

**Learn more**

- [agledger.ai](https://agledger.ai) — what AGLedger is and why Layer 3 accountability matters
- [How it works](https://agledger.ai/how-it-works) — the four-endpoint lifecycle: mandate, receipt, verdict, fulfill
- [Glossary](https://agledger.ai/glossary) — canonical definitions of Mandate, Receipt, Verdict, Settlement Signal
- [Documentation](https://agledger.ai/docs) — installation, integration guides, API reference
- [Protocol (AOAP)](https://agledger.ai/protocol) — the coordination language behind AGLedger

## Why AGLedger?

Enterprises deploying AI agents need to know what each agent was asked to do, what it actually did, and whether the result met expectations. AGLedger provides the accountability record -- what was agreed to, by whom, when, and the delegation of that agreement through other systems.

- Record what was asked and who it was delegated to (mandates)
- Capture what was reported to be done (task attestations)
- Check whether the creator accepted the results (verification)
- Track agent reliability across your organization over time (reputation)

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

// Create a mandate (what the agent is being asked to do)
const mandate = await client.mandates.create({
  enterpriseId: 'ent-123',
  contractType: 'ACH-DATA-v1',
  contractVersion: '1',
  platform: 'internal-etl',
  criteria: {
    source_system: 'warehouse-db',
    target_format: 'parquet',
    max_records: 500_000,
  },
});

// Activate the mandate
await client.mandates.transition(mandate.id, 'activate');

// Submit a receipt (what the agent reported back)
const receipt = await client.receipts.submit(mandate.id, {
  agentId: 'agent-456',
  evidence: {
    records_processed: 487_231,
    output_path: '/data/exports/2026-03-10.parquet',
    duration_ms: 12_400,
  },
});

// Check whether the results meet the original criteria
const result = await client.verification.verify(mandate.id);
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
export AGLEDGER_API_KEY=ach_ent_...
export AGLEDGER_EXTERNAL_URL=https://agledger.internal.example.com
```

## Features

- **Stripe-style client** with resource sub-clients (`client.mandates`, `client.receipts`, etc.)
- **Automatic retries** with exponential backoff + jitter for 429/5xx errors
- **Idempotency keys** auto-generated for all mutating requests
- **Auto-pagination** via async iterators
- **Webhook signature verification** (separate import to keep browser bundles lean)
- **TypeScript-first** with full type coverage and forward-compatible enums

## Resources

| Resource | Description |
|----------|-------------|
| `client.mandates` | Create, search, transition, and delegate mandates |
| `client.receipts` | Submit and manage task attestation reports |
| `client.verification` | Trigger and check verification status |
| `client.disputes` | File, escalate, and resolve disputes |
| `client.webhooks` | Manage webhook endpoints and deliveries |
| `client.reputation` | Query agent health scores and history |
| `client.events` | List audit events and hash-chained audit trails |
| `client.schemas` | Browse and validate against contract type schemas |
| `client.dashboard` | Dashboard summaries, metrics, and agent leaderboards |
| `client.compliance` | Compliance exports, EU AI Act assessments |
| `client.registration` | Account registration and API key management |
| `client.health` | Instance health, status, and conformance |
| `client.admin` | Platform administration (requires platform API key) |
| `client.a2a` | A2A Protocol support (AgentCard, JSON-RPC 2.0) |
| `client.capabilities` | Agent contract type capability management |
| `client.notarize` | Lightweight agent-to-agent agreement notarization |
| `client.enterprises` | Enterprise agent approval and management |
| `client.projects` | Project organization for mandates |
| `client.proxy` | Governance sidecar session sync and analytics |
| `client.federation` | Federation gateway operations |
| `client.agents` | Agent identity and references |
| `client.references` | Cross-system reference lookups |

## Contract Types

Contract types are defined by the Agentic Contract Specification:

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

## Pagination

All list methods return `Page<T>`:

```typescript
// Single page
const page = await client.mandates.list({ enterpriseId: 'ent-123' });
console.log(page.data);    // Mandate[]
console.log(page.hasMore); // boolean
console.log(page.total);   // number | undefined

// Auto-pagination with async iterator
for await (const mandate of client.mandates.listAll({ enterpriseId: 'ent-123' })) {
  console.log(mandate.id);
}
```

## Error Handling

```typescript
import { AgledgerApiError, NotFoundError, RateLimitError } from '@agledger/sdk';

try {
  await client.mandates.get('mnd-nonexistent');
} catch (err) {
  if (err instanceof NotFoundError) {
    console.log('Mandate not found');
  } else if (err instanceof RateLimitError) {
    console.log(`Rate limited. Retry after ${err.retryAfter}ms`);
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

Verify a mandate's hash-chained, Ed25519-signed audit export without calling the API:

```typescript
import { verifyExport } from '@agledger/sdk/verify';

const exportData = await client.compliance.exportMandate('MND_123');
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

## Mandate Lifecycle

```
CREATED ──> ACTIVE ──> PROCESSING ──> FULFILLED
  │           │           │
  v           v           v
PROPOSED   EXPIRED    FAILED ──> REMEDIATED
  │        CANCELLED     │
  v                      v
REJECTED            REVISION_REQUESTED ──> PROCESSING (resubmit)
```

## API Documentation

API documentation is available at your instance's `/docs` endpoint (Swagger UI).

## Licensing

AGLedger is **free for single-node deployments** (Docker Compose with bundled database). An Enterprise License ($8,000 one-time, per database instance) is required for external database connections, federation, and multi-node deployments. The license is perpetual -- production never stops due to licensing.

Full details: [agledger.ai/pricing](https://agledger.ai/pricing) | [License Agreement](https://agledger.ai/license)

## SDK License

Proprietary. Copyright (c) 2026 AGLedger LLC. All rights reserved. See [LICENSE](./LICENSE) for details.

AGLedger, Agentic Ledger, Settlement Signal, and Agentic Operations and Accountability Protocol (AOAP) are trademarks of AGLedger LLC. Patent pending.
