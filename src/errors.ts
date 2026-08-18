import type { ApiErrorResponse, ValidationErrorDetail } from './types.js';

/**
 * Base error for all SDK errors (network, timeout, etc.).
 * Not an API error: no status code.
 */
export class AgledgerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AgledgerError';
  }
}

/**
 * The client was constructed with unusable options, caught before any request
 * is made. Distinct from `ValidationError`, which reports what the Server
 * rejected: this never left the process.
 */
export class ConfigurationError extends AgledgerError {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/**
 * API returned an error response. All HTTP errors extend this.
 *
 * Fields mirror the API error body verbatim; the SDK does not invent content.
 * The API responds with RFC 9457 `application/problem+json`. Standard fields
 * (`type`, `title`, `status`, `detail`, `instance`) are surfaced alongside
 * AGLedger extension fields (`error`, `code`, `requestId`, `retryable`,
 * `docUrl`, `suggestion`, `recoveryHint`, `missingScopes`, `nextSteps`, …).
 *
 * Key properties for consumers:
 * - `type`: RFC 9457 problem URI (e.g. `/problems/ambiguous-publisher`). Branch on this, not on prose.
 * - `publishers`: candidate publisher labels on an ambiguous-publisher 422
 * - `pinnedRecords` / `unattributableRecords`: why a schema delete was refused
 * - `docs`: discovery-document pointer. `docUrl` is dead and always undefined.
 * - `status`: HTTP status code
 * - `code`: stable machine-readable error code (from API body `code` or `error`)
 * - `retryable`: API's `retryable` flag, falling back to status-based classification (429/5xx)
 * - `requestId`: correlation ID (from API body or `X-Request-Id` header)
 * - `docUrl`: documentation link, only if the API returned one
 * - `suggestion`: typo-correction hint, only if the API returned one
 * - `recoveryHint`: machine-readable recovery guidance (e.g. on 422 INVALID_ACTION)
 * - `refreshUrl`: concrete GET URL to re-fetch state (e.g. on 422 INVALID_ACTION)
 * - `validationErrors`: field-level validation details (for 400/422)
 */
export class AgledgerApiError extends AgledgerError {
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;
  readonly details?: ValidationErrorDetail[] | Record<string, unknown> | unknown[];

  /**
   * RFC 9457 problem URI, forwarded from the body's `type` when the failure
   * carries a narrower one than its status class, e.g.
   * `/problems/ambiguous-publisher`. Branch on this rather than on `message`
   * prose. The bulk-create envelope calls the same value `problemType`.
   */
  readonly type?: string;

  /**
   * Documentation link.
   *
   * @deprecated Always `undefined`: no route emits `docUrl`. Read `docs`.
   */
  readonly docUrl?: string;

  /**
   * Pointer to the discovery-document section describing the failed scheme.
   * Set on the federation 401 alongside `signInputTemplate`.
   */
  readonly docs?: string;

  /**
   * Candidate publisher labels on a 422 `/problems/ambiguous-publisher`: the
   * type is offered by more than one publisher, so the engine refuses to pick.
   * Re-send the request pinned to one of these (`publisher` in the Record
   * create body, or the `publisher` option on a schema read).
   */
  readonly publishers?: string[];

  /**
   * Registry version slot a schema conflict is on: the integer MAJOR component
   * of `manifest.version`. Minor and patch bumps stay in the same slot, so
   * escaping a `CONFLICTING_VERSION` 409 needs a major bump (or disabling and
   * deleting the existing registration to free the slot).
   */
  readonly registryVersion?: number;

  /**
   * Why a `schemas.delete()` was refused: Records written against the exact
   * registration the delete would have removed.
   *
   * Paired with `unattributableRecords`, and the pair is the whole diagnosis.
   * A non-zero `pinnedRecords` is fixable by deleting the other publisher's
   * registration instead; a non-zero `unattributableRecords` is not, because
   * those Records name no registration and so block the delete under every
   * label.
   */
  readonly pinnedRecords?: number;

  /**
   * Records of this type carrying no registration pin. They block a delete
   * under any publisher label, so this can be non-zero while `pinnedRecords`
   * is 0 and the delete still fails.
   */
  readonly unattributableRecords?: number;

  /** Recovery hint forwarded from the API body when present (typo-correction tier). */
  readonly suggestion?: string;

  /**
   * Machine-readable recovery guidance pointing the caller at the right
   * endpoint or refresh action. Set on 422 INVALID_ACTION and other
   * state-rejection errors where the API can name a corrective step.
   */
  readonly recoveryHint?: string;

  /**
   * Concrete GET URL the agent should re-fetch to read fresh
   * `nextActions` / `validTransitions` / `allowedActions`. Set on 422
   * INVALID_ACTION when the request path includes a Record id.
   */
  readonly refreshUrl?: string;

  /**
   * Whether this error is retryable.
   * - Uses the API's `retryable` field if present
   * - Falls back to status-based classification: 429 and 5xx are retryable
   */
  readonly retryable: boolean;

  /**
   * Raw response body bytes for binary endpoints (`application/cose`,
   * `application/concise-problem-details+cbor`). Set by `HttpClient.requestBinary`
   * when the API returns a 4xx/5xx on a SCITT or attestation endpoint;
   * customers decode it with `cborg` for SCITT problem-details (RFC 9290).
   */
  rawBody?: Uint8Array;

  constructor(status: number, body: ApiErrorResponse) {
    super(body.message || body.detail || body.title || `API error ${status}`);
    this.name = 'AgledgerApiError';
    this.status = status;
    this.code = body.code || body.error || 'unknown';
    this.requestId = body.requestId;
    this.details = body.details ?? undefined;
    this.retryable = body.retryable ?? (status === 429 || status >= 500);
    this.type = body.type;
    this.docUrl = body.docUrl;
    this.docs = body.docs;
    this.suggestion = body.suggestion;
    this.recoveryHint = body.recoveryHint;
    this.refreshUrl = body.refreshUrl;
    this.publishers = body.publishers;
    this.registryVersion = body.registryVersion;
    this.pinnedRecords = body.pinnedRecords;
    this.unattributableRecords = body.unattributableRecords;
  }

  /** Whether this error is retryable (429, 5xx, network errors). Delegates to the `retryable` property. */
  isRetryable(): boolean {
    return this.retryable;
  }

  /** Whether this is an input error (400): the request itself is malformed; fix it and retry. */
  isInputError(): boolean {
    return this.status === 400;
  }

  /** Whether this is a state error (422): the resource is in the wrong state; do not retry the same request. */
  isStateError(): boolean {
    return this.status === 422;
  }

  /** Whether this is an auth error (401/403): check credentials or scopes. */
  isAuthError(): boolean {
    return this.status === 401 || this.status === 403;
  }

  /** Field-level validation errors, normalized from various API formats. */
  get validationErrors(): ValidationErrorDetail[] {
    if (!this.details) return [];
    if (Array.isArray(this.details)) return this.details as ValidationErrorDetail[];
    // Handle Ajv-style errors nested under .errors
    const rec = this.details as Record<string, unknown>;
    if (Array.isArray(rec.errors)) {
      return (rec.errors as Record<string, string>[]).map((e) => ({
        field: e.instancePath || e.dataPath || '',
        message: e.message || '',
      }));
    }
    return [];
  }
}

export class AuthenticationError extends AgledgerApiError {
  constructor(body: ApiErrorResponse) {
    super(401, body);
    this.name = 'AuthenticationError';
  }
}

export class PermissionError extends AgledgerApiError {
  /** Scopes required by the endpoint but missing from the key. Empty if not a scope error. */
  readonly missingScopes: string[];
  /** Scopes the key has. Null if not included in the response. */
  readonly keyScopes: string[] | null;

  constructor(body: ApiErrorResponse) {
    super(403, body);
    this.name = 'PermissionError';
    // RFC 9457 surfaces missingScopes as a top-level extension field; older
    // bodies nested it under details.
    if (Array.isArray(body.missingScopes)) {
      this.missingScopes = body.missingScopes;
    } else {
      const details = body.details as Record<string, unknown> | undefined;
      this.missingScopes = Array.isArray(details?.missingScopes) ? details.missingScopes as string[] : [];
    }
    const details = body.details as Record<string, unknown> | undefined;
    this.keyScopes = Array.isArray(details?.keyScopes) ? details.keyScopes as string[] : null;
  }
}

export class NotFoundError extends AgledgerApiError {
  constructor(body: ApiErrorResponse) {
    super(404, body);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AgledgerApiError {
  constructor(body: ApiErrorResponse) {
    super(409, body);
    this.name = 'ConflictError';
  }
}

/**
 * Idempotency key conflict: the same key was used with different parameters.
 * Subclass of AgledgerApiError (typically 409 with a specific error code).
 */
export class IdempotencyError extends AgledgerApiError {
  constructor(body: ApiErrorResponse) {
    super(409, body);
    this.name = 'IdempotencyError';
  }
}

export class ValidationError extends AgledgerApiError {
  constructor(body: ApiErrorResponse) {
    super(400, body);
    this.name = 'ValidationError';
  }
}

/**
 * 422 Unprocessable: the request was valid but the resource state won't
 * accept it (e.g. INVALID_ACTION on `POST /v1/records/{id}/transition`).
 *
 * On INVALID_ACTION the API attaches `recoveryHint` and `refreshUrl` (and
 * `currentState` / `allowedActions` via `details`); surfaced on the base
 * `AgledgerApiError` properties.
 */
export class UnprocessableError extends AgledgerApiError {
  constructor(body: ApiErrorResponse) {
    super(422, body);
    this.name = 'UnprocessableError';
  }
}

export class RateLimitError extends AgledgerApiError {
  readonly retryAfter: number | null;

  constructor(body: ApiErrorResponse, retryAfter: number | null) {
    super(429, body);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class ConnectionError extends AgledgerError {
  override readonly cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'ConnectionError';
    this.cause = cause;
  }
}

export class TimeoutError extends ConnectionError {
  constructor(method: string, url: string, timeoutMs: number, cause?: Error) {
    super(`Request timed out after ${timeoutMs}ms: ${method} ${url}`, cause);
    this.name = 'TimeoutError';
  }
}

/**
 * Webhook signature verification failed.
 * NOT an API error: thrown locally by `constructEvent()` / `verifySignature()`.
 */
export class SignatureVerificationError extends Error {
  /** The raw payload that failed verification. */
  readonly payload: string;

  constructor(message: string, payload: string) {
    super(message);
    this.name = 'SignatureVerificationError';
    this.payload = payload;
  }
}

/**
 * The host runtime refuses to compute the algorithm a signing key commits to,
 * so the signature could not be checked at all.
 *
 * Distinct from `SignatureVerificationError` on purpose, and thrown rather
 * than reported as a verification failure. "I could not check this" and "I
 * checked this and it failed" call for opposite responses: the first is your
 * server's configuration, the second is a rejected delivery. Returning false
 * for both made a FIPS-locked receiver 401 every legitimate ed25519 delivery
 * as though it were forged, with nothing anywhere saying why.
 *
 * The usual cause is an active OpenSSL FIPS provider, which carries no EdDSA.
 * Either terminate the ed25519 webhook signature somewhere unrestricted, or
 * configure the sender for `ecdsa-p256-sha256`, which FIPS does permit.
 */
export class SignatureAlgorithmUnavailableError extends AgledgerError {
  /** Algorithm the key commits to (e.g. `Ed25519`), when it could be resolved. */
  readonly algorithm: string | null;

  constructor(message: string, algorithm: string | null = null) {
    super(message);
    this.name = 'SignatureAlgorithmUnavailableError';
    this.algorithm = algorithm;
  }
}
