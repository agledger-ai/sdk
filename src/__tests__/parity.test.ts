/**
 * SDK ↔ API Parity Test
 *
 * Validates that every SDK resource method maps to a real API route, and that
 * important API routes have SDK coverage. Uses the route manifest generated
 * from the API's OpenAPI spec (routes.json).
 *
 * To update the manifest:
 *   cd ~/projects/agledger-api && npx tsx scripts/generate-route-manifest.ts
 *   cp dist/routes.json ~/projects/agledger-agents/agledger-sdk/src/__tests__/routes.json
 *
 * Or fetch from production:
 *   curl -s https://api.agledger.ai/docs/json | npx tsx -e '...'
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Load route manifest
// ---------------------------------------------------------------------------

interface RouteEntry {
  method: string;
  path: string;
  operationId: string | null;
  tag: string | null;
  requiredFields: string[];
  bodyFields: string[];
  queryFields: string[];
  pathParams: string[];
  responseCodes: number[];
}

interface RouteManifest {
  generatedAt: string;
  routeCount: number;
  routes: RouteEntry[];
}

const manifest: RouteManifest = JSON.parse(
  readFileSync(resolve(__dirname, 'routes.json'), 'utf8'),
);

// Build a lookup: "METHOD /path" → RouteEntry
const routeMap = new Map<string, RouteEntry>();
for (const route of manifest.routes) {
  routeMap.set(`${route.method} ${route.path}`, route);
}

// ---------------------------------------------------------------------------
// SDK method → API route mapping
//
// Each entry: [sdkResource, sdkMethod, httpMethod, apiPath]
// Paths use OpenAPI {param} syntax (no /v1 prefix — the OpenAPI spec strips it).
// ---------------------------------------------------------------------------

type SdkMapping = [resource: string, method: string, httpMethod: string, apiPath: string];

const SDK_METHODS: SdkMapping[] = [
  // Mandates
  ['mandates', 'create', 'POST', '/mandates'],
  ['mandates', 'createAgent', 'POST', '/mandates/agent'],
  ['mandates', 'get', 'GET', '/mandates/{id}'],
  ['mandates', 'list', 'GET', '/mandates'],
  ['mandates', 'search', 'GET', '/mandates/search'],
  ['mandates', 'update', 'PATCH', '/mandates/{id}'],
  ['mandates', 'transition', 'POST', '/mandates/{id}/transition'],
  ['mandates', 'cancel', 'POST', '/mandates/{id}/cancel'],
  ['mandates', 'accept', 'POST', '/mandates/{id}/accept'],
  ['mandates', 'reject', 'POST', '/mandates/{id}/reject'],
  ['mandates', 'counterPropose', 'POST', '/mandates/{id}/counter-propose'],
  ['mandates', 'acceptCounter', 'POST', '/mandates/{id}/accept-counter'],
  ['mandates', 'batchGet', 'POST', '/mandates/batch'],
  ['mandates', 'getChain', 'GET', '/mandates/{id}/chain'],
  ['mandates', 'getSubMandates', 'GET', '/mandates/{id}/sub-mandates'],
  ['mandates', 'bulkCreate', 'POST', '/mandates/bulk'],
  ['mandates', 'listAsPrincipal', 'GET', '/mandates/agent/principal'],
  ['mandates', 'listProposals', 'GET', '/mandates/agent/proposals'],
  ['mandates', 'requestRevision', 'POST', '/mandates/{id}/revision'],
  ['mandates', 'getAudit', 'GET', '/mandates/{mandateId}/audit'],
  ['mandates', 'reportOutcome', 'POST', '/mandates/{id}/outcome'],
  ['mandates', 'getSummary', 'GET', '/mandates/summary'],

  // Receipts
  ['receipts', 'submit', 'POST', '/mandates/{mandateId}/receipts'],
  ['receipts', 'get', 'GET', '/mandates/{mandateId}/receipts/{receiptId}'],
  ['receipts', 'list', 'GET', '/mandates/{mandateId}/receipts'],

  // Verification
  ['verification', 'verify', 'POST', '/mandates/{id}/verify'],
  ['verification', 'getStatus', 'GET', '/mandates/{id}/verification-status'],

  // Disputes
  ['disputes', 'create', 'POST', '/mandates/{mandateId}/dispute'],
  ['disputes', 'get', 'GET', '/mandates/{mandateId}/dispute'],
  ['disputes', 'escalate', 'POST', '/mandates/{mandateId}/dispute/escalate'],
  ['disputes', 'submitEvidence', 'POST', '/mandates/{mandateId}/dispute/evidence'],

  // Webhooks
  ['webhooks', 'create', 'POST', '/webhooks'],
  ['webhooks', 'list', 'GET', '/webhooks'],
  ['webhooks', 'delete', 'DELETE', '/webhooks/{webhookId}'],
  ['webhooks', 'rotate', 'POST', '/webhooks/{webhookId}/rotate'],
  ['webhooks', 'ping', 'POST', '/webhooks/{webhookId}/ping'],
  ['webhooks', 'listDeliveries', 'GET', '/webhooks/{webhookId}/deliveries'],

  // Reputation
  ['reputation', 'getAgent', 'GET', '/agents/{agentId}/reputation'],
  ['reputation', 'getHistory', 'GET', '/agents/{agentId}/history'],

  // Capabilities
  ['capabilities', 'get', 'GET', '/agents/{agentId}/capabilities'],
  ['capabilities', 'set', 'PUT', '/agents/{agentId}/capabilities'],

  // Compliance
  ['compliance', 'export', 'POST', '/compliance/export'],
  ['compliance', 'getExportStatus', 'GET', '/compliance/export/{exportId}'],
  ['compliance', 'createAssessment', 'POST', '/mandates/{mandateId}/ai-impact-assessment'],
  ['compliance', 'getAssessment', 'GET', '/mandates/{mandateId}/ai-impact-assessment'],
  ['compliance', 'getEuAiActReport', 'GET', '/compliance/eu-ai-act/report'],
  ['compliance', 'createRecord', 'POST', '/mandates/{mandateId}/compliance-records'],
  ['compliance', 'listRecords', 'GET', '/mandates/{mandateId}/compliance-records'],
  ['compliance', 'getRecord', 'GET', '/mandates/{mandateId}/compliance-records/{recordId}'],
  ['compliance', 'exportMandate', 'GET', '/mandates/{mandateId}/audit-export'],
  ['compliance', 'stream', 'GET', '/audit/stream'],

  // Events
  ['events', 'list', 'GET', '/events'],

  // Schemas
  ['schemas', 'list', 'GET', '/schemas'],
  ['schemas', 'get', 'GET', '/schemas/{contractType}'],
  ['schemas', 'getRules', 'GET', '/schemas/{contractType}/rules'],
  ['schemas', 'validateReceipt', 'POST', '/schemas/{contractType}/validate'],
  ['schemas', 'register', 'POST', '/schemas'],
  ['schemas', 'preview', 'POST', '/schemas/preview'],

  // Dashboard
  ['dashboard', 'getSummary', 'GET', '/dashboard/summary'],
  ['dashboard', 'getMetrics', 'GET', '/dashboard/metrics'],
  ['dashboard', 'listAgents', 'GET', '/dashboard/agents'],
  ['dashboard', 'getAlerts', 'GET', '/dashboard/alerts'],
  ['dashboard', 'getDisputes', 'GET', '/dashboard/disputes'],
  ['dashboard', 'getAuditTrail', 'GET', '/dashboard/audit-trail'],

  // Registration
  ['registration', 'register', 'POST', '/auth/register'],
  ['registration', 'getMe', 'GET', '/auth/me'],

  // Admin
  ['admin', 'listEnterprises', 'GET', '/admin/enterprises'],
  ['admin', 'listAgents', 'GET', '/admin/agents'],
  ['admin', 'updateTrustLevel', 'PATCH', '/admin/accounts/{id}/trust-level'],
  ['admin', 'createApiKey', 'POST', '/admin/api-keys'],
  ['admin', 'listDlq', 'GET', '/admin/webhook-dlq'],
  ['admin', 'retryDlq', 'POST', '/admin/webhook-dlq/{dlqId}/retry'],
  ['admin', 'getSystemHealth', 'GET', '/admin/system-health'],

  // A2A
  ['a2a', 'getAgentCard', 'GET', '/.well-known/agent-card.json'],
  ['a2a', 'dispatch', 'POST', '/a2a'],

  // Enterprises
  ['enterprises', 'approveAgent', 'PUT', '/enterprises/{enterpriseId}/agents/{agentId}'],
  ['enterprises', 'revokeAgent', 'DELETE', '/enterprises/{enterpriseId}/agents/{agentId}'],
  ['enterprises', 'updateAgentStatus', 'PATCH', '/enterprises/{enterpriseId}/agents/{agentId}'],
  ['enterprises', 'bulkApprove', 'POST', '/enterprises/{enterpriseId}/agents/bulk'],
  ['enterprises', 'listAgents', 'GET', '/enterprises/{enterpriseId}/agents'],
  ['enterprises', 'getAgent', 'GET', '/enterprises/{enterpriseId}/agents/{agentId}'],
  ['enterprises', 'getApprovalConfig', 'GET', '/enterprises/{enterpriseId}/approval-config'],
  ['enterprises', 'setApprovalConfig', 'PUT', '/enterprises/{enterpriseId}/approval-config'],

  // Notarize
  ['notarize', 'create', 'POST', '/notarize/mandates'],
  ['notarize', 'get', 'GET', '/notarize/mandates/{id}'],
  ['notarize', 'submitReceipt', 'POST', '/notarize/mandates/{id}/receipts'],
  ['notarize', 'verdict', 'POST', '/notarize/mandates/{id}/verdict'],

  // Mandates — additional
  ['mandates', 'getGraph', 'GET', '/mandates/{id}/graph'],

  // Webhooks — additional
  ['webhooks', 'get', 'GET', '/webhooks/{webhookId}'],
  ['webhooks', 'update', 'PATCH', '/webhooks/{webhookId}'],
  ['webhooks', 'pause', 'POST', '/webhooks/{webhookId}/pause'],
  ['webhooks', 'resume', 'POST', '/webhooks/{webhookId}/resume'],
  ['webhooks', 'listDlq', 'GET', '/webhooks/{webhookId}/dlq'],
  ['webhooks', 'retryDlq', 'POST', '/webhooks/{webhookId}/dlq/{dlqId}/retry'],
  ['webhooks', 'retryAllDlq', 'POST', '/webhooks/{webhookId}/dlq/retry-all'],

  // Schemas — additional
  ['schemas', 'delete', 'DELETE', '/schemas/{contractType}'],

  // Projects
  ['projects', 'create', 'POST', '/projects'],
  ['projects', 'list', 'GET', '/projects'],
  ['projects', 'get', 'GET', '/projects/{id}'],
  ['projects', 'update', 'PATCH', '/projects/{id}'],
  ['projects', 'delete', 'DELETE', '/projects/{id}'],

  // Admin — additional
  ['admin', 'createEnterprise', 'POST', '/admin/enterprises'],
  ['admin', 'createAgent', 'POST', '/admin/agents'],
  ['admin', 'listMandates', 'GET', '/admin/mandates'],
  ['admin', 'replaceEnterpriseConfig', 'PUT', '/admin/enterprises/{id}/config'],
  ['admin', 'listRateLimitExemptions', 'GET', '/admin/rate-limit-exemptions/ips'],
  ['admin', 'setRateLimitExemption', 'PUT', '/admin/rate-limit-exemptions/ip/{ip}'],
  ['admin', 'deleteRateLimitExemption', 'DELETE', '/admin/rate-limit-exemptions/ip/{ip}'],
  ['admin', 'getWebhookHealth', 'GET', '/admin/webhooks/health'],
  ['admin', 'updateCircuitBreaker', 'PATCH', '/admin/webhooks/{webhookId}/circuit-breaker'],

  // Federation — Gateway Operations
  ['federation', 'register', 'POST', '/federation/v1/register'],
  ['federation', 'heartbeat', 'POST', '/federation/v1/heartbeat'],
  ['federation', 'registerAgent', 'POST', '/federation/v1/agents'],
  ['federation', 'listAgents', 'GET', '/federation/v1/agents'],
  ['federation', 'submitStateTransition', 'POST', '/federation/v1/state-transitions'],
  ['federation', 'relaySignal', 'POST', '/federation/v1/signals'],
  ['federation', 'rotateKey', 'POST', '/federation/v1/gateways/{id}/rotate-key'],
  ['federation', 'revoke', 'POST', '/federation/v1/gateways/{id}/revoke'],

  // Federation — Additional Gateway Operations
  ['federation', 'catchUp', 'GET', '/federation/v1/catch-up'],
  ['federation', 'stream', 'GET', '/federation/v1/stream'],
  ['federation', 'publishSchema', 'POST', '/federation/v1/schemas/{contractType}/publish'],
  ['federation', 'confirmSchemaPublish', 'POST', '/federation/v1/schemas/{contractType}/publish/confirm'],
  ['federation', 'listContractTypes', 'GET', '/federation/v1/contract-types'],
  ['federation', 'getContractType', 'GET', '/federation/v1/contract-types/{contractType}'],
  ['federation', 'getMandateCriteria', 'GET', '/federation/v1/mandates/{mandateId}/criteria'],
  ['federation', 'submitMandateCriteria', 'POST', '/federation/v1/mandates/{mandateId}/criteria'],
  ['federation', 'contributeReputation', 'POST', '/federation/v1/reputation/contribute'],
  ['federation', 'getAgentReputation', 'GET', '/federation/v1/agents/{agentId}/reputation'],
  ['federation', 'broadcastRevocations', 'POST', '/federation/v1/peer/revocations'],
  ['federation', 'syncAgentDirectory', 'POST', '/federation/v1/peer/agent-sync'],

  // Federation — Admin Operations
  ['federationAdmin', 'createRegistrationToken', 'POST', '/federation/v1/admin/registration-tokens'],
  ['federationAdmin', 'listGateways', 'GET', '/federation/v1/admin/gateways'],
  ['federationAdmin', 'revokeGateway', 'POST', '/federation/v1/admin/gateways/{id}/revoke'],
  ['federationAdmin', 'queryMandates', 'GET', '/federation/v1/admin/mandates'],
  ['federationAdmin', 'getAuditLog', 'GET', '/federation/v1/admin/audit-log'],
  ['federationAdmin', 'getHealth', 'GET', '/federation/v1/admin/health'],
  ['federationAdmin', 'resetSequence', 'POST', '/federation/v1/admin/gateways/{id}/reset-seq'],
  ['federationAdmin', 'listDlq', 'GET', '/federation/v1/admin/outbound-dlq'],
  ['federationAdmin', 'retryDlq', 'POST', '/federation/v1/admin/outbound-dlq/{id}/retry'],
  ['federationAdmin', 'deleteDlq', 'DELETE', '/federation/v1/admin/outbound-dlq/{id}'],
  ['federationAdmin', 'rotateHubKey', 'POST', '/federation/v1/admin/rotate-hub-key'],
  ['federationAdmin', 'listHubKeys', 'GET', '/federation/v1/admin/hub-keys'],
  ['federationAdmin', 'activateHubKey', 'POST', '/federation/v1/admin/hub-keys/{id}/activate'],
  ['federationAdmin', 'expireHubKey', 'POST', '/federation/v1/admin/hub-keys/{id}/expire'],
  ['federationAdmin', 'registerPeer', 'POST', '/federation/v1/peer'],
  ['federationAdmin', 'listPeers', 'GET', '/federation/v1/admin/peers'],
  ['federationAdmin', 'getPeer', 'GET', '/federation/v1/admin/peers/{hubId}'],
  ['federationAdmin', 'revokePeer', 'POST', '/federation/v1/admin/peers/{hubId}/revoke'],
  ['federationAdmin', 'resyncPeer', 'POST', '/federation/v1/admin/peers/{hubId}/resync'],
  ['federationAdmin', 'createPeeringToken', 'POST', '/federation/v1/admin/peering-tokens'],
  ['federationAdmin', 'deleteSchemaVersion', 'DELETE', '/federation/v1/admin/schemas/{contractType}/{version}'],
  ['federationAdmin', 'listReputationContributions', 'GET', '/federation/v1/admin/reputation/{agentId}'],
  ['federationAdmin', 'resetReputation', 'DELETE', '/federation/v1/admin/reputation/{agentId}'],
  ['federationAdmin', 'getMandateCriteriaStatus', 'GET', '/federation/v1/admin/mandates/{mandateId}/criteria-status'],

  // Agents
  ['agents', 'get', 'GET', '/agents/{id}'],
  ['agents', 'update', 'PATCH', '/agents/{id}'],
  ['agents', 'addReferences', 'POST', '/agents/{id}/references'],
  ['agents', 'getReferences', 'GET', '/agents/{id}/references'],

  // References
  ['references', 'lookup', 'GET', '/references'],
  ['references', 'addMandateReferences', 'POST', '/mandates/{id}/references'],
  ['references', 'getMandateReferences', 'GET', '/mandates/{id}/references'],

  // Admin — Vault
  ['admin', 'listVaultSigningKeys', 'GET', '/admin/vault/signing-keys'],
  ['admin', 'rotateVaultSigningKey', 'POST', '/admin/vault/signing-keys/rotate'],
  ['admin', 'listVaultAnchors', 'GET', '/admin/vault/anchors'],
  ['admin', 'verifyVaultAnchors', 'POST', '/admin/vault/anchors/verify'],
  ['admin', 'startVaultScan', 'POST', '/admin/vault/scan'],
  ['admin', 'getVaultScanStatus', 'GET', '/admin/vault/scan/{jobId}'],
];

// ---------------------------------------------------------------------------
// API routes that are intentionally NOT in the SDK
// (internal, admin-only, or convenience aliases)
// ---------------------------------------------------------------------------

const EXCLUDED_ROUTES = new Set([
  // Health & status (no auth, SDK has HealthResource for the important ones)
  'GET /health',
  'GET /health/ready',
  'GET /status',
  'GET /llms.txt',
  'GET /lifecycle',

  // Agent card alias
  'GET /.well-known/agent.json',

  // SIEM (internal)
  'GET /siem/alerts',
  'PATCH /siem/alerts/{alertId}',
  'GET /siem/alerts/{alertId}',
  'POST /siem/test-alert',

  // Ops (internal monitoring)
  'GET /ops/queue-health',

  // Portal (customer portal, separate frontend)
  'GET /portal/mandates',
  'GET /portal/mandates/{mandateId}',
  'GET /portal/mandates/{mandateId}/receipts',
  'POST /portal/mandates/{mandateId}/verdict',
  'GET /portal/mandate-summary',
  'GET /portal/profile',
  'POST /portal/invitations',
  'GET /portal/invitations',
  'PATCH /portal/invitations/{invitationId}',

  // Admin convenience routes handled by other SDK methods
  'PUT /admin/agents/{agentId}/capabilities',
  'GET /admin/agents/capabilities',
  'GET /admin/api-keys',
  'POST /admin/accounts/{id}/deactivate',
  'GET /admin/enterprises/{id}',
  'GET /admin/agents/{id}',

  // Auth routes (login is session-based, verify is email flow)
  'POST /auth/login',
  'POST /auth/verify-email',
  'POST /auth/resend-verification',
  'POST /auth/verify-agent-card',

  // Proxy ingestion (sidecar-only, uses SDK ProxyResource)
  'POST /proxy/sessions',
  'POST /proxy/sessions/{sessionId}/sync',
  'GET /proxy/sessions',
  'GET /proxy/sessions/{sessionId}',
  'GET /proxy/sessions/{sessionId}/tool-calls',
  'GET /proxy/sessions/{sessionId}/mandates',
  'GET /proxy/sessions/{sessionId}/mandates/{mandateId}',
  'PATCH /proxy/sessions/{sessionId}/mandates/{mandateId}',
  'GET /proxy/sessions/{sessionId}/receipts',
  'GET /proxy/sessions/{sessionId}/tool-catalog',
  'GET /proxy/analytics',
  'GET /proxy/analytics/{sessionId}',

  // Conformance (public, informational)
  'GET /conformance',

  // Schema subresource routes (SDK has these but paths may differ in OpenAPI)
  'GET /schemas/{contractType}/versions',
  'GET /schemas/{contractType}/versions/{version}',
  'PATCH /schemas/{contractType}/versions/{version}',
  'GET /schemas/{contractType}/diff',
  'POST /schemas/{contractType}/export',
  'POST /schemas/import',
  'POST /schemas/{contractType}/check-compatibility',
  'GET /schemas/meta-schema',
  'GET /schemas/_blank',
  'GET /schemas/{contractType}/template',

  // Reputation per-contract-type (SDK gets aggregate only)
  'GET /agents/{agentId}/reputation/{contractType}',

  // Mandate cancel (SDK uses transition with cancel action)
  'POST /mandates/{id}/cancel',

  // Audit enterprise report (SDK uses compliance.getEnterpriseReport/analyzeAudit)
  'GET /audit/enterprise-report',
  'POST /audit/enterprise-report/analyze',

  // Dashboard (getStats removed in v0.15.1, alerts/disputes/auditTrail now in SDK)

  // Notarize subresources (SDK covers core CRUD, not all actions)
  'POST /notarize/mandates/{id}/accept',
  'POST /notarize/mandates/{id}/counter-propose',
  'GET /notarize/mandates/{id}/history',
  'POST /notarize/verify',

  // Additional proxy routes (sidecar-only, handled by ProxyResource)
  'POST /proxy/sessions/{sessionId}/tool-calls',
  'POST /proxy/sessions/{sessionId}/tool-catalog',
  'POST /proxy/sessions/{sessionId}/shadow-mandates',
  'GET /proxy/sessions/{sessionId}/shadow-mandates',
  'POST /proxy/sessions/{sessionId}/shadow-receipts',
  'GET /proxy/sessions/{sessionId}/shadow-receipts',
  'POST /proxy/sessions/{sessionId}/sidecar-mandates',
  'GET /proxy/sessions/{sessionId}/sidecar-mandates',
  'POST /proxy/sessions/{sessionId}/sidecar-receipts',
  'GET /proxy/sessions/{sessionId}/sidecar-receipts',
  'GET /proxy/sessions/{sessionId}/alignment',
  'GET /proxy/sessions/{sessionId}/analytics',
  'GET /proxy/sessions/{sessionId}/mandate-summary',
  'GET /proxy/analytics/summary',
  'GET /proxy/shadow-mandates',
  'PATCH /proxy/shadow-mandates/{sidecarMandateId}',
  'GET /proxy/sidecar-mandates',
  'PATCH /proxy/sidecar-mandates/{sidecarMandateId}',
  'POST /proxy/sync',

  // Portal signup
  'POST /portal/signup',

  // Admin DLQ retry-all
  'POST /admin/webhook-dlq/retry-all',

  // Events audit chain (SDK uses events.getAuditChain with different path pattern)
  'GET /events/audit-chain/{mandateId}',

  // Audit vault (internal, admin-only export)
  'GET /audit-vault/export',

  // License management (admin-only)
  'GET /admin/license/instance-id',
  'POST /admin/license/reload',

  // Admin internal routes
  'GET /admin/auth-cache/stats',
  'POST /admin/auth-cache/flush',
  'POST /admin/schemas/cache/flush',
  'GET /admin/enterprises/{id}/config',
  'PATCH /admin/enterprises/{id}/config',
  'GET /admin/license',
  'GET /admin/rate-limit-exemptions',
  'PUT /admin/rate-limit-exemptions/{ownerId}',
  'DELETE /admin/rate-limit-exemptions/{ownerId}',
  'PATCH /admin/api-keys/{keyId}',
  'POST /admin/api-keys/bulk-revoke',
  'POST /admin/webhook-dlq/retry-all',

  // Auth internal flows (session-based, email verification, agent/enterprise registration)
  'GET /auth/verify',
  'POST /auth/agent',
  'POST /auth/enterprise',
  'POST /auth/keys/rotate',

  // Portal (customer portal, separate frontend — full exclusion)
  'GET /portal/auth/confirm',
  'POST /portal/auth/verify',
  'POST /portal/login',
  'POST /portal/logout',
  'GET /portal/me',
  'PATCH /portal/me',
  'GET /portal/me/sandbox',
  'POST /portal/me/change-password',
  'POST /portal/forgot-password',
  'POST /portal/reset-password',
  'GET /portal/passkeys',
  'DELETE /portal/passkeys/{passkeyId}',
  'POST /portal/passkeys/register/options',
  'POST /portal/passkeys/register/verify',
  'POST /portal/passkeys/authenticate/options',
  'POST /portal/passkeys/authenticate/verify',

  // Observability (internal)
  'GET /metrics',

  // Compliance export download (SDK uses waitForExport + downloadUrl)
  'GET /compliance/export/{exportId}/download',

  // (Federation routes previously tracked here are now in SDK_METHODS and routes.json)
]);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SDK ↔ API Parity', () => {
  it('route manifest is loaded and non-empty', () => {
    expect(manifest.routeCount).toBeGreaterThan(50);
    expect(manifest.routes.length).toBe(manifest.routeCount);
  });

  describe('every SDK method maps to a real API route', () => {
    for (const [resource, method, httpMethod, apiPath] of SDK_METHODS) {
      it(`${resource}.${method}() → ${httpMethod} ${apiPath}`, () => {
        const key = `${httpMethod} ${apiPath}`;
        const route = routeMap.get(key);
        expect(route, `API route not found: ${key}`).toBeDefined();
      });
    }
  });

  describe('every non-excluded API route has SDK coverage', () => {
    const sdkRouteKeys = new Set(
      SDK_METHODS.map(([, , httpMethod, apiPath]) => `${httpMethod} ${apiPath}`),
    );

    const uncoveredRoutes = manifest.routes.filter((r) => {
      const key = `${r.method} ${r.path}`;
      return !sdkRouteKeys.has(key) && !EXCLUDED_ROUTES.has(key);
    });

    it('no uncovered routes', () => {
      if (uncoveredRoutes.length > 0) {
        const list = uncoveredRoutes
          .map((r) => `  ${r.method} ${r.path} (${r.tag ?? 'untagged'})`)
          .join('\n');
        expect.fail(
          `${uncoveredRoutes.length} API route(s) have no SDK method and are not in EXCLUDED_ROUTES:\n${list}\n\n` +
          'Fix: add SDK method(s), or add to EXCLUDED_ROUTES with a comment explaining why.',
        );
      }
    });
  });

  describe('webhook creation sends eventTypes (not events)', () => {
    it('POST /webhooks requires eventTypes field', () => {
      const route = routeMap.get('POST /webhooks');
      expect(route).toBeDefined();
      expect(route!.requiredFields).toContain('eventTypes');
      expect(route!.requiredFields).not.toContain('events');
    });
  });

  describe('capabilities uses PUT (not PATCH)', () => {
    it('PUT /agents/{agentId}/capabilities exists', () => {
      expect(routeMap.has('PUT /agents/{agentId}/capabilities')).toBe(true);
    });

    it('PATCH /agents/{agentId}/capabilities does not exist', () => {
      expect(routeMap.has('PATCH /agents/{agentId}/capabilities')).toBe(false);
    });
  });

  describe('reputation history path is /agents/:id/history (not /reputation/history)', () => {
    it('GET /agents/{agentId}/history exists', () => {
      expect(routeMap.has('GET /agents/{agentId}/history')).toBe(true);
    });
  });

  describe('required fields on key routes match SDK types', () => {
    it('POST /mandates requires contractType and criteria', () => {
      const route = routeMap.get('POST /mandates');
      expect(route).toBeDefined();
      for (const field of ['contractType', 'criteria']) {
        expect(route!.requiredFields, `missing required field: ${field}`).toContain(field);
      }
    });

    it('POST /mandates/{id}/outcome requires receiptId and outcome', () => {
      const route = routeMap.get('POST /mandates/{id}/outcome');
      expect(route).toBeDefined();
      expect(route!.requiredFields).toContain('receiptId');
      expect(route!.requiredFields).toContain('outcome');
    });

    it('POST /mandates/{mandateId}/compliance-records requires recordType, attestation, attestedBy', () => {
      const route = routeMap.get('POST /mandates/{mandateId}/compliance-records');
      expect(route).toBeDefined();
      for (const field of ['recordType', 'attestation', 'attestedBy']) {
        expect(route!.requiredFields).toContain(field);
      }
    });
  });
});
