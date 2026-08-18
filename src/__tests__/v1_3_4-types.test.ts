import { describe, it, expectTypeOf } from 'vitest';
import type {
  ComplianceExport,
  ExpressionHelperDoc,
  MetaSchema,
  VaultCheckpoint,
  VaultCheckpointChain,
  ListVaultCheckpointsParams,
} from '../types.js';

/**
 * API v1.3.4 client-facing deltas. All three live in response bodies or in an
 * inline (non-component) schema, which is exactly the surface routes.json and
 * schema-fields.json do not pin: one snapshot covers request fields, the other
 * covers the 11 named `components.schemas` models. Response drift lands here.
 *
 * Type-only checks. No runtime behavior.
 */
describe('v1.3.4: compliance export row cap', () => {
  it('carries the truncation signal and the pre-cap total', () => {
    // Optional: a server older than v1.3.4 omits both.
    expectTypeOf<undefined>().toMatchTypeOf<ComplianceExport['truncated']>();
    expectTypeOf<boolean>().toMatchTypeOf<ComplianceExport['truncated']>();
    expectTypeOf<number>().toMatchTypeOf<ComplianceExport['totalRecords']>();
  });

  it('still models the synchronous-ready status', () => {
    // v1.3.4 builds the export inline and answers `ready`; `processing`
    // remains reachable, so waitForExport's poll loop stays correct.
    expectTypeOf<'ready'>().toMatchTypeOf<ComplianceExport['status']>();
    expectTypeOf<'processing'>().toMatchTypeOf<ComplianceExport['status']>();
  });
});

describe('v1.3.4: expression helper docs', () => {
  it('is a keyed map of signature + semantics, not a list of names', () => {
    type H = NonNullable<MetaSchema['expressionHelpers']>;
    expectTypeOf<H>().toEqualTypeOf<Record<string, ExpressionHelperDoc>>();
    expectTypeOf<ExpressionHelperDoc['signature']>().toEqualTypeOf<string>();
    expectTypeOf<ExpressionHelperDoc['semantics']>().toEqualTypeOf<string>();
    // The pre-1.3.4 shape must no longer satisfy the field.
    expectTypeOf<string[]>().not.toMatchTypeOf<H>();
  });
});

describe('v1.3.4: vault checkpoint chain discriminator', () => {
  it('names the three chains', () => {
    expectTypeOf<VaultCheckpointChain>().toEqualTypeOf<'record' | 'schema' | 'admin'>();
    expectTypeOf<'schema'>().toMatchTypeOf<NonNullable<VaultCheckpoint['chain']>>();
  });

  it('accepts a row exactly as the API returns it', () => {
    // Regression guard. Two `VaultCheckpoint` interfaces used to declaration-merge,
    // so the type demanded `signature` and `signatureAlg`, which this endpoint has
    // never returned. A real row did not typecheck without a cast.
    const row: VaultCheckpoint = {
      id: 'a',
      recordId: 'b',
      chain: 'record',
      chainPosition: 1,
      payloadHash: 'c',
      coseSign1: 'd',
      signingKeyId: null,
      createdAt: 'e',
    };
    expectTypeOf(row).toMatchTypeOf<VaultCheckpoint>();
    // `chain` is optional so a pre-1.3.4 server's rows still typecheck.
    expectTypeOf<undefined>().toMatchTypeOf<VaultCheckpoint['chain']>();
  });

  it('offers only the query params the endpoint accepts', () => {
    // The endpoint takes recordId/cursor/limit. The deleted duplicate extended
    // ListParams, which advertised an `offset` the route does not implement.
    expectTypeOf<ListVaultCheckpointsParams>().toEqualTypeOf<{
      recordId?: string;
      cursor?: string;
      limit?: number;
    }>();
  });
});
