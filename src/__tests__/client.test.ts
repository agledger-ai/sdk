import { describe, it, expect, vi } from 'vitest';
import { AgledgerClient } from '../client.js';

function mockFetch() {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue({}),
    headers: new Headers(),
  });
}

describe('AgledgerClient', () => {
  it('initializes all resources', () => {
    const client = new AgledgerClient({
      apiKey: 'test_key',
      fetch: mockFetch() as unknown as typeof globalThis.fetch,
    });

    expect(client.records).toBeDefined();
    expect(client.receipts).toBeDefined();
    expect(client.verification).toBeDefined();
    expect(client.disputes).toBeDefined();
    expect(client.webhooks).toBeDefined();
    expect(client.reputation).toBeDefined();
    expect(client.events).toBeDefined();
    expect(client.schemas).toBeDefined();
    expect(client.compliance).toBeDefined();
    expect(client.health).toBeDefined();
    expect(client.admin).toBeDefined();
    expect(client.admin.records).toBeDefined();
    expect(client.admin.vault).toBeDefined();
    expect(client.a2a).toBeDefined();
    expect(client.capabilities).toBeDefined();
    expect(client.federation).toBeDefined();
    expect(client.federationAdmin).toBeDefined();
    expect(client.agents).toBeDefined();
    expect(client.references).toBeDefined();
    expect(client.verificationKeys).toBeDefined();
    expect(client.auth).toBeDefined();
    expect(client.discovery).toBeDefined();
    expect(client.audit).toBeDefined();
    expect(client.audit.tenantReadsCheckpoints).toBeDefined();
  });

  it('sends correct auth header', async () => {
    const fetch = mockFetch();
    const client = new AgledgerClient({
      apiKey: 'agl_agt_test_abc123',
      fetch: fetch as unknown as typeof globalThis.fetch,
    });

    await client.health.check();
    const [, init] = fetch.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer agl_agt_test_abc123');
  });

  it('uses custom base URL', async () => {
    const fetch = mockFetch();
    const client = new AgledgerClient({
      apiKey: 'test',
      baseUrl: 'https://agledger.staging.example.com',
      fetch: fetch as unknown as typeof globalThis.fetch,
    });

    await client.health.check();
    expect(fetch.mock.calls[0][0]).toContain('https://agledger.staging.example.com');
  });
});
