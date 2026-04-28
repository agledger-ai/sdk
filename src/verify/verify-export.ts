import { createHash, createPublicKey, verify as cryptoVerify, type KeyObject } from 'node:crypto';
import type { RecordAuditExport, AuditExportEntry } from '../types.js';

/**
 * Offline verification of an AGLedger Record audit export.
 *
 * Re-implements the vault's per-entry integrity check (RFC 8785 JCS → SHA-256
 * → Ed25519 over `{position}:{payloadHash}:{previousHash}`) and walks the hash
 * chain. Makes no network calls.
 *
 * This is the client-side companion to the tamper-evident audit trail described
 * at `/.well-known/agledger-vault-keys.json` and returned by
 * `GET /v1/records/:id/audit-export`.
 */

/** A single entry's verification result. */
export interface EntryVerificationResult {
  position: number;
  valid: boolean;
  /** Machine-readable failure code when `valid === false`. */
  reason?: EntryFailureReason;
  /** Human-readable detail. */
  detail?: string;
}

export type EntryFailureReason =
  /** RFC 8785 canonical hash of payload does not match stored payloadHash. */
  | 'payload_hash_mismatch'
  /** Stored previousHash does not link to the prior entry's payloadHash. */
  | 'chain_break'
  /** Entry position is not sequential (expected i+1). */
  | 'position_gap'
  /** Ed25519 signature failed cryptographic verification. */
  | 'signature_invalid'
  /** Entry references a signingKeyId that was not provided. */
  | 'unknown_key'
  /** Entry is missing a required field (signature, signingKeyId, etc.). */
  | 'malformed_entry'
  /** Unsupported hash or signature algorithm. */
  | 'unsupported_algorithm';

/** Top-level verification result. */
export interface VerifyExportResult {
  /** True if every entry verified and the chain is contiguous. */
  valid: boolean;
  totalEntries: number;
  /** Count of entries that passed all checks. */
  verifiedEntries: number;
  /** The first entry that failed, if any. */
  brokenAt?: {
    position: number;
    reason: EntryFailureReason;
    detail?: string;
  };
  /** Per-entry results in order. */
  entries: EntryVerificationResult[];
  /** Record ID from the export metadata, for logging/identification. */
  recordId: string;
}

export interface VerifyExportOptions {
  /**
   * Additional or override public keys, keyed by signingKeyId (SPKI DER base64).
   * Merged over the export's embedded `signingPublicKeys` map. Use this when
   * the export predates a key that has since been added, or to force
   * verification against a specific trusted key set.
   */
  publicKeys?: Record<string, string>;
  /**
   * If set, every entry must reference this keyId. Use in high-assurance flows
   * where an attacker with access to an older retired key should not be able
   * to produce a "valid" export.
   */
  requireKeyId?: string;
}

const RFC8785 = 'RFC8785';
const SUPPORTED_HASH = new Set(['SHA-256', 'sha-256', 'sha256']);
const SUPPORTED_SIG = new Set(['Ed25519', 'ed25519']);

/**
 * Verify a Record audit export offline.
 *
 * @example
 * ```ts
 * import { verifyExport } from '@agledger/sdk/verify';
 *
 * const exportData = await client.records.getAuditExport('REC_123');
 * const result = verifyExport(exportData);
 * if (!result.valid) {
 *   console.error(`Broken at position ${result.brokenAt?.position}: ${result.brokenAt?.reason}`);
 * }
 * ```
 */
export function verifyExport(
  exportData: RecordAuditExport,
  options: VerifyExportOptions = {},
): VerifyExportResult {
  const meta = exportData.exportMetadata;
  const entries = exportData.entries ?? [];
  const keys = new KeyCache(resolveKeys(exportData, options));
  const entryResults: EntryVerificationResult[] = [];
  let verifiedEntries = 0;
  let brokenAt: VerifyExportResult['brokenAt'];

  if (meta.canonicalization && meta.canonicalization !== RFC8785) {
    const detail = `Unsupported canonicalization: ${meta.canonicalization} (only RFC8785 supported)`;
    const result: EntryVerificationResult = {
      position: 0,
      valid: false,
      reason: 'unsupported_algorithm',
      detail,
    };
    return {
      valid: false,
      totalEntries: entries.length,
      verifiedEntries: 0,
      brokenAt: { position: 0, reason: 'unsupported_algorithm', detail },
      entries: [result],
      recordId: meta.recordId,
    };
  }

  let prevPayloadHash: string | null = null;
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const result = verifyEntry(entry, i + 1, prevPayloadHash, keys, options.requireKeyId);
    entryResults.push(result);
    if (result.valid) {
      verifiedEntries++;
    } else if (!brokenAt && result.reason) {
      brokenAt = { position: result.position, reason: result.reason, detail: result.detail };
    }
    prevPayloadHash = entry.integrity.payloadHash;
  }

  return {
    valid: verifiedEntries === entries.length && entries.length > 0,
    totalEntries: entries.length,
    verifiedEntries,
    brokenAt,
    entries: entryResults,
    recordId: meta.recordId,
  };
}

function resolveKeys(
  exportData: RecordAuditExport,
  options: VerifyExportOptions,
): Record<string, string> {
  const meta = exportData.exportMetadata;
  const merged: Record<string, string> = {};
  if (meta.signingPublicKeys) {
    for (const [k, v] of Object.entries(meta.signingPublicKeys)) merged[k] = v;
  }
  if (options.publicKeys) {
    for (const [k, v] of Object.entries(options.publicKeys)) merged[k] = v;
  }
  return merged;
}

/**
 * Lazily decodes SPKI-DER base64 public keys into KeyObjects and caches them.
 * Exports with 10k+ entries would otherwise re-decode the same key on every
 * signature check.
 */
class KeyCache {
  private readonly cache = new Map<string, KeyObject>();
  constructor(private readonly spki: Record<string, string>) {}

  get(keyId: string): KeyObject | undefined {
    const existing = this.cache.get(keyId);
    if (existing) return existing;
    const raw = this.spki[keyId];
    if (!raw) return undefined;
    const key = createPublicKey({ key: Buffer.from(raw, 'base64'), format: 'der', type: 'spki' });
    this.cache.set(keyId, key);
    return key;
  }
}

function verifyEntry(
  entry: AuditExportEntry,
  expectedPosition: number,
  expectedPrevHash: string | null,
  keys: KeyCache,
  requireKeyId: string | undefined,
): EntryVerificationResult {
  const position = entry.position;

  if (entry.position !== expectedPosition) {
    return {
      position,
      valid: false,
      reason: 'position_gap',
      detail: `Expected position ${expectedPosition}, got ${entry.position}`,
    };
  }

  const { payloadHash, previousHash, signature, signingKeyId, hashAlg, signatureAlg } =
    entry.integrity;

  if (hashAlg && !SUPPORTED_HASH.has(hashAlg)) {
    return { position, valid: false, reason: 'unsupported_algorithm', detail: `hashAlg=${hashAlg}` };
  }
  if (signatureAlg && !SUPPORTED_SIG.has(signatureAlg)) {
    return {
      position,
      valid: false,
      reason: 'unsupported_algorithm',
      detail: `signatureAlg=${signatureAlg}`,
    };
  }

  if (previousHash !== expectedPrevHash) {
    return {
      position,
      valid: false,
      reason: 'chain_break',
      detail: `Expected previousHash=${expectedPrevHash ?? 'null'}, got ${previousHash ?? 'null'}`,
    };
  }

  const recomputed = sha256Hex(canonicalize(entry.payload));
  if (recomputed !== payloadHash) {
    return {
      position,
      valid: false,
      reason: 'payload_hash_mismatch',
      detail: `Recomputed ${recomputed.slice(0, 16)}…, stored ${payloadHash.slice(0, 16)}…`,
    };
  }

  if (!signature || !signingKeyId) {
    return {
      position,
      valid: false,
      reason: 'malformed_entry',
      detail: 'Missing signature or signingKeyId',
    };
  }

  if (requireKeyId && signingKeyId !== requireKeyId) {
    return {
      position,
      valid: false,
      reason: 'unknown_key',
      detail: `Entry keyId=${signingKeyId} does not match requireKeyId=${requireKeyId}`,
    };
  }

  const publicKey = keys.get(signingKeyId);
  if (!publicKey) {
    return {
      position,
      valid: false,
      reason: 'unknown_key',
      detail: `No public key for keyId=${signingKeyId}`,
    };
  }

  const signInput = `${position}:${payloadHash}:${previousHash ?? 'null'}`;
  let sigValid = false;
  try {
    sigValid = verifyEd25519(publicKey, signInput, signature);
  } catch (err) {
    return {
      position,
      valid: false,
      reason: 'signature_invalid',
      detail: `Signature verification threw: ${(err as Error).message}`,
    };
  }

  if (!sigValid) {
    return { position, valid: false, reason: 'signature_invalid' };
  }

  return { position, valid: true };
}

/** RFC 8785 JSON Canonicalization Scheme. */
export function canonicalize(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalize).join(',') + ']';
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    return (
      '{' +
      keys.map((k) => JSON.stringify(k) + ':' + canonicalize(obj[k])).join(',') +
      '}'
    );
  }
  return 'null';
}

function sha256Hex(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

function verifyEd25519(publicKey: KeyObject, message: string, signatureHex: string): boolean {
  return cryptoVerify(null, Buffer.from(message), publicKey, Buffer.from(signatureHex, 'hex'));
}
