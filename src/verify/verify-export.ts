/**
 * Offline verification of an AGLedger record audit export.
 *
 * Thin adapter over `@agledger/verify-core` — the single shared verification
 * core (COSE_Sign1 / RFC 9052 hash-chain walk + Ed25519) that the CLI, MCP
 * server, and `@agledger/verify` also build on. This module maps the SDK's
 * `RecordAuditExport` response type onto the core's structural input and
 * re-exports the result types so `@agledger/sdk/verify` keeps a stable surface.
 *
 * Format version 2.0: each entry carries a canonical COSE_Sign1 (RFC 9052 §4.4,
 * tag 18, EdDSA) envelope over an in-toto v1 Statement payload. The chain links
 * via sha256 of the envelope bytes; the per-entry signature is the COSE
 * signature itself.
 */
import { verifyAuditExport } from '@agledger/verify-core';
import type { VerifyExportOptions, VerifyExportResult } from '@agledger/verify-core';
import type { RecordAuditExport } from '../types.js';

export type {
  VerifyExportOptions,
  VerifyExportResult,
  EntryVerificationResult,
  OutOfBandKeyEntry,
  FailureCode,
} from '@agledger/verify-core';

/**
 * Verify a record audit export offline.
 *
 * For an independent audit, pass the signing keys you obtained out of band
 * (`options.publicKeys`, from `GET /v1/verification-keys` or
 * `/.well-known/scitt-keys`) rather than trusting the export's embedded keys.
 * `result.keyProvenance` reports how many signatures were checked against
 * out-of-band vs export-embedded keys — `outOfBand > 0` is the only state that
 * proves the chain was checked against keys you trust.
 *
 * `options.publicKeys` accepts either form — pass the `.data` array from
 * `client.verificationKeys.list()` directly, or a compact `Record<keyId, b64SPKI>`
 * map. The wrong shape throws `TypeError` rather than silently falling back to
 * embedded keys.
 *
 * @example Independent audit using the natural SDK shape
 * ```ts
 * import { verifyExport } from '@agledger/sdk/verify';
 *
 * const exp = await client.records.getAuditExport('REC_123');
 * const keys = await client.verificationKeys.list();
 *
 * const result = verifyExport(exp, { publicKeys: keys.data });
 * if (!result.valid) {
 *   console.error(`Broken at position ${result.brokenAt?.position}: ${result.brokenAt?.code}`);
 * }
 * if (result.keyProvenance.outOfBand === 0) {
 *   throw new Error('verdict trusts only export-embedded keys — not an independent audit');
 * }
 * ```
 */
export function verifyExport(
  exportData: RecordAuditExport,
  options: VerifyExportOptions = {},
): VerifyExportResult {
  return verifyAuditExport(exportData, options);
}
