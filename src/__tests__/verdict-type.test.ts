import { describe, it, expectTypeOf } from 'vitest';
import type { Verdict, SubmitVerdictParams, VerdictResult, RecordRow } from '../types.js';

/**
 * Regression: the exported `Verdict` union is open
 * (`'accept' | 'reject' | (string & {})`) for forward compatibility, and
 * `SubmitVerdictParams.verdict` / `VerdictResult.verdict` / `RecordRow.verdict`
 * all use that same `Verdict` so generic verdict-routing code composes without
 * an extra narrowing step.
 *
 * Type-only checks. No runtime behavior.
 */
describe('Verdict union write/read symmetry', () => {
  it('Verdict accepts both known literals and any string (forward compat)', () => {
    expectTypeOf<'accept'>().toExtend<Verdict>();
    expectTypeOf<'reject'>().toExtend<Verdict>();
    // The `(string & {})` branch lets future API values through without an SDK bump.
    expectTypeOf<string>().toExtend<Verdict>();
  });

  it('SubmitVerdictParams.verdict accepts a generic Verdict variable', () => {
    type WriteShape = SubmitVerdictParams['verdict'];
    expectTypeOf<Verdict>().toExtend<WriteShape>();
    expectTypeOf<WriteShape>().toExtend<Verdict>();
  });

  it('VerdictResult.verdict reads as the same Verdict union', () => {
    type ReadShape = VerdictResult['verdict'];
    expectTypeOf<Verdict>().toExtend<ReadShape>();
    expectTypeOf<ReadShape>().toExtend<Verdict>();
  });

  it('RecordRow.verdict reads as Verdict | null | undefined', () => {
    type RecordVerdict = RecordRow['verdict'];
    expectTypeOf<'accept'>().toExtend<RecordVerdict>();
    expectTypeOf<'reject'>().toExtend<RecordVerdict>();
    expectTypeOf<null>().toExtend<RecordVerdict>();
  });
});
