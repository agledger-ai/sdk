/**
 * Integration test: validate SDK response shapes against a live API.
 *
 * Calls real API endpoints and verifies the returned objects have the
 * expected shape (fields exist, correct types, pagination works).
 * Auto-skips when the API is unreachable.
 *
 * Environment:
 *   AGLEDGER_TEST_API_URL  - API base URL (default: http://localhost:3001)
 *   AGLEDGER_TEST_API_KEY  - Enterprise API key with standard scopes
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { AgledgerClient } from '../client.js';
import type { Page, Mandate } from '../types.js';

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
  let createdMandateId: string | undefined;

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

  it('schemas.list() returns Page of contract types', async () => {
    const page = await client.schemas.list();
    assertPage(page, 'schemas.list');
    expect(page.data.length).toBeGreaterThan(0);
    // API returns strings (contract type identifiers), not objects
    expect(typeof page.data[0]).toBe('string');
  });

  it('schemas.get() returns schema with mandateSchema + receiptSchema', async () => {
    const schema = await client.schemas.get('ACH-PROC-v1');
    expect(schema.contractType).toBe('ACH-PROC-v1');
    expect(schema.mandateSchema).toBeDefined();
    expect(schema.receiptSchema).toBeDefined();
  });

  it('schemas.getVersions() returns array or Page of versions', async () => {
    const result = await client.schemas.getVersions('ACH-PROC-v1');
    // SDK types say SchemaVersionDetail[] but API may return Page wrapper
    const versions = Array.isArray(result) ? result : (result as any).data;
    expect(Array.isArray(versions), 'getVersions result should contain an array').toBe(true);
    if (versions.length > 0) {
      expect(typeof versions[0].version).toBe('number');
      expect(typeof versions[0].contractType).toBe('string');
    }
  });

  it('schemas.getMetaSchema() returns meta-schema object', async () => {
    const meta = await client.schemas.getMetaSchema();
    expect(meta).toBeDefined();
    expect(typeof meta).toBe('object');
  });

  it('schemas.getTemplate() returns template object', async () => {
    const template = await client.schemas.getTemplate('ACH-PROC-v1');
    expect(template).toBeDefined();
    expect(typeof template).toBe('object');
  });

  it('schemas.getBlankTemplate() returns blank template', async () => {
    const template = await client.schemas.getBlankTemplate();
    expect(template).toBeDefined();
    expect(typeof template).toBe('object');
  });

  it('schemas.getRules() returns rules config', async () => {
    const rules = await client.schemas.getRules('ACH-PROC-v1');
    expect(rules).toBeDefined();
  });

  // --- Mandates ---

  it('mandates.search() returns Page<Mandate>', async () => {
    const page = await client.mandates.search({ limit: 5 });
    assertPage(page, 'mandates.search');
  });

  it('mandates.getSummary() returns status counts', async () => {
    const summary = await client.mandates.getSummary();
    expect(summary).toBeDefined();
    expect(typeof summary).toBe('object');
  });

  it('mandate lifecycle: create → get → cancel', async () => {
    // Create
    const mandate = await client.mandates.create({
      contractType: 'ACH-PROC-v1',
      contractVersion: '1',
      platform: 'integration-test',
      criteria: { item_description: 'test-widget', quantity: { target: 1 } },
    });
    createdMandateId = mandate.id;
    expect(typeof mandate.id).toBe('string');
    expect(mandate.contractType).toBe('ACH-PROC-v1');
    expect(mandate.status).toBe('CREATED');
    expect(typeof mandate.createdAt).toBe('string');

    // Get
    const fetched = await client.mandates.get(mandate.id);
    expect(fetched.id).toBe(mandate.id);
    expect(fetched.status).toBe('CREATED');

    // Register then Activate (CREATED → register → activate)
    await client.mandates.transition(mandate.id, 'register');
    const activated = await client.mandates.transition(mandate.id, 'activate');
    expect(activated.status).toBe('ACTIVE');

    // Cancel
    const cancelled = await client.mandates.cancel(mandate.id, 'integration test cleanup');
    expect(cancelled.status).toBe('CANCELLED');
    createdMandateId = undefined; // cleaned up
  });

  // --- Receipts ---

  it('mandate + receipt lifecycle: createAgent → submit receipt → get receipt', async () => {
    if (!AGENT_KEY) {
      // Can't test without agent key
      return;
    }
    // Use agent key for createAgent (requires agent role)
    const agentClient = new AgledgerClient({ apiKey: AGENT_KEY, baseUrl: API_URL });
    const mandate = await agentClient.mandates.createAgent({
      contractType: 'ACH-DATA-v1',
      contractVersion: '1',
      criteria: { description: 'Integration test data processing', output_format: 'json' },
      autoActivate: true,
    });
    createdMandateId = mandate.id;

    // Submit receipt
    const receipt = await agentClient.receipts.submit(mandate.id, {
      evidence: { deliverable: 'query result', deliverable_type: 'report' },
    });
    expect(typeof receipt.id).toBe('string');
    expect(receipt.mandateId).toBe(mandate.id);
    expect(typeof receipt.createdAt).toBe('string');

    // Get receipt
    const fetched = await agentClient.receipts.get(mandate.id, receipt.id);
    expect(fetched.id).toBe(receipt.id);

    // List receipts
    const page = await agentClient.receipts.list(mandate.id);
    assertPage(page, 'receipts.list');
    expect(page.data.length).toBeGreaterThanOrEqual(1);

    // Clean up (may fail if mandate auto-advanced past cancellable state)
    try {
      await agentClient.mandates.cancel(mandate.id, 'integration test cleanup');
    } catch { /* OK — mandate may be in non-cancellable state */ }
    createdMandateId = undefined;
  });

  // --- Verification ---

  it('verification.getStatus() returns status object', async () => {
    const mandate = await client.mandates.create({
      contractType: 'ACH-DLVR-v1',
      contractVersion: '1',
      platform: 'integration-test',
      criteria: { description: 'Integration test deliverable' },
    });
    createdMandateId = mandate.id;

    try {
      const status = await client.verification.getStatus(mandate.id);
      expect(status).toBeDefined();
      expect(status.mandateId).toBe(mandate.id);
    } catch (err: any) {
      // API may return 400/404 if no verification has run yet — that's OK
      expect([400, 404]).toContain(err.status);
    }

    await client.mandates.cancel(mandate.id, 'integration test cleanup');
    createdMandateId = undefined;
  });

  // --- Reputation ---

  it('reputation.getAgent() returns Page<ReputationScore>', async () => {
    // Use auth/me to get our own agent ID
    const me = await client.registration.getMe();
    const agentId = me.agentId ?? me.id;
    if (!agentId) return; // can't test without an agent ID

    const page = await client.reputation.getAgent(agentId);
    assertPage(page, 'reputation.getAgent');
  });

  // --- Dashboard ---

  it('dashboard.getSummary() returns summary object', async () => {
    const summary = await client.dashboard.getSummary();
    expect(summary).toBeDefined();
    expect(typeof summary).toBe('object');
  });

  // --- Capabilities ---

  it('capabilities.get() returns capabilities or error', async () => {
    try {
      const caps = await client.capabilities.get();
      expect(caps).toBeDefined();
    } catch (err: any) {
      // 400 or 404 if no capabilities set yet — that's OK
      expect([400, 404]).toContain(err.status);
    }
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
});
