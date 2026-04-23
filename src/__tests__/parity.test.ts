/**
 * SDK ↔ API Parity Test
 *
 * Validates that the SDK's route contracts stay in sync with the API's
 * OpenAPI spec. Uses the route manifest (routes.json) generated from the
 * API spec as the source of truth.
 *
 * Regenerate the manifest:
 *   cd ~/projects/agledger-api && npx tsx scripts/generate-route-manifest.ts
 *   cp dist/routes.json ~/projects/agledger-agents/agledger-sdk/src/__tests__/routes.json
 *
 * Or offline from the checked-in spec:
 *   node -e "...extract from agledger-api/openapi.json..."
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
  it('is loaded and has the v0.20.0 route surface', () => {
    expect(routeCount).toBeGreaterThan(150);
    expect(manifest.routes.length).toBe(routeCount);
  });
});

describe('critical routes exist in the current API spec', () => {
  const CRITICAL_ROUTES: Array<[string, string]> = [
    ['POST', '/v1/mandates'],
    ['GET', '/v1/mandates'],
    ['GET', '/v1/mandates/{id}'],
    ['POST', '/v1/mandates/{id}/transition'],
    ['POST', '/v1/mandates/{id}/accept'],
    ['POST', '/v1/mandates/{id}/reject'],
    ['POST', '/v1/mandates/{id}/counter-propose'],
    ['POST', '/v1/mandates/{id}/outcome'],
    ['POST', '/v1/mandates/{mandateId}/receipts'],
    ['GET', '/v1/mandates/{mandateId}/receipts'],
    ['POST', '/v1/mandates/{id}/verify'],
    ['POST', '/v1/mandates/{mandateId}/dispute'],
    ['POST', '/v1/mandates/{mandateId}/compliance-records'],
    ['GET', '/v1/mandates/{mandateId}/audit-export'],
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
    ['POST', '/v1/admin/enterprises'],
    ['POST', '/v1/admin/api-keys'],
    ['POST', '/v1/admin/agents'],
    ['GET', '/v1/admin/mandates'],
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
    ['POST', '/v1/mandates/agent'],
    ['GET', '/v1/mandates/agent/principal'],
    ['GET', '/v1/mandates/{mandateId}/audit'],
    ['GET', '/v1/mandates/summary'],
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
        `${method} ${path} was supposed to be retired in API v0.20.0 but still appears in the manifest`,
      ).toBeUndefined();
    });
  }
});

describe('body-field contracts on critical POST routes', () => {
  it('POST /v1/mandates does not require principalType (principal model collapsed)', () => {
    const route = routeMap.get('POST /v1/mandates');
    expect(route).toBeDefined();
    expect(route!.bodyFields).not.toContain('principalType');
    expect(route!.requiredFields).not.toContain('principalType');
  });

  it('POST /v1/mandates exposes principalAgentId in the body surface', () => {
    const route = routeMap.get('POST /v1/mandates');
    expect(route).toBeDefined();
    expect(route!.bodyFields).toContain('principalAgentId');
  });

  it('POST /v1/webhooks requires eventTypes (not events)', () => {
    const route = routeMap.get('POST /v1/webhooks');
    expect(route).toBeDefined();
    expect(route!.requiredFields).toContain('eventTypes');
    expect(route!.requiredFields).not.toContain('events');
  });

  it('POST /v1/mandates/{id}/outcome requires receiptId and outcome', () => {
    const route = routeMap.get('POST /v1/mandates/{id}/outcome');
    expect(route).toBeDefined();
    expect(route!.requiredFields).toEqual(expect.arrayContaining(['receiptId', 'outcome']));
  });

  it('POST /v1/mandates/{mandateId}/compliance-records requires recordType, attestation, attestedBy', () => {
    const route = routeMap.get('POST /v1/mandates/{mandateId}/compliance-records');
    expect(route).toBeDefined();
    for (const field of ['recordType', 'attestation', 'attestedBy']) {
      expect(route!.requiredFields).toContain(field);
    }
  });
});

describe('SDK resource files reach only v0.20.0-shaped routes', () => {
  const resourcesDir = resolve(__dirname, '..', 'resources');
  const files = readdirSync(resourcesDir).filter(f => f.endsWith('.ts'));

  for (const file of files) {
    const content = readFileSync(join(resourcesDir, file), 'utf8');

    it(`${file} does not reference retired routes`, () => {
      const violations: string[] = [];
      // Only match actual route strings (inside backticks or single/double quotes)
      // to avoid false positives on surrounding prose.
      const retiredPatterns = [
        /[`'"]\/v1\/dashboard\//,
        /[`'"]\/v1\/proxy\//,
        /[`'"]\/v1\/notarize\//,
        /[`'"]\/v1\/projects(?:\/|['"`])/,
        /[`'"]\/v1\/mandates\/agent\/principal/,
        /[`'"]\/v1\/mandates\/agent['"`\s]/,
        /[`'"]\/v1\/mandates\/summary/,
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
