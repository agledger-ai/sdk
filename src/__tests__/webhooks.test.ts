import { describe, it, expect } from 'vitest';
import { generateKeyPairSync, createHash, sign as edSign, type KeyObject } from 'node:crypto';
import { signPayload, parseSignatureHeader, verifySignature, constructEvent, verifyRfc9421, constructEventRfc9421 } from '../webhooks/verify.js';
import type { VerificationKey } from '../types.js';

describe('Webhook Verification', () => {
  const secret = 'whsec_test_secret_key';
  const body = '{"event":"record.fulfilled","data":{"id":"rec-123"}}';

  describe('signPayload', () => {
    it('produces valid header format', () => {
      const result = signPayload(body, secret, 1709913600);
      expect(result.header).toMatch(/^t=\d+,v1=[a-f0-9]+$/);
      expect(result.timestamp).toBe(1709913600);
      expect(result.signature).toMatch(/^[a-f0-9]{64}$/);
    });

    it('uses current time when no timestamp provided', () => {
      const result = signPayload(body, secret);
      const now = Math.floor(Date.now() / 1000);
      expect(Math.abs(result.timestamp - now)).toBeLessThan(2);
    });
  });

  describe('parseSignatureHeader', () => {
    it('parses valid header', () => {
      const parsed = parseSignatureHeader('t=1234567890,v1=abcdef0123456789');
      expect(parsed).not.toBeNull();
      expect(parsed!.timestamp).toBe(1234567890);
      expect(parsed!.signatures).toEqual(['abcdef0123456789']);
    });

    it('supports multiple v1 signatures (key rotation)', () => {
      const parsed = parseSignatureHeader('t=1234567890,v1=sig1,v1=sig2');
      expect(parsed!.signatures).toEqual(['sig1', 'sig2']);
    });

    it('returns null for invalid header', () => {
      expect(parseSignatureHeader('')).toBeNull();
      expect(parseSignatureHeader('invalid')).toBeNull();
      expect(parseSignatureHeader('t=abc')).toBeNull();
      expect(parseSignatureHeader('v1=sig')).toBeNull();
    });
  });

  describe('verifySignature', () => {
    it('verifies a valid signature', () => {
      const { header } = signPayload(body, secret);
      expect(verifySignature(body, header, secret)).toBe(true);
    });

    it('rejects wrong body', () => {
      const { header } = signPayload(body, secret);
      expect(verifySignature('wrong body', header, secret)).toBe(false);
    });

    it('rejects wrong secret', () => {
      const { header } = signPayload(body, secret);
      expect(verifySignature(body, header, 'wrong_secret')).toBe(false);
    });

    it('rejects expired signatures', () => {
      const oldTimestamp = Math.floor(Date.now() / 1000) - 600;
      const { header } = signPayload(body, secret, oldTimestamp);
      expect(verifySignature(body, header, secret)).toBe(false);
    });

    it('accepts within tolerance', () => {
      const recentTimestamp = Math.floor(Date.now() / 1000) - 100;
      const { header } = signPayload(body, secret, recentTimestamp);
      expect(verifySignature(body, header, secret, 300)).toBe(true);
    });

    it('caps tolerance at 300 seconds', () => {
      const oldTimestamp = Math.floor(Date.now() / 1000) - 400;
      const { header } = signPayload(body, secret, oldTimestamp);
      // Even with 600s tolerance, should be capped at 300
      expect(verifySignature(body, header, secret, 600)).toBe(false);
    });

    it('supports array of secrets (key rotation)', () => {
      const { header } = signPayload(body, secret);
      expect(verifySignature(body, header, ['old_secret', secret, 'new_secret'])).toBe(true);
    });

    it('rejects when no secret matches', () => {
      const { header } = signPayload(body, secret);
      expect(verifySignature(body, header, ['wrong1', 'wrong2'])).toBe(false);
    });
  });

  describe('constructEvent', () => {
    const eventBody = JSON.stringify({
      type: 'record.created',
      data: { id: 'rec-123', status: 'CREATED' },
      timestamp: '2026-03-16T12:00:00Z',
      id: 'evt-456',
    });

    it('verifies and parses in one step', () => {
      const { header } = signPayload(eventBody, secret);
      const event = constructEvent(eventBody, header, secret);
      expect(event.type).toBe('record.created');
      expect(event.data).toEqual({ id: 'rec-123', status: 'CREATED' });
      expect(event.timestamp).toBe('2026-03-16T12:00:00Z');
      expect(event.id).toBe('evt-456');
    });

    it('throws on invalid signature', () => {
      const { header } = signPayload(eventBody, 'wrong_secret');
      expect(() => constructEvent(eventBody, header, secret)).toThrow('Webhook signature verification failed');
    });

    it('throws on expired signature', () => {
      const oldTs = Math.floor(Date.now() / 1000) - 600;
      const { header } = signPayload(eventBody, secret, oldTs);
      expect(() => constructEvent(eventBody, header, secret)).toThrow('Webhook signature verification failed');
    });
  });
});

describe('RFC 9421 (ed25519) Webhook Verification', () => {
  // Replicates the API's outbound signer (webhooks.rfc9421-signer.ts) so the
  // SDK verifier is tested against the exact wire format it must accept.
  const IDEMPOTENCY = 'x-agledger-idempotency-key';
  const COVERED = ['content-digest', IDEMPOTENCY];
  const contentDigest = (raw: string) => `sha-256=:${createHash('sha256').update(raw, 'utf8').digest('base64')}:`;
  const sigParams = (created: number, kid: string) =>
    `(${COVERED.map((c) => `"${c}"`).join(' ')});created=${created};keyid="${kid}";alg="ed25519"`;

  function sign(opts: {
    rawBody: string;
    idempotencyKey: string;
    privateKey: KeyObject;
    keyId: string;
    created?: number;
  }): Record<string, string> {
    const created = opts.created ?? Math.floor(Date.now() / 1000);
    const cd = contentDigest(opts.rawBody);
    const params = sigParams(created, opts.keyId);
    const base = [`"content-digest": ${cd}`, `"${IDEMPOTENCY}": ${opts.idempotencyKey}`, `"@signature-params": ${params}`].join('\n');
    const signature = edSign(null, Buffer.from(base, 'utf8'), opts.privateKey);
    return {
      'content-digest': cd,
      'signature-input': `sig1=${params}`,
      signature: `sig1=:${signature.toString('base64')}:`,
      [IDEMPOTENCY]: opts.idempotencyKey,
    };
  }

  const kp = generateKeyPairSync('ed25519');
  const keyId = 'a1b2c3d4e5f60718';
  const spkiBase64 = kp.publicKey.export({ format: 'der', type: 'spki' }).toString('base64');
  const rawBase64 = Buffer.from(kp.publicKey.export({ format: 'jwk' }).x as string, 'base64url').toString('base64');
  const verificationKeys: VerificationKey[] = [
    { keyId, algorithm: 'Ed25519', publicKey: spkiBase64, publicKeyRaw: rawBase64, status: 'active', activatedAt: '2026-01-01', retiredAt: null },
  ];
  const body = '{"type":"signal.emitted","data":{"recordId":"rec-1","signal":"SETTLE"},"timestamp":"2026-05-25T00:00:00Z","id":"evt-9"}';
  const idk = '11111111-2222-3333-4444-555555555555';

  it('verifies a valid delivery against a single SPKI key', async () => {
    const headers = sign({ rawBody: body, idempotencyKey: idk, privateKey: kp.privateKey, keyId });
    expect(await verifyRfc9421(headers, body, spkiBase64)).toBe(true);
  });

  it('verifies against a single raw 32-byte key', async () => {
    const headers = sign({ rawBody: body, idempotencyKey: idk, privateKey: kp.privateKey, keyId });
    expect(await verifyRfc9421(headers, body, rawBase64)).toBe(true);
  });

  it('resolves the key by keyid from a verification-keys array', async () => {
    const headers = sign({ rawBody: body, idempotencyKey: idk, privateKey: kp.privateKey, keyId });
    expect(await verifyRfc9421(headers, body, verificationKeys)).toBe(true);
  });

  it('handles header casing and string[] values', async () => {
    const headers = sign({ rawBody: body, idempotencyKey: idk, privateKey: kp.privateKey, keyId });
    const messy: Record<string, string | string[]> = {
      'Content-Digest': headers['content-digest'],
      'Signature-Input': [headers['signature-input']],
      Signature: headers.signature,
      'X-AGLedger-Idempotency-Key': headers[IDEMPOTENCY],
    };
    expect(await verifyRfc9421(messy, body, verificationKeys)).toBe(true);
  });

  it('rejects a tampered body (Content-Digest mismatch)', async () => {
    const headers = sign({ rawBody: body, idempotencyKey: idk, privateKey: kp.privateKey, keyId });
    expect(await verifyRfc9421(headers, body + ' ', spkiBase64)).toBe(false);
  });

  it('rejects a tampered idempotency key', async () => {
    const headers = sign({ rawBody: body, idempotencyKey: idk, privateKey: kp.privateKey, keyId });
    expect(await verifyRfc9421({ ...headers, [IDEMPOTENCY]: 'different-key' }, body, spkiBase64)).toBe(false);
  });

  it('rejects the wrong public key', async () => {
    const other = generateKeyPairSync('ed25519');
    const otherSpki = other.publicKey.export({ format: 'der', type: 'spki' }).toString('base64');
    const headers = sign({ rawBody: body, idempotencyKey: idk, privateKey: kp.privateKey, keyId });
    expect(await verifyRfc9421(headers, body, otherSpki)).toBe(false);
  });

  it('rejects when keyid is absent from the verification-keys array', async () => {
    const headers = sign({ rawBody: body, idempotencyKey: idk, privateKey: kp.privateKey, keyId: 'unknown-kid' });
    expect(await verifyRfc9421(headers, body, verificationKeys)).toBe(false);
  });

  it('rejects a stale signature beyond the replay window', async () => {
    const created = Math.floor(Date.now() / 1000) - 600;
    const headers = sign({ rawBody: body, idempotencyKey: idk, privateKey: kp.privateKey, keyId, created });
    expect(await verifyRfc9421(headers, body, spkiBase64)).toBe(false);
  });

  it('rejects when required headers are missing', async () => {
    const headers = sign({ rawBody: body, idempotencyKey: idk, privateKey: kp.privateKey, keyId });
    const { signature: _omit, ...withoutSig } = headers;
    expect(await verifyRfc9421(withoutSig, body, spkiBase64)).toBe(false);
    const { 'content-digest': _omit2, ...withoutDigest } = headers;
    expect(await verifyRfc9421(withoutDigest, body, spkiBase64)).toBe(false);
  });

  it('constructEventRfc9421 parses a verified delivery and throws otherwise', async () => {
    const headers = sign({ rawBody: body, idempotencyKey: idk, privateKey: kp.privateKey, keyId });
    const event = await constructEventRfc9421(headers, body, verificationKeys);
    expect(event.type).toBe('signal.emitted');
    expect(event.id).toBe('evt-9');
    await expect(constructEventRfc9421({ ...headers, [IDEMPOTENCY]: 'x' }, body, verificationKeys)).rejects.toThrow(
      'RFC 9421 webhook signature verification failed',
    );
  });
});
