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
 * Key properties for agent consumers:
 * - `status` — HTTP status code
 * - `code` — stable machine-readable error code (e.g., 'MANDATE_NOT_ACTIVE')
 * - `retryable` — whether this error can be retried
 * - `requestId` — correlation ID for debugging
 * - `suggestion` — agent-friendly recovery hint
 * - `validationErrors` — field-level validation details (for 400/422)
 */
export class AgledgerApiError extends AgledgerError {
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;
  readonly details?: ValidationErrorDetail[] | Record<string, unknown>;

  /** Link to documentation for this error code. */
  readonly docUrl: string;

  /**
   * Agent-friendly recovery hint describing what to do next.
   * Example: `"Call client.mandates.list() to find valid mandate IDs"`
   *
   * Populated from the API response when available. When the API does not
   * include a suggestion, the SDK generates one for common error patterns
   * (404 → list the resource, 403 → check scopes, 422 → check status).
   */
  readonly suggestion?: string;

  /**
   * Whether this error is retryable.
   * - Uses the API's `retryable` field if present
   * - Falls back to status-based classification: 429 and 5xx are retryable
   */
  readonly retryable: boolean;

  constructor(status: number, body: ApiErrorResponse) {
    super(body.message || `API error ${status}`);
    this.name = 'AgledgerApiError';
    this.status = status;
    this.code = body.code || body.error || 'unknown';
    this.requestId = body.requestId;
    this.details = body.details;
    this.retryable = body.retryable ?? (status === 429 || status >= 500);
    this.docUrl = `https://docs.agledger.ai/errors/${this.code}`;
    this.suggestion = body.suggestion ?? AgledgerApiError.defaultSuggestion(status, this.code);
  }

  /** Generate a default recovery suggestion for common HTTP status codes. */
  private static defaultSuggestion(status: number, code: string): string | undefined {
    switch (status) {
      case 401: return 'Check your API key. Set AGLEDGER_API_KEY or pass apiKey to the client constructor.';
      case 403: return 'Check API key scopes. See error.missingScopes for required scopes, or use a broader ScopeProfile.';
      case 404: return 'The resource was not found. Verify the ID is correct, or list resources to find valid IDs.';
      case 409: return 'A conflicting operation is in progress. Wait and retry, or check the current resource state.';
      case 422: return 'The resource is in the wrong state for this operation. Check the current status before retrying.';
      case 429: return 'Rate limit exceeded. The SDK retries automatically — if you see this, increase maxRetries or add backoff.';
      default: return undefined;
    }
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
    if (Array.isArray(this.details)) return this.details;
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
    const details = body.details as Record<string, unknown> | undefined;
    this.missingScopes = Array.isArray(details?.missingScopes) ? details.missingScopes as string[] : [];
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
