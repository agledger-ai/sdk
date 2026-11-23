import { createHmac, timingSafeEqual, createHash, createPublicKey, verify as cryptoVerify, type KeyObject } from 'node:crypto';
import {
  algorithmByName,
  instantMs,
  looksLikeEd25519Key,
  resolveKeyAlgorithm,
  runtimeCanCompute,
} from '@agledger/verify-core';
import type { WebhookEventType, RecordRow, Completion, Dispute, VerificationKey } from '../types.js';
import { ConfigurationError, SignatureAlgorithmUnavailableError, SignatureVerificationError } from '../errors.js';
import { ByteSequence, parseDictionary, serializeInnerList, type InnerList } from './structured-fields.js';

/**
 * Re-exported so a receiver can import the functions and the errors they throw
 * from one place. Handling both is not optional in a real handler, and making
 * people reach into a second entrypoint for the catch is how documented
 * examples end up not running.
 */
export { SignatureAlgorithmUnavailableError, SignatureVerificationError } from '../errors.js';

const MAX_TOLERANCE_SECONDS = 300;

/**
 * The replay window in seconds: the caller's value capped at 300. A value that
 * is not a finite number, 0 or more, throws instead of being capped: `NaN`
 * would make every freshness comparison false and so switch the window off.
 */
function resolveTolerance(toleranceSeconds: number | undefined): number {
  if (toleranceSeconds === undefined) return MAX_TOLERANCE_SECONDS;
  if (typeof toleranceSeconds !== 'number' || !Number.isFinite(toleranceSeconds) || toleranceSeconds < 0) {
    throw new RangeError('toleranceSeconds must be a finite number, 0 or more.');
  }
  return Math.min(toleranceSeconds, MAX_TOLERANCE_SECONDS);
}

/**
 * Clock skew allowed at each edge of a signing key's window when a delivery's
 * `created` time is placed in it. The Server publishes the same allowance to
 * receivers; it is fixed, and separate from the replay tolerance.
 */
const KEY_WINDOW_SKEW_MS = 300_000;

/**
 * The signing secrets as a list, refusing any that would let a caller forge.
 * An empty secret is a valid HMAC key, so accepting one (a receiver deployed
 * with `WEBHOOK_SECRET=` set but empty) would let anyone compute a passing
 * signature. An empty list, or an entry that is not a string with something
 * besides whitespace, is a configuration mistake: thrown, never reported as a
 * failed delivery.
 */
function checkedSecrets(secrets: string | readonly string[]): readonly string[] {
  const list: readonly unknown[] = Array.isArray(secrets) ? secrets : [secrets];
  if (list.length === 0 || list.some((s) => typeof s !== 'string' || s.trim() === '')) {
    throw new ConfigurationError(
      'Webhook signing secret is empty. Pass the endpoint\'s secret, or a non-empty list of secrets during rotation.',
    );
  }
  return list as readonly string[];
}

/** A verified webhook event with typed payload. */
export interface WebhookEvent<T extends WebhookEventType = WebhookEventType> {
  /** Event type (e.g., 'record.created', 'record.completion_submitted'). */
  type: T;
  /** Event payload: the resource that triggered the event. */
  data: T extends `record.completion_${string}` ? Completion
    : T extends `record.${string}` ? RecordRow
    : T extends `dispute.${string}` ? Dispute
    : Record<string, unknown>;
  /** ISO 8601 timestamp of the event, as the sender stated it. Absent when the body carries none. */
  timestamp?: string;
  /** Unique event ID. */
  id?: string;
}

/**
 * Verify a webhook signature and parse the payload in one step.
 *
 * @param rawBody - The raw request body string (do NOT parse JSON first)
 * @param header - The x-agledger-signature header value
 * @param secrets - One or more webhook secrets (array for key rotation). An empty list, or an empty or blank secret, throws a ConfigurationError.
 * @param toleranceSeconds - Max age in seconds (default/max: 300; a value that is not a finite number, 0 or more, throws a RangeError)
 * @returns Parsed and typed webhook event
 * @throws Error if signature is invalid or body cannot be parsed
 *
 * @example
 * ```ts
 * import { constructEvent } from '@agledger/sdk/webhooks';
 *
 * const header = req.headers['x-agledger-signature'];
 * if (typeof header !== 'string') throw new Error('missing signature header');
 * const event = constructEvent(rawBody, header, secret);
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
  const parsed: unknown = JSON.parse(rawBody);
  const o: Record<string, unknown> = parsed !== null && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  return {
    type: (o.type ?? o.event ?? 'unknown') as WebhookEventType,
    data: (o.data ?? o.payload ?? parsed) as WebhookEvent['data'],
    timestamp: (o.timestamp ?? o.created_at) as string | undefined,
    id: (o.id ?? o.event_id) as string | undefined,
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
      if (!/^\d+$/.test(value.trim())) return null;
      timestamp = Number(value.trim());
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
 * @param secrets - One or more webhook secrets (array for key rotation). An empty list, or an empty or blank secret, throws a ConfigurationError.
 * @param toleranceSeconds - Max age in seconds (default/max: 300). A value that is not a finite number, 0 or more, throws a RangeError.
 * @returns true if signature is valid and within tolerance
 */
export function verifySignature(
  rawBody: string,
  header: string,
  secrets: string | string[],
  toleranceSeconds?: number,
): boolean {
  const secretList = checkedSecrets(secrets);
  const tolerance = resolveTolerance(toleranceSeconds);
  const parsed = parseSignatureHeader(header);
  if (!parsed) return false;

  // Check timestamp freshness
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parsed.timestamp) > tolerance) return false;

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
// secret, so it can check the Server's signature on a Settlement Signal on its
// own. This is distinct from the HMAC path above. The verification algorithm is dispatched from the
// resolved key's type, never from the attacker-writable `alg` parameter; `alg`
// is asserted against the key via the `algs` allowlist.
//
// Covered components are exactly `content-digest` (RFC 9530 body integrity) and
// `x-agledger-idempotency-key` (the stable dedup identity). Derived components
// (@method/@target-uri/@authority) are deliberately excluded; proxies rewrite
// them, which would break verification of authentic deliveries.

/** The covered components a signed delivery signs, lowercased per RFC 9421. */
const RFC9421_COVERED_COMPONENTS = ['content-digest', 'x-agledger-idempotency-key'] as const;

/**
 * Public key(s) to verify a signed delivery against. Either a single
 * base64-encoded key (raw 32-byte Ed25519 or SPKI DER, which also carries
 * P-256), or the `data` array from `client.verificationKeys.list()`, in which
 * case the key is resolved by matching the delivery's `keyid` to
 * `VerificationKey.keyId` and the delivery's `created` time must fall inside
 * that key's `[activatedAt, retiredAt]` window, with 300 seconds allowed at
 * each edge (`retiredAt: null` means the window is still open). `status` is
 * not consulted: a key retired between signing and your fetch still verifies
 * what it signed while it was active. A single key string carries no window,
 * so pinning one accepts whatever that key signed inside the replay window.
 * The key statements are not read here, so a key list held without them works
 * too.
 */
export type Rfc9421PublicKey = string | Omit<VerificationKey, 'statements'>[];

export interface Rfc9421VerifyOptions {
  /** Max age of the signature's `created` time, in seconds (default/max: 300). */
  toleranceSeconds?: number;
}

/**
 * Normalize a headers bag to a lowercase-keyed map of single string values:
 * each value trimmed and obsolete line folding replaced by a space, and
 * multiple values joined with `, `, as RFC 9421 section 2.1 builds a field's
 * component value.
 */
function normalizeHeaders(headers: Record<string, string | string[] | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    if (v === undefined) continue;
    const values = Array.isArray(v) ? v : [v];
    out[k.toLowerCase()] = values.map((x) => x.trim().replaceAll(/\n\s*/g, ' ')).join(', ');
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
  // Gate BEFORE loading, because that is where a FIPS-locked host refuses:
  // `createPublicKey` throws "Failed to read asymmetric key" for a perfectly
  // good Ed25519 key, measured on a real provider. That throw
  // lands inside the caller's try and becomes a `false` that reads as a forged
  // delivery. Judged from the OID rather than from a loaded key, because on
  // such a runtime there is no key object left to ask.
  if (buf.length === 32 || looksLikeEd25519Key(buf)) assertRuntimeCanComputeNamed('Ed25519');
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
 * delivery itself, so no attacker input can turn a bad signature into a pass.
 *
 * With a `VerificationKey[]`, the delivery's `keyid` does select WHICH trusted
 * key is resolved, hence which algorithm gets probed, hence whether this
 * throws or returns false on a partially-restricted host. That is a choice
 * between two rejections, never a route to acceptance: the answer still comes
 * from fixed key material and a fixed vector.
 */
function assertRuntimeCanCompute(keyObj: KeyObject): void {
  const spki = (keyObj.export({ type: 'spki', format: 'der' }) as Buffer).toString('base64');
  const keyAlg = resolveKeyAlgorithm(spki);
  // Key types outside the table are rejected by verifyUnderKey as before:
  // that is a fail-closed key-shape decision, not a runtime gap.
  if (typeof keyAlg !== 'object' || !keyAlg.verifiable) return;
  if (runtimeCanCompute(keyAlg)) return;
  throw unavailable(keyAlg.name);
}

/**
 * The same refusal, asked by algorithm name rather than from a key object.
 * Used before the key is loaded, where a load-refusing runtime would leave
 * nothing to resolve an algorithm from.
 */
function assertRuntimeCanComputeNamed(name: 'Ed25519' | 'ES256'): void {
  const keyAlg = algorithmByName(name);
  if (keyAlg === null || runtimeCanCompute(keyAlg)) return;
  throw unavailable(name);
}

function unavailable(algorithm: string): SignatureAlgorithmUnavailableError {
  return new SignatureAlgorithmUnavailableError(
    `This host cannot compute ${algorithm}, so the webhook signature could not be checked. ` +
      `The usual cause is an active OpenSSL FIPS provider, which carries no EdDSA. ` +
      `This is NOT a failed signature: the delivery may be valid, forged, or expired; ` +
      `on this host none of those can be told apart. ` +
      `Terminate the signature on an unrestricted host, or configure the sender for ecdsa-p256-sha256.`,
    algorithm,
  );
}

/**
 * Verify a signature base under whatever algorithm the resolved key commits
 * to. Ed25519 and ES256 (`ecdsa-p256-sha256`, raw r||s per RFC 9421) are
 * supported; any other key type fails closed rather than falling into Node's
 * key-type-dispatched `verify(null, ...)`. A declared `alg` is asserted
 * against the key, never used to choose the algorithm. The checks the sender
 * controls come before the runtime capability probe, so nothing the sender
 * sends decides whether this throws or returns false.
 */
function verifyUnderKey(keyObj: KeyObject, declaredAlg: string | undefined, base: Buffer, signature: Buffer): boolean {
  if (keyObj.asymmetricKeyType === 'ed25519') {
    if (declaredAlg !== undefined && declaredAlg !== 'ed25519') return false;
    assertRuntimeCanCompute(keyObj);
    return cryptoVerify(null, base, keyObj, signature);
  }
  if (keyObj.asymmetricKeyType === 'ec' && keyObj.asymmetricKeyDetails?.namedCurve === 'prime256v1') {
    if (declaredAlg !== undefined && declaredAlg !== 'ecdsa-p256-sha256') return false;
    if (signature.length !== 64) return false;
    assertRuntimeCanCompute(keyObj);
    return cryptoVerify('sha256', base, { key: keyObj, dsaEncoding: 'ieee-p1363' }, signature);
  }
  return false;
}

type KeyWindow = { activatedAt: unknown; retiredAt: unknown };

/**
 * Whether a signature created at `createdSeconds` falls inside its key's
 * window, with the skew allowance at each edge. A window that cannot be read
 * (no `activatedAt`, or an instant that is not RFC 3339) places nothing.
 */
function insideKeyWindow(createdSeconds: number, window: KeyWindow): boolean {
  const createdMs = createdSeconds * 1000;
  const activatedMs = typeof window.activatedAt === 'string' ? instantMs(window.activatedAt) : Number.NaN;
  // NaN compares false, so an unreadable edge rejects.
  if (!(createdMs >= activatedMs - KEY_WINDOW_SKEW_MS)) return false;
  if (window.retiredAt === null || window.retiredAt === undefined) return true;
  const retiredMs = typeof window.retiredAt === 'string' ? instantMs(window.retiredAt) : Number.NaN;
  return createdMs <= retiredMs + KEY_WINDOW_SKEW_MS;
}

/**
 * Verify an RFC 9421 webhook delivery (ed25519 or ecdsa-p256-sha256), the
 * non-repudiable signing tier for settlement events. Recomputes the
 * Content-Digest over the raw body, reconstructs the RFC 9421 signature base,
 * resolves the public key by `keyid`, verifies the signature under the
 * algorithm that key commits to, and enforces the `created` replay window.
 * Given the key list, it also holds `created` to the signing key's
 * `[activatedAt, retiredAt]` window with 300 seconds allowed at each edge.
 *
 * @param headers - The delivery's HTTP headers (must include `content-digest`,
 *   `signature-input`, `signature`, and `x-agledger-idempotency-key`). Casing
 *   and `string[]` values are handled.
 * @param rawBody - The raw request body string (do NOT parse JSON first).
 * @param key - A single base64 public key, or the array from
 *   `client.verificationKeys.list()` (resolved by `keyid`).
 * @param options - `toleranceSeconds` for the replay window (default/max: 300; a value that is not a finite number, 0 or more, rejects with a RangeError).
 * @returns true only if the signature, digest, replay window and key window all hold.
 * @throws {SignatureAlgorithmUnavailableError} when this host cannot compute
 *   the key's algorithm (typically an active OpenSSL FIPS provider, which
 *   carries no EdDSA). Nothing was checked, so the delivery is neither
 *   verified nor refuted: on such a host a forgery throws exactly as a valid
 *   delivery does. Catch it, or an unhandled rejection will end the process
 *   on Express 4 / plain `http`.
 *
 * @example
 * ```ts
 * import { verifyRfc9421, SignatureAlgorithmUnavailableError } from '@agledger/sdk/webhooks';
 *
 * const { data: keys } = await client.verificationKeys.list();
 * try {
 *   const ok = await verifyRfc9421(req.headers, rawBody, keys);
 *   if (!ok) return res.status(401).end();
 * } catch (err) {
 *   // Receiver misconfiguration, not a bad delivery: do not answer 401.
 *   if (err instanceof SignatureAlgorithmUnavailableError) return res.status(500).end();
 *   throw err;
 * }
 * ```
 */
export async function verifyRfc9421(
  headers: Record<string, string | string[] | undefined>,
  rawBody: string,
  key: Rfc9421PublicKey,
  options?: Rfc9421VerifyOptions,
): Promise<boolean> {
  const tolerance = resolveTolerance(options?.toleranceSeconds);
  try {
    return verifyDelivery(normalizeHeaders(headers), rawBody, key, tolerance);
  } catch (err) {
    // "Could not check" must not be flattened into "did not verify"; every
    // other failure in here really is a rejected delivery.
    if (err instanceof SignatureAlgorithmUnavailableError) throw err;
    return false;
  }
}

/**
 * The delivery verifies when one of its signatures does. A signature is
 * considered only when it covers exactly `content-digest` and
 * `x-agledger-idempotency-key`, in that order, and names `created` (an
 * Integer) and `keyid` (a String). A sender may add signatures of its own,
 * such as an intermediary's; one that is not ours is passed over rather than
 * failing the delivery.
 */
function verifyDelivery(h: Record<string, string>, rawBody: string, key: Rfc9421PublicKey, tolerance: number): boolean {
  // RFC 9530 body integrity: the body is bound to the signature through the
  // Content-Digest it covers.
  const contentDigest = h['content-digest'];
  const idempotencyKey = h['x-agledger-idempotency-key'];
  const sigInputField = h['signature-input'];
  const sigField = h['signature'];
  if (!contentDigest || !idempotencyKey || !sigInputField || !sigField) return false;
  if (contentDigest !== computeContentDigest(rawBody)) return false;

  const inputs = parseDictionary(sigInputField);
  const signatures = parseDictionary(sigField);
  if (!inputs || !signatures) return false;

  const now = Date.now() / 1000;
  const componentValues: Record<string, string> = {
    'content-digest': contentDigest,
    'x-agledger-idempotency-key': idempotencyKey,
  };

  // A host that cannot compute a key's algorithm is a receiver fault: raised
  // once no signature verified, never turned into a `false`.
  let unavailableError: SignatureAlgorithmUnavailableError | null = null;
  for (const [label, input] of inputs) {
    if (input.kind !== 'inner-list') continue;
    const sig = signatures.get(label);
    if (sig?.kind !== 'item' || !(sig.value instanceof ByteSequence)) continue;
    try {
      if (verifyOne(input, Buffer.from(sig.value.bytes), componentValues, key, tolerance, now)) return true;
    } catch (err) {
      // A label that cannot be checked (an unusable key, a host without the
      // algorithm) is passed over so a later label can still verify.
      if (err instanceof SignatureAlgorithmUnavailableError) unavailableError ??= err;
    }
  }
  if (unavailableError) throw unavailableError;
  return false;
}

function verifyOne(
  input: InnerList,
  signature: Buffer,
  componentValues: Record<string, string>,
  key: Rfc9421PublicKey,
  tolerance: number,
  now: number,
): boolean {
  // Covered components: exactly ours, in order, with no component parameters.
  if (input.items.length !== RFC9421_COVERED_COMPONENTS.length) return false;
  for (const [i, item] of input.items.entries()) {
    if (item.value !== RFC9421_COVERED_COMPONENTS[i] || item.params.size !== 0) return false;
  }

  const created = input.params.get('created');
  const keyid = input.params.get('keyid');
  const expires = input.params.get('expires');
  const alg = input.params.get('alg');
  if (typeof created !== 'number' || typeof keyid !== 'string') return false;
  if (expires !== undefined && (typeof expires !== 'number' || now > expires + tolerance)) return false;
  if (alg !== undefined && typeof alg !== 'string') return false;

  // The replay window, symmetric as on the HMAC path.
  if (Math.abs(now - created) > tolerance) return false;

  let keyObj: KeyObject;
  let window: KeyWindow | null = null;
  if (typeof key === 'string') {
    keyObj = publicKeyObject(key);
  } else {
    const match = key.find((k) => k.keyId === keyid);
    if (!match) return false;
    keyObj = publicKeyObject(match.publicKey);
    window = { activatedAt: match.activatedAt, retiredAt: match.retiredAt };
  }
  if (window !== null && !insideKeyWindow(created, window)) return false;

  const base = [
    ...RFC9421_COVERED_COMPONENTS.map((c) => `"${c}": ${componentValues[c]}`),
    `"@signature-params": ${serializeInnerList(input)}`,
  ].join('\n');
  return verifyUnderKey(keyObj, alg, Buffer.from(base, 'utf8'), signature);
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
