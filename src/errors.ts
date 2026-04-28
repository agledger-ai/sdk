import type { ApiErrorResponse, ValidationErrorDetail } from './types.js';

/**
 * Base error for all SDK errors (network, timeout, etc.).
 * Not an API error — no status code.
 */
export class AgledgerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AgledgerError';
  }
}

/**
 * API returned an error response. All HTTP errors extend this.
 *
 * Fields mirror the API error body verbatim — the SDK does not invent content.
 * The API responds with RFC 9457 `application/problem+json`. Standard fields
 * (`type`, `title`, `status`, `detail`, `instance`) are surfaced alongside
 * AGLedger extension fields (`error`, `code`, `requestId`, `retryable`,
 * `docUrl`, `suggestion`, `recoveryHint`, `missingScopes`, `nextSteps`, …).
 *
 * Key properties for consumers:
 * - `status` — HTTP status code
 * - `code` — stable machine-readable error code (from API body `code` or `error`)
 * - `retryable` — API's `retryable` flag, falling back to status-based classification (429/5xx)
 * - `requestId` — correlation ID (from API body or `X-Request-Id` header)
 * - `docUrl` — documentation link, only if the API returned one
 * - `suggestion` — typo-correction hint, only if the API returned one
 * - `recoveryHint` — machine-readable recovery guidance (e.g. on 422 INVALID_ACTION)
 * - `refreshUrl` — concrete GET URL to re-fetch state (e.g. on 422 INVALID_ACTION)
 * - `validationErrors` — field-level validation details (for 400/422)
 */
export class AgledgerApiError extends AgledgerError {
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;
  readonly details?: ValidationErrorDetail[] | Record<string, unknown> | unknown[];

  /** Documentation link for this error, forwarded from the API body when present. */
  readonly docUrl?: string;

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

  constructor(status: number, body: ApiErrorResponse) {
    super(body.message || body.detail || body.title || `API error ${status}`);
    this.name = 'AgledgerApiError';
    this.status = status;
    this.code = body.code || body.error || 'unknown';
    this.requestId = body.requestId;
    this.details = body.details ?? undefined;
    this.retryable = body.retryable ?? (status === 429 || status >= 500);
    this.docUrl = body.docUrl;
    this.suggestion = body.suggestion;
    this.recoveryHint = body.recoveryHint;
    this.refreshUrl = body.refreshUrl;
  }

  /** Whether this error is retryable (429, 5xx, network errors). Delegates to the `retryable` property. */
  isRetryable(): boolean {
    return this.retryable;
  }

  /** Whether this is an input error (400) — the request itself is malformed; fix it and retry. */
  isInputError(): boolean {
    return this.status === 400;
  }

  /** Whether this is a state error (422) — the resource is in the wrong state; do not retry the same request. */
  isStateError(): boolean {
    return this.status === 422;
  }

  /** Whether this is an auth error (401/403) — check credentials or scopes. */
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
 * Idempotency key conflict — the same key was used with different parameters.
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
 * 422 Unprocessable — the request was valid but the resource state won't
 * accept it (e.g. INVALID_ACTION on `POST /v1/records/{id}/transition`).
 *
 * On INVALID_ACTION the API attaches `recoveryHint` and `refreshUrl` (and
 * `currentState` / `allowedActions` via `details`) — surfaced on the base
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
 * NOT an API error — thrown locally by `constructEvent()` / `verifySignature()`.
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
