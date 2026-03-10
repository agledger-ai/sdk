/**
 * AGLedger™ SDK — Error Classes
 * Patent Pending. Copyright 2026 AGLedger LLC. All rights reserved.
 */

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
 * - `validationErrors` — field-level validation details (for 400/422)
 */
export class AgledgerApiError extends AgledgerError {
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;
  readonly details?: ValidationErrorDetail[] | Record<string, unknown>;

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
  constructor(body: ApiErrorResponse) {
    super(403, body);
    this.name = 'PermissionError';
  }
}

export class NotFoundError extends AgledgerApiError {
  constructor(body: ApiErrorResponse) {
    super(404, body);
    this.name = 'NotFoundError';
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
