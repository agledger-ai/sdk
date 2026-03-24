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
  count: number;
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
  ['mandates', 'respond', 'POST', '/mandates/{id}/respond'],
  ['mandates', 'acceptCounter', 'POST', '/mandates/{id}/accept-counter'],
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
  ['dashboard', 'getAgents', 'GET', '/dashboard/agents'],

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

  // Dashboard subresources (SDK may not cover all dashboard views)
  'GET /dashboard/alerts',
  'GET /dashboard/audit-trail',
  'GET /dashboard/disputes',
  'GET /dashboard/stats',

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

  // Ops (internal)
  'GET /ops/alerts',
  'GET /ops/status',
  'POST /ops/sns-webhook',

  // Compliance export download (SDK uses waitForExport + downloadUrl)
  'GET /compliance/export/{exportId}/download',
]);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SDK ↔ API Parity', () => {
  it('route manifest is loaded and non-empty', () => {
    expect(manifest.count).toBeGreaterThan(50);
    expect(manifest.routes.length).toBe(manifest.count);
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
    it('POST /mandates requires enterpriseId, contractType, contractVersion, platform, criteria', () => {
      const route = routeMap.get('POST /mandates');
      expect(route).toBeDefined();
      for (const field of ['enterpriseId', 'contractType', 'contractVersion', 'platform', 'criteria']) {
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
