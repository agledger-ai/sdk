import { describe, it, expect } from 'vitest';
import { generateKeyPairSync, createHash, createPrivateKey, sign } from 'node:crypto';
import { verifyExport, canonicalize } from '../verify/verify-export.js';
import type { MandateAuditExport } from '../types.js';

interface Keypair {
  publicKeyBase64: string;
  privateKey: ReturnType<typeof createPrivateKey>;
}

function makeKeypair(): Keypair {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const der = publicKey.export({ type: 'spki', format: 'der' }) as Buffer;
  return { publicKeyBase64: der.toString('base64'), privateKey };
}

function sha256Hex(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

function signEntry(
  kp: Keypair,
  keyId: string,
  position: number,
  payload: Record<string, unknown>,
  previousHash: string | null,
) {
  const payloadHash = sha256Hex(canonicalize(payload));
  const signInput = `${position}:${payloadHash}:${previousHash ?? 'null'}`;
  const signature = sign(null, Buffer.from(signInput), kp.privateKey).toString('hex');
  return {
    position,
    timestamp: '2026-04-17T00:00:00Z',
    entryType: 'TEST',
    description: 'test entry',
    payload,
    integrity: {
      payloadHash,
      hashAlg: 'SHA-256',
      previousHash,
      signature,
      signatureAlg: 'Ed25519',
      signingKeyId: keyId,
      valid: true,
    },
  };
}

function makeExport(kp: Keypair, keyId = 'vault-key-1', mandateId = 'MND-test-001'): MandateAuditExport {
  const e1 = signEntry(kp, keyId, 1, { event: 'mandate_created', mandateId }, null);
  const e2 = signEntry(kp, keyId, 2, { event: 'mandate_activated', mandateId }, e1.integrity.payloadHash);
  const e3 = signEntry(kp, keyId, 3, { event: 'receipt_submitted', mandateId, count: 100 }, e2.integrity.payloadHash);
  return {
    exportMetadata: {
      mandateId,
      enterpriseId: 'ent-001',
      contractType: 'ACH-PROC-v1',
      exportDate: '2026-04-17T00:00:00Z',
      totalEntries: 3,
      chainIntegrity: true,
      exportFormatVersion: '1.0',
      canonicalization: 'RFC8785',
      signingPublicKey: kp.publicKeyBase64,
      signingPublicKeys: { [keyId]: kp.publicKeyBase64 },
    },
    entries: [e1, e2, e3],
  };
}

describe('verifyExport', () => {
  it('verifies a valid export', () => {
    const kp = makeKeypair();
    const result = verifyExport(makeExport(kp));
    expect(result.valid).toBe(true);
    expect(result.verifiedEntries).toBe(3);
    expect(result.totalEntries).toBe(3);
    expect(result.brokenAt).toBeUndefined();
    expect(result.entries.every((e) => e.valid)).toBe(true);
  });

  it('detects tampered payload (hash mismatch)', () => {
    const kp = makeKeypair();
    const exp = makeExport(kp);
    (exp.entries[1].payload as Record<string, unknown>).tampered = true;
    const result = verifyExport(exp);
    expect(result.valid).toBe(false);
    expect(result.brokenAt?.position).toBe(2);
    expect(result.brokenAt?.reason).toBe('payload_hash_mismatch');
  });

  it('detects tampered signature', () => {
    const kp = makeKeypair();
    const exp = makeExport(kp);
    exp.entries[1].integrity.signature = 'f'.repeat(128);
    const result = verifyExport(exp);
    expect(result.valid).toBe(false);
    expect(result.brokenAt?.position).toBe(2);
    expect(result.brokenAt?.reason).toBe('signature_invalid');
  });

  it('detects broken chain link', () => {
    const kp = makeKeypair();
    const exp = makeExport(kp);
    exp.entries[2].integrity.previousHash = 'a'.repeat(64);
    const result = verifyExport(exp);
    expect(result.valid).toBe(false);
    expect(result.brokenAt?.position).toBe(3);
    expect(result.brokenAt?.reason).toBe('chain_break');
  });

  it('detects position gap', () => {
    const kp = makeKeypair();
    const exp = makeExport(kp);
    exp.entries[1].position = 5;
    const result = verifyExport(exp);
    expect(result.valid).toBe(false);
    expect(result.brokenAt?.position).toBe(5);
    expect(result.brokenAt?.reason).toBe('position_gap');
  });

  it('detects unknown signing key', () => {
    const kp = makeKeypair();
    const exp = makeExport(kp);
    exp.entries[1].integrity.signingKeyId = 'unknown-key-999';
    const result = verifyExport(exp);
    expect(result.valid).toBe(false);
    expect(result.brokenAt?.reason).toBe('unknown_key');
  });

  it('rejects wrong public key supplied via options override', () => {
    const kp = makeKeypair();
    const exp = makeExport(kp);
    const wrongKp = makeKeypair();
    const result = verifyExport(exp, {
      publicKeys: { 'vault-key-1': wrongKp.publicKeyBase64 },
    });
    expect(result.valid).toBe(false);
    expect(result.brokenAt?.reason).toBe('signature_invalid');
  });

  it('rejects unsupported canonicalization', () => {
    const kp = makeKeypair();
    const exp = makeExport(kp);
    exp.exportMetadata.canonicalization = 'custom';
    const result = verifyExport(exp);
    expect(result.valid).toBe(false);
    expect(result.brokenAt?.reason).toBe('unsupported_algorithm');
  });

  it('rejects unsupported hash algorithm', () => {
    const kp = makeKeypair();
    const exp = makeExport(kp);
    exp.entries[0].integrity.hashAlg = 'SHA-1';
    const result = verifyExport(exp);
    expect(result.valid).toBe(false);
    expect(result.brokenAt?.reason).toBe('unsupported_algorithm');
  });

  it('supports requireKeyId for high-assurance verification', () => {
    const kp = makeKeypair();
    const exp = makeExport(kp, 'retired-key');
    const result = verifyExport(exp, { requireKeyId: 'active-key' });
    expect(result.valid).toBe(false);
    expect(result.brokenAt?.reason).toBe('unknown_key');
  });

  it('handles empty export', () => {
    const kp = makeKeypair();
    const exp = makeExport(kp);
    exp.entries = [];
    const result = verifyExport(exp);
    expect(result.valid).toBe(false);
    expect(result.totalEntries).toBe(0);
    expect(result.verifiedEntries).toBe(0);
  });

  it('uses embedded signingPublicKeys when present', () => {
    const kp = makeKeypair();
    const exp = makeExport(kp);
    exp.exportMetadata.signingPublicKey = null;
    const result = verifyExport(exp);
    expect(result.valid).toBe(true);
  });

  it('merges option publicKeys over embedded ones', () => {
    const kp = makeKeypair();
    const exp = makeExport(kp);
    exp.exportMetadata.signingPublicKeys = {};
    const result = verifyExport(exp, {
      publicKeys: { 'vault-key-1': kp.publicKeyBase64 },
    });
    expect(result.valid).toBe(true);
  });
});

describe('canonicalize (RFC 8785)', () => {
  it('sorts object keys', () => {
    expect(canonicalize({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });

  it('handles nested objects', () => {
    expect(canonicalize({ b: { d: 1, c: 2 }, a: 3 })).toBe('{"a":3,"b":{"c":2,"d":1}}');
  });

  it('handles arrays with preserved order', () => {
    expect(canonicalize([3, 1, 2])).toBe('[3,1,2]');
  });

  it('handles primitives', () => {
    expect(canonicalize(null)).toBe('null');
    expect(canonicalize(undefined)).toBe('null');
    expect(canonicalize(true)).toBe('true');
    expect(canonicalize(42)).toBe('42');
    expect(canonicalize('hello')).toBe('"hello"');
  });

  it('escapes strings per JSON.stringify', () => {
    expect(canonicalize('a"b')).toBe('"a\\"b"');
    expect(canonicalize('a\nb')).toBe('"a\\nb"');
  });
});
