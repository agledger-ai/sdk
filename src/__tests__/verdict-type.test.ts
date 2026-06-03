import { describe, it, expectTypeOf } from 'vitest';
import type { Verdict, SubmitVerdictParams, VerdictResult, RecordResponse } from '../types.js';

/**
 * F-702 regression: the exported `Verdict` union is open
 * (`'accept' | 'reject' | (string & {})`) for forward compatibility, and
 * `SubmitVerdictParams.verdict` / `VerdictResult.verdict` / `RecordResponse.verdict`
 * all use that same `Verdict` so generic verdict-routing code composes without
 * an extra narrowing step.
 *
 * Type-only checks. No runtime behavior.
 */
describe('F-702: Verdict union write/read symmetry', () => {
  it('Verdict accepts both known literals and any string (forward compat)', () => {
    expectTypeOf<'accept'>().toMatchTypeOf<Verdict>();
    expectTypeOf<'reject'>().toMatchTypeOf<Verdict>();
    // The `(string & {})` branch lets future API values through without an SDK bump.
    expectTypeOf<string>().toMatchTypeOf<Verdict>();
  });

  it('SubmitVerdictParams.verdict accepts a generic Verdict variable', () => {
    type WriteShape = SubmitVerdictParams['verdict'];
    expectTypeOf<Verdict>().toMatchTypeOf<WriteShape>();
    expectTypeOf<WriteShape>().toMatchTypeOf<Verdict>();
  });

  it('VerdictResult.verdict reads as the same Verdict union', () => {
    type ReadShape = VerdictResult['verdict'];
    expectTypeOf<Verdict>().toMatchTypeOf<ReadShape>();
    expectTypeOf<ReadShape>().toMatchTypeOf<Verdict>();
  });

  it('RecordResponse.verdict reads as Verdict | null | undefined', () => {
    type RecordVerdict = RecordResponse['verdict'];
    expectTypeOf<'accept'>().toMatchTypeOf<RecordVerdict>();
    expectTypeOf<'reject'>().toMatchTypeOf<RecordVerdict>();
    expectTypeOf<null>().toMatchTypeOf<RecordVerdict>();
  });
});
