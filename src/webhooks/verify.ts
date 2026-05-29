import { createHmac, timingSafeEqual, createHash, createPublicKey, verify as cryptoVerify, type KeyObject } from 'node:crypto';
import { httpbis, type VerifyingKey, type SignatureParameters } from 'http-message-signatures';
import type { WebhookEventType, RecordRow, Completion, Dispute, VerificationKey } from '../types.js';
import { SignatureVerificationError } from '../errors.js';

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

// RFC 9421 (ed25519) webhook verification.
//
// The asymmetric, opt-in signing tier (`signingAlg: 'ed25519'`). Deliveries are
// signed with the Server vault key as RFC 9421 HTTP Message Signatures; the
// receiver verifies against the published public key at GET /v1/verification-keys
// (matched by the `keyid` parameter) and holds no secret — non-repudiation for
// the Settlement Signal hop. This is distinct from the HMAC path above.
//
// Covered components are exactly `content-digest` (RFC 9530 body integrity) and
// `x-agledger-idempotency-key` (the stable dedup identity). Derived components
// (@method/@target-uri/@authority) are deliberately excluded — proxies rewrite
// them, which would break verification of authentic deliveries.

/** The covered components an ed25519 delivery signs, lowercased per RFC 9421. */
const RFC9421_COVERED_COMPONENTS = ['content-digest', 'x-agledger-idempotency-key'] as const;

/**
 * Public key(s) to verify an ed25519 delivery against. Either a single
 * base64-encoded key (raw 32-byte or SPKI DER — both accepted), or the `data`
 * array from `client.verificationKeys.list()`, in which case the key is
 * resolved by matching the delivery's `keyid` to `VerificationKey.keyId`.
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

/** Build an Ed25519 public KeyObject from a base64 raw (32-byte) or SPKI DER key. */
function ed25519PublicKeyObject(base64Key: string): KeyObject {
  const buf = Buffer.from(base64Key, 'base64');
  if (buf.length === 32) {
    return createPublicKey({ key: { kty: 'OKP', crv: 'Ed25519', x: buf.toString('base64url') }, format: 'jwk' });
  }
  return createPublicKey({ key: buf, format: 'der', type: 'spki' });
}

/**
 * Verify an RFC 9421 (ed25519) webhook delivery — the non-repudiable signing
 * tier for settlement events. Recomputes the Content-Digest over the raw body,
 * reconstructs the RFC 9421 signature base, resolves the public key by `keyid`,
 * verifies the Ed25519 signature, and enforces the `created` replay window.
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
      if (typeof key === 'string') return ed25519PublicKeyObject(key);
      const match = key.find((k) => k.keyId === keyid);
      return match ? ed25519PublicKeyObject(match.publicKey) : null;
    };

    const result = await httpbis.verifyMessage(
      {
        keyLookup: async (params: SignatureParameters): Promise<VerifyingKey | null> => {
          const keyObj = resolveKey(typeof params.keyid === 'string' ? params.keyid : undefined);
          if (!keyObj) return null;
          return {
            id: typeof params.keyid === 'string' ? params.keyid : undefined,
            algs: ['ed25519'],
            verify: async (data: Buffer, signature: Buffer) => cryptoVerify(null, data, keyObj, signature),
          };
        },
        // `created` is required for replay protection; the window is enforced
        // via maxAge (how old) + tolerance (clock skew on either side).
        requiredParams: ['created', 'keyid'],
        requiredFields: [...RFC9421_COVERED_COMPONENTS],
        maxAge: tolerance,
        tolerance,
      },
      { method: 'POST', url: 'https://webhook.agledger.local/', headers: h },
    );

    return result === true;
  } catch {
    return false;
  }
}

/**
 * Verify an RFC 9421 (ed25519) webhook delivery and parse the payload in one
 * step. The ed25519 analogue of `constructEvent`.
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
