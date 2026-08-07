import { describe, it, expect, vi } from 'vitest';
import { createHash, generateKeyPairSync, sign as edSign } from 'node:crypto';

/**
 * A FIPS-locked receiver must not reject legitimate deliveries as forged
 * (agents#113).
 *
 * The FIPS provider carries no EdDSA, so verifying an ed25519 webhook throws
 * inside `verifyRfc9421`. That throw was caught and returned as `false`, which
 * every documented caller turns into a 401. The result: a receiver rejecting
 * every valid delivery it is sent, reporting each one as a bad signature, with
 * nothing anywhere naming the real cause.
 *
 * `runtimeCanCompute` is mocked rather than the crypto layer, because what
 * changed in this package is the decision made on its answer, and verify-core
 * covers the probe itself against a real refusal.
 */
vi.mock('@agledger/verify-core', async () => {
  const actual = await vi.importActual<typeof import('@agledger/verify-core')>(
    '@agledger/verify-core',
  );
  return {
    ...actual,
    // A FIPS host: ES256 yes, EdDSA no.
    runtimeCanCompute: (keyAlg: { name: string }) => keyAlg.name !== 'Ed25519',
  };
});

const { verifyRfc9421, constructEventRfc9421 } = await import('../webhooks/verify.js');
const { SignatureAlgorithmUnavailableError, SignatureVerificationError } = await import(
  '../errors.js'
);

const IDEMPOTENCY = 'x-agledger-idempotency-key';
const COVERED = ['content-digest', IDEMPOTENCY];
const contentDigest = (raw: string) =>
  `sha-256=:${createHash('sha256').update(raw, 'utf8').digest('base64')}:`;

const kp = generateKeyPairSync('ed25519');
const keyId = 'a1b2c3d4e5f60718';
const spkiBase64 = kp.publicKey.export({ format: 'der', type: 'spki' }).toString('base64');
const body =
  '{"type":"signal.emitted","data":{"recordId":"rec-1","signal":"SETTLE"},"timestamp":"2026-05-25T00:00:00Z","id":"evt-9"}';
const idk = '11111111-2222-3333-4444-555555555555';

/** A genuinely valid delivery. Signing is unaffected; only verify is refused. */
function signDelivery(): Record<string, string> {
  const created = Math.floor(Date.now() / 1000);
  const cd = contentDigest(body);
  const params = `(${COVERED.map((c) => `"${c}"`).join(' ')});created=${created};keyid="${keyId}";alg="ed25519"`;
  const base = [
    `"content-digest": ${cd}`,
    `"${IDEMPOTENCY}": ${idk}`,
    `"@signature-params": ${params}`,
  ].join('\n');
  return {
    'content-digest': cd,
    'signature-input': `sig1=${params}`,
    signature: `sig1=:${edSign(null, Buffer.from(base, 'utf8'), kp.privateKey).toString('base64')}:`,
    [IDEMPOTENCY]: idk,
  };
}

describe('a receiver whose runtime cannot compute EdDSA', () => {
  it('throws instead of reporting a valid delivery as unverified', async () => {
    await expect(verifyRfc9421(signDelivery(), body, spkiBase64)).rejects.toBeInstanceOf(
      SignatureAlgorithmUnavailableError,
    );
  });

  it('does not report it as a signature failure', async () => {
    // The distinction is the whole point: a 401 blames the sender for a fault
    // that is entirely in the receiver's configuration.
    await expect(verifyRfc9421(signDelivery(), body, spkiBase64)).rejects.not.toBeInstanceOf(
      SignatureVerificationError,
    );
  });

  it('names the algorithm, the cause, and both remedies', async () => {
    const err = await verifyRfc9421(signDelivery(), body, spkiBase64).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(SignatureAlgorithmUnavailableError);
    const { message, algorithm } = err as InstanceType<typeof SignatureAlgorithmUnavailableError>;
    expect(algorithm).toBe('Ed25519');
    expect(message).toContain('FIPS');
    expect(message).toContain('NOT a failed signature');
    expect(message).toContain('ecdsa-p256-sha256');
  });

  it('propagates through constructEventRfc9421 rather than becoming a parse failure', async () => {
    await expect(constructEventRfc9421(signDelivery(), body, spkiBase64)).rejects.toBeInstanceOf(
      SignatureAlgorithmUnavailableError,
    );
  });

  it('still returns false for deliveries that are actually bad', async () => {
    // The escape hatch must stay narrow: a tampered body is a rejected
    // delivery, not a runtime problem, and must not start throwing.
    const headers = signDelivery();
    await expect(verifyRfc9421(headers, `${body} `, spkiBase64)).resolves.toBe(false);
    const { signature: _drop, ...noSignature } = headers;
    await expect(verifyRfc9421(noSignature, body, spkiBase64)).resolves.toBe(false);
  });
});
