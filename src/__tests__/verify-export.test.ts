import { describe, it, expect } from 'vitest';
import { generateKeyPairSync, hash, sign, type KeyObject } from 'node:crypto';
import { encode as cborEncode, rfc8949EncodeOptions } from 'cborg';
import { verifyExport } from '../verify/verify-export.js';
import type { RecordAuditExport, AuditExportEntry } from '../types.js';

/**
 * Minimal COSE_Sign1 envelope builder. Mirrors the engine-side encoder's
 * Sig_structure construction (RFC 9052 §4.4) deterministically.
 */
const COSE_SIGN1_TAG = 18n; // tagged via raw header byte 0xd2

interface Keypair {
  publicKeyBase64: string;
  privateKey: KeyObject;
}

function makeKeypair(): Keypair {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const der = publicKey.export({ type: 'spki', format: 'der' }) as Buffer;
  return { publicKeyBase64: der.toString('base64'), privateKey };
}

function buildChainProtectedHeader(position: number, previousHash: string | null): Uint8Array {
  // Protected header is a CBOR map; we only need the -65537 chain entry.
  const chainMap = new Map<number, unknown>();
  chainMap.set(1, position);
  chainMap.set(2, previousHash === null ? null : Buffer.from(previousHash, 'hex'));
  const header = new Map<number, unknown>();
  header.set(-65537, chainMap);
  return cborEncode(header, rfc8949EncodeOptions);
}

function buildCoseSign1(
  kp: Keypair,
  position: number,
  previousHash: string | null,
  payloadJson: Record<string, unknown>,
): Uint8Array {
  const protectedBstr = buildChainProtectedHeader(position, previousHash);
  const payloadBstr = cborEncode(payloadJson, rfc8949EncodeOptions);
  const sigStructure: unknown[] = [
    'Signature1',
    protectedBstr,
    new Uint8Array(0),
    payloadBstr,
  ];
  const toBeSigned = cborEncode(sigStructure, rfc8949EncodeOptions);
  const signature = sign(null, toBeSigned, kp.privateKey);
  // Wrap as tagged COSE_Sign1: #6.18([protected, {}, payload, signature])
  const envelopeArray = [protectedBstr, new Map(), payloadBstr, new Uint8Array(signature)];
  // cborg encodes BigInt as a tag by default — easier to just prepend the tag byte.
  const inner = cborEncode(envelopeArray, rfc8949EncodeOptions);
  const tagged = new Uint8Array(inner.length + 1);
  tagged[0] = 0xd2; // major type 6, value 18
  tagged.set(inner, 1);
  return tagged;
}

function sha256Hex(bytes: Uint8Array): string {
  return hash('sha256', bytes, 'hex');
}

const ENTRY_TYPE = 'RECORD_STATE_CHANGE';

function buildEntry(
  kp: Keypair,
  keyId: string,
  position: number,
  previousHash: string | null,
  payload: Record<string, unknown>,
): AuditExportEntry {
  // Sign a faithful in-toto v1 Statement: the engine signs `{ predicate: ... }`
  // where the predicate is the canonical row projection (record_id, entry_type,
  // payload). The binding check (F-731) re-derives exactly this from the row's
  // recordId/entryType/payload, so the synthetic envelope must carry it too.
  const recordId = typeof payload.recordId === 'string' ? payload.recordId : 'REC-test-001';
  const predicate = { record_id: recordId, entry_type: ENTRY_TYPE, payload };
  const envelope = buildCoseSign1(kp, position, previousHash, { predicate });
  const payloadHash = sha256Hex(envelope);
  return {
    // Current exports are chainPosition-only — no legacy `position` (F-682).
    chainPosition: position,
    timestamp: '2026-04-17T00:00:00Z',
    createdAt: '2026-04-17T00:00:00Z',
    recordId,
    entryType: ENTRY_TYPE,
    payload,
    integrity: {
      payloadHash,
      previousHash,
      coseSign1: Buffer.from(envelope).toString('base64'),
      signingKeyId: keyId,
      valid: true,
    },
  };
}

function makeExport(kp: Keypair, keyId = 'vault-key-1', recordId = 'REC-test-001'): RecordAuditExport {
  const e1 = buildEntry(kp, keyId, 1, null, { event: 'record_created', recordId });
  const e2 = buildEntry(kp, keyId, 2, e1.integrity.payloadHash, { event: 'record_activated', recordId });
  const e3 = buildEntry(kp, keyId, 3, e2.integrity.payloadHash, { event: 'completion_submitted', recordId, count: 100 });
  return {
    exportMetadata: {
      recordId,
      orgId: 'org-001',
      type: 'ACH-PROC-v1',
      exportDate: '2026-04-17T00:00:00Z',
      totalEntries: 3,
      chainIntegrity: true,
      exportFormatVersion: '2.0',
      canonicalization: 'RFC8949-CDE',
      signingPublicKey: kp.publicKeyBase64,
      signingPublicKeys: { [keyId]: kp.publicKeyBase64 },
    },
    entries: [e1, e2, e3],
  };
}

describe('verifyExport — COSE_Sign1 (format 2.0)', () => {
  it('verifies a valid export', () => {
    const kp = makeKeypair();
    const result = verifyExport(makeExport(kp));
    expect(result.valid).toBe(true);
    expect(result.verifiedEntries).toBe(3);
    expect(result.totalEntries).toBe(3);
    expect(result.brokenAt).toBeUndefined();
    expect(result.signatureCoverage).toEqual({ signed: 3, unsigned: 0, skipped: 0, total: 3 });
    expect(result.entries.every((e) => e.valid && e.signature === 'ok')).toBe(true);
  });

  it('rejects unsupported export format version', () => {
    const kp = makeKeypair();
    const exp = makeExport(kp);
    exp.exportMetadata.exportFormatVersion = '1.0';
    const result = verifyExport(exp);
    expect(result.valid).toBe(false);
    expect(result.brokenAt?.code).toBe('UNSUPPORTED_FORMAT');
  });

  it('rejects unsupported canonicalization', () => {
    const kp = makeKeypair();
    const exp = makeExport(kp);
    exp.exportMetadata.canonicalization = 'RFC8785';
    const result = verifyExport(exp);
    expect(result.valid).toBe(false);
    expect(result.brokenAt?.code).toBe('UNSUPPORTED_FORMAT');
  });

  it('detects a broken hash chain (mutated previousHash)', () => {
    const kp = makeKeypair();
    const exp = makeExport(kp);
    exp.entries[1]!.integrity.previousHash = 'f'.repeat(64);
    const result = verifyExport(exp);
    expect(result.valid).toBe(false);
    expect(result.brokenAt?.position).toBe(2);
    expect(result.brokenAt?.code).toBe('CHAIN_LINK_BROKEN');
  });

  it('detects a position gap', () => {
    const kp = makeKeypair();
    const exp = makeExport(kp);
    exp.entries[1]!.chainPosition = 5;
    const result = verifyExport(exp);
    expect(result.valid).toBe(false);
    // verify-core sorts by chainPosition, so the sorted order is [1, 3, 5];
    // the gap surfaces at the entry whose actual chainPosition is 3.
    expect(result.brokenAt?.position).toBe(3);
    expect(result.brokenAt?.code).toBe('CHAIN_POSITION_GAP');
  });

  it('verifies a legacy export that uses `position` instead of `chainPosition` (F-682 back-compat)', () => {
    const kp = makeKeypair();
    const exp = makeExport(kp);
    // Simulate a pre-v0.25 export: only the legacy `position` field is present.
    for (const e of exp.entries) {
      (e as { position?: number; chainPosition?: number }).position = e.chainPosition;
      delete (e as { chainPosition?: number }).chainPosition;
    }
    const result = verifyExport(exp);
    expect(result.valid).toBe(true);
    expect(result.verifiedEntries).toBe(3);
  });

  it('detects a payload-hash mismatch (mutated coseSign1)', () => {
    const kp = makeKeypair();
    const exp = makeExport(kp);
    // Flip a byte in the middle of the base64 envelope.
    const raw = Buffer.from(exp.entries[1]!.integrity.coseSign1, 'base64');
    raw[10] = raw[10]! ^ 0x01;
    exp.entries[1]!.integrity.coseSign1 = raw.toString('base64');
    const result = verifyExport(exp);
    expect(result.valid).toBe(false);
    expect(result.brokenAt?.position).toBe(2);
    expect(result.brokenAt?.code).toBe('CHAIN_HASH_MISMATCH');
  });

  it('detects a tampered envelope under a re-stamped payloadHash (signature_invalid)', () => {
    // Rebuild the envelope with a DIFFERENT signing key, then stamp the new
    // payloadHash so the chain links cleanly. The verifier should still reject
    // because the resulting signature does not validate against the declared
    // signingKeyId's public key.
    const kp = makeKeypair();
    const attackerKp = makeKeypair();
    const exp = makeExport(kp);
    // Re-sign with the attacker key over the SAME predicate the row projects to,
    // so binding-integrity passes and the signature check is what rejects it
    // (a payload tamper would trip CHAIN_PAYLOAD_BINDING_MISMATCH first).
    const predicate2 = {
      record_id: exp.entries[1]!.recordId,
      entry_type: ENTRY_TYPE,
      payload: exp.entries[1]!.payload,
    };
    const tamperedEnvelope = buildCoseSign1(attackerKp, 2, exp.entries[0]!.integrity.payloadHash, {
      predicate: predicate2,
    });
    exp.entries[1]!.integrity.coseSign1 = Buffer.from(tamperedEnvelope).toString('base64');
    exp.entries[1]!.integrity.payloadHash = sha256Hex(tamperedEnvelope);
    // Update the next entry's previousHash too so we hit the *signature* check,
    // not chain_break at position 3.
    exp.entries[2]!.integrity.previousHash = exp.entries[1]!.integrity.payloadHash;
    const predicate3 = {
      record_id: exp.entries[2]!.recordId,
      entry_type: ENTRY_TYPE,
      payload: exp.entries[2]!.payload,
    };
    const tamperedEnvelope3 = buildCoseSign1(
      attackerKp,
      3,
      exp.entries[1]!.integrity.payloadHash,
      { predicate: predicate3 },
    );
    exp.entries[2]!.integrity.coseSign1 = Buffer.from(tamperedEnvelope3).toString('base64');
    exp.entries[2]!.integrity.payloadHash = sha256Hex(tamperedEnvelope3);

    const result = verifyExport(exp);
    expect(result.valid).toBe(false);
    expect(result.brokenAt?.position).toBe(2);
    expect(result.brokenAt?.code).toBe('CHAIN_SIGNATURE_INVALID');
  });

  it('detects denormalised-payload tampering with the envelope intact (F-731, binding)', () => {
    // The attacker rewrites the human-readable row payload but leaves coseSign1
    // (the signed truth) untouched — the offline verifier must catch the drift
    // between the decoded predicate and the row projection (verificationGuide §4).
    const kp = makeKeypair();
    const exp = makeExport(kp);
    (exp.entries[1]!.payload as Record<string, unknown>).event = 'FORGED';
    const result = verifyExport(exp);
    expect(result.valid).toBe(false);
    expect(result.brokenAt?.position).toBe(2);
    expect(result.brokenAt?.code).toBe('CHAIN_PAYLOAD_BINDING_MISMATCH');
    expect(result.optionalChecks.payload_binding).toBe('applied');
    // The signature is never reached once binding fails upstream.
    expect(result.entries[1]!.signature).toBe('not-checked');
  });

  it('rejects entries referencing an unknown signing key', () => {
    const kp = makeKeypair();
    const exp = makeExport(kp);
    exp.entries[1]!.integrity.signingKeyId = 'ghost-key';
    const result = verifyExport(exp);
    expect(result.valid).toBe(false);
    expect(result.brokenAt?.position).toBe(2);
    expect(result.brokenAt?.code).toBe('CHAIN_SIGNATURE_MISSING_KEY');
  });

  it('flags unsigned entries (engine booted without VAULT_SIGNING_KEY) but keeps chain integrity', () => {
    const kp = makeKeypair();
    const exp = makeExport(kp);
    exp.entries[1]!.integrity.signingKeyId = null;
    const result = verifyExport(exp);
    expect(result.valid).toBe(true);
    expect(result.signatureCoverage.skipped).toBe(1);
    expect(result.entries[1]!.signature).toBe('skipped');
  });

  it('honors requireKeyId by rejecting entries signed with a different key', () => {
    const kp = makeKeypair();
    const exp = makeExport(kp);
    const result = verifyExport(exp, { requireKeyId: 'a-different-key' });
    expect(result.valid).toBe(false);
    // requireKeyId is a caller trust policy — its violation is alertable apart
    // from a benign missing key.
    expect(result.brokenAt?.code).toBe('CHAIN_KEY_POLICY_VIOLATION');
  });

  it('verifies with public keys supplied at call time (not embedded in export)', () => {
    const kp = makeKeypair();
    const exp = makeExport(kp);
    delete exp.exportMetadata.signingPublicKeys;
    exp.exportMetadata.signingPublicKey = null;
    const result = verifyExport(exp, { publicKeys: { 'vault-key-1': kp.publicKeyBase64 } });
    expect(result.valid).toBe(true);
  });

  it('detects cose_header_mismatch when envelope chain claim diverges from row columns', () => {
    // Build entry 2's envelope claiming previousHash = "bb…b" inside the
    // protected header, but set the row's previousHash to entry 1's real
    // payloadHash. The hash chain links, sha256(envelope) matches the stamped
    // payloadHash, signature verifies — but the protected-header chain claim
    // diverges from the row columns.
    const kp = makeKeypair();
    const exp = makeExport(kp);
    const divergedEnvelope = buildCoseSign1(kp, 2, 'b'.repeat(64), exp.entries[1]!.payload);
    exp.entries[1]!.integrity.coseSign1 = Buffer.from(divergedEnvelope).toString('base64');
    exp.entries[1]!.integrity.payloadHash = sha256Hex(divergedEnvelope);
    // Re-link entry 3 to the new entry 2 hash so signature_invalid / chain_break
    // doesn't surface at position 3 first.
    exp.entries[2] = buildEntry(kp, 'vault-key-1', 3, exp.entries[1]!.integrity.payloadHash, exp.entries[2]!.payload);

    const result = verifyExport(exp);
    expect(result.valid).toBe(false);
    expect(result.brokenAt?.position).toBe(2);
    expect(result.brokenAt?.code).toBe('CHAIN_COSE_HEADER_MISMATCH');
  });
});
