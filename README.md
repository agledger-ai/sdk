# @agledger/sdk

The official TypeScript SDK for the [AGLedger](https://agledger.ai) API -- accountability and audit infrastructure for agentic systems.

Zero runtime dependencies. TypeScript strict. 113 tests. Works with Node.js 18+, Deno, and Bun.

## Why AGLedger?

Enterprises deploying AI agents need to know what each agent was asked to do, what it actually did, and whether the result met expectations. AGLedger provides the accountability record -- what was agreed to, by whom, when, and the delegation of that agreement through other systems.

- Record what was asked and who it was delegated to (mandates)
- Capture what was reported to be done (task attestations)
- Check whether the creator accepted the results (verification)
- Track agent reliability across your organization over time (reputation)

## The Accountability Record

The core of AGLedger is the contract. A mandate is a structured, deterministic record of what was agreed to -- the acceptance criteria, tolerance bands, and delegation chain. It works the same way regardless of which AI agent, platform, or framework is executing the work.

On top of the contract, AGLedger provides:

- **Tamper-evident audit trail** -- every state change is hash-chained and independently verifiable
- **Encrypted operating mode** -- for sensitive operations where criteria and evidence must be encrypted at rest
- **Governance sidecar** -- passive detection of agent operations via MCP proxy, with observe/advisory/enforced modes
- **Compliance exports** -- audit-ready reports for internal review, regulators, and EU AI Act assessments

## Get Started

1. Create an account at [agledger.ai](https://agledger.ai)
2. Get your API key from the dashboard
3. Install the SDK: `npm install @agledger/sdk`
4. Follow the Quick Start below

## Quick Start

```typescript
import { AgledgerClient } from '@agledger/sdk';

const client = new AgledgerClient({
  apiKey: process.env.AGLEDGER_API_KEY!,
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

## Features

- **Stripe-style client** with resource sub-clients (`client.mandates`, `client.receipts`, etc.)
- **Automatic retries** with exponential backoff + jitter for 429/5xx errors
- **Idempotency keys** auto-generated for all mutating requests
- **Auto-pagination** via async iterators
- **Webhook signature verification** (separate import to keep browser bundles lean)
- **TypeScript-first** with full type coverage and forward-compatible enums
- **Sandbox support** via `environment: 'sandbox'` option

## Configuration

```typescript
const client = new AgledgerClient({
  apiKey: 'your_api_key',

  // Environment shorthand (sets baseUrl automatically)
  environment: 'sandbox', // or 'production' (default)

  // Or explicit base URL
  baseUrl: 'https://api.agledger.ai',

  // Retry configuration
  maxRetries: 3,        // default: 3
  timeout: 30_000,      // default: 30s

  // Idempotency key prefix
  idempotencyKeyPrefix: 'my-app-',
});
```

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
| `client.health` | Platform health, status, and conformance |
| `client.admin` | Platform administration (requires platform API key) |
| `client.a2a` | A2A Protocol support (AgentCard, JSON-RPC 2.0) |
| `client.capabilities` | Agent contract type capability management |
| `client.proxy` | Governance sidecar session sync and analytics |

## Contract Types

Contract types are defined by the Agentic Contract Specification™:

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

Full API documentation is available at [https://api.agledger.ai/docs](https://api.agledger.ai/docs).

## License

Proprietary. Copyright (c) 2026 AGLedger LLC. All rights reserved. See [LICENSE](./LICENSE) for details.

AGLedger™ and the Agentic Contract Specification™ are trademarks of AGLedger LLC. Patent pending.
