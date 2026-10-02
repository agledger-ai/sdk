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
 * surfaces the canonical FailureCode taxonomy unchanged from verify-core: if
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
  options?: {
    keysFile?: string;
    requireKeyId?: string;
    requireSuppliedKeys?: boolean;
    /**
     * A JSON array of agent cert public keys (JWKs). Unmapped, a vector that
     * expects `CHAIN_AGENT_SIGNATURE_INVALID` runs with no agent keys, the
     * check reports `skipped_no_input`, the export passes, and the suite fails
     * on a vector that was never actually exercised.
     */
    agentKeysFile?: string;
  };
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

function optionsFor(vector: ManifestVector): VerifyExportOptions {
  const options: VerifyExportOptions = {};
  if (vector.options?.keysFile) {
    options.publicKeys = loadJson<Record<string, string>>(vector.options.keysFile);
  }
  if (vector.options?.requireKeyId) options.requireKeyId = vector.options.requireKeyId;
  if (vector.options?.requireSuppliedKeys) options.requireSuppliedKeys = true;
  if (vector.options?.agentKeysFile) {
    options.agentKeys = loadJson<NonNullable<VerifyExportOptions['agentKeys']>>(
      vector.options.agentKeysFile,
    );
  }
  return options;
}

// A digest no statement links to, for vectors whose export names no Server key.
const STRANGER = `sha256:${'ab'.repeat(32)}`;

// An option this runner does not map runs the vector without it, and a renamed
// key (requireOutOfBandKeys became requireSuppliedKeys) then passes or fails
// for the wrong reason. Fail on any key not listed here.
const MAPPED_OPTIONS = new Set(['keysFile', 'requireKeyId', 'requireSuppliedKeys', 'agentKeysFile']);

describe('verifyExport: shared conformance corpus', () => {
  it('maps every option the manifest uses', () => {
    const used = new Set(exportVectors.flatMap((v) => Object.keys(v.options ?? {})));
    expect([...used].filter((k) => !MAPPED_OPTIONS.has(k))).toEqual([]);
  });

  it('corpus is present', () => {
    expect(exportVectors.length).toBeGreaterThan(0);
  });

  for (const vector of exportVectors) {
    const label = `${vector.file} -> ${vector.expect}${vector.failureCode ? ` (${vector.failureCode})` : ''}`;
    it(label, () => {
      const exportData = loadJson<RecordAuditExport>(vector.file);
      const result = verifyExport(exportData, optionsFor(vector));

      expect(result.valid).toBe(vector.expect === 'pass');
      // The manifest pins no anchor, so no verdict here is a trusted one.
      expect(result.keyTrust.status).toBe('no_anchor');
      expect(result.optionalChecks.key_anchoring).toBe('skipped_no_input');

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

describe('verifyExport: the same corpus pinned on the key each export names', () => {
  // With trustAnchors every verdict is unchanged except the one whose key no
  // signed statement admits: the substituted key passes unpinned (it is
  // embedded in the export) and fails once the walk runs.
  const UNANCHORED_WHEN_PINNED: Record<string, { position: number }> = {
    'export/key-substitution.json': { position: 2 },
  };

  for (const vector of exportVectors) {
    const override = vector.expect === 'pass' ? UNANCHORED_WHEN_PINNED[vector.file] : undefined;
    const label = `${vector.file} pinned -> ${override ? 'fail (CHAIN_SIGNING_KEY_UNANCHORED)' : vector.expect}`;
    it(label, () => {
      const exportData = loadJson<RecordAuditExport>(vector.file);
      const anchor = exportData.exportMetadata.anchoredFrom ?? STRANGER;
      const result = verifyExport(exportData, { ...optionsFor(vector), trustAnchors: [anchor] });

      if (override) {
        expect(result.valid).toBe(false);
        expect(result.brokenAt).toMatchObject({ code: 'CHAIN_SIGNING_KEY_UNANCHORED', position: override.position });
        return;
      }
      expect(result.valid).toBe(vector.expect === 'pass');
      if (vector.expect === 'fail') expect(result.brokenAt?.code).toBe(vector.failureCode);
      // An unsupported format is refused before any key is read. Otherwise the
      // walk ran, and a run that verified no signature under an anchored key
      // (an unsigned chain, or one that broke before its first signature) is
      // no_anchored_signature: never a trusted verdict.
      if (vector.failureCode !== 'UNSUPPORTED_FORMAT') {
        expect(result.keyTrust.status).toBe(
          result.signatureCoverage.signed > 0 ? 'walked' : 'no_anchored_signature',
        );
      }
      if (vector.file === 'export/unsigned.json') {
        expect(result.valid).toBe(true);
        expect(result.keyTrust.status).toBe('no_anchored_signature');
        expect(result.keyTrust.detail).toMatch(/not a trusted verdict/);
      }
      if (vector.expect === 'pass' && result.signatureCoverage.signed > 0) {
        expect(result.optionalChecks.key_anchoring).toBe('applied');
      }
    });
  }

  it('a distrusted pin anchors nothing', () => {
    const exportData = loadJson<RecordAuditExport>('export/valid.json');
    const pin = exportData.exportMetadata.anchoredFrom!;
    const result = verifyExport(exportData, { trustAnchors: [pin], distrustedKeys: [pin] });
    expect(result.brokenAt?.code).toBe('CHAIN_SIGNING_KEY_UNANCHORED');
  });

  it('distrustedKeys without trustAnchors throws TypeError rather than being ignored', () => {
    const exportData = loadJson<RecordAuditExport>('export/valid.json');
    const pin = exportData.exportMetadata.anchoredFrom!;
    expect(() => verifyExport(exportData, { distrustedKeys: [pin] })).toThrow(TypeError);
  });

  it('a malformed anchor throws TypeError naming it', () => {
    const exportData = loadJson<RecordAuditExport>('export/valid.json');
    expect(() => verifyExport(exportData, { trustAnchors: ['15d63684'] })).toThrow(/15d63684/);
  });
});
