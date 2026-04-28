/**
 * SDK ↔ API Parity Test
 *
 * Validates that the SDK's route contracts stay in sync with the API's
 * OpenAPI spec. Uses the route manifest (routes.json) generated from the
 * API spec as the source of truth.
 *
 * Regenerate the manifest from a checked-in API spec:
 *   node -e "..." (see .github/workflows/update-route-manifest.yml)
 *
 * The test is deliberately a focused invariant check, not an exhaustive
 * method enumeration — a per-method table drifts constantly and obscures
 * real regressions.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

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
  count?: number;
  routeCount?: number;
  routes: RouteEntry[];
}

const manifest: RouteManifest = JSON.parse(
  readFileSync(resolve(__dirname, 'routes.json'), 'utf8'),
);
const routeCount = manifest.count ?? manifest.routeCount ?? manifest.routes.length;

const routeMap = new Map<string, RouteEntry>();
for (const route of manifest.routes) {
  routeMap.set(`${route.method} ${route.path}`, route);
}

describe('route manifest', () => {
  it('is loaded and has the v0.21 route surface', () => {
    expect(routeCount).toBeGreaterThan(150);
    expect(manifest.routes.length).toBe(routeCount);
  });
});

describe('critical routes exist in the current API spec', () => {
  const CRITICAL_ROUTES: Array<[string, string]> = [
    // Records (the core surface)
    ['POST', '/v1/records'],
    ['GET', '/v1/records'],
    ['GET', '/v1/records/{id}'],
    ['POST', '/v1/records/{id}/transition'],
    ['POST', '/v1/records/{id}/accept'],
    ['POST', '/v1/records/{id}/reject'],
    ['POST', '/v1/records/{id}/counter-propose'],
    ['POST', '/v1/records/{id}/outcome'],
    ['POST', '/v1/records/{recordId}/receipts'],
    ['GET', '/v1/records/{recordId}/receipts'],
    ['POST', '/v1/records/{id}/verify'],
    ['POST', '/v1/records/{recordId}/dispute'],
    ['POST', '/v1/records/{recordId}/compliance-records'],
    ['GET', '/v1/records/{recordId}/audit-export'],
    ['POST', '/v1/records/bulk'],
    ['POST', '/v1/records/batch'],
    ['GET', '/v1/records/{id}/sub-records'],
    ['GET', '/v1/records/me/verdict-statistics'],

    // Webhooks, schemas, compliance, auth, discovery
    ['POST', '/v1/webhooks'],
    ['POST', '/v1/schemas'],
    ['POST', '/v1/compliance/export'],
    ['GET', '/v1/auth/me'],
    ['POST', '/v1/auth/keys/rotate'],
    ['GET', '/v1/scope-profiles'],
    ['GET', '/v1/conformance'],
    ['GET', '/v1/events'],
    ['GET', '/v1/references'],
    ['GET', '/v1/verification-keys'],

    // Schema toolkit helpers (added in v0.21)
    ['GET', '/v1/schemas/_blank'],
    ['GET', '/v1/schemas/meta-schema'],
    ['POST', '/v1/schemas/preview'],
    ['POST', '/v1/schemas/import'],

    // Disputes (tenant-wide listing added in v0.21)
    ['GET', '/v1/disputes'],

    // Tenant-reads checkpoints (added in v0.21)
    ['GET', '/v1/audit/tenant-reads/checkpoints'],
    ['POST', '/v1/audit/tenant-reads/checkpoints/{id}/cosign'],
    ['GET', '/v1/audit/tenant-reads/checkpoints/{id}/proof'],

    // Admin
    ['POST', '/v1/admin/enterprises'],
    ['POST', '/v1/admin/api-keys'],
    ['POST', '/v1/admin/agents'],
    ['GET', '/v1/admin/records'],
    ['POST', '/v1/admin/records/import'],
    ['GET', '/v1/admin/vault/anchors'],
    ['POST', '/v1/admin/vault/anchors/verify'],
    ['POST', '/v1/admin/vault/scan'],
    ['GET', '/v1/admin/vault/signing-keys'],
    ['POST', '/v1/admin/vault/signing-keys/rotate'],

    // SIEM stream
    ['GET', '/v1/siem/stream'],
  ];

  for (const [method, path] of CRITICAL_ROUTES) {
    it(`${method} ${path}`, () => {
      expect(
        routeMap.get(`${method} ${path}`),
        `Missing route ${method} ${path} — API may have renamed or removed it`,
      ).toBeDefined();
    });
  }
});

describe('retired routes are gone from the spec', () => {
  const RETIRED: Array<[string, string]> = [
    // Mandate routes — every one renamed to /v1/records/* in v0.21
    ['POST', '/v1/mandates'],
    ['GET', '/v1/mandates'],
    ['GET', '/v1/mandates/{id}'],
    ['POST', '/v1/mandates/{id}/transition'],
    ['POST', '/v1/mandates/agent'],
    ['GET', '/v1/mandates/agent/principal'],
    ['GET', '/v1/mandates/{mandateId}/audit'],
    ['GET', '/v1/mandates/{mandateId}/audit-export'],
    ['GET', '/v1/mandates/summary'],
    ['POST', '/v1/mandates/bulk'],

    // Dashboard / proxy / projects / notarize / report-analyze — retired earlier in v0.20
    ['GET', '/v1/dashboard/summary'],
    ['GET', '/v1/dashboard/metrics'],
    ['GET', '/v1/dashboard/audit-trail'],
    ['GET', '/v1/dashboard/agents'],
    ['GET', '/v1/dashboard/alerts'],
    ['GET', '/v1/dashboard/disputes'],
    ['POST', '/v1/proxy/sessions'],
    ['POST', '/v1/notarize/mandates'],
    ['POST', '/v1/projects'],
    ['GET', '/v1/projects'],
    ['POST', '/v1/audit/enterprise-report/analyze'],
    ['GET', '/v1/audit/enterprise-report'],
    ['PATCH', '/v1/admin/accounts/{id}/trust-level'],
  ];

  for (const [method, path] of RETIRED) {
    it(`${method} ${path} is not in the spec`, () => {
      expect(
        routeMap.get(`${method} ${path}`),
        `${method} ${path} was supposed to be retired but still appears in the manifest`,
      ).toBeUndefined();
    });
  }
});

describe('body-field contracts on critical POST routes', () => {
  it('POST /v1/records does not require principalType (principal model collapsed)', () => {
    const route = routeMap.get('POST /v1/records');
    expect(route).toBeDefined();
    expect(route!.bodyFields).not.toContain('principalType');
    expect(route!.requiredFields).not.toContain('principalType');
  });

  it('POST /v1/records exposes principalAgentId in the body surface', () => {
    const route = routeMap.get('POST /v1/records');
    expect(route).toBeDefined();
    expect(route!.bodyFields).toContain('principalAgentId');
  });

  it('POST /v1/records body uses `type`, not `contractType`', () => {
    const route = routeMap.get('POST /v1/records');
    expect(route).toBeDefined();
    expect(route!.bodyFields).toContain('type');
    expect(route!.bodyFields).not.toContain('contractType');
  });

  it('POST /v1/webhooks requires eventTypes (not events)', () => {
    const route = routeMap.get('POST /v1/webhooks');
    expect(route).toBeDefined();
    expect(route!.requiredFields).toContain('eventTypes');
    expect(route!.requiredFields).not.toContain('events');
  });

  it('POST /v1/records/{id}/outcome requires receiptId and outcome', () => {
    const route = routeMap.get('POST /v1/records/{id}/outcome');
    expect(route).toBeDefined();
    expect(route!.requiredFields).toEqual(expect.arrayContaining(['receiptId', 'outcome']));
  });

  it('POST /v1/records/{recordId}/compliance-records requires recordType, attestation, attestedBy', () => {
    const route = routeMap.get('POST /v1/records/{recordId}/compliance-records');
    expect(route).toBeDefined();
    for (const field of ['recordType', 'attestation', 'attestedBy']) {
      expect(route!.requiredFields).toContain(field);
    }
  });

  it('POST /v1/records/bulk supports per-item idempotencyKey', () => {
    const route = routeMap.get('POST /v1/records/bulk');
    expect(route).toBeDefined();
    expect(route!.requiredFields).toContain('records');
  });

  it('POST /v1/admin/records/import requires enterpriseId, source, records', () => {
    const route = routeMap.get('POST /v1/admin/records/import');
    expect(route).toBeDefined();
    expect(route!.requiredFields).toEqual(expect.arrayContaining(['enterpriseId', 'source', 'records']));
  });
});

describe('SDK resource files reach only v0.21-shaped routes', () => {
  const resourcesDir = resolve(__dirname, '..', 'resources');
  const files = readdirSync(resourcesDir).filter(f => f.endsWith('.ts'));

  for (const file of files) {
    const content = readFileSync(join(resourcesDir, file), 'utf8');

    it(`${file} does not reference retired or renamed routes`, () => {
      const violations: string[] = [];
      // Match actual route strings (inside backticks or single/double quotes)
      // to avoid false positives on surrounding prose.
      const retiredPatterns = [
        // Renamed paths — every /v1/mandates/* moved to /v1/records/*
        /[`'"]\/v1\/mandates\b/,
        /[`'"]\/federation\/v1\/mandates\b/,
        /[`'"]\/federation\/v1\/admin\/mandates\b/,

        // Retired surfaces
        /[`'"]\/v1\/dashboard\//,
        /[`'"]\/v1\/proxy\//,
        /[`'"]\/v1\/notarize\//,
        /[`'"]\/v1\/projects(?:\/|['"`])/,
        /[`'"]\/v1\/audit\/enterprise-report/,
        /[`'"]\/v1\/admin\/accounts\/\$\{[^}]+\}\/trust-level/,
        /[`'"]\/v1\/audit\/stream/,
      ];
      for (const re of retiredPatterns) {
        const match = content.match(re);
        if (match) violations.push(`${file}: ${match[0]}`);
      }
      expect(violations, `Retired routes referenced:\n${violations.join('\n')}`).toEqual([]);
    });

    it(`${file} does not reference old API key prefix`, () => {
      const violations: string[] = [];
      if (/\bach_(ent|age|pla)_/.test(content)) violations.push(`${file}: ach_*_ key prefix`);
      expect(violations, `Legacy identifiers found:\n${violations.join('\n')}`).toEqual([]);
    });
  }
});
