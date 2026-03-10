import { describe, it, expect, vi } from 'vitest';
import { AgledgerClient } from '../client.js';

function createMockClient(responseOverride?: unknown) {
  const fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue(responseOverride ?? { id: 'session-1', mandateIdMap: {} }),
    headers: new Headers(),
  });
  const client = new AgledgerClient({
    apiKey: 'test_key',
    fetch: fetch as unknown as typeof globalThis.fetch,
    maxRetries: 0,
  });
  return { client, fetch };
}

function createPageMockClient(data: unknown[] = []) {
  return createMockClient({ data, hasMore: false });
}

describe('ProxyResource', () => {
  describe('sessions', () => {
    it('creates a session', async () => {
      const { client, fetch } = createMockClient();
      await client.proxy.sessions.create({
        startedAt: '2026-03-09T00:00:00Z',
        proxyMode: 'observe',
      });
      expect(fetch.mock.calls[0][0]).toContain('/v1/proxy/sessions');
      expect(fetch.mock.calls[0][1].method).toBe('POST');
    });

    it('lists sessions', async () => {
      const { client, fetch } = createPageMockClient();
      await client.proxy.sessions.list();
      expect(fetch.mock.calls[0][0]).toContain('/v1/proxy/sessions');
      expect(fetch.mock.calls[0][1].method).toBe('GET');
    });
  });

  describe('syncSession', () => {
    it('sends unified sync payload', async () => {
      const { client, fetch } = createMockClient();
      await client.proxy.syncSession({
        session: {
          startedAt: '2026-03-09T00:00:00Z',
          proxyMode: 'advisory',
          agentName: 'test-agent',
        },
        toolCalls: [
          {
            toolName: 'query_database',
            arguments: { sql: 'SELECT 1' },
            occurredAt: '2026-03-09T00:00:01Z',
          },
        ],
        sidecarMandates: [
          {
            contractType: 'ACH-DATA-v1',
            confidence: 'high',
            confidenceScore: 0.95,
            extractedCriteria: { description: 'SQL query' },
          },
        ],
      });

      const [url, init] = fetch.mock.calls[0];
      expect(url).toContain('/v1/proxy/sync');
      const body = JSON.parse(init.body);
      expect(body.session.agentName).toBe('test-agent');
      expect(body.toolCalls).toHaveLength(1);
      expect(body.sidecarMandates).toHaveLength(1);
    });

    it('uses 60s timeout by default', async () => {
      const { client, fetch } = createMockClient();
      await client.proxy.syncSession({
        session: { startedAt: '2026-03-09T00:00:00Z', proxyMode: 'observe' },
      });
      expect(fetch).toHaveBeenCalledOnce();
    });
  });

  describe('toolCalls', () => {
    it('ingests tool calls', async () => {
      const { client, fetch } = createMockClient();
      await client.proxy.toolCalls.ingest('session-1', [
        {
          toolName: 'write_file',
          arguments: { path: '/tmp/test' },
          occurredAt: '2026-03-09T00:00:01Z',
        },
      ]);
      expect(fetch.mock.calls[0][0]).toContain('/v1/proxy/sessions/session-1/tool-calls');
    });

    it('lists tool calls', async () => {
      const { client, fetch } = createPageMockClient();
      await client.proxy.toolCalls.list('session-1');
      expect(fetch.mock.calls[0][0]).toContain('/v1/proxy/sessions/session-1/tool-calls');
      expect(fetch.mock.calls[0][1].method).toBe('GET');
    });
  });

  describe('sidecarMandates', () => {
    it('ingests sidecar mandates', async () => {
      const { client, fetch } = createMockClient();
      await client.proxy.sidecarMandates.ingest('session-1', [
        {
          contractType: 'ACH-PROC-v1',
          confidence: 'high',
          confidenceScore: 0.92,
          extractedCriteria: { item_spec: 'Widget', quantity: 100 },
          ruleId: 'proc-commitment-purchase',
        },
      ]);
      expect(fetch.mock.calls[0][0]).toContain('/sidecar-mandates');
    });

    it('formalizes a sidecar mandate', async () => {
      const { client, fetch } = createMockClient();
      await client.proxy.sidecarMandates.formalize('sm-abc123', 'mnd-real-uuid');
      const body = JSON.parse(fetch.mock.calls[0][1].body);
      expect(body.status).toBe('FORMALIZED');
      expect(body.formalizedMandateId).toBe('mnd-real-uuid');
    });

    it('dismisses a sidecar mandate', async () => {
      const { client, fetch } = createMockClient();
      await client.proxy.sidecarMandates.dismiss('sm-abc123');
      const body = JSON.parse(fetch.mock.calls[0][1].body);
      expect(body.status).toBe('DISMISSED');
    });
  });

  describe('sidecarReceipts', () => {
    it('ingests sidecar receipts with correlation ID', async () => {
      const { client, fetch } = createMockClient();
      await client.proxy.sidecarReceipts.ingest('session-1', [
        {
          sidecarMandateId: 'sm-abc123',
          confidence: 'medium',
          confidenceScore: 0.7,
          correlationId: 'corr-uuid-456',
        },
      ]);
      const body = JSON.parse(fetch.mock.calls[0][1].body);
      expect(body.items[0].correlationId).toBe('corr-uuid-456');
    });
  });

  describe('analytics', () => {
    it('gets session analytics', async () => {
      const { client, fetch } = createMockClient();
      await client.proxy.analytics.getSession('session-1');
      expect(fetch.mock.calls[0][0]).toContain('/v1/proxy/sessions/session-1/analytics');
    });

    it('gets analytics summary', async () => {
      const { client, fetch } = createMockClient();
      await client.proxy.analytics.getSummary({ from: '2026-01-01' });
      const url = fetch.mock.calls[0][0];
      expect(url).toContain('/v1/proxy/analytics');
      expect(url).toContain('from=2026-01-01');
    });

    it('gets mandate summary for session', async () => {
      const { client, fetch } = createMockClient();
      await client.proxy.analytics.getMandateSummary('session-1');
      expect(fetch.mock.calls[0][0]).toContain('/v1/proxy/sessions/session-1/mandate-summary');
    });

    it('gets alignment analysis for session', async () => {
      const { client, fetch } = createMockClient();
      await client.proxy.analytics.getAlignment('session-1');
      expect(fetch.mock.calls[0][0]).toContain('/v1/proxy/sessions/session-1/alignment');
    });
  });
});
