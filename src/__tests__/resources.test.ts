import { describe, it, expect, vi } from 'vitest';
import { AgledgerClient } from '../client.js';

function createMockClient(responseOverride?: unknown) {
  const fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue(responseOverride ?? { id: 'test-id', status: 'DRAFT' }),
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

describe('MandatesResource', () => {
  it('creates a mandate', async () => {
    const { client, fetch } = createMockClient();
    await client.mandates.create({
      enterpriseId: 'ent-1',
      contractType: 'ACH-PROC-v1',
      contractVersion: '1',
      platform: 'test',
      criteria: { item_spec: 'Widget' },
    });

    const [url, init] = fetch.mock.calls[0];
    expect(url).toContain('/mandates');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toHaveProperty('contractType', 'ACH-PROC-v1');
  });

  it('creates a mandate with typed criteria', async () => {
    const { client, fetch } = createMockClient();
    await client.mandates.create({
      enterpriseId: 'ent-1',
      contractType: 'ACH-DATA-v1',
      contractVersion: '1',
      platform: 'internal-etl',
      criteria: {
        description: 'Nightly ETL pipeline',
        output_format: 'parquet',
        row_count_min: 100_000,
      },
    });

    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.contractType).toBe('ACH-DATA-v1');
    expect(body.criteria.description).toBe('Nightly ETL pipeline');
    expect(body.criteria.row_count_min).toBe(100_000);
  });

  it('creates a mandate with untyped criteria for unknown contract types', async () => {
    const { client, fetch } = createMockClient();
    await client.mandates.create({
      enterpriseId: 'ent-1',
      contractType: 'ACH-CUSTOM-v1',
      contractVersion: '1',
      platform: 'test',
      criteria: { custom_field: 'any value' },
    });

    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.contractType).toBe('ACH-CUSTOM-v1');
    expect(body.criteria.custom_field).toBe('any value');
  });

  it('gets a mandate by ID', async () => {
    const { client, fetch } = createMockClient();
    await client.mandates.get('mnd-123');
    expect(fetch.mock.calls[0][0]).toContain('/mandates/mnd-123');
  });

  it('lists mandates with enterpriseId', async () => {
    const { client, fetch } = createPageMockClient();
    await client.mandates.list({ enterpriseId: 'ent-123' });
    const url = fetch.mock.calls[0][0];
    expect(url).toContain('/mandates');
    expect(url).toContain('enterpriseId=ent-123');
  });

  it('searches mandates with filters', async () => {
    const { client, fetch } = createPageMockClient();
    await client.mandates.search({ enterpriseId: 'ent-123', status: 'ACTIVE', contractType: 'ACH-TXN-v1' });
    const url = fetch.mock.calls[0][0];
    expect(url).toContain('/mandates/search');
    expect(url).toContain('status=ACTIVE');
    expect(url).toContain('contractType=ACH-TXN-v1');
  });

  it('transitions a mandate with reason', async () => {
    const { client, fetch } = createMockClient();
    await client.mandates.transition('mnd-123', 'cancel', 'Budget exceeded');
    const [url, init] = fetch.mock.calls[0];
    expect(url).toContain('/mandates/mnd-123/transition');
    expect(JSON.parse(init.body)).toEqual({ action: 'cancel', reason: 'Budget exceeded' });
  });

  it('cancel passes reason through', async () => {
    const { client, fetch } = createMockClient();
    await client.mandates.cancel('mnd-123', 'No longer needed');
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.reason).toBe('No longer needed');
  });

  it('responds to a proposed mandate', async () => {
    const { client, fetch } = createMockClient();
    await client.mandates.respond('mnd-123', { action: 'counter', counterTerms: { price: 50 } });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toContain('/mandates/mnd-123/respond');
    expect(JSON.parse(init.body).action).toBe('counter');
  });

  it('accepts a counter-proposal', async () => {
    const { client, fetch } = createMockClient();
    await client.mandates.acceptCounter('mnd-123');
    expect(fetch.mock.calls[0][0]).toContain('/mandates/mnd-123/accept-counter');
  });

  it('gets delegation chain', async () => {
    const { client, fetch } = createMockClient([]);
    await client.mandates.getChain('mnd-123');
    expect(fetch.mock.calls[0][0]).toContain('/mandates/mnd-123/chain');
  });

  it('gets sub-mandates', async () => {
    const { client, fetch } = createPageMockClient();
    await client.mandates.getSubMandates('mnd-123');
    expect(fetch.mock.calls[0][0]).toContain('/mandates/mnd-123/sub-mandates');
  });

  it('delegates a mandate via agent endpoint', async () => {
    const { client, fetch } = createMockClient();
    await client.mandates.delegate('mnd-123', {
      principalAgentId: 'agent-principal',
      performerAgentId: 'agent-456',
      contractType: 'ACH-PROC-v1',
      contractVersion: '1',
      platform: 'test',
      criteria: {},
      commissionPct: 10,
    });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toContain('/mandates/agent');
    const body = JSON.parse(init.body);
    expect(body).toHaveProperty('parentMandateId', 'mnd-123');
    expect(body).toHaveProperty('performerAgentId', 'agent-456');
  });

  it('bulk creates mandates', async () => {
    const { client, fetch } = createMockClient();
    await client.mandates.bulkCreate([
      { enterpriseId: 'ent-1', contractType: 'ACH-PROC-v1', contractVersion: '1', platform: 'test', criteria: {} },
    ]);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toContain('/mandates/bulk');
    expect(JSON.parse(init.body).mandates).toHaveLength(1);
  });

  it('lists mandates as principal', async () => {
    const { client, fetch } = createPageMockClient();
    await client.mandates.listAsPrincipal();
    expect(fetch.mock.calls[0][0]).toContain('/mandates/agent/principal');
  });

  it('lists proposals', async () => {
    const { client, fetch } = createPageMockClient();
    await client.mandates.listProposals();
    expect(fetch.mock.calls[0][0]).toContain('/mandates/agent/proposals');
  });

  it('createAndActivate creates then registers then activates', async () => {
    let callCount = 0;
    const fetch = vi.fn().mockImplementation(() => {
      callCount++;
      const status = callCount === 1 ? 'DRAFT'
        : callCount === 2 ? 'REGISTERED'
        : 'ACTIVE';
      return Promise.resolve({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ id: 'mnd-new', status }),
        headers: new Headers(),
      });
    });
    const client = new AgledgerClient({
      apiKey: 'test_key',
      fetch: fetch as unknown as typeof globalThis.fetch,
      maxRetries: 0,
    });
    const result = await client.mandates.createAndActivate({
      enterpriseId: 'ent-1',
      contractType: 'ACH-PROC-v1',
      contractVersion: '1',
      platform: 'test',
      criteria: {},
    });
    expect(result.status).toBe('ACTIVE');
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch.mock.calls[1][0]).toContain('/mandates/mnd-new/transition');
    expect(JSON.parse(fetch.mock.calls[1][1].body).action).toBe('register');
    expect(fetch.mock.calls[2][0]).toContain('/mandates/mnd-new/transition');
    expect(JSON.parse(fetch.mock.calls[2][1].body).action).toBe('activate');
  });

  it('getValidTransitions returns client-side transitions', () => {
    const { client } = createMockClient();
    const mandate = { status: 'DRAFT' } as import('../types.js').Mandate;
    const transitions = client.mandates.getValidTransitions(mandate);
    expect(transitions).toContain('REGISTERED');
    expect(transitions).toContain('PROPOSED');
    expect(transitions).not.toContain('ACTIVE');
  });
});

describe('ReceiptsResource', () => {
  it('submits a receipt', async () => {
    const { client, fetch } = createMockClient();
    await client.receipts.submit('mnd-123', { agentId: 'agt-1', evidence: { delivered: true } });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toContain('/mandates/mnd-123/receipts');
    expect(init.method).toBe('POST');
  });

  it('submits a receipt with typed evidence', async () => {
    const { client, fetch } = createMockClient();
    await client.receipts.submit<'ACH-INFRA-v1'>('mnd-123', {
      agentId: 'agt-1',
      evidence: {
        action: 'deploy_service',
        resource_name: 'api-gateway',
        resource_type: 'service',
        status: 'running',
        environment: 'staging',
      },
    });
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.evidence.action).toBe('deploy_service');
    expect(body.evidence.environment).toBe('staging');
  });

  it('updates a receipt', async () => {
    const { client, fetch } = createMockClient();
    await client.receipts.update('mnd-123', 'rct-456', { notes: 'Updated' });
    const url = fetch.mock.calls[0][0];
    expect(url).toContain('/mandates/mnd-123/receipts/rct-456');
    expect(fetch.mock.calls[0][1].method).toBe('PATCH');
  });

  it('lists receipts for a mandate', async () => {
    const { client, fetch } = createPageMockClient();
    const result = await client.receipts.list('mnd-123');
    expect(fetch.mock.calls[0][0]).toContain('/mandates/mnd-123/receipts');
    expect(result.data).toEqual([]);
  });
});

describe('VerificationResource', () => {
  it('triggers verification', async () => {
    const { client, fetch } = createMockClient();
    await client.verification.verify('mnd-123', ['rct-1', 'rct-2']);
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.receiptIds).toEqual(['rct-1', 'rct-2']);
  });

  it('gets verification status', async () => {
    const { client, fetch } = createMockClient();
    await client.verification.getStatus('mnd-123');
    expect(fetch.mock.calls[0][0]).toContain('/mandates/mnd-123/verification-status');
  });
});

describe('DisputesResource', () => {
  it('creates a dispute', async () => {
    const { client, fetch } = createMockClient();
    await client.disputes.create('mnd-123', { grounds: 'Wrong quantity' });
    expect(fetch.mock.calls[0][0]).toContain('/mandates/mnd-123/dispute');
  });

  it('escalates a dispute', async () => {
    const { client, fetch } = createMockClient();
    await client.disputes.escalate('mnd-123', 'Need higher review');
    expect(fetch.mock.calls[0][0]).toContain('/mandates/mnd-123/dispute/escalate');
  });

  it('resolves a dispute', async () => {
    const { client, fetch } = createMockClient();
    await client.disputes.resolve('mnd-123', { resolution: 'Split 50/50', amount: 500 });
    expect(fetch.mock.calls[0][0]).toContain('/mandates/mnd-123/dispute/resolve');
  });
});

describe('WebhooksResource', () => {
  it('creates a webhook', async () => {
    const { client, fetch } = createMockClient();
    await client.webhooks.create({ url: 'https://example.com/hook', events: ['receipt.submitted'] });
    expect(fetch.mock.calls[0][1].method).toBe('POST');
  });

  it('pings a webhook', async () => {
    const { client, fetch } = createMockClient();
    await client.webhooks.ping('wh-123');
    expect(fetch.mock.calls[0][0]).toContain('/webhooks/wh-123/ping');
  });

  it('deletes a webhook', async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json: vi.fn(),
      headers: new Headers(),
    });
    const client = new AgledgerClient({
      apiKey: 'test',
      fetch: fetch as unknown as typeof globalThis.fetch,
      maxRetries: 0,
    });
    await client.webhooks.delete('wh-123');
    expect(fetch.mock.calls[0][1].method).toBe('DELETE');
  });

  it('lists deliveries with status filter', async () => {
    const { client, fetch } = createPageMockClient();
    await client.webhooks.listDeliveries('wh-123', { status: 'failed' });
    const url = fetch.mock.calls[0][0];
    expect(url).toContain('/webhooks/wh-123/deliveries');
    expect(url).toContain('status=failed');
  });
});

describe('ComplianceResource', () => {
  it('exports compliance data', async () => {
    const { client, fetch } = createMockClient();
    await client.compliance.export({ format: 'json' });
    expect(fetch.mock.calls[0][0]).toContain('/compliance/export');
  });

  it('creates AI impact assessment', async () => {
    const { client, fetch } = createMockClient();
    await client.compliance.createAssessment('mnd-123', { riskLevel: 'high', domain: 'healthcare' });
    expect(fetch.mock.calls[0][0]).toContain('/mandates/mnd-123/ai-impact-assessment');
  });
});

describe('ReputationResource', () => {
  it('gets agent reputation', async () => {
    const { client, fetch } = createMockClient();
    await client.reputation.getAgent('agent-123');
    expect(fetch.mock.calls[0][0]).toContain('/agents/agent-123/reputation');
  });

  it('gets reputation history', async () => {
    const { client, fetch } = createPageMockClient();
    await client.reputation.getHistory('agent-123', { from: '2026-01-01' });
    const url = fetch.mock.calls[0][0];
    expect(url).toContain('/agents/agent-123/reputation/history');
    expect(url).toContain('from=2026-01-01');
  });
});

describe('HealthResource', () => {
  it('checks health', async () => {
    const { client, fetch } = createMockClient();
    await client.health.check();
    expect(fetch.mock.calls[0][0]).toContain('/health');
  });

  it('checks status', async () => {
    const { client, fetch } = createMockClient();
    await client.health.status();
    expect(fetch.mock.calls[0][0]).toContain('/status');
  });

  it('gets conformance', async () => {
    const { client, fetch } = createMockClient();
    await client.health.conformance();
    expect(fetch.mock.calls[0][0]).toContain('/v1/conformance');
  });
});

describe('RegistrationResource', () => {
  it('gets authenticated profile', async () => {
    const { client, fetch } = createMockClient();
    await client.registration.getMe();
    expect(fetch.mock.calls[0][0]).toContain('/v1/auth/me');
  });

  it('registers a new account', async () => {
    const { client, fetch } = createMockClient();
    await client.registration.register({ accountType: 'agent', email: 'a@b.com', legalName: 'Test' });
    expect(fetch.mock.calls[0][0]).toContain('/v1/auth/register');
  });

  it('verifies agent card', async () => {
    const { client, fetch } = createMockClient();
    await client.registration.verifyAgentCard('https://agent.example.com/.well-known/agent-card.json');
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.agentCardUrl).toContain('agent-card.json');
  });
});

describe('AdminResource', () => {
  it('lists enterprises', async () => {
    const { client, fetch } = createPageMockClient();
    await client.admin.listEnterprises();
    expect(fetch.mock.calls[0][0]).toContain('/v1/admin/enterprises');
  });

  it('lists agents', async () => {
    const { client, fetch } = createPageMockClient();
    await client.admin.listAgents();
    expect(fetch.mock.calls[0][0]).toContain('/v1/admin/agents');
  });

  it('updates trust level', async () => {
    const { client, fetch } = createMockClient();
    await client.admin.updateTrustLevel('acct-123', { trustLevel: 'verified' });
    expect(fetch.mock.calls[0][0]).toContain('/v1/admin/accounts/acct-123/trust-level');
  });

  it('lists DLQ entries', async () => {
    const { client, fetch } = createPageMockClient();
    await client.admin.listDlq();
    expect(fetch.mock.calls[0][0]).toContain('/v1/admin/webhook-dlq');
  });

  it('retries DLQ entry', async () => {
    const { client, fetch } = createMockClient();
    await client.admin.retryDlq('dlq-123');
    expect(fetch.mock.calls[0][0]).toContain('/v1/admin/webhook-dlq/dlq-123/retry');
  });

  it('gets system health', async () => {
    const { client, fetch } = createMockClient();
    await client.admin.getSystemHealth();
    expect(fetch.mock.calls[0][0]).toContain('/v1/admin/system-health');
  });

  it('creates API key with scopes', async () => {
    const { client, fetch } = createMockClient();
    await client.admin.createApiKey({
      ownerId: 'ent-1',
      ownerType: 'enterprise',
      scopes: ['mandates:read', 'mandates:write'],
    });
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.scopes).toEqual(['mandates:read', 'mandates:write']);
  });

  it('creates API key with scope profile', async () => {
    const { client, fetch } = createMockClient();
    await client.admin.createApiKey({
      ownerId: 'ent-1',
      ownerType: 'enterprise',
      scopeProfile: 'sidecar',
    });
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.scopeProfile).toBe('sidecar');
  });
});

describe('A2aResource', () => {
  it('fetches agent card', async () => {
    const { client, fetch } = createMockClient();
    await client.a2a.getAgentCard();
    expect(fetch.mock.calls[0][0]).toContain('/.well-known/agent-card.json');
  });

  it('dispatches JSON-RPC request', async () => {
    const { client, fetch } = createMockClient();
    await client.a2a.dispatch({ jsonrpc: '2.0', method: 'tasks/send', params: { task: 'test' }, id: '1' });
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.jsonrpc).toBe('2.0');
    expect(body.method).toBe('tasks/send');
  });

  it('call() auto-generates JSON-RPC envelope', async () => {
    const { client, fetch } = createMockClient();
    await client.a2a.call('tasks/send', { task: 'hello' });
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.jsonrpc).toBe('2.0');
    expect(body.method).toBe('tasks/send');
    expect(body.id).toBeDefined();
  });
});

describe('CapabilitiesResource', () => {
  it('gets agent capabilities', async () => {
    const { client, fetch } = createMockClient();
    await client.capabilities.get('agent-123');
    expect(fetch.mock.calls[0][0]).toContain('/v1/agents/agent-123/capabilities');
  });

  it('sets agent capabilities', async () => {
    const { client, fetch } = createMockClient();
    await client.capabilities.set('agent-123', { capabilities: ['ACH-PROC-v1', 'ACH-DATA-v1'] });
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.capabilities).toEqual(['ACH-PROC-v1', 'ACH-DATA-v1']);
  });
});

describe('EnterprisesResource', () => {
  it('approves an agent via PUT', async () => {
    const { client, fetch } = createMockClient();
    await client.enterprises.approveAgent('ent-1', 'agent-1', { reason: 'Trusted partner' });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toContain('/v1/enterprises/ent-1/agents/agent-1');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body)).toHaveProperty('reason', 'Trusted partner');
  });

  it('revokes an agent via DELETE', async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json: vi.fn(),
      headers: new Headers(),
    });
    const client = new AgledgerClient({
      apiKey: 'test',
      fetch: fetch as unknown as typeof globalThis.fetch,
      maxRetries: 0,
    });
    await client.enterprises.revokeAgent('ent-1', 'agent-1');
    const [url, init] = fetch.mock.calls[0];
    expect(url).toContain('/v1/enterprises/ent-1/agents/agent-1');
    expect(init.method).toBe('DELETE');
  });

  it('updates agent status via PATCH', async () => {
    const { client, fetch } = createMockClient();
    await client.enterprises.updateAgentStatus('ent-1', 'agent-1', { status: 'suspended', reason: 'Policy violation' });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toContain('/v1/enterprises/ent-1/agents/agent-1');
    expect(init.method).toBe('PATCH');
    const body = JSON.parse(init.body);
    expect(body.status).toBe('suspended');
    expect(body.reason).toBe('Policy violation');
  });

  it('bulk approves agents via POST', async () => {
    const { client, fetch } = createMockClient();
    await client.enterprises.bulkApprove('ent-1', { agents: [{ agentId: 'a1' }, { agentId: 'a2', reason: 'OK' }] });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toContain('/v1/enterprises/ent-1/agents/bulk');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body).agents).toHaveLength(2);
  });

  it('lists agents with page mock', async () => {
    const { client, fetch } = createPageMockClient();
    await client.enterprises.listAgents('ent-1');
    expect(fetch.mock.calls[0][0]).toContain('/v1/enterprises/ent-1/agents');
  });

  it('lists agents with status filter', async () => {
    const { client, fetch } = createPageMockClient();
    await client.enterprises.listAgents('ent-1', { status: 'suspended' });
    const url = fetch.mock.calls[0][0];
    expect(url).toContain('status=suspended');
  });

  it('gets a single agent', async () => {
    const { client, fetch } = createMockClient();
    await client.enterprises.getAgent('ent-1', 'agent-1');
    expect(fetch.mock.calls[0][0]).toContain('/v1/enterprises/ent-1/agents/agent-1');
  });

  it('gets approval config', async () => {
    const { client, fetch } = createMockClient();
    await client.enterprises.getApprovalConfig('ent-1');
    expect(fetch.mock.calls[0][0]).toContain('/v1/enterprises/ent-1/approval-config');
  });

  it('sets approval config via PUT', async () => {
    const { client, fetch } = createMockClient();
    await client.enterprises.setApprovalConfig('ent-1', { agentApprovalRequired: true, allowSelfApproval: false });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toContain('/v1/enterprises/ent-1/approval-config');
    expect(init.method).toBe('PUT');
    const body = JSON.parse(init.body);
    expect(body.agentApprovalRequired).toBe(true);
    expect(body.allowSelfApproval).toBe(false);
  });
});

describe('SchemasResource', () => {
  it('lists contract types from /v1/schemas', async () => {
    const { client, fetch } = createPageMockClient();
    await client.schemas.list();
    expect(fetch.mock.calls[0][0]).toContain('/v1/schemas');
  });

  it('gets a contract schema', async () => {
    const { client, fetch } = createMockClient();
    await client.schemas.get('ACH-PROC-v1');
    expect(fetch.mock.calls[0][0]).toContain('/v1/schemas/ACH-PROC-v1');
  });

  it('gets rules for a contract type', async () => {
    const { client, fetch } = createMockClient();
    await client.schemas.getRules('ACH-PROC-v1');
    expect(fetch.mock.calls[0][0]).toContain('/v1/schemas/ACH-PROC-v1/rules');
  });

  it('validates receipt against schema', async () => {
    const { client, fetch } = createMockClient();
    await client.schemas.validateReceipt('ACH-PROC-v1', { quantity: 100 });
    expect(fetch.mock.calls[0][0]).toContain('/v1/schemas/ACH-PROC-v1/validate');
  });

  it('gets meta-schema', async () => {
    const { client, fetch } = createMockClient();
    await client.schemas.getMetaSchema();
    expect(fetch.mock.calls[0][0]).toContain('/v1/schemas/meta-schema');
  });

  it('gets template for contract type', async () => {
    const { client, fetch } = createMockClient();
    await client.schemas.getTemplate('ACH-PROC-v1');
    const url = fetch.mock.calls[0][0];
    expect(url).toContain('/v1/schemas/ACH-PROC-v1');
    expect(url).toContain('format=template');
  });

  it('gets blank template', async () => {
    const { client, fetch } = createMockClient();
    await client.schemas.getBlankTemplate();
    expect(fetch.mock.calls[0][0]).toContain('/v1/schemas/_blank');
  });

  it('lists schema versions', async () => {
    const { client, fetch } = createMockClient([]);
    await client.schemas.getVersions('ACH-PROC-v1');
    expect(fetch.mock.calls[0][0]).toContain('/v1/schemas/ACH-PROC-v1/versions');
  });

  it('gets specific schema version', async () => {
    const { client, fetch } = createMockClient();
    await client.schemas.getVersion('ACH-PROC-v1', 1);
    expect(fetch.mock.calls[0][0]).toContain('/v1/schemas/ACH-PROC-v1/versions/1');
  });

  it('diffs two versions', async () => {
    const { client, fetch } = createMockClient();
    await client.schemas.diff('ACH-PROC-v1', 1, 2);
    const url = fetch.mock.calls[0][0];
    expect(url).toContain('/v1/schemas/ACH-PROC-v1/diff');
    expect(url).toContain('from=1');
    expect(url).toContain('to=2');
  });

  it('previews a schema', async () => {
    const { client, fetch } = createMockClient();
    await client.schemas.preview({
      contractType: 'ACH-CUSTOM-v1',
      displayName: 'Custom',
      mandateSchema: {},
      receiptSchema: {},
    });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toContain('/v1/schemas/preview');
    expect(init.method).toBe('POST');
  });

  it('checks compatibility', async () => {
    const { client, fetch } = createMockClient();
    await client.schemas.checkCompatibility('ACH-PROC-v1', {
      mandateSchema: {},
      receiptSchema: {},
    });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toContain('/v1/schemas/ACH-PROC-v1/check-compatibility');
    expect(init.method).toBe('POST');
  });

  it('registers a schema', async () => {
    const { client, fetch } = createMockClient();
    await client.schemas.register({
      contractType: 'ACH-CUSTOM-v1',
      displayName: 'Custom',
      mandateSchema: {},
      receiptSchema: {},
    });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toContain('/v1/schemas');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toHaveProperty('contractType', 'ACH-CUSTOM-v1');
  });

  it('updates a version', async () => {
    const { client, fetch } = createMockClient();
    await client.schemas.updateVersion('ACH-PROC-v1', 1, { status: 'DEPRECATED' });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toContain('/v1/schemas/ACH-PROC-v1/versions/1');
    expect(init.method).toBe('PATCH');
  });

  it('exports a schema with versions param', async () => {
    const { client, fetch } = createMockClient();
    await client.schemas.exportSchema('ACH-PROC-v1', { versions: '1,2' });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toContain('/v1/schemas/ACH-PROC-v1/export');
    expect(url).toContain('versions=1%2C2');
    expect(init.method).toBe('POST');
  });

  it('imports a schema', async () => {
    const { client, fetch } = createMockClient();
    await client.schemas.importSchema({ exportVersion: 1, contractType: 'ACH-CUSTOM-v1', versions: [{}] });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toContain('/v1/schemas/import');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toHaveProperty('contractType', 'ACH-CUSTOM-v1');
  });

  it('preview-imports with dryRun', async () => {
    const { client, fetch } = createMockClient();
    await client.schemas.previewImport({ exportVersion: 1, contractType: 'ACH-CUSTOM-v1', versions: [{}] });
    const url = fetch.mock.calls[0][0];
    expect(url).toContain('/v1/schemas/import');
    expect(url).toContain('dryRun=true');
  });

  it('registers a schema with expression field mapping', async () => {
    const { client, fetch } = createMockClient();
    await client.schemas.register({
      contractType: 'ACH-CUSTOM-v1',
      displayName: 'Custom Expression',
      mandateSchema: {},
      receiptSchema: {},
      fieldMappings: [
        {
          ruleId: 'expr-amount-check',
          criteriaPath: 'criteria.target',
          evidencePath: 'evidence.amount',
          valueType: 'expression',
          expression: 'abs(evidence.amount - criteria.target) <= tolerance.amount',
          toleranceField: 'criteria.tolerance',
        },
      ],
    });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toContain('/v1/schemas');
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body);
    expect(body).toHaveProperty('contractType', 'ACH-CUSTOM-v1');
    expect(body.fieldMappings).toHaveLength(1);
    expect(body.fieldMappings[0]).toMatchObject({
      ruleId: 'expr-amount-check',
      valueType: 'expression',
      expression: 'abs(evidence.amount - criteria.target) <= tolerance.amount',
    });
  });

  it('previews a schema with expression field mapping', async () => {
    const { client, fetch } = createMockClient();
    await client.schemas.preview({
      contractType: 'ACH-CUSTOM-v1',
      displayName: 'Custom Expression Preview',
      mandateSchema: {},
      receiptSchema: {},
      fieldMappings: [
        {
          ruleId: 'expr-budget-check',
          criteriaPath: 'criteria.budget',
          evidencePath: 'evidence.spent',
          valueType: 'expression',
          expression: 'abs(evidence.amount - criteria.target) <= tolerance.amount',
        },
      ],
    });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toContain('/v1/schemas/preview');
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body);
    expect(body.fieldMappings).toHaveLength(1);
    expect(body.fieldMappings[0].valueType).toBe('expression');
    expect(body.fieldMappings[0].expression).toBe(
      'abs(evidence.amount - criteria.target) <= tolerance.amount',
    );
  });
});
