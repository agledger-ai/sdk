import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgledgerClient, createFederationClient } from '../client.js';

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

describe('FederationResource (peer-facing)', () => {
  let fetch: ReturnType<typeof vi.fn>;
  let client: AgledgerClient;

  beforeEach(() => {
    fetch = mockFetch();
    client = new AgledgerClient({
      apiKey: 'agl_adm_test',
      fetch: fetch as unknown as typeof globalThis.fetch,
    });
  });

  it('peerHandshake() posts to /federation/v1/peer', async () => {
    await client.federation.peerHandshake({
      hubId: 'hub-x',
      signingPublicKey: 'ed25519-pk',
      encryptionPublicKey: 'x25519-pk',
      peeringToken: 'tok-abc',
      agentDirectory: [],
    });
    const { url } = lastCall(fetch);
    expect(url).toContain('/federation/v1/peer');
  });

  it('syncAgentDirectory() posts to /federation/v1/peer/agent-sync', async () => {
    await client.federation.syncAgentDirectory({
      hubId: 'hub-x',
      agents: [],
      directoryHash: 'sha256-abc',
    });
    const { url } = lastCall(fetch);
    expect(url).toContain('/federation/v1/peer/agent-sync');
  });

  it('submitStateTransition() posts to /federation/v1/state-transitions', async () => {
    await client.federation.submitStateTransition({
      recordId: 'rec-1',
      gatewayId: 'gw-1',
      state: 'FULFILLED',
      type: 'ACH-TXN-v1',
      criteriaHash: 'sha256-c',
      role: 'principal',
      seq: 1,
      idempotencyKey: 'idem-1',
      timestamp: '2026-05-21T00:00:00Z',
      nonce: 'n1',
      signature: 'sig1',
    });
    const { url } = lastCall(fetch);
    expect(url).toContain('/federation/v1/state-transitions');
  });

  it('relaySignal() posts to /federation/v1/signals', async () => {
    await client.federation.relaySignal({
      recordId: 'rec-1',
      signal: 'SETTLE',
      outcomeHash: 'sha256-o',
      signalSeq: 1,
      validUntil: '2026-05-22T00:00:00Z',
      performerGatewayId: 'gw-perf',
      timestamp: '2026-05-21T00:00:00Z',
      nonce: 'n2',
      performerSignature: 'sig2',
    });
    const { url } = lastCall(fetch);
    expect(url).toContain('/federation/v1/signals');
  });

  it('submitCoSignRequest() posts to /federation/v1/co-sign-requests', async () => {
    await client.federation.submitCoSignRequest({ recordId: 'rec-1', payload: 'cbor:...' });
    const { url } = lastCall(fetch);
    expect(url).toContain('/federation/v1/co-sign-requests');
  });

  it('submitDisputeProtocol() posts to /federation/v1/disputes', async () => {
    await client.federation.submitDisputeProtocol({ recordId: 'rec-1', reason: 'mismatch' });
    const { url } = lastCall(fetch);
    expect(url).toContain('/federation/v1/disputes');
  });

  it('contributeReputation() posts to /federation/v1/reputation/contribute', async () => {
    await client.federation.contributeReputation({
      agentId: 'a-1',
      type: 'ACH-PROC-v1',
      period: '2026-Q2',
      totalRecords: 10,
      totalVerified: 9,
      totalPassed: 9,
    });
    const { url } = lastCall(fetch);
    expect(url).toContain('/federation/v1/reputation/contribute');
  });

  it('getAgentReputation() GETs /federation/v1/agents/{id}/reputation', async () => {
    await client.federation.getAgentReputation('a-1');
    const { url } = lastCall(fetch);
    expect(url).toContain('/federation/v1/agents/a-1/reputation');
  });
});

describe('FederationAdminResource', () => {
  let fetch: ReturnType<typeof vi.fn>;
  let client: AgledgerClient;

  beforeEach(() => {
    fetch = mockFetch();
    client = new AgledgerClient({
      apiKey: 'agl_adm_test',
      fetch: fetch as unknown as typeof globalThis.fetch,
    });
  });

  it('createPeeringToken() posts to /federation/v1/admin/peering-tokens with label', async () => {
    await client.federationAdmin.createPeeringToken({ label: 'partner-x' });
    const { url, init } = lastCall(fetch);
    expect(url).toContain('/federation/v1/admin/peering-tokens');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ label: 'partner-x' });
  });

  it('listPeers() GETs /federation/v1/admin/peers', async () => {
    fetch = mockFetch({ data: [] });
    client = new AgledgerClient({
      apiKey: 'agl_adm_test',
      fetch: fetch as unknown as typeof globalThis.fetch,
    });
    await client.federationAdmin.listPeers({ status: 'active' });
    const { url } = lastCall(fetch);
    expect(url).toContain('/federation/v1/admin/peers');
    expect(url).toContain('status=active');
  });

  it('revokePeer() requires reason in body', async () => {
    await client.federationAdmin.revokePeer('hub-x', { reason: 'compromise' });
    const { url, init } = lastCall(fetch);
    expect(url).toContain('/federation/v1/admin/peers/hub-x/revoke');
    expect(JSON.parse(init.body as string)).toEqual({ reason: 'compromise' });
  });

  it('deletePeer() DELETEs the peer record', async () => {
    await client.federationAdmin.deletePeer('hub-x');
    const { url, init } = lastCall(fetch);
    expect(url).toContain('/federation/v1/admin/peers/hub-x');
    expect(init.method).toBe('DELETE');
  });

  it('listDlq() GETs /federation/v1/admin/dlq (consolidated)', async () => {
    fetch = mockFetch({ data: [] });
    client = new AgledgerClient({
      apiKey: 'agl_adm_test',
      fetch: fetch as unknown as typeof globalThis.fetch,
    });
    await client.federationAdmin.listDlq({ limit: 50 });
    const { url } = lastCall(fetch);
    expect(url).toContain('/federation/v1/admin/dlq');
    expect(url).not.toContain('outbound-dlq');
  });

  it('recoverDlq() posts to /federation/v1/admin/dlq/recover', async () => {
    await client.federationAdmin.recoverDlq();
    const { url } = lastCall(fetch);
    expect(url).toContain('/federation/v1/admin/dlq/recover');
  });

  it('getInstance() GETs this server\'s federation identity', async () => {
    await client.federationAdmin.getInstance();
    const { url } = lastCall(fetch);
    expect(url).toContain('/federation/v1/admin/instance');
  });
});

describe('createFederationClient', () => {
  it('creates a client with bearer token (federation peer convenience)', () => {
    const fc = createFederationClient({ bearerToken: 'bt-123' });
    expect(fc).toBeDefined();
    expect(fc.federation).toBeDefined();
  });
});
