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

  it('still returns false for deliveries rejected before any key is touched', async () => {
    // These fail at the digest/header layer, upstream of key resolution, so
    // the capability gate is never consulted and the old behavior stands.
    const headers = signDelivery();
    await expect(verifyRfc9421(headers, `${body} `, spkiBase64)).resolves.toBe(false);
    const { signature: _drop, ...noSignature } = headers;
    await expect(verifyRfc9421(noSignature, body, spkiBase64)).resolves.toBe(false);
  });

  it('throws for a FORGED signature too, because nothing was computed', async () => {
    // The honest and easily-misread consequence: the gate necessarily runs
    // before verification, so on this host a forgery is indistinguishable
    // from a valid delivery. Pinned here so nobody "fixes" it into a false,
    // which would claim a signature was checked when it never was, and so the
    // README/CHANGELOG cannot drift back to promising bad deliveries return
    // false on every host.
    const headers = signDelivery();
    const sig = Buffer.from(headers['signature']!.slice('sig1=:'.length, -1), 'base64');
    sig[0] ^= 0xff;
    headers['signature'] = `sig1=:${sig.toString('base64')}:`;
    await expect(verifyRfc9421(headers, body, spkiBase64)).rejects.toBeInstanceOf(
      SignatureAlgorithmUnavailableError,
    );
  });

  it('refuses before loading the key, for both key encodings', async () => {
    // The gate has to sit ahead of key loading, because the other FIPS build
    // variant refuses THERE and would leave no key object to ask about the
    // algorithm; the throw would be caught and become a `false` that reads as
    // a forgery. Proven by the raw 32-byte form, which is Ed25519 by
    // definition and is identified without loading anything.
    const raw = Buffer.from(
      kp.publicKey.export({ format: 'jwk' }).x as string,
      'base64url',
    ).toString('base64');
    await expect(verifyRfc9421(signDelivery(), body, raw)).rejects.toBeInstanceOf(
      SignatureAlgorithmUnavailableError,
    );
    await expect(verifyRfc9421(signDelivery(), body, spkiBase64)).rejects.toBeInstanceOf(
      SignatureAlgorithmUnavailableError,
    );
  });
});
