import { createHmac, timingSafeEqual, createHash, createPublicKey, verify as cryptoVerify, type KeyObject } from 'node:crypto';
import { httpbis, type VerifyingKey, type SignatureParameters } from 'http-message-signatures';
import { resolveKeyAlgorithm, runtimeCanCompute } from '@agledger/verify-core';
import type { WebhookEventType, RecordRow, Completion, Dispute, VerificationKey } from '../types.js';
import { SignatureAlgorithmUnavailableError, SignatureVerificationError } from '../errors.js';

const MAX_TOLERANCE_SECONDS = 300;

/** A verified webhook event with typed payload. */
export interface WebhookEvent<T extends WebhookEventType = WebhookEventType> {
  /** Event type (e.g., 'record.created', 'record.completion_submitted'). */
  type: T;
  /** Event payload — the resource that triggered the event. */
  data: T extends `record.completion_${string}` ? Completion
    : T extends `record.${string}` ? RecordRow
    : T extends `dispute.${string}` ? Dispute
    : Record<string, unknown>;
  /** ISO 8601 timestamp of the event. */
  timestamp: string;
  /** Unique event ID. */
  id?: string;
}

/**
 * Verify a webhook signature and parse the payload in one step.
 *
 * @param rawBody - The raw request body string (do NOT parse JSON first)
 * @param header - The x-agledger-signature header value
 * @param secrets - One or more webhook secrets (array for key rotation)
 * @param toleranceSeconds - Max age in seconds (default/max: 300)
 * @returns Parsed and typed webhook event
 * @throws Error if signature is invalid or body cannot be parsed
 *
 * @example
 * ```ts
 * import { constructEvent } from '@agledger/sdk/webhooks';
 *
 * const event = constructEvent(rawBody, req.headers['x-agledger-signature'], secret);
 * if (event.type === 'record.created') {
 *   console.log(event.data.id); // typed as RecordRow
 * }
 * ```
 */
export function constructEvent(
  rawBody: string,
  header: string,
  secrets: string | string[],
  toleranceSeconds?: number,
): WebhookEvent {
  if (!verifySignature(rawBody, header, secrets, toleranceSeconds)) {
    throw new SignatureVerificationError('Webhook signature verification failed', rawBody);
  }
  return parseWebhookEvent(rawBody);
}

/** Parse a verified webhook body into a typed event (shared by both verify paths). */
function parseWebhookEvent(rawBody: string): WebhookEvent {
  const parsed = JSON.parse(rawBody);
  return {
    type: parsed.type ?? parsed.event ?? 'unknown',
    data: parsed.data ?? parsed.payload ?? parsed,
    timestamp: parsed.timestamp ?? parsed.created_at ?? new Date().toISOString(),
    id: parsed.id ?? parsed.event_id,
  };
}

export interface SignResult {
  header: string;
  timestamp: number;
  signature: string;
}

/**
 * Sign a payload (for testing purposes).
 * Returns the header string, timestamp, and hex signature.
 */
export function signPayload(
  rawBody: string,
  secret: string,
  timestamp?: number,
): SignResult {
  const ts = timestamp ?? Math.floor(Date.now() / 1000);
  const signedPayload = `${ts}.${rawBody}`;
  const signature = createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  return {
    header: `t=${ts},v1=${signature}`,
    timestamp: ts,
    signature,
  };
}

/**
 * Parse a webhook signature header into timestamp and signature(s).
 * Format: t=<unix_ts>,v1=<hex>[,v1=<hex2>]
 * Supports multiple v1 signatures for key rotation.
 */
export function parseSignatureHeader(
  header: string,
): { timestamp: number; signatures: string[] } | null {
  const parts = header.split(',');
  let timestamp: number | undefined;
  const signatures: string[] = [];

  for (const part of parts) {
    const [key, value] = part.split('=', 2);
    if (!key || !value) return null;

    if (key.trim() === 't') {
      timestamp = parseInt(value.trim(), 10);
      if (isNaN(timestamp)) return null;
    } else if (key.trim() === 'v1') {
      signatures.push(value.trim());
    }
  }

  if (timestamp === undefined || signatures.length === 0) return null;
  return { timestamp, signatures };
}

/**
 * Verify a webhook signature.
 *
 * @param rawBody - The raw request body string
 * @param header - The x-agledger-signature header value
 * @param secrets - One or more webhook secrets (array for key rotation)
 * @param toleranceSeconds - Max age in seconds (default/max: 300)
 * @returns true if signature is valid and within tolerance
 */
export function verifySignature(
  rawBody: string,
  header: string,
  secrets: string | string[],
  toleranceSeconds?: number,
): boolean {
  const parsed = parseSignatureHeader(header);
  if (!parsed) return false;

  const tolerance = Math.min(
    toleranceSeconds ?? MAX_TOLERANCE_SECONDS,
    MAX_TOLERANCE_SECONDS,
  );

  // Check timestamp freshness
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parsed.timestamp) > tolerance) return false;

  const secretList = Array.isArray(secrets) ? secrets : [secrets];
  const signedPayload = `${parsed.timestamp}.${rawBody}`;

  for (const secret of secretList) {
    const expected = createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');

    for (const sig of parsed.signatures) {
      const sigBuf = Buffer.from(sig, 'hex');
      const expectedBuf = Buffer.from(expected, 'hex');

      if (sigBuf.length === expectedBuf.length && timingSafeEqual(sigBuf, expectedBuf)) {
        return true;
      }
    }
  }

  return false;
}

// RFC 9421 webhook verification (ed25519 / ecdsa-p256-sha256).
//
// The asymmetric, opt-in signing tier (`signingAlg: 'ed25519'` or
// `'ecdsa-p256-sha256'`; the wire `alg` parameter reflects the Server's ACTIVE
// vault key). Deliveries are signed with the Server vault key as RFC 9421 HTTP
// Message Signatures; the receiver verifies against the published public key at
// GET /v1/verification-keys (matched by the `keyid` parameter) and holds no
// secret: non-repudiation for the Settlement Signal hop. This is distinct from
// the HMAC path above. The verification algorithm is dispatched from the
// resolved key's type, never from the attacker-writable `alg` parameter; `alg`
// is asserted against the key via the `algs` allowlist.
//
// Covered components are exactly `content-digest` (RFC 9530 body integrity) and
// `x-agledger-idempotency-key` (the stable dedup identity). Derived components
// (@method/@target-uri/@authority) are deliberately excluded — proxies rewrite
// them, which would break verification of authentic deliveries.

/** The covered components a signed delivery signs, lowercased per RFC 9421. */
const RFC9421_COVERED_COMPONENTS = ['content-digest', 'x-agledger-idempotency-key'] as const;

/**
 * Public key(s) to verify a signed delivery against. Either a single
 * base64-encoded key (raw 32-byte Ed25519 or SPKI DER, which also carries
 * P-256), or the `data` array from `client.verificationKeys.list()`, in which
 * case the key is resolved by matching the delivery's `keyid` to
 * `VerificationKey.keyId`.
 */
export type Rfc9421PublicKey = string | VerificationKey[];

export interface Rfc9421VerifyOptions {
  /** Max age of the signature's `created` time, in seconds (default/max: 300). */
  toleranceSeconds?: number;
}

/** Normalize a headers bag to a lowercase-keyed map of single string values. */
function normalizeHeaders(headers: Record<string, string | string[] | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    if (v === undefined) continue;
    out[k.toLowerCase()] = Array.isArray(v) ? v.join(', ') : v;
  }
  return out;
}

/** Compute the RFC 9530 Content-Digest header value over the raw body bytes. */
function computeContentDigest(rawBody: string): string {
  return `sha-256=:${createHash('sha256').update(rawBody, 'utf8').digest('base64')}:`;
}

/** Build a public KeyObject from a base64 raw (32-byte Ed25519) or SPKI DER key. */
function publicKeyObject(base64Key: string): KeyObject {
  const buf = Buffer.from(base64Key, 'base64');
  if (buf.length === 32) {
    return createPublicKey({ key: { kty: 'OKP', crv: 'Ed25519', x: buf.toString('base64url') }, format: 'jwk' });
  }
  return createPublicKey({ key: buf, format: 'der', type: 'spki' });
}

/**
 * Refuse to proceed when the host runtime cannot compute the key's algorithm.
 *
 * A verification failure and an inability to verify are different events with
 * opposite responses, so this throws instead of joining the `false` path: a
 * caller doing `if (!ok) return 401` would otherwise reject every legitimate
 * delivery as forged. An unhandled throw surfacing as a 500 is the correct
 * outcome, because the fault is in the receiver's configuration, not in the
 * sender's signature.
 *
 * Capability is proven against a fixed known-answer signature (verify-core's
 * `runtimeCanCompute`), never inferred from a failed verification of the
 * delivery itself: nothing an attacker sends may decide whether a bad
 * signature gets reported as unverifiable.
 */
function assertRuntimeCanCompute(keyObj: KeyObject): void {
  const spki = (keyObj.export({ type: 'spki', format: 'der' }) as Buffer).toString('base64');
  const keyAlg = resolveKeyAlgorithm(spki);
  // Key types outside the table are rejected by verifyingKeyFor as before:
  // that is a fail-closed key-shape decision, not a runtime gap.
  if (typeof keyAlg !== 'object' || !keyAlg.verifiable) return;
  if (runtimeCanCompute(keyAlg)) return;
  throw new SignatureAlgorithmUnavailableError(
    `This host cannot compute ${keyAlg.name}, so the webhook signature could not be checked. ` +
      `The usual cause is an active OpenSSL FIPS provider, which carries no EdDSA. ` +
      `This is NOT a failed signature: the delivery may be perfectly valid. ` +
      `Terminate the signature on an unrestricted host, or configure the sender for ecdsa-p256-sha256.`,
    keyAlg.name,
  );
}

/**
 * Build the http-message-signatures VerifyingKey for whatever algorithm the
 * resolved key commits to. Ed25519 and ES256 (`ecdsa-p256-sha256`, raw r||s
 * per RFC 9421) are supported; any other key type returns null so
 * verification fails closed rather than falling into Node's
 * key-type-dispatched `verify(null, ...)` fallback.
 */
function verifyingKeyFor(keyObj: KeyObject, id: string | undefined): VerifyingKey | null {
  assertRuntimeCanCompute(keyObj);
  if (keyObj.asymmetricKeyType === 'ed25519') {
    return {
      id,
      algs: ['ed25519'],
      verify: async (data: Buffer, signature: Buffer) => cryptoVerify(null, data, keyObj, signature),
    };
  }
  if (keyObj.asymmetricKeyType === 'ec' && keyObj.asymmetricKeyDetails?.namedCurve === 'prime256v1') {
    return {
      id,
      algs: ['ecdsa-p256-sha256'],
      verify: async (data: Buffer, signature: Buffer) =>
        cryptoVerify('sha256', data, { key: keyObj, dsaEncoding: 'ieee-p1363' }, signature),
    };
  }
  return null;
}

/**
 * Verify an RFC 9421 webhook delivery (ed25519 or ecdsa-p256-sha256), the
 * non-repudiable signing tier for settlement events. Recomputes the
 * Content-Digest over the raw body, reconstructs the RFC 9421 signature base,
 * resolves the public key by `keyid`, verifies the signature under the
 * algorithm that key commits to, and enforces the `created` replay window.
 *
 * @param headers - The delivery's HTTP headers (must include `content-digest`,
 *   `signature-input`, `signature`, and `x-agledger-idempotency-key`). Casing
 *   and `string[]` values are handled.
 * @param rawBody - The raw request body string (do NOT parse JSON first).
 * @param key - A single base64 public key, or the array from
 *   `client.verificationKeys.list()` (resolved by `keyid`).
 * @param options - `toleranceSeconds` for the replay window (default/max: 300).
 * @returns true only if the signature, digest, and replay window all hold.
 *
 * @example
 * ```ts
 * import { verifyRfc9421 } from '@agledger/sdk/webhooks';
 *
 * const { data: keys } = await client.verificationKeys.list();
 * const ok = await verifyRfc9421(req.headers, rawBody, keys);
 * if (!ok) return res.status(401).end();
 * ```
 */
export async function verifyRfc9421(
  headers: Record<string, string | string[] | undefined>,
  rawBody: string,
  key: Rfc9421PublicKey,
  options?: Rfc9421VerifyOptions,
): Promise<boolean> {
  try {
    const h = normalizeHeaders(headers);

    // RFC 9530 body integrity — the http-message-signatures library does not
    // check Content-Digest, so the body↔digest binding is enforced here.
    if (!h['content-digest'] || h['content-digest'] !== computeContentDigest(rawBody)) return false;

    const tolerance = Math.min(options?.toleranceSeconds ?? MAX_TOLERANCE_SECONDS, MAX_TOLERANCE_SECONDS);

    const resolveKey = (keyid: string | undefined): KeyObject | null => {
      if (typeof key === 'string') return publicKeyObject(key);
      const match = key.find((k) => k.keyId === keyid);
      return match ? publicKeyObject(match.publicKey) : null;
    };

    const result = await httpbis.verifyMessage(
      {
        keyLookup: async (params: SignatureParameters): Promise<VerifyingKey | null> => {
          const keyObj = resolveKey(typeof params.keyid === 'string' ? params.keyid : undefined);
          if (!keyObj) return null;
          return verifyingKeyFor(keyObj, typeof params.keyid === 'string' ? params.keyid : undefined);
        },
        // `created` is required for replay protection. The library's window
        // math: a delivery is rejected when age > maxAge - tolerance (past)
        // or when created - tolerance > now (future). maxAge = 2t with
        // tolerance = t therefore accepts age in [-t, +t], the same symmetric
        // window the HMAC path enforces. maxAge = tolerance = t would make
        // the past window ZERO seconds and reject every real delivery.
        requiredParams: ['created', 'keyid'],
        requiredFields: [...RFC9421_COVERED_COMPONENTS],
        maxAge: tolerance * 2,
        tolerance,
      },
      { method: 'POST', url: 'https://webhook.agledger.local/', headers: h },
    );

    return result === true;
  } catch (err) {
    // "Could not check" must not be flattened into "did not verify"; every
    // other failure in here really is a rejected delivery.
    if (err instanceof SignatureAlgorithmUnavailableError) throw err;
    return false;
  }
}

/**
 * Verify an RFC 9421 webhook delivery and parse the payload in one step. The
 * asymmetric-tier analogue of `constructEvent`.
 *
 * @throws SignatureVerificationError if verification fails.
 */
export async function constructEventRfc9421(
  headers: Record<string, string | string[] | undefined>,
  rawBody: string,
  key: Rfc9421PublicKey,
  options?: Rfc9421VerifyOptions,
): Promise<WebhookEvent> {
  if (!(await verifyRfc9421(headers, rawBody, key, options))) {
    throw new SignatureVerificationError('RFC 9421 webhook signature verification failed', rawBody);
  }
  return parseWebhookEvent(rawBody);
}
