import { describe, it, expectTypeOf } from 'vitest';
import type {
  VaultScanResult,
  VaultScanGlobalChains,
  VaultScanBrokenChain,
} from '../types.js';

/**
 * API v1.3.3 (#949/#952): a full vault scan now folds the record-less chains
 * (the platform-ops `admin` chain and each org's `schema` chain) into
 * `result.globalChains`, and `healthy` accounts for a break there. The field is
 * optional because a `recordIds`-scoped scan (and the list-view summaries) omit it.
 *
 * Type-only checks. No runtime behavior.
 */
describe('v1.3.3: VaultScanResult.globalChains', () => {
  it('globalChains is optional on the scan result', () => {
    type G = VaultScanResult['globalChains'];
    expectTypeOf<undefined>().toMatchTypeOf<G>();
    expectTypeOf<VaultScanGlobalChains>().toMatchTypeOf<NonNullable<G>>();
  });

  it('globalChains carries the record-less counters and broken-chain list', () => {
    expectTypeOf<VaultScanGlobalChains['total']>().toEqualTypeOf<number>();
    expectTypeOf<VaultScanGlobalChains['broken']>().toEqualTypeOf<number>();
    expectTypeOf<VaultScanGlobalChains['signatureErrors']>().toEqualTypeOf<number>();
    expectTypeOf<VaultScanGlobalChains['brokenChains']>().toEqualTypeOf<VaultScanBrokenChain[]>();
    expectTypeOf<VaultScanGlobalChains['brokenChainsTruncated']>().toEqualTypeOf<boolean>();
  });

  it('a broken chain names admin-vs-schema and a nullable org', () => {
    expectTypeOf<VaultScanBrokenChain['chain']>().toEqualTypeOf<'admin' | 'schema'>();
    expectTypeOf<null>().toMatchTypeOf<VaultScanBrokenChain['orgId']>();
    // reason stays open (string) so a server-added failure code is not a compile break.
    expectTypeOf<string>().toMatchTypeOf<VaultScanBrokenChain['reason']>();
  });
});
