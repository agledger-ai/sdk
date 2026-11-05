import type { ApiErrorResponse, NextStep, ValidationErrorDetail } from './types.js';

/**
 * One entry of the body's `validationErrors` as a `ValidationErrorDetail`.
 * The engine writes `field` and `message`; Ajv-shaped entries name the field
 * as `instancePath` instead. Everything else on the entry is kept.
 */
function normalizeValidationError(e: Record<string, unknown>): ValidationErrorDetail {
  const field = typeof e.field === 'string' ? e.field
    : typeof e.instancePath === 'string' ? e.instancePath
    : typeof e.dataPath === 'string' ? e.dataPath
    : '';
  const message = typeof e.message === 'string' ? e.message : '';
  return { ...e, field, message } as ValidationErrorDetail;
}

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
 * Arguments the SDK will not send, caught before any request is made: options
 * the client cannot be constructed with, and per-call parameter combinations
 * the endpoint rejects (`compliance.stream` takes `since` or `cursor`, exactly
 * one). Distinct from `ValidationError`, which reports what the Server
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
 * AGLedger extension fields (`error`, `requestId`, `retryable`, `suggestion`,
 * `recoveryHint`, `missingScopes`, `nextSteps`, ...). `message` is the body's
 * `detail`, the one human-readable field, falling back to `title`. The parsed
 * body itself is `body`, so a field this class does not name is still
 * readable (`err.body.someNewField`); `rawBody` holds the bytes of any
 * body that is not a JSON object: CBOR problem details on a binary route, or
 * a proxy's HTML error page on a JSON one.
 *
 * Key properties for consumers:
 * - `type`: RFC 9457 problem URI (e.g. `/problems/ambiguous-publisher`). Branch on this, not on prose.
 * - `publishers`: candidate publisher labels on an ambiguous-publisher 422
 * - `pinnedRecords` / `unattributableRecords`: why a schema delete was refused
 * - `status`: HTTP status code
 * - `code`: stable machine-readable error code (the API body's `error`)
 * - `retryable`: API's `retryable` flag, falling back to status-based classification (429/5xx)
 * - `requestId`: correlation ID (from API body or `X-Request-Id` header)
 * - `suggestion`: typo-correction hint, only if the API returned one
 * - `recoveryHint`: machine-readable recovery guidance (e.g. on 422 INVALID_ACTION)
 * - `reason` / `currentState` / `allowedActions`: the refusal's reason code, the state it found, and what is allowed now
 * - `validTransitions`: targets reachable now, on a 422 refusal (a Record's display states, or a dispute's statuses)
 * - `existingId`: the row a 409 collided with (e.g. TRUSTED_ISSUER_EXISTS)
 * - `refreshUrl`: concrete GET URL to re-fetch state (e.g. on 422 INVALID_ACTION)
 * - `validationErrors`: field-level validation details (for 400/422)
 * - `requiredFields` / `optionalFields` / `examplePayload` / `schemaUrl` / `recordType`: the
 *   rebuild kit a 400 carries when a Record or Completion body failed its schema
 * - `hint`: the 404's pointer at what to list or create instead
 * - `attemptedAction` / `attemptedTransition` / `attemptedState`: what a 422 refused
 * - `inapplicableFields`: the fields a 422 `notarize_only_field` refused on a notarize-only create
 * - `retryAfter`: milliseconds the Server or a proxy asked the client to wait, from the
 *   `Retry-After` header on any status (a 429 body's `retryAfterSeconds` fills it too)
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
   * Machine-readable reason code, forwarded from the body. On a 401 OIDC
   * refusal it names the token check that failed (`expired`, `wrong_audience`,
   * `wrong_azp`, `jti_replayed`, ...); on a 409 that carries one it names the
   * conflict: `STATUS_NOT_DISABLED`, `ACCOUNT_DEACTIVATED`,
   * `RECORDS_REFERENCE_TYPE`, `CONFLICTING_VERSION`, `RESERVED_PUBLISHER_LABEL`,
   * `PROVISIONING_MANAGED`, `OIDC_JTI_REPLAY`, `ROW_HAS_DEPENDENT_RECORDS`,
   * `CHAIN_REWIND_DETECTED`, `VAULT_SCAN_IN_FLIGHT`, `AGENT_NAME_IN_USE`,
   * `TRUSTED_ISSUER_EXISTS` or `KEY_ALREADY_ROTATED`. Not every 409 names one
   * (a duplicate agent `displayName` answers `error: CONFLICT` with no
   * `reason` today), so branch on `code` first and on `reason` when present.
   */
  readonly reason?: string;

  /**
   * State the resource was in when the request was refused, forwarded from
   * the body. Some refusals name their precondition here instead, such as the
   * cert exchange's 422 `scope_claim_admin_only`.
   */
  readonly currentState?: string;

  /** Actions the resource accepts right now, forwarded from the body. Ground truth for the next call. */
  readonly allowedActions?: string[];

  /**
   * Targets reachable now, forwarded from the body on a 422 refusal: the
   * display states a Record can reach on a refusal about a Record, or the
   * dispute's own target statuses on a refused dispute move.
   */
  readonly validTransitions?: string[];

  /**
   * ID of the row already holding the unique key this request collided with.
   * Present on 409 `TRUSTED_ISSUER_EXISTS`: read or PATCH that row rather than
   * creating another.
   */
  readonly existingId?: string;

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

  /** RFC 9457 `title`: the short name of the problem class. */
  readonly title?: string;
  /** RFC 9457 `detail`: the human-readable explanation of this occurrence. Also `message`. */
  readonly detail?: string;
  /** RFC 9457 `instance`: the request path this occurrence belongs to. */
  readonly instance?: string;
  /** Field-level errors as the body carries them top level (RFC 9457 extension). Prefer {@link validationErrors}. */
  readonly errors?: Record<string, unknown>[] | null;
  /**
   * The 404's pointer at what to do instead of retrying the same id: which
   * listing to read, or which create to run first.
   */
  readonly hint?: string;
  /** Fields the schema requires, on a 400 that refused a Record or Completion body. */
  readonly requiredFields?: string[];
  /** Fields the schema allows beyond the required ones, on the same 400. */
  readonly optionalFields?: string[];
  /** A payload that passes the schema the 400 refused against. Rebuild from it rather than from prose. */
  readonly examplePayload?: Record<string, unknown>;
  /** Where the schema the 400 validated against is served. */
  readonly schemaUrl?: string;
  /** The contract type the 400 validated against. */
  readonly recordType?: string;
  /** The action a 422 refused (`transition`, `verdict`, `cancel`, ...). */
  readonly attemptedAction?: string;
  /** The transition name a 422 refused. */
  readonly attemptedTransition?: string;
  /** The display state a refused transition tried to reach. */
  readonly attemptedState?: string;
  /** Values the refused field accepts, when a 400 or 422 can enumerate them. */
  readonly allowedValues?: unknown[];
  /** Role labels permitted to take the refused action. */
  readonly allowedActors?: string[];
  /** The bounds the request broke (`field`, `parentValue`, `childValue`, `reason`, `tolerance`). */
  readonly constraintViolations?: Record<string, unknown>[];
  /** Name of the single constraint a 400 or 422 broke, when it was one. */
  readonly constraint?: string;
  /** Fields a 422 `notarize_only_field` refused: drop them and re-send the create. */
  readonly inapplicableFields?: string[];
  /** The JSON type or value a validation error expected. */
  readonly expected?: string;
  /** License features the current tier lacks, on a 403 license refusal. */
  readonly missingFeatures?: string[];
  /** The license tier in force, beside `requiredTier`, on a 403 license refusal. */
  readonly currentTier?: string;
  readonly requiredTier?: string;
  /** Guided next actions the error body carries. */
  readonly nextSteps?: NextStep[];
  /** The Record deadline that had already passed on a system TIME_OUT 422. */
  readonly deadline?: string;
  /** The system action that terminalized the Record (`OVERFLOW_REJECT`, `TIME_OUT`, ...). */
  readonly terminalReason?: string;
  /** The Record's display status before that system action. */
  readonly previousStatus?: string;
  /** Display status of the Record when the request was refused. */
  readonly currentStatus?: string;
  /** Display statuses from which a dispute is accepted. */
  readonly disputeableWhen?: string[];
  /** Disputes already filed against the Record, beside `maxDisputes`, when the cap refused one more. */
  readonly disputeCount?: number;
  readonly maxDisputes?: number;
  /** The currently open dispute, or null once every prior dispute terminalized. */
  readonly openDisputeId?: string | null;
  /** Revisions consumed, beside `maxRevisions`, when the revision cap fired. */
  readonly revisionCount?: number;
  readonly maxRevisions?: number;
  /** Completions received, beside `maxSubmissions`, when the submission cap refused one more. */
  readonly submissionCount?: number;
  readonly maxSubmissions?: number;
  /** The parent Record a refused child write names. */
  readonly parentRecordId?: string;
  /** The in-flight job a 409 refused to start a second of. */
  readonly jobId?: string;
  /** Publisher label on the conflicting schema row. */
  readonly publisher?: string;
  /** Manifest version string on the conflicting schema row. */
  readonly version?: string;
  /** Manifest digests on a schema or federation digest conflict. */
  readonly existingDigest?: string;
  readonly incomingDigest?: string;
  readonly localDigest?: string;
  readonly peerDigest?: string;

  /**
   * Milliseconds the client was asked to wait before retrying, from the
   * `Retry-After` header on any status (a load balancer sends one on a 503 as
   * the Server does on a 429), or from a 429 body's `retryAfterSeconds` when
   * the header was stripped. `null` when neither was given. The SDK's own
   * retries wait at least this long.
   */
  readonly retryAfter: number | null;

  /**
   * The error body as the Server sent it, parsed, every field included.
   * Everything this class names is a typed view onto it; read this for a
   * field the view does not name yet.
   */
  readonly body: ApiErrorResponse;

  /**
   * The response body's bytes, when it was not a JSON object. On a binary
   * endpoint (`application/cose`, `application/concise-problem-details+cbor`)
   * every error sets it; decode SCITT problem details (RFC 9290) with `cborg`.
   * On a JSON route it is set when something in front of the Server answered
   * instead (a load balancer's 502 page): `new TextDecoder().decode(err.rawBody)`
   * reads it, and `body` is then only the status line.
   */
  rawBody?: Uint8Array;

  constructor(status: number, body: ApiErrorResponse, retryAfter: number | null = null) {
    super(body.detail || body.title || `API error ${status}`);
    this.name = 'AgledgerApiError';
    this.status = status;
    this.body = body;
    this.retryAfter = retryAfter;
    this.code = body.error || 'unknown';
    this.requestId = body.requestId;
    this.details = body.details ?? undefined;
    this.retryable = body.retryable ?? (status === 429 || status >= 500);
    this.type = body.type;
    this.title = body.title;
    this.detail = body.detail;
    this.instance = body.instance;
    this.errors = body.errors;
    this.hint = body.hint;
    this.requiredFields = body.requiredFields;
    this.optionalFields = body.optionalFields;
    this.examplePayload = body.examplePayload;
    this.schemaUrl = body.schemaUrl;
    this.recordType = body.recordType;
    this.attemptedAction = body.attemptedAction;
    this.attemptedTransition = body.attemptedTransition;
    this.attemptedState = body.attemptedState;
    this.allowedValues = body.allowedValues;
    this.allowedActors = body.allowedActors;
    this.constraintViolations = body.constraintViolations;
    this.constraint = body.constraint;
    this.inapplicableFields = body.inapplicableFields;
    this.expected = body.expected;
    this.missingFeatures = body.missingFeatures;
    this.currentTier = body.currentTier;
    this.requiredTier = body.requiredTier;
    this.nextSteps = body.nextSteps;
    this.deadline = body.deadline;
    this.terminalReason = body.terminalReason;
    this.previousStatus = body.previousStatus;
    this.currentStatus = body.currentStatus;
    this.disputeableWhen = body.disputeableWhen;
    this.disputeCount = body.disputeCount;
    this.maxDisputes = body.maxDisputes;
    this.openDisputeId = body.openDisputeId;
    this.revisionCount = body.revisionCount;
    this.maxRevisions = body.maxRevisions;
    this.submissionCount = body.submissionCount;
    this.maxSubmissions = body.maxSubmissions;
    this.parentRecordId = body.parentRecordId;
    this.jobId = body.jobId;
    this.publisher = body.publisher;
    this.version = body.version;
    this.existingDigest = body.existingDigest;
    this.incomingDigest = body.incomingDigest;
    this.localDigest = body.localDigest;
    this.peerDigest = body.peerDigest;
    this.suggestion = body.suggestion;
    this.recoveryHint = body.recoveryHint;
    this.refreshUrl = body.refreshUrl;
    this.reason = body.reason;
    this.currentState = body.currentState;
    this.allowedActions = body.allowedActions;
    this.validTransitions = body.validTransitions;
    this.existingId = body.existingId;
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

  /**
   * Field-level validation errors, normalized from the shapes the API uses:
   * the top-level `validationErrors` array a schema refusal carries, else
   * `details` as a list, else Ajv-style `details.errors`.
   */
  get validationErrors(): ValidationErrorDetail[] {
    if (Array.isArray(this.body.validationErrors)) {
      return this.body.validationErrors.map((e) => normalizeValidationError(e));
    }
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
  constructor(body: ApiErrorResponse, retryAfter: number | null = null) {
    super(401, body, retryAfter);
    this.name = 'AuthenticationError';
  }
}

export class PermissionError extends AgledgerApiError {
  /** Scopes required by the endpoint but missing from the key. Empty if not a scope error. */
  readonly missingScopes: string[];
  /** Scopes the key has. Null if not included in the response. */
  readonly keyScopes: string[] | null;

  constructor(body: ApiErrorResponse, retryAfter: number | null = null) {
    super(403, body, retryAfter);
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
  constructor(body: ApiErrorResponse, retryAfter: number | null = null) {
    super(404, body, retryAfter);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AgledgerApiError {
  constructor(body: ApiErrorResponse, retryAfter: number | null = null) {
    super(409, body, retryAfter);
    this.name = 'ConflictError';
  }
}

export class ValidationError extends AgledgerApiError {
  constructor(body: ApiErrorResponse, retryAfter: number | null = null) {
    super(400, body, retryAfter);
    this.name = 'ValidationError';
  }
}

/**
 * 422 Unprocessable: the request was valid but the resource state won't
 * accept it (e.g. INVALID_ACTION on `POST /v1/records/{id}/transition`).
 *
 * On INVALID_ACTION the API attaches `recoveryHint`, `refreshUrl`,
 * `currentState` and `allowedActions`, all surfaced on the base
 * `AgledgerApiError` properties.
 */
export class UnprocessableError extends AgledgerApiError {
  constructor(body: ApiErrorResponse, retryAfter: number | null = null) {
    super(422, body, retryAfter);
    this.name = 'UnprocessableError';
  }
}

export class RateLimitError extends AgledgerApiError {
  constructor(body: ApiErrorResponse, retryAfter: number | null) {
    super(429, body, retryAfter);
    this.name = 'RateLimitError';
  }
}

/**
 * The request never produced a response: a network failure, or (see
 * `TimeoutError`) a timeout. The Server may still have applied it.
 *
 * `idempotencyKey` is the `Idempotency-Key` header the failed request sent
 * (generated per call when you passed none; absent on reads). The SDK reuses it
 * across its own retries. When you retry after this error yourself, pass it back
 * as the `idempotencyKey` request option so the Server answers the original
 * write instead of performing a second one.
 */
export class ConnectionError extends AgledgerError {
  override readonly cause?: Error;
  readonly idempotencyKey?: string;

  constructor(message: string, cause?: Error, idempotencyKey?: string) {
    super(message);
    this.name = 'ConnectionError';
    this.cause = cause;
    this.idempotencyKey = idempotencyKey;
  }
}

/**
 * The request exceeded the timeout on every attempt. A write may have been
 * applied anyway: retry it with `idempotencyKey` (inherited from
 * `ConnectionError`) so it cannot be applied twice.
 */
export class TimeoutError extends ConnectionError {
  constructor(method: string, url: string, timeoutMs: number, cause?: Error, idempotencyKey?: string) {
    super(`Request timed out after ${timeoutMs}ms: ${method} ${url}`, cause, idempotencyKey);
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

/**
 * An auto-paginating walk stopped at the default page ceiling with pages still
 * available, so the rows it yielded are a prefix of the listing rather than all
 * of it.
 *
 * The ceiling is a runaway guard, not a result. Raising is what separates it
 * from the intentional stop: set `maxPages` or `maxItems` explicitly and the
 * walk ends quietly at your bound, because you asked for one.
 *
 * Recover by raising `limit` so the same rows arrive in fewer pages, by setting
 * `maxPages` high enough for the listing, or by narrowing the filters.
 */
export class PaginationLimitError extends AgledgerError {
  /** Path being walked. */
  readonly path: string;
  /** Pages fetched before stopping: equal to the ceiling that stopped it. */
  readonly pagesRead: number;
  /** Items yielded before stopping. All are valid; they are just not all of them. */
  readonly itemsYielded: number;
  /** Ceiling that was hit. */
  readonly maxPages: number;

  /**
   * `message` overrides the ceiling wording for the other way a walk truncates
   * without being asked to: a page that carries rows but no resume token, so
   * there is nothing to advance on. Same class, because the caller's problem is
   * the same one, a prefix that reads as the whole listing.
   */
  constructor(
    path: string,
    pagesRead: number,
    itemsYielded: number,
    maxPages: number,
    message?: string,
  ) {
    super(
      message ??
        `Pagination of ${path} stopped at the ${maxPages}-page ceiling after ${itemsYielded} item(s), ` +
          `and the listing has more. Raise 'limit' to fit the walk in fewer pages, pass ` +
          `'maxPages' to lift the ceiling, or pass 'maxItems' to take a prefix on purpose.`,
    );
    this.name = 'PaginationLimitError';
    this.path = path;
    this.pagesRead = pagesRead;
    this.itemsYielded = itemsYielded;
    this.maxPages = maxPages;
  }
}
