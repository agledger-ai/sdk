import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyExport } from '../verify/verify-export.js';
import type { MandateAuditExport } from '../types.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const VECTORS_DIR = join(HERE, '..', '..', '..', 'testdata', 'verifier');
const MANIFEST_PATH = join(VECTORS_DIR, 'manifest.json');

interface VectorEntry {
  file: string;
  expected: 'valid' | 'invalid';
  brokenAt?: number;
  reason?: string;
}

interface VectorManifest {
  vectors: VectorEntry[];
}

describe('verifyExport — shared test vectors', () => {
  if (!existsSync(MANIFEST_PATH)) {
    it.skip('vectors not present (run scripts/generate-verifier-vectors.ts)', () => {});
    return;
  }

  const manifest: VectorManifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));

  for (const vector of manifest.vectors) {
    it(`${vector.file} → ${vector.expected}`, () => {
      const exportData: MandateAuditExport = JSON.parse(
        readFileSync(join(VECTORS_DIR, vector.file), 'utf8'),
      );
      const result = verifyExport(exportData);
      if (vector.expected === 'valid') {
        expect(result.valid).toBe(true);
      } else {
        expect(result.valid).toBe(false);
        if (vector.brokenAt !== undefined) {
          expect(result.brokenAt?.position).toBe(vector.brokenAt);
        }
        if (vector.reason !== undefined) {
          expect(result.brokenAt?.reason).toBe(vector.reason);
        }
      }
    });
  }
});
