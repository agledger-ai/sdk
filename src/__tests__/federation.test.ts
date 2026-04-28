import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgledgerClient, createFederationClient } from '../client.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFetch(body: unknown = {}, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
    headers: new Headers(),
  });
}

function lastCall(fetch: ReturnType<typeof vi.fn>) {
  const [url, init] = fetch.mock.calls[fetch.mock.calls.length - 1];
  return { url: url as string, init: init as RequestInit };
}

// ---------------------------------------------------------------------------
// FederationResource (Gateway Operations)
// ---------------------------------------------------------------------------

describe('FederationResource', () => {
  let fetch: ReturnType<typeof vi.fn>;
  let client: AgledgerClient;

  beforeEach(() => {
    fetch = mockFetch();
    client = new AgledgerClient({
      apiKey: 'gw_bearer_token_123',
      fetch: fetch as unknown as typeof globalThis.fetch,
    });
  });

  it('register() sends NO Authorization header', async () => {
    const registerResult = {
      gatewayId: 'gw-001',
      hubSigningPublicKey: 'hub-pk',
      hubEncryptionPublicKey: 'hub-enc',
      bearerToken: 'bt-fresh',
      bearerTokenExpiresAt: '2026-04-01T00:00:00Z',
      registeredAt: '2026-03-31T00:00:00Z',
    };
    fetch = mockFetch(registerResult);
    client = new AgledgerClient({
      apiKey: 'unused',
      fetch: fetch as unknown as typeof globalThis.fetch,
    });

    const result = await client.federation.register({
      registrationToken: 'tok-abc',
      organizationId: 'org-1',
      signingPublicKey: 'ed25519-pk',
      encryptionPublicKey: 'x25519-pk',
      endpointUrl: 'https://gw.example.com',
      revocationSecret: 'supersecretrevoke',
      timestamp: '2026-03-31T00:00:00Z',
      nonce: 'nonce-1234567890123456',
      signature: 'sig-abc',
    });

    const { init } = lastCall(fetch);
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
    expect(result.gatewayId).toBe('gw-001');
    expect(result.bearerToken).toBe('bt-fresh');
  });

  it('heartbeat() sends bearer token', async () => {
    await client.federation.heartbeat({
      gatewayId: 'gw-001',
      agentCount: 5,
      recordCount: 10,
      timestamp: '2026-03-31T00:05:00Z',
    });

    const { url, init } = lastCall(fetch);
    expect(url).toContain('/federation/v1/heartbeat');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer gw_bearer_token_123');
  });

  it('registerAgent() posts to /federation/v1/agents', async () => {
    await client.federation.registerAgent({
      agentId: 'agent-001',
      types: ['ACH-PROC-v1', 'ACH-DLVR-v1'],
    });

    const { url, init } = lastCall(fetch);
    expect(url).toContain('/federation/v1/agents');
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body as string);
    expect(body.types).toEqual(['ACH-PROC-v1', 'ACH-DLVR-v1']);
  });

  it('listAgents() supports cursor pagination', async () => {
    fetch = mockFetch({
      data: [{ agentId: 'a1', gatewayId: 'gw-1', types: [], displayName: null, registeredAt: '2026-03-31T00:00:00Z' }],
      nextCursor: 'cursor-abc',
      hasMore: true,
    });
    client = new AgledgerClient({
      apiKey: 'gw_token',
      fetch: fetch as unknown as typeof globalThis.fetch,
    });

    const page = await client.federation.listAgents({ type: 'ACH-PROC-v1', limit: 10 });
    const { url } = lastCall(fetch);
    expect(url).toContain('/federation/v1/agents');
    expect(url).toContain('type=ACH-PROC-v1');
    expect(url).toContain('limit=10');
    expect(page.data).toHaveLength(1);
    expect(page.hasMore).toBe(true);
    expect(page.nextCursor).toBe('cursor-abc');
  });

  it('submitStateTransition() posts signed transition', async () => {
    await client.federation.submitStateTransition({
      recordId: 'r-001',
      gatewayId: 'gw-001',
      state: 'ACTIVE',
      type: 'ACH-PROC-v1',
      criteriaHash: 'a'.repeat(64),
      role: 'principal',
      seq: 1,
      idempotencyKey: 'idem-001',
      timestamp: '2026-03-31T00:00:00Z',
      nonce: 'nonce-1234567890123456',
      signature: 'sig-xyz',
    });

    const { url, init } = lastCall(fetch);
    expect(url).toContain('/federation/v1/state-transitions');
    expect(init.method).toBe('POST');
  });

  it('relaySignal() posts settlement signal', async () => {
    await client.federation.relaySignal({
      recordId: 'r-001',
      signal: 'SETTLE',
      outcome: 'PASS',
      outcomeHash: 'b'.repeat(64),
      signalSeq: 1,
      validUntil: '2026-03-31T00:05:00Z',
      performerGatewayId: 'gw-002',
      timestamp: '2026-03-31T00:00:00Z',
      nonce: 'nonce-1234567890123456',
      performerSignature: 'sig-perf',
    });

    const { url, init } = lastCall(fetch);
    expect(url).toContain('/federation/v1/signals');
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body as string);
    expect(body.signal).toBe('SETTLE');
    expect(body.outcome).toBe('PASS');
  });

  it('rotateKey() posts to correct path', async () => {
    await client.federation.rotateKey('gw-001', {
      newSigningPublicKey: 'new-ed25519-pk',
      newEncryptionPublicKey: 'new-x25519-pk',
      signatureOldKey: 'old-sig',
      signatureNewKey: 'new-sig',
      timestamp: '2026-03-31T00:00:00Z',
      nonce: 'nonce-1234567890123456',
    });

    const { url, init } = lastCall(fetch);
    expect(url).toContain('/federation/v1/gateways/gw-001/rotate-key');
    expect(init.method).toBe('POST');
  });

  it('revoke() sends NO Authorization header', async () => {
    await client.federation.revoke('gw-001', {
      revocationSecret: 'supersecretrevoke',
      reason: 'key_compromise',
    });

    const { init } = lastCall(fetch);
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
    const body = JSON.parse(init.body as string);
    expect(body.reason).toBe('key_compromise');
  });

  it('catchUp() passes sincePosition as query param', async () => {
    fetch = mockFetch({ data: [], hasMore: false });
    client = new AgledgerClient({
      apiKey: 'gw_token',
      fetch: fetch as unknown as typeof globalThis.fetch,
    });

    await client.federation.catchUp({ sincePosition: 42, limit: 50 });
    const { url } = lastCall(fetch);
    expect(url).toContain('/federation/v1/catch-up');
    expect(url).toContain('sincePosition=42');
    expect(url).toContain('limit=50');
  });
});

// ---------------------------------------------------------------------------
// FederationAdminResource (Platform Operations)
// ---------------------------------------------------------------------------

describe('FederationAdminResource', () => {
  let fetch: ReturnType<typeof vi.fn>;
  let client: AgledgerClient;

  beforeEach(() => {
    fetch = mockFetch();
    client = new AgledgerClient({
      apiKey: 'admin_api_key',
      fetch: fetch as unknown as typeof globalThis.fetch,
    });
  });

  it('createRegistrationToken() posts to admin endpoint', async () => {
    await client.federationAdmin.createRegistrationToken({
      label: 'Test GW',
      expiresInHours: 24,
    });

    const { url, init } = lastCall(fetch);
    expect(url).toContain('/federation/v1/admin/registration-tokens');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer admin_api_key');
  });

  it('listGateways() supports status filter', async () => {
    fetch = mockFetch({ data: [], total: 0 });
    client = new AgledgerClient({
      apiKey: 'admin_api_key',
      fetch: fetch as unknown as typeof globalThis.fetch,
    });

    await client.federationAdmin.listGateways({ status: 'active', limit: 10 });
    const { url } = lastCall(fetch);
    expect(url).toContain('/federation/v1/admin/gateways');
    expect(url).toContain('status=active');
  });

  it('revokeGateway() posts to correct path with reason', async () => {
    await client.federationAdmin.revokeGateway('gw-001', { reason: 'Compromised key detected' });
    const { url, init } = lastCall(fetch);
    expect(url).toContain('/federation/v1/admin/gateways/gw-001/revoke');
    expect(init.method).toBe('POST');
  });

  it('queryRecords() supports hubState filter', async () => {
    fetch = mockFetch({ data: [], total: 0 });
    client = new AgledgerClient({
      apiKey: 'admin_api_key',
      fetch: fetch as unknown as typeof globalThis.fetch,
    });

    await client.federationAdmin.queryRecords({ hubState: 'ACTIVE', type: 'ACH-PROC-v1' });
    const { url } = lastCall(fetch);
    expect(url).toContain('/federation/v1/admin/records');
    expect(url).toContain('hubState=ACTIVE');
  });

  it('getAuditLog() supports entryType filter', async () => {
    fetch = mockFetch({ data: [], total: 0 });
    client = new AgledgerClient({
      apiKey: 'admin_api_key',
      fetch: fetch as unknown as typeof globalThis.fetch,
    });

    await client.federationAdmin.getAuditLog({ entryType: 'GATEWAY_REGISTERED' });
    const { url } = lastCall(fetch);
    expect(url).toContain('/federation/v1/admin/audit-log');
    expect(url).toContain('entryType=GATEWAY_REGISTERED');
  });

  it('getHealth() calls correct path', async () => {
    await client.federationAdmin.getHealth();
    const { url } = lastCall(fetch);
    expect(url).toContain('/federation/v1/admin/health');
  });

  it('resetSequence() posts with optional newSeq', async () => {
    await client.federationAdmin.resetSequence('gw-001', { newSeq: 100 });
    const { url, init } = lastCall(fetch);
    expect(url).toContain('/federation/v1/admin/gateways/gw-001/reset-seq');
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body as string);
    expect(body.newSeq).toBe(100);
  });

  it('listDlq() uses cursor pagination', async () => {
    fetch = mockFetch({ data: [], hasMore: false });
    client = new AgledgerClient({
      apiKey: 'admin_api_key',
      fetch: fetch as unknown as typeof globalThis.fetch,
    });

    await client.federationAdmin.listDlq({ limit: 25 });
    const { url } = lastCall(fetch);
    expect(url).toContain('/federation/v1/admin/outbound-dlq');
    expect(url).toContain('limit=25');
  });

  it('retryDlq() posts to correct path', async () => {
    await client.federationAdmin.retryDlq('dlq-001');
    const { url, init } = lastCall(fetch);
    expect(url).toContain('/federation/v1/admin/outbound-dlq/dlq-001/retry');
    expect(init.method).toBe('POST');
  });

  it('deleteDlq() sends DELETE to correct path', async () => {
    await client.federationAdmin.deleteDlq('dlq-001');
    const { url, init } = lastCall(fetch);
    expect(url).toContain('/federation/v1/admin/outbound-dlq/dlq-001');
    expect(init.method).toBe('DELETE');
  });
});

// ---------------------------------------------------------------------------
// createFederationClient factory
// ---------------------------------------------------------------------------

describe('createFederationClient', () => {
  it('creates a lightweight client with only federation resource', () => {
    const fc = createFederationClient({ bearerToken: 'bt-abc' });
    expect(fc.federation).toBeDefined();
    expect((fc as Record<string, unknown>).admin).toBeUndefined();
    expect((fc as Record<string, unknown>).records).toBeUndefined();
  });

  it('uses bearer token for authenticated requests', async () => {
    const fetch = mockFetch({ ack: true, serverTime: '2026-03-31T00:05:00Z', bearerToken: 'bt-new', bearerTokenExpiresAt: '2026-04-01T00:00:00Z', revocations: [] });
    const fc = createFederationClient({
      bearerToken: 'bt-abc',
      fetch: fetch as unknown as typeof globalThis.fetch,
    });

    await fc.federation.heartbeat({
      gatewayId: 'gw-001',
      agentCount: 0,
      recordCount: 0,
      timestamp: '2026-03-31T00:05:00Z',
    });

    const { init } = lastCall(fetch);
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer bt-abc');
  });
});
