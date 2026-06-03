/**
 * SDK ↔ API Schema-Field Parity Test
 *
 * The field-level analogue of parity.test.ts. routes.json pins the route
 * surface; schema-fields.json pins the per-model FIELD surface. Together they
 * catch the two ways the API drifts from the SDK — endpoints AND field shapes.
 *
 * This guard exists because route-only parity silently missed a full minor's
 * worth of field renames/additions (0.26.x: vaultCompletion→signedStatement,
 * selfCommitment→selfPrincipal, +17 RecordRow fields, +4 webhook events, …).
 * A clean route diff (194/194) hid all of it. Never again: this test fails CI
 * the moment the API adds/renames a field a mapped SDK model doesn't carry.
 *
 * Regenerate the snapshot from a checked-in API spec:
 *   node scripts/gen-schema-fields.mjs <openapi.json> agledger-sdk/src/__tests__/schema-fields.json
 * The weekly update-route-manifest workflow regenerates it from prod OpenAPI.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface SchemaFields {
  apiVersion: string | null;
  schemaCount: number;
  schemas: Record<string, string[]>;
}

const snapshot: SchemaFields = JSON.parse(
  readFileSync(resolve(__dirname, 'schema-fields.json'), 'utf8'),
);
const typesSrc = readFileSync(resolve(__dirname, '../types.ts'), 'utf8');

/** Top-level field names of each `export interface`, brace-depth aware so inline
 *  sub-objects don't leak their keys into the parent. */
function parseInterfaces(text: string): Record<string, Set<string>> {
  const out: Record<string, Set<string>> = {};
  const re = /export interface (\w+)\s*(?:extends [^{]+)?\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const name = m[1];
    let i = re.lastIndex;
    let depth = 1;
    let lineStartDepth = 1;
    let line = '';
    const fields = new Set<string>();
    for (; i < text.length && depth > 0; i++) {
      const ch = text[i];
      if (ch === '\n') {
        const fm = line.match(/^\s*(?:readonly\s+)?(['"]?)([A-Za-z_$][\w$]*)\1\??\s*:/);
        if (fm && lineStartDepth === 1) fields.add(fm[2]);
        line = '';
        lineStartDepth = depth;
        continue;
      }
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) break;
      }
      line += ch;
    }
    out[name] = fields;
  }
  return out;
}

const ifaces = parseInterfaces(typesSrc);

/**
 * API component → SDK interface. The two diverge in name where the SDK wraps or
 * renames: the flat `DisputeResponse` component is the SDK's `Dispute` (the SDK
 * `DisputeResponse` is a {dispute, evidence} GET wrapper); `WebhookSubscription`
 * is the SDK's `Webhook`; `NextStepAction` is `NextStep`.
 */
const ALIASES: Record<string, string> = {
  RecordRow: 'RecordRow',
  Completion: 'Completion',
  DisputeResponse: 'Dispute',
  DisputeEvidence: 'DisputeEvidence',
  WebhookSubscription: 'Webhook',
  WebhookDelivery: 'WebhookDelivery',
  ReputationScore: 'ReputationScore',
  EntityReference: 'EntityReference',
  NextStepAction: 'NextStep',
};

/**
 * SDK-only fields that are intentional, not drift: convenience fields the SDK
 * surfaces that the base API component schema doesn't carry. Keyed by SDK
 * interface name. Keep this list SHORT and justify every entry.
 */
const ALLOWED_SDK_ONLY: Record<string, Set<string>> = {
  // recentHistory is hydrated from the separate reputation-history endpoint.
  ReputationScore: new Set(['recentHistory']),
};

describe('schema-field parity', () => {
  it('snapshot is loaded', () => {
    expect(snapshot.schemaCount).toBeGreaterThan(0);
    expect(Object.keys(snapshot.schemas).length).toBe(snapshot.schemaCount);
  });

  for (const [apiName, sdkName] of Object.entries(ALIASES)) {
    const apiFields = snapshot.schemas[apiName];

    it(`API ${apiName} → SDK ${sdkName}: SDK is present and models every API field`, () => {
      expect(apiFields, `API component ${apiName} missing from snapshot`).toBeDefined();
      const sdk = ifaces[sdkName];
      expect(sdk, `SDK interface ${sdkName} not found in types.ts`).toBeDefined();

      const missing = apiFields.filter((f) => !sdk.has(f));
      expect(
        missing,
        `SDK ${sdkName} is missing API fields (consumers can't see them): ${missing.join(', ')}`,
      ).toEqual([]);
    });

    it(`SDK ${sdkName}: no un-allowlisted fields the API no longer returns`, () => {
      const sdk = ifaces[sdkName];
      if (!sdk || !apiFields) return;
      const allowed = ALLOWED_SDK_ONLY[sdkName] ?? new Set<string>();
      const apiSet = new Set(apiFields);
      const stale = [...sdk].filter((f) => !apiSet.has(f) && !allowed.has(f));
      expect(
        stale,
        `SDK ${sdkName} has fields absent from the API ${apiName} schema (stale or needs allowlisting): ${stale.join(', ')}`,
      ).toEqual([]);
    });
  }
});
