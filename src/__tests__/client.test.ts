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

    expect(client.mandates).toBeDefined();
    expect(client.receipts).toBeDefined();
    expect(client.verification).toBeDefined();
    expect(client.disputes).toBeDefined();
    expect(client.webhooks).toBeDefined();
    expect(client.reputation).toBeDefined();
    expect(client.events).toBeDefined();
    expect(client.schemas).toBeDefined();
    expect(client.dashboard).toBeDefined();
    expect(client.compliance).toBeDefined();
    expect(client.registration).toBeDefined();
    expect(client.health).toBeDefined();
    expect(client.proxy).toBeDefined();
    expect(client.admin).toBeDefined();
    expect(client.a2a).toBeDefined();
    expect(client.capabilities).toBeDefined();
  });

  it('proxy has decomposed sub-resources', () => {
    const client = new AgledgerClient({
      apiKey: 'test_key',
      fetch: mockFetch() as unknown as typeof globalThis.fetch,
    });

    expect(client.proxy.sessions).toBeDefined();
    expect(client.proxy.toolCalls).toBeDefined();
    expect(client.proxy.sidecarMandates).toBeDefined();
    expect(client.proxy.sidecarReceipts).toBeDefined();
    expect(client.proxy.toolCatalog).toBeDefined();
    expect(client.proxy.analytics).toBeDefined();
  });

  it('sends correct auth header', async () => {
    const fetch = mockFetch();
    const client = new AgledgerClient({
      apiKey: 'sk_test_abc123',
      fetch: fetch as unknown as typeof globalThis.fetch,
    });

    await client.health.check();
    const [, init] = fetch.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer sk_test_abc123');
  });

  it('uses custom base URL', async () => {
    const fetch = mockFetch();
    const client = new AgledgerClient({
      apiKey: 'test',
      baseUrl: 'https://staging.api.agledger.ai',
      fetch: fetch as unknown as typeof globalThis.fetch,
    });

    await client.health.check();
    expect(fetch.mock.calls[0][0]).toContain('https://staging.api.agledger.ai');
  });

  it('uses environment shorthand for sandbox', async () => {
    const fetch = mockFetch();
    const client = new AgledgerClient({
      apiKey: 'test',
      environment: 'sandbox',
      fetch: fetch as unknown as typeof globalThis.fetch,
    });

    await client.health.check();
    expect(fetch.mock.calls[0][0]).toContain('https://sandbox.api.agledger.ai');
  });
});
