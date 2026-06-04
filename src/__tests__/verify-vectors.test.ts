import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyExport } from '../verify/verify-export.js';
import type { VerifyExportOptions, FailureCode } from '../verify/verify-export.js';
import type { RecordAuditExport } from '../types.js';

/**
 * SDK-side conformance replay: drive the shared EXPORT-kind corpus
 * (testdata/conformance/manifest-export.json) through the SDK's public
 * `verifyExport` entrypoint. This proves the SDK adapter forwards options and
 * surfaces the canonical FailureCode taxonomy unchanged from verify-core — if
 * the SDK ever re-wraps the result and drops `brokenAt.code`, these vectors
 * fail loudly. The verify-core package runs the same corpus directly; this is
 * the through-the-SDK mirror.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
// src/__tests__ -> repo root is two levels up (standalone source-of-truth repo).
const CONFORMANCE_DIR = join(HERE, '..', '..', 'testdata', 'conformance');

interface ManifestVector {
  file: string;
  kind: 'export' | 'dump';
  expect: 'pass' | 'fail';
  failureCode?: FailureCode;
  brokenAt?: number;
  options?: { keysFile?: string; requireKeyId?: string; requireOutOfBandKeys?: boolean };
  expectSignatureCoverage?: { signed: number; unsigned: number; skipped: number };
}

interface Manifest {
  vectors: ManifestVector[];
}

function loadJson<T>(relPath: string): T {
  return JSON.parse(readFileSync(join(CONFORMANCE_DIR, relPath), 'utf8')) as T;
}

const manifest = loadJson<Manifest>('manifest-export.json');
const exportVectors = manifest.vectors.filter((v) => v.kind === 'export');

describe('verifyExport — shared conformance corpus', () => {
  it('corpus is present', () => {
    expect(exportVectors.length).toBeGreaterThan(0);
  });

  for (const vector of exportVectors) {
    const label = `${vector.file} -> ${vector.expect}${vector.failureCode ? ` (${vector.failureCode})` : ''}`;
    it(label, () => {
      const exportData = loadJson<RecordAuditExport>(vector.file);

      const options: VerifyExportOptions = {};
      if (vector.options?.keysFile) {
        options.publicKeys = loadJson<Record<string, string>>(vector.options.keysFile);
      }
      if (vector.options?.requireKeyId) options.requireKeyId = vector.options.requireKeyId;
      if (vector.options?.requireOutOfBandKeys) options.requireOutOfBandKeys = true;

      const result = verifyExport(exportData, options);

      expect(result.valid).toBe(vector.expect === 'pass');

      if (vector.expect === 'fail') {
        expect(result.brokenAt?.code).toBe(vector.failureCode);
        if (vector.brokenAt !== undefined) {
          expect(result.brokenAt?.position).toBe(vector.brokenAt);
        }
      }

      if (vector.expectSignatureCoverage) {
        expect(result.signatureCoverage.signed).toBe(vector.expectSignatureCoverage.signed);
        expect(result.signatureCoverage.unsigned).toBe(vector.expectSignatureCoverage.unsigned);
        expect(result.signatureCoverage.skipped).toBe(vector.expectSignatureCoverage.skipped);
      }
    });
  }
});
