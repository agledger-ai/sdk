/**
 * Integration test: validate SDK response shapes against a live API.
 *
 * Calls real API endpoints and verifies the returned objects have the
 * expected shape (fields exist, correct types, pagination works).
 * Auto-skips when the API is unreachable.
 *
 * Environment:
 *   AGLEDGER_TEST_API_URL  - API base URL (default: http://localhost:3001)
 *   AGLEDGER_TEST_API_KEY  - Admin API key with standard scopes
 *   AGLEDGER_TEST_AGENT_KEY - Agent API key (optional; enables agent-side tests)
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { AgledgerClient } from '../client.js';
import type { Page } from '../types.js';

const API_URL = process.env['AGLEDGER_TEST_API_URL'] || 'http://localhost:3001';
const API_KEY = process.env['AGLEDGER_TEST_API_KEY'] || '';
const AGENT_KEY = process.env['AGLEDGER_TEST_AGENT_KEY'] || '';

async function isApiReachable(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

describe('SDK integration: response shape validation', async () => {
  const reachable = await isApiReachable();
  if (!reachable || !API_KEY) {
    it.skip('API not reachable or AGLEDGER_TEST_API_KEY not set', () => {});
    return;
  }

  let client: AgledgerClient;
  let createdRecordId: string | undefined;

  beforeAll(() => {
    client = new AgledgerClient({ apiKey: API_KEY, baseUrl: API_URL });
  });

  // --- Helper: assert Page<T> shape ---
  function assertPage<T>(page: Page<T>, label: string): void {
    expect(page, `${label}: null response`).toBeDefined();
    expect(Array.isArray(page.data), `${label}: data is not an array`).toBe(true);
    expect(typeof page.hasMore, `${label}: hasMore is not boolean`).toBe('boolean');
  }

  // --- Health ---

  it('health.check() returns { status, version, timestamp }', async () => {
    const h = await client.health.check();
    expect(h.status).toBe('ok');
    expect(typeof h.version).toBe('string');
    expect(typeof h.timestamp).toBe('string');
  });

  // --- Schemas ---

  it('schemas.list() returns Page of Types', async () => {
    const page = await client.schemas.list();
    assertPage(page, 'schemas.list');
    expect(page.data.length).toBeGreaterThan(0);
  });

  it('schemas.get() returns schema with recordSchema + receiptSchema', async () => {
    const schema = await client.schemas.get('ACH-PROC-v1');
    expect(schema.type).toBe('ACH-PROC-v1');
    expect(schema.recordSchema).toBeDefined();
    expect(schema.receiptSchema).toBeDefined();
  });

  it('schemas.metaSchema() returns meta-schema object', async () => {
    const meta = await client.schemas.metaSchema();
    expect(meta).toBeDefined();
    expect(typeof meta).toBe('object');
  });

  it('schemas.blank() returns blank template', async () => {
    const template = await client.schemas.blank();
    expect(template).toBeDefined();
    expect(typeof template).toBe('object');
  });

  // --- Records ---

  it('records.search() returns Page<Record>', async () => {
    const page = await client.records.search({ limit: 5 });
    assertPage(page, 'records.search');
  });

  it('record lifecycle: create → get → cancel', async () => {
    // Create (admin must name a principal)
    const me = await client.auth.getMe();
    const principalId = me.agentId;
    if (!principalId) {
      // Admin key with no agent — skip the create-flow test
      return;
    }
    const record = await client.records.create({
      principalAgentId: principalId,
      type: 'ACH-PROC-v1',
      contractVersion: '1',
      platform: 'integration-test',
      criteria: { item_spec: 'test-widget', quantity: { target: 1 } },
    });
    createdRecordId = record.id;
    expect(typeof record.id).toBe('string');
    expect(record.type).toBe('ACH-PROC-v1');
    expect(record.status).toBe('CREATED');
    expect(typeof record.createdAt).toBe('string');
    expect(record.vaultReceipt).toBeDefined();

    // Get
    const fetched = await client.records.get(record.id);
    expect(fetched.id).toBe(record.id);

    // Register then Activate
    await client.records.transition(record.id, 'register');
    const activated = await client.records.transition(record.id, 'activate');
    expect(activated.status).toBe('ACTIVE');

    // Cancel
    const cancelled = await client.records.cancel(record.id, 'integration test cleanup');
    expect(cancelled.status).toBe('CANCELLED');
    createdRecordId = undefined;
  });

  // --- Receipts (agent-side) ---

  it('record + receipt lifecycle: create → submit receipt → get receipt', async () => {
    if (!AGENT_KEY) return;
    const agentClient = new AgledgerClient({ apiKey: AGENT_KEY, baseUrl: API_URL });
    const record = await agentClient.records.create({
      type: 'ACH-DATA-v1',
      contractVersion: '1',
      platform: 'integration-test',
      criteria: { description: 'Integration test data processing', output_format: 'json' },
      autoActivate: true,
    });
    createdRecordId = record.id;

    // Submit receipt
    const receipt = await agentClient.receipts.submit(record.id, {
      evidence: { deliverable: 'query result', deliverable_type: 'report' },
    });
    expect(typeof receipt.id).toBe('string');
    expect(receipt.recordId).toBe(record.id);

    // Get receipt
    const fetched = await agentClient.receipts.get(record.id, receipt.id);
    expect(fetched.id).toBe(receipt.id);

    // List receipts
    const page = await agentClient.receipts.list(record.id);
    assertPage(page, 'receipts.list');
    expect(page.data.length).toBeGreaterThanOrEqual(1);

    try {
      await agentClient.records.cancel(record.id, 'integration test cleanup');
    } catch { /* OK — record may be in non-cancellable state */ }
    createdRecordId = undefined;
  });

  // --- Reputation ---

  it('reputation.getAgent() returns Page<ReputationScore>', async () => {
    const me = await client.auth.getMe();
    const agentId = me.agentId;
    if (!agentId) return;
    const page = await client.reputation.getAgent(agentId);
    assertPage(page, 'reputation.getAgent');
  });

  // --- Verification Keys ---

  it('verificationKeys.list() returns keys', async () => {
    const result = await client.verificationKeys.list();
    expect(result).toBeDefined();
  });

  // --- Events ---

  it('events.list() returns Page of events', async () => {
    const page = await client.events.list({ since: '2026-01-01T00:00:00Z', limit: 5 });
    assertPage(page, 'events.list');
  });

  // --- Conformance ---

  it('conformance.run() returns features + Types', async () => {
    const conf = await client.conformance.run();
    expect(conf).toBeDefined();
    expect(Array.isArray(conf.features)).toBe(true);
    expect(Array.isArray(conf.types)).toBe(true);
  });
});
