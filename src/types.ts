/** A suggested next API call: guides agents through the lifecycle without prior state-machine knowledge. */
export interface NextStep {
  /** What to do next. */
  action: string;
  /** HTTP method. */
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Relative URL template (substitute {id} placeholders). */
  href: string;
  /** Why this step matters. */
  description: string;
  /** Action name expected to follow this one in the workflow, or absent at a terminal step. */
  afterThis?: string;
  /** Human-readable label for the workflow this step belongs to. */
  workflowLabel?: string;
  /** 1-indexed position of this step within its workflow. */
  workflowStep?: number;
  /** Total number of steps in this step's workflow. */
  workflowTotal?: number;
}


/** Rate limit metadata parsed from response headers. */
export interface RateLimitInfo {
  /** Max requests per window */
  limit: number;
  /** Remaining requests in current window */
  remaining: number;
  /** Unix timestamp (seconds) when the window resets */
  reset: number;
}


export interface AgledgerClientOptions {
  /** API key (Bearer token) */
  apiKey: string;
  /**
   * Base URL of your AGLedger instance, e.g. `https://agledger.internal`.
   * Required: every deployment is self-hosted, so there is no default to fall
   * back to. Omitting it throws `ConfigurationError` at construction rather
   * than failing later against a placeholder host. Optional in
   * the type only so the error can carry a useful message.
   */
  baseUrl?: string;
  /** Max retries for 429/5xx/network errors (default: 3) */
  maxRetries?: number;
  /** Request timeout in ms (default: 30_000) */
  timeout?: number;
  /** Custom fetch implementation (for testing or non-standard runtimes) */
  fetch?: typeof globalThis.fetch;
  /** Prefix prepended to auto-generated idempotency keys */
  idempotencyKeyPrefix?: string;
}

export interface RequestOptions {
  /** Override idempotency key for this request */
  idempotencyKey?: string;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
  /** Override timeout for this request (ms) */
  timeout?: number;
  /**
   * Override authentication for this request.
   * - `'none'`: omit the Authorization header entirely (used for federation register/revoke).
   * - Any other string: sent as `Bearer <value>` (used for federation gateway bearer tokens).
   * - `undefined` (default): use the client's configured API key.
   */
  authOverride?: 'none' | (string & {});
  /** Custom headers to merge with defaults for this request. */
  headers?: Record<string, string>;
}


/**
 * Request options for a `/v1/schemas/{type}` read or write, plus the publisher
 * scope.
 *
 * A bare `type` names a schema only while one publisher offers it. Once two do
 * (an imported peer manifest alongside a local registration), the engine
 * refuses with 422 `/problems/ambiguous-publisher` and lists the candidates on
 * `AgledgerApiError.publishers` rather than picking. Pass `publisher` to pin
 * one. Single-publisher orgs never need it.
 */
export interface SchemaScopeOptions extends RequestOptions {
  /** Publisher label to scope this call to, e.g. `local` or `acme-corp`. */
  publisher?: string;
}


/** Parameters accepted by all list endpoints. */
/**
 * Pagination is not uniform across the API: some list endpoints page by cursor,
 * some by offset, and a few accept neither. The querystring rejects unknown
 * properties, so offering a parameter an endpoint does not take is a 400 rather
 * than a no-op. These three narrower shapes exist so each list method advertises
 * only what its own route accepts.
 */
export interface LimitParams {
  limit?: number;
}

/** A list endpoint that pages by opaque cursor. */
export interface CursorListParams extends LimitParams {
  cursor?: string;
}

/**
 * A list endpoint that pages by numeric offset.
 *
 * @deprecated Every paginated listing the Server publishes now also accepts
 * `cursor`, and offset paging skips or repeats rows on a listing that is being
 * written to while you walk it. Use {@link ListParams} and page by cursor.
 */
export interface OffsetListParams extends LimitParams {
  offset?: number;
}

/** A list endpoint that accepts both paging styles. */
export interface ListParams extends LimitParams {
  offset?: number;
  cursor?: string;
}

/**
 * Unified page type for all list endpoints.
 * Every list method returns `Page<T>`: no exceptions.
 */
export interface Page<T> {
  data: T[];
  hasMore: boolean;
  nextCursor?: string | null;
  total?: number;
  /** Suggested next actions, on the listings that carry guidance. */
  nextSteps?: NextStep[];
  /** Org-admin cross-party reads only: the chain entry this read appended. */
  recordRead?: RecordReadCompletion;
}

/** Options for auto-pagination. */
export interface AutoPaginateOptions {
  /**
   * Cap the walk at this many pages. Unset, the walk runs to the end of the
   * listing behind a 100-page runaway guard, and hitting that guard throws
   * `PaginationLimitError` rather than returning a prefix silently. Set this
   * and the cap is yours, so the walk stops at it quietly.
   */
  maxPages?: number;
  /** Maximum total items to yield before stopping (default: unlimited). */
  maxItems?: number;
}


export interface BatchResult<T> {
  results: Array<{
    index: number;
    status: 'created' | 'skipped' | 'failed';
    data?: T;
    error?: string;
  }>;
  summary: {
    total: number;
    created: number;
    skipped: number;
    failed: number;
  };
}

export interface BulkCreateResult {
  results: Array<{
    index: number;
    status: 'created' | 'replayed' | 'error';
    data?: RecordRow;
    error?: string;
    /**
     * RFC 9457 problem URI when the failure carries a narrower one than its
     * class, e.g. `/problems/ambiguous-publisher`. Branch on this rather than
     * on the `error` prose.
     */
    problemType?: string;
    /**
     * Structured extras from the failure, matching the singleton error body.
     * For `/problems/ambiguous-publisher` this carries `publishers` (the
     * candidate labels) and `recordType`.
     */
    context?: Record<string, unknown>;
    /**
     * What to do next about this item, when the failure carries a pointer.
     * Mirrors the `recoveryHint` a singleton caller gets in the RFC 9457 body.
     * For `/problems/idempotency-key-reuse` the fix is a fresh
     * `idempotencyKey`: resending the same item unchanged fails identically
     * until the key expires.
     */
    recoveryHint?: string;
  }>;
  summary: {
    total: number;
    succeeded: number;
    failed: number;
  };
}


/**
 * Record Type identifier.
 *
 * The API ships NO built-in contract types: your org owns its entire type
 * namespace and you register your own via the Schema Development Toolkit
 * (`POST /v1/schemas`). Every new org is auto-seeded with four example
 * contracts you can use as-is, edit, rename, or delete:
 *   - `notarize-generic-v1` (notarize-only; the on-ramp)
 *   - `principal-gate-generic-v1` (completion + principal verdict)
 *   - `terminal-outcome-v1` (auto-gate child pattern)
 *   - `delegated-workflow-v1` (delegation-chain root)
 *
 * Listed here only as a discovery hint; the type accepts any string, and these
 * may not be present if an org deleted them. The canonical set for an org is
 * `GET /v1/schemas`.
 */
export type RecordType =
  | 'notarize-generic-v1'
  | 'principal-gate-generic-v1'
  | 'terminal-outcome-v1'
  | 'delegated-workflow-v1'
  | (string & {});

/**
 * A row from the Type catalog (`GET /v1/schemas`): one entry per
 * (publisher, type). Lighter than {@link TypeSchema}: enough to triage the
 * catalog and pick a type to read in full via `schemas.get(type)`.
 */
export interface SchemaListItem {
  /** Type identifier (e.g. `acme-po-v1`). */
  type: RecordType;
  /** Latest version number for this type. */
  version?: number;
  /** Lifecycle status. `DISABLED` types reject new records. */
  status?: 'ACTIVE' | 'DISABLED' | (string & {});
  /** Human-readable name, or null. */
  displayName?: string | null;
  /** Customer-defined taxonomy label (no engine semantics), or null. */
  category?: string | null;
  /** Truncated preview of the per-type description (full text on `schemas.get(type)`), or null. */
  description?: string | null;
  /** URL to fetch a forkable template seeded from this type. */
  templateUrl?: string;
  /** Publisher label that owns this row. */
  publisher?: string;
  /** Owning org id, or null for platform-bundled types. Present only on platform-key reads without `orgId`. */
  orgId?: string | null;
  /**
   * Lifecycle discriminator: `auto` or `principal` for a gated type,
   * `null` for notarize-only / no-default-gate. Mirrors `defaultGateMode` on
   * `schemas.get(type)` so a row alone distinguishes a gated type from a
   * notarize-only one without a per-type GET.
   */
  defaultGateMode?: GateMode | null;
}

export interface TypeSchema {
  type: RecordType;
  displayName?: string | null;
  description?: string | null;
  category?: string | null;
  version?: number;
  latestVersion?: number;
  status?: SchemaVersionStatus;
  /**
   * Publisher label of the registration that answered this read. `local` for
   * engine-authored types, anything else for file-imported ones.
   *
   * This is how a publisher-pinned read confirms which registration replied.
   * Pin with the `publisher` option; an unpinned read of a type two publishers
   * offer is refused with a 422 `/problems/ambiguous-publisher` rather than
   * resolved arbitrarily, so on a 200 this field names the schema you got.
   */
  publisher?: string;
  /** `sha256:<hex>` of the JCS-canonicalized manifest. Federation peers compare schemas by this value. */
  manifestDigest?: string;
  /** How this row was authored. Federation digest-echo treats both identically. */
  trustClass?: 'local' | 'imported' | (string & {});
  /** Whether this engine exposes the schema to federated peer hubs. Row-only metadata, not in the canonical manifest. */
  federatable?: boolean;
  /**
   * V1 sharing default for Records of this type. `null` inherits the global
   * `AGLEDGER_DEFAULT_SHARE`; `true` or `false` is an explicit per-type
   * decision. A per-record `share` overrides it. Row-only metadata, not in the
   * canonical manifest.
   */
  defaultShare?: boolean | null;
  /**
   * Default gate mode for records of this type when the create payload omits
   * `gateMode`. `auto` (engine default) auto-settles against the principal's
   * pre-configured predicates; `principal` forces a principal-held verdict. An
   * explicit per-record `gateMode` always wins. Row-only metadata, not
   * canonicalized into the manifest digest.
   */
  defaultGateMode?: GateMode | null;
  /**
   * Bilateral co-signed Settlement Signal opt-in. `null` or `false` fires
   * signals single-signature (the firing Server only); `true` requests a
   * counter-signature from the counterparty before firing.
   */
  coSignRequired?: boolean | null;
  /**
   * When `true` (the default), opening a dispute against a Record of this type
   * flips `record.status` to DISPUTED while the dispute is in flight, restored
   * to the pre-dispute status on resolve or withdraw. When `false` the Record
   * holds its status throughout.
   */
  flipRecordStatusOnDispute?: boolean;
  /**
   * When `true` (the default), disputes on federated Records of this type
   * propagate to peers: the originator's dispute lifecycle emits federation
   * outbound jobs that update the counterparty.
   */
  federateDisputes?: boolean;
  recordSchema: Record<string, unknown>;
  completionSchema: Record<string, unknown>;
  rulesConfig?: SchemaRulesConfig;
  quickStart?: {
    /** Minimal valid criteria example, synthesized from the record schema. Copy and modify. */
    criteria: Record<string, unknown>;
    /** Minimal valid completion evidence. `null` on notarize-only Types: no completion phase, so there is no `/completions` call to make. */
    evidence: Record<string, unknown> | null;
    /** One entry per registered fieldMapping, keyed by its `toleranceField`. `null` when the type registers none. */
    tolerance?: Record<string, unknown> | null;
    /** Present only when the type declares a `defaultGateMode`. Include it in the `POST /v1/records` payload. */
    gateMode?: GateMode;
  } | null;
}

export interface SchemaValidationResult {
  valid: boolean;
  errors?: Array<{
    keyword: string;
    message: string;
    instancePath?: string;
    schemaPath?: string;
  }>;
}


/** Known values: ACTIVE, DEPRECATED, DELETED. Accepts any string for forward compatibility. */
/**
 * Lifecycle status of a registered schema version. Known values: ACTIVE,
 * DISABLED. Accepts any string for forward compatibility.
 *
 * `DEPRECATED` and `DELETED` were named here and appear nowhere in the API,
 * while `DISABLED`, the value the listing and detail routes actually serve, was
 * missing. Disabling a Type is `schemas.disable()`, not a status write.
 */
export type SchemaVersionStatus = 'ACTIVE' | 'DISABLED' | (string & {});

/**
 * Schema compatibility mode. Known values: none, backward, forward, full.
 * Accepts any string for forward compatibility.
 *
 * Lowercase, which is what every request site declares: `POST /v1/schemas`,
 * `POST /v1/schemas/preview`, the import manifest's `compatibility`, and the
 * version PATCH all carry `enum: [none, backward, forward, full]`. This type
 * named the uppercase forms, so all four documented values were a 400. Response
 * sites declare a bare string, so nothing constrains them either way.
 */
export type SchemaCompatibilityMode = 'none' | 'backward' | 'forward' | 'full' | (string & {});

/**
 * Documentation for one helper function callable inside a gate-rule expression.
 *
 * `semantics` states the edge behavior (invalid-input result, rounding
 * direction, coercion) and is worth reading before relying on a helper in a
 * rule: `daysBetween`, for example, counts whole elapsed 24h periods between
 * UTC instants (floored, order-independent) rather than calendar days, and
 * returns 0 on an unparseable date.
 */
export interface ExpressionHelperDoc {
  /** The call shape, e.g. `daysBetween(a, b)`. */
  signature: string;
  /** Edge behavior: what the helper does with invalid input, how it rounds. */
  semantics: string;
}

/** Meta-schema describing constraints and limits for custom schema authoring. */
export interface MetaSchema {
  constraints: {
    maxDepth: number;
    maxNodes: number;
    maxSizeBytes: number;
    maxCombinerEntries: number;
    rootTypeMustBe: string;
    rootMustHaveRequired: boolean;
    blockedKeywords: string[];
    [key: string]: unknown;
  };
  allowedFormats: string[];
  allowedRefs: string[];
  limits: {
    typeMaxLength: number;
    maxFieldMappings: number;
    ruleIdPattern: string;
    ruleIdMaxLength: number;
    reservedPrefixes: string[];
  };
  fieldMappingValueTypes: string[];
  builtinRuleIds: string[];
  /**
   * Helper functions callable inside an expression, keyed by name.
   *
   * API v1.3.4 replaced the bare `string[]` of names with per-helper
   * signature + semantics, so the edge behavior travels with the helper
   * instead of living only in prose.
   */
  expressionHelpers?: Record<string, ExpressionHelperDoc>;
  expressionLimits?: {
    maxLength: number;
    maxAstNodes: number;
    maxAstDepth: number;
    maxOperations: number;
    allowedContexts: string[];
  };
  sharedSchemas: Record<string, unknown>;
  examples: {
    minimalRecord: Record<string, unknown>;
    minimalCompletion: Record<string, unknown>;
  };
}

/** Known values for SchemaFieldMapping.valueType. Accepts 'expression' for expression-based rules. */
export type SchemaFieldMappingValueType = 'number' | 'denomination' | 'string' | 'boolean' | 'datetime' | 'expression';

/** Field mapping between Record criteria and completion evidence for verification rules. */
export interface SchemaFieldMapping {
  ruleId: string;
  criteriaPath: string;
  evidencePath: string;
  toleranceField?: string;
  valueType: SchemaFieldMappingValueType;
  /** Safe expression string. Required when valueType is 'expression'. */
  expression?: string;
  /**
   * Cap on the per-record tolerance a caller may pass for this rule.
   * `0` forbids any tolerance (the rule is an undodgeable threshold
   * gate); a positive value pins the widest band a record may declare.
   * Omitted = uncapped. The cap applies in whatever unit the tolerance key
   * uses (percent for `*Pct`/`*_pct` keys, absolute otherwise). Enforced
   * with 400 at every tolerance write (create, bulk, update). Must be >= 0.
   */
  maxTolerance?: number;
}

/** Template for creating a new Record type schema. */
export interface SchemaTemplate {
  sourceType: RecordType | null;
  template: {
    type: string;
    displayName: string;
    description: string;
    recordSchema: Record<string, unknown>;
    completionSchema: Record<string, unknown>;
    fieldMappings: SchemaFieldMapping[];
  };
}

/** Input for previewing a schema before registration. */
export interface SchemaPreviewInput {
  type: string;
  displayName: string;
  description?: string;
  category?: string;
  /** Default gate mode for records of this type; see {@link RegisterSchemaParams.defaultGateMode}. */
  defaultGateMode?: GateMode;
  recordSchema: Record<string, unknown>;
  completionSchema?: Record<string, unknown>;
  fieldMappings?: SchemaFieldMapping[];
  compatibilityMode?: SchemaCompatibilityMode;
}

/** Result of a schema preview or validation. */
export interface SchemaPreviewResult {
  valid: boolean;
  compiled?: Record<string, unknown>;
  errors?: SchemaPreviewError[];
  warnings?: SchemaKeywordWarning[];
}

/**
 * A keyword in a submitted schema that the validator does not enforce and
 * therefore ignores.
 *
 * Usually a misspelling (`maxLenght` for `maxLength`), and worth acting on:
 * the constraint the author intended is not applied, so every value passes.
 * Absent when there are none. Prefix a deliberate annotation with `x-` to keep
 * it out of this list.
 */
export interface SchemaKeywordWarning {
  /** Location of the keyword within the submitted schema. */
  path?: string;
  /** The unrecognized keyword. */
  keyword?: string;
  message?: string;
}

/** Individual error from schema preview/validation. */
export interface SchemaPreviewError {
  code: string;
  message: string;
  path?: string;
}

/** Result of diffing two schema versions. */
export interface SchemaDiffResult {
  type: RecordType;
  from: { version: number; createdAt: string; status: string };
  to: { version: number; createdAt: string; status: string };
  record: { changes: SchemaDiffChange[] };
  completion: { changes: SchemaDiffChange[] };
  overallCompatibility: { backward: boolean; forward: boolean };
}

/** Result of deleting a Type schema registration. */
export interface SchemaDeleteResult {
  type: RecordType;
  /**
   * Publisher label this delete targeted, always the one the call resolved to.
   * Rows under any OTHER publisher of the same type are untouched and still in
   * the catalog: this field, not the absence of the type, is what says which
   * registration went away.
   */
  publisher: string;
  versionsDeleted: number;
  /** Suggested next API calls (e.g. list remaining types). */
  nextSteps?: NextStep[];
}

/** Individual change in a schema diff. */
export interface SchemaDiffChange {
  path: string;
  type: string;
  breaking: boolean;
  detail: string;
}

/** Exported schema bundle for transfer between environments. */
export interface SchemaExportResult {
  exportVersion: number;
  exportedAt: string;
  type: RecordType;
  /**
   * Publisher label of the registration this artifact was exported from. Pin
   * the export with the `publisher` option on a type two publishers offer;
   * without it the engine emits both registrations, and their `versions`
   * entries can collide on the same number.
   */
  publisher?: string;
  displayName: string | null;
  description: string | null;
  category: string | null;
  compatibilityMode: SchemaCompatibilityMode;
  versions: SchemaExportVersion[];
  sharedSchemas: Record<string, unknown>;
  /** Suggested next API calls after the export. */
  nextSteps?: NextStep[];
}

/** Individual version within a schema export. */
export interface SchemaExportVersion {
  version: number;
  status: SchemaVersionStatus;
  recordSchema: Record<string, unknown>;
  completionSchema: Record<string, unknown>;
  rulesConfig: Record<string, unknown>;
  createdAt: string;
}

/**
 * A third-party schema manifest for `POST /v1/schemas/import`
 * (DESIGN-SCHEMA-CATALOG.md §4). The manifest is JCS-canonicalized and
 * SHA-256 hashed server-side; the digest persists on the subject row so
 * federation peers can verify schema equality by digest, not name. The API
 * rejects unknown manifest keys (`additionalProperties: false`).
 */
/**
 * Response of `schemas.getManifest()`: this Server's registration of a type,
 * shaped exactly as `schemas.import_()` accepts it.
 *
 * The bytes are JCS-canonicalized before hashing, so `manifestDigest` matches
 * what a peer computes on import. Mirror a schema by handing both to the peer.
 */
export interface SchemaManifestExport {
  manifest: SchemaManifest;
  /** `sha256:<hex>` digest of the JCS-canonicalized manifest. */
  manifestDigest: string;
  nextSteps?: NextStep[];
}

export interface SchemaManifest {
  /** Envelope version (currently `"1.0"`). */
  manifestVersion: string;
  /** Publisher coordination label (1-64 lowercase alphanumerics + hyphens). `local` and `local-*` / `*-local` are reserved. */
  publisher: string;
  /** Type identifier. */
  type: string;
  /** SemVer-ish version string; the major component is stored as the subject version. */
  version: string;
  recordSchema: Record<string, unknown>;
  completionSchema?: Record<string, unknown>;
  publishedAt?: string;
  displayName?: string;
  description?: string;
  category?: string;
  compatibility?: SchemaCompatibilityMode;
  deprecation?: { since?: string; replacedBy?: string } | null;
  /** Advisory documentation only; the engine never reads this field. */
  previousVersion?: string | null;
  fieldMappings?: Record<string, unknown>[];
  tolerances?: Record<string, unknown>;
}

/** Parameters for listing the Type schema catalog (`GET /v1/schemas`). */
export interface ListSchemasParams extends ListParams {
  /** Include this org's custom types (requires auth). */
  orgId?: string;
  /** Include DISABLED types. Default false, meaning ACTIVE only. */
  includeDisabled?: boolean;
}

/**
 * Row-only metadata options accepted alongside the manifest on
 * `POST /v1/schemas/import`. None of these are canonicalized into the
 * manifest digest.
 */
export interface SchemaImportParams {
  /** Override target org (platform keys only). */
  orgId?: string;
  /** Whether this engine exposes the schema to federated peer hubs. Default true. */
  federatable?: boolean;
  /** V1 sharing default for records of this type. Omit to inherit the global default. */
  defaultShare?: boolean;
  /** Default gate mode for records of this type when the create payload omits `gateMode`. */
  defaultGateMode?: GateMode;
  coSignRequired?: boolean;
  flipRecordStatusOnDispute?: boolean;
  federateDisputes?: boolean;
}

/** Parameters for registering a new custom Type schema. */
export interface RegisterSchemaParams {
  type: string;
  displayName: string;
  description?: string;
  category?: string;
  /**
   * Default gate mode applied to records of this type when the create payload
   * omits `gateMode`. Omit for the engine default (`auto`). Set `principal` so
   * records created from the quickStart cannot silently auto-settle. An explicit
   * per-record `gateMode` always wins.
   */
  defaultGateMode?: GateMode;
  recordSchema: Record<string, unknown>;
  completionSchema?: Record<string, unknown>;
  fieldMappings?: SchemaFieldMapping[];
  compatibilityMode?: SchemaCompatibilityMode;
}

/** Verification-rule configuration echoed on schema reads and writes. */
export interface SchemaRulesConfig {
  type?: string;
  syncRuleIds: string[];
  asyncRuleIds: string[];
  fieldMappings?: SchemaFieldMapping[];
}

/**
 * Result of `schemas.getRules()`. The registered rules config plus the label
 * of the registration it came from.
 */
export interface SchemaRulesResult extends SchemaRulesConfig {
  /**
   * Publisher label of the registration these rules came from, echoing the
   * resolved value. On a type two publishers offer, the rules differ per
   * publisher, so this is what says which set you are reading.
   */
  publisher?: string;
}

/** Result of `schemas.disable()` and `schemas.enable()`. */
export interface SchemaLifecycleResult {
  type: RecordType;
  /**
   * Publisher label this call targeted, always the one it resolved to. Rows
   * under any other publisher of the same type are untouched.
   */
  publisher?: string;
  /** Post-state of the type after this call. */
  status: 'ACTIVE' | 'DISABLED' | (string & {});
  /** Versions moved to DISABLED. Present on `disable()`. */
  versionsDisabled?: number;
  /** Versions moved to ACTIVE. Present on `enable()`. */
  versionsEnabled?: number;
  /** Suggested next API calls. */
  nextSteps?: NextStep[];
}

/**
 * A schema-version subject row, returned by `schemas.register()`,
 * `schemas.import_()`, `schemas.updateVersion()`, `schemas.getVersions()`
 * and `schemas.getVersion()`.
 *
 * `getVersion()` projects the row differently: it includes `recordSchema` and
 * `completionSchema` (and may include `latestVersion`) but omits `id`,
 * `orgId`, `compatibilityMode`, `createdAt` and `updatedAt`, so those
 * fields are optional here. Absent fields are omitted from the wire entirely,
 * not sent as null.
 */
export interface SchemaVersionDetail {
  id?: string;
  type: RecordType;
  version: number;
  orgId?: string | null;
  displayName: string | null;
  description: string | null;
  category: string | null;
  compatibilityMode?: SchemaCompatibilityMode;
  status: SchemaVersionStatus;
  /** Publisher label that owns this row (`local` for locally registered types). */
  publisher?: string;
  /** SHA-256 digest of the JCS-canonicalized manifest; peers verify schema equality by digest. */
  manifestDigest?: string;
  /** `local` for `POST /v1/schemas`; `imported` for `POST /v1/schemas/import`. */
  trustClass?: 'local' | 'imported';
  federatable?: boolean;
  defaultShare?: boolean | null;
  defaultGateMode?: GateMode | null;
  coSignRequired?: boolean | null;
  flipRecordStatusOnDispute?: boolean;
  federateDisputes?: boolean;
  rulesConfig?: SchemaRulesConfig;
  quickStart?: {
    criteria: Record<string, unknown>;
    evidence: Record<string, unknown>;
  } | null;
  /** Present on `getVersion()` reads only. */
  recordSchema?: Record<string, unknown>;
  /** Present on `getVersion()` reads only. */
  completionSchema?: Record<string, unknown>;
  /** May appear on `getVersion()` reads. */
  latestVersion?: number;
  createdAt?: string;
  updatedAt?: string;
  /**
   * Keywords in the submitted schemas the validator ignores. Present on
   * register and version-update responses; absent when there are none.
   */
  warnings?: SchemaKeywordWarning[];
  /** Suggested next API calls (present on write responses). */
  nextSteps?: NextStep[];
}

/**
 * Parameters for updating a schema version.
 *
 * `compatibilityMode` is the only field the route accepts and it is required:
 * the body declares `additionalProperties: false`, so the `status` this
 * interface used to offer was rejected outright rather than deprecating
 * anything.
 */
export interface UpdateSchemaVersionParams {
  compatibilityMode: SchemaCompatibilityMode;
}

/** Result of a compatibility check against an existing schema. */
export interface SchemaCompatibilityResult {
  record: { compatible: boolean; changes: SchemaDiffChange[] };
  completion: { compatible: boolean; changes: SchemaDiffChange[] };
}

/** Options for exporting a schema. */
export interface ExportSchemaOptions {
  versions?: string;
  orgId?: string;
  /** Publisher label to export from. Required in practice on a type two publishers offer, or the artifact carries both. */
  publisher?: string;
}

/** Performer's response to a Record proposal. */
export type AcceptanceStatus = 'PROPOSED' | 'ACCEPTED' | 'REJECTED' | (string & {});

/**
 * Co-signature state of a Record or a Settlement Signal. `partial` is a
 * multi-peer co-sign where some counter-signatures came back and some did not.
 */
export type CoSignStatus = 'not_required' | 'pending' | 'succeeded' | 'partial' | 'failed';

/** Customer-facing Record statuses. The API maps internal states to these display statuses. Accepts any string for forward compatibility. */
export type RecordStatus =
  | 'CREATED'
  | 'PROPOSED'
  | 'ACTIVE'
  | 'PROCESSING'
  | 'REVISION_REQUESTED'
  | 'DISPUTED'
  | 'FULFILLED'
  | 'FAILED'
  | 'REMEDIATED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'RECORDED'
  | (string & {});

/**
 * Record transition action accepted by `POST /v1/records/{id}/transition`.
 *
 * Known values: register, propose, activate, cancel. Read `nextActions` on the
 * Record response for the exact set valid right now: display state `CREATED`
 * covers two internal states (DRAFT, REGISTERED) which accept different actions.
 */
export type RecordTransitionAction =
  | 'register'
  | 'propose'
  | 'activate'
  | 'cancel'
  | (string & {});

export type OperatingMode = 'cleartext' | 'encrypted';
/**
 * Gate mode. Known values: `auto` (the gate evaluates the principal's
 * pre-configured predicates and auto-settles) or `principal` (the engine runs an
 * advisory pass when rules exist, then the principal renders accept/reject).
 * Either way the verdict is the principal's; AGLedger holds the signed decision
 * and never renders it. Accepts any string for forward compatibility.
 */
export type GateMode = 'auto' | 'principal' | (string & {});

/**
 * EU AI Act risk tier (Article 5 prohibited → Annex III high → Article 50
 * limited → minimal). An AI impact assessment always asserts one of these.
 */
export type EuAiActRiskTier = 'unacceptable' | 'high' | 'limited' | 'minimal';

/**
 * Record-column risk classification: the canonical {@link EuAiActRiskTier} set
 * plus the notary sentinel `unclassified` (nothing asserted yet, the
 * create-time default).
 */
export type RiskClassification = EuAiActRiskTier | 'unclassified';

/**
 * EU AI Act Annex III high-risk domains. Shared by a Record's `euAiActDomain`
 * and an AI impact assessment's `domain`, so the declared and formally-assessed
 * surfaces speak one taxonomy.
 */
export type EuAiActDomain =
  | 'biometrics'
  | 'critical_infrastructure'
  | 'education'
  | 'employment'
  | 'essential_services'
  | 'law_enforcement'
  | 'migration'
  | 'justice';

/** Constraint inheritance mode from parent Record. */
export type ConstraintInheritanceMode = 'none' | 'advisory' | 'enforced';

/** Dispute evidence types. */
export type EvidenceType = 'screenshot' | 'external_lookup' | 'document' | 'communication' | 'other' | (string & {});


/**
 * Inline tamper-evident completion for the head of a Record's audit chain.
 *
 * Lets a notarize-only caller verify the Record was chained without a
 * follow-up call to `/v1/records/{id}/audit-export`.
 */
export interface SignedStatement {
  /** Per-Record monotonic chain position of the head Signed Statement (1-indexed). */
  chainPosition: number;
  /** Hex sha256 over the canonical COSE_Sign1 envelope bytes. */
  leafHash: string;
  /** leafHash of the prior entry (null only on chainPosition === 1). */
  previousHash: string | null;
  /** ID of the vault signing key: resolves to a public key at GET /v1/verification-keys. */
  signingKeyId: string | null;
  /**
   * Signed instant of the head Signed Statement: the CWT `iat` claim (second
   * precision) sealed in the COSE_Sign1 protected header. THE
   * authoritative timestamp for time-anchored contracts (wait windows, notice
   * clocks); the Record's `createdAt` is a millisecond-precision DB clock that
   * only approximates it. Null if the envelope fails to decode.
   */
  signedAt?: string | null;
  /** Most recent signed checkpoint covering this chain position, or null until the next 6h sweep. */
  signedCheckpointRef: string | null;
  /** Relative URL to the COSE_Sign1 attestation stream for this Record. */
  url: string;
}

/**
 * SCITT-style inclusion-proof completion. Present only on org-admin
 * cross-party reads: proves the read was logged.
 */
export interface RecordReadCompletion {
  /** Per-org monotonic leaf index in the org_admin_reads chain. */
  leafIndex: number;
  /** Hex sha256 of the canonical chain entry. */
  leafHash: string;
  /** Most recent signed checkpoint that includes this leaf, or null until the next 6h sweep covers it. */
  signedCheckpointRef: string | null;
}

/**
 * A Record: a registered commitment between a principal and a performer.
 * Records what was asked, by whom, and when. The contract is the product.
 *
 * Named `RecordRow` (matching the API's openapi schema name) to avoid
 * colliding with TypeScript's built-in `Record<K, V>` utility type.
 *
 * @example
 * ```ts
 * // Admin naming a principal
 * const record = await client.records.create({
 *   principalAgentId: 'agt_abc',
 *   type: 'ACH-PROC-v1',
 *   contractVersion: '1',
 *   platform: 'internal',
 *   criteria: { item_spec: 'widgets', quantity: { target: 100 } },
 * });
 * ```
 */
export interface RecordRow {
  /** Unique Record ID (UUID). */
  id: string;
  /** Org that owns this Record. */
  orgId: string;
  /** Agent assigned as performer, or null if unassigned. */
  performerAgentId: string | null;
  /** Agent ID of the principal. */
  principalAgentId: string;
  /** API key that created this Record (admin, agent, or platform). See audit_vault for the chain of custody. */
  createdByKeyId: string;
  /** Record Type, e.g. 'ACH-PROC-v1'. */
  type: RecordType;
  /** Version of the Type schema. */
  contractVersion: string;
  /** Platform where this Record operates. */
  platform: string;
  /** External reference ID on the platform. */
  platformRef?: string | null;
  /** Current lifecycle status. Use `getValidTransitions()` to see allowed next states. */
  status: RecordStatus;
  /** Acceptance criteria: what the performer must deliver. Typed per Type. */
  criteria: Record<string, unknown>;
  /** Tolerance bands for numeric criteria (e.g., quantityPct: 5 allows 5% variance). */
  tolerance?: Record<string, unknown>;
  /** ISO 8601 deadline for completion. */
  deadline?: string | null;
  /** Operating mode: cleartext (default) or encrypted. */
  operatingMode?: OperatingMode;
  /** Gate mode: auto (auto-settles against the principal's pre-configured predicates), or principal (engine advisory pass, then the principal renders accept/reject). */
  gateMode?: GateMode;
  /** EU AI Act risk classification. */
  riskClassification?: RiskClassification;
  /** EU AI Act high-risk domain (only when riskClassification=high). */
  euAiActDomain?: EuAiActDomain | null;
  /** Human oversight configuration for EU AI Act compliance. */
  humanOversight?: Record<string, unknown> | null;
  /** Performer's response to a proposed Record. */
  acceptanceStatus?: AcceptanceStatus | null;
  /** ISO 8601 timestamp when the performer responded to a proposal. */
  acceptanceRespondedAt?: string | null;
  /** Project grouping reference for related Records. */
  projectRef?: string | null;
  /** Parent Record ID in a delegation chain. */
  parentRecordId?: string | null;
  /** Root Record ID at the top of the delegation chain. */
  rootRecordId?: string | null;
  /** Depth in the delegation chain (0 = root). */
  chainDepth?: number;
  /**
   * IDs of child Records in the delegation chain, OLDEST first by creation time
   * (present on single-Record fetch only). Do not read `[0]` as the latest child:
   * for the newest child of a type, use
   * `records.search({ parentRecordId, type })`, which returns newest first.
   */
  childRecordIds?: string[];
  /**
   * The earlier Record this one replaces, asserted by the writer at create and
   * immutable thereafter. Orthogonal to delegation: `parentRecordId` says what
   * this Record is part of, `supersedesRecordId` says which earlier Record it
   * makes stale. It sits inside the create-time signature, so an offline
   * verifier reconstructs the same lineage the API reports.
   */
  supersedesRecordId?: string | null;
  /**
   * How many later Records name this one as their `supersedesRecordId`. 0 means
   * this Record is current. Greater than 1 is a FORK: two writers superseded the
   * same Record independently, so there are that many current heads and no single
   * answer; list them with `records.search({ supersedesRecordId: id })`.
   */
  supersededByCount?: number;
  /** Delegation-shell indicator: true when parent's principal org equals this child's performer org. NULL on root and on children without a performer. Informational only. */
  parentPrincipalOrgMatchesPerformer?: boolean | null;
  /** Reason provided for the last state transition. */
  lastTransitionReason?: string | null;
  /** Actor who triggered the last state transition. */
  lastTransitionBy?: string | null;
  /** Reason from the most recent verdict or revision request. Persists across subsequent state changes. */
  lastVerdictReason?: string | null;
  /** ISO 8601 timestamp of the most recent verdict or revision request. */
  lastVerdictAt?: string | null;
  /** Number of completion submissions so far. */
  submissionCount: number;
  /** Maximum allowed submissions, or null for unlimited. */
  maxSubmissions: number | null;
  /** Number of revisions consumed by RESUBMIT_COMPLETION calls. */
  revisionCount?: number;
  /** Maximum revisions allowed before OVERFLOW_REJECT (default 3). */
  maxRevisions?: number;
  /** Number of disputes opened against this Record. */
  disputeCount?: number;
  /** Maximum disputes allowed (default 1 in v1). */
  maxDisputes?: number;
  /** True iff a deadline is set AND has passed. */
  pastDeadline?: boolean;
  /** Optimistic concurrency version. */
  version: number;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
  /** ISO 8601 last update timestamp. */
  updatedAt: string;
  /** ISO 8601 timestamp when the Record was activated. */
  activatedAt?: string | null;
  /** ISO 8601 timestamp when the Record was fulfilled. */
  fulfilledAt?: string | null;
  /** Valid next actions from current state: exact action names accepted by /transition right now. */
  nextActions?: string[];
  /** Valid target statuses from current state. */
  validTransitions?: string[];
  /**
   * Hint for completion evidence fields, or null if no completion expected.
   * Use `schemaUrl` for the full JSON Schema; it is publisher-scoped the same
   * way the Record-level `schemaUrl` is.
   */
  completionHint?: { requiredFields: string[]; optionalFields?: string[]; schemaUrl?: string } | null;
  /** Advisory enforcement warnings from the most recent transition. */
  advisoryWarnings?: Array<{ rule: string; message: string; details?: Record<string, unknown> }>;
  /**
   * Publisher label of the registration this Record binds to. With `type` and
   * `contractVersion` it names exactly which schema the Record was judged
   * against, which `type` alone cannot once two publishers offer the same type.
   * Present whether or not `publisher` was pinned on create, so a
   * single-publisher org reads its one label (usually `local`).
   *
   * `null` means the engine never validated this Record against a local
   * registration, which leaves exactly one case: federation-received Records,
   * where the originator ran the gate against its own registration. Read
   * `null` as "ask the originator", not as "the schema is missing here".
   *
   * Records backfilled through the admin import route are NOT null. Import
   * binds the registration it validated against, so a backfilled Record reads
   * its publisher label and a `schemaUrl` scoped to it.
   */
  publisher?: string | null;
  /**
   * URL to the Type schema definition. Carries `?publisher=` whenever
   * `publisher` is known, so the link resolves even for a type two publishers
   * offer. Follow it verbatim; do not rebuild it from `type`.
   *
   * `null` on a federation-received Record whose schema this Server does not
   * hold, matching `publisher`. The engine returns null rather than a link
   * that lies: a receiver-scoped path would 404 where the type is absent, and
   * where the receiver happens to hold the same type name it would answer with
   * its own unrelated registration, whose requirements can differ. Read `null`
   * as "ask the originator".
   */
  schemaUrl?: string | null;
  /** Detailed per-rule gate-evaluation results with tolerance bands, or null if the gate has not run. */
  verdictChecks?: Record<string, unknown> | null;
  /** Phase 2 gate verdict: accept, reject, or null until the gate evaluation completes. */
  verdict?: Verdict | null;
  /** True when principal and performer are the same agent at creation. Auto-verdict is blocked on self-principal Records. */
  selfPrincipal?: boolean;
  /** Constraint inheritance mode from parent Record. */
  constraintInheritance?: ConstraintInheritanceMode;
  /** External task ID from the caller's system. */
  externalTaskId?: string | null;
  /** Record IDs this Record depends on. */
  dependsOn?: string[];
  /** Per-field enforcement overrides. */
  enforcementOverrides?: Record<string, unknown> | null;
  /** Arbitrary metadata attached to the Record. */
  metadata?: Record<string, unknown> | null;
  /** Free-form taxonomy of what kind of artifact this Record represents: denormalized from the Type at create. Immutable. */
  category?: string | null;
  /** Optional free-form outcome supplied at create. Stored on metadata.outcome and surfaced here regardless of Type. */
  outcome?: 'success' | 'failure' | 'denied' | 'partial' | (string & {}) | null;
  /** Optional grouping ID supplied at create. Multiple Records sharing a correlationId can be queried via /v1/records/search?correlationId=... */
  correlationId?: string | null;
  /** Free-form identifier of the human or upstream system that asked for the work. */
  requestedBy?: string | null;
  /** External entity references attached to this Record (present on single-Record fetch only). */
  references?: EntityReference[];
  /** Suggested next API calls based on current Record state. */
  nextSteps?: NextStep[];
  /** Inline tamper-evident head of this Record's audit chain (the Signed Statement at chainPosition). */
  signedStatement?: SignedStatement;
  /** SCITT-style inclusion-proof completion; present only on org-admin cross-party reads. */
  recordRead?: RecordReadCompletion;
  /** True when this Record has child (delegated) Records. */
  hasChildren?: boolean;
  /** ID of the most recent Completion submitted against this Record, or null. */
  latestCompletionId?: string | null;
  /** Which role the Record is currently awaiting, or null when not blocked on anyone. */
  awaitingActor?: 'principal' | 'performer' | 'system' | null;
  /** Terminal-state reason string, or null while non-terminal. */
  terminalReason?: string | null;
  /** ISO 8601 timestamp when the Record expired, or null. */
  expiredAt?: string | null;
  /** True iff the Record was imported from an external system. */
  imported?: boolean;
  /** Free-form identifier of the originating system, or null. */
  source?: string | null;
  /** True when an open dispute exists against this Record. */
  hasDispute?: boolean;
  /** ID of the open/most-recent dispute, or null. */
  disputeId?: string | null;
  /** Lifecycle status of the dispute, or null when none. */
  disputeStatus?: DisputeStatus | null;
  /** Whether a co-signature is required before settlement, or null when not configured. */
  coSignRequired?: boolean | null;
  /** Co-signature state, or null when co-sign is not configured. */
  coSignStatus?: CoSignStatus | null;
  /** Hex Ed25519 counter-signature from the most recent successful co-sign, verifiable offline against the peer's published vault keys. Null when co-sign is not configured or not yet completed. */
  counterSignature?: string | null;
  /** Settlement Signal projected onto the Record (SETTLE/HOLD/RELEASE), or null until a terminal verdict produces one. */
  settlementSignal?: SettlementSignalSummary | null;
  /** Federation delivery status for this Record's outbound state, or null when not federated. */
  federationStatus?: 'pending' | 'delivered' | 'partial' | 'failed' | null;
  /** Peer Server IDs this Record has been shared to via federation. */
  sharedToPeers?: string[];
  /** Whether this Record participates in revenue share, or null when not configured. */
  share?: boolean | null;
  /**
   * Tamper-evidence result, present only when the Record was read with
   * `?integrity=true` ({@link GetRecordParams.integrity}). Re-verifies the full
   * audit chain AND cross-checks that the fields in this response match what the
   * chain asserts. `verified: false` means this body may not match the signed
   * evidence; treat the audit-export as authoritative.
   */
  integrity?: RecordIntegrity;
}

/** Tamper-evidence result attached to a Record read with `?integrity=true`. */
export interface RecordIntegrity {
  /**
   * True iff the full audit chain re-verifies (hash re-derive, linkage,
   * signatures, checkpoint cross-check) AND the record fields served here match
   * what the chain asserts. False ⇒ read the audit-export as the source of truth.
   */
  verified: boolean;
  /** Strength of the chain verification: whether every entry was signed or only hash-linked. */
  integrityLevel: 'hash_chain_only' | 'hash_chain_partial_signatures' | 'hash_chain_and_signatures' | 'invalid';
  /**
   * Failure class when `verified` is false; null when verified. `record_projection_drift`
   * = the served row diverges from the verified chain (see {@link driftFields}).
   */
  reason: string | null;
  /** Number of audit-chain entries verified. */
  entries: number;
  /** True when the row-vs-chain projection cross-check ran. */
  projectionChecked: boolean;
  /** Record fields that diverged from the chain when `reason` is `record_projection_drift`. */
  driftFields: string[];
}

/**
 * Settlement Signal projected onto a Record: the SETTLE/HOLD/RELEASE
 * recommendation bound to the terminal verdict, plus federation delivery state.
 * One payload class on the Notify channel; the Record holds the recommendation,
 * the principal renders the decision.
 */
export interface SettlementSignalSummary {
  /** The settlement recommendation bound to the terminal verdict. */
  recommendation: 'SETTLE' | 'HOLD' | 'RELEASE';
  /** Verdict the recommendation binds to: `accept` (typically SETTLE) or `reject` (HOLD), or null. */
  outcome: 'accept' | 'reject' | null;
  /** Optional machine-readable reason code, or null. */
  reasonCode?: string | null;
  /** Rule IDs that failed and drove the recommendation, or null. */
  failingRuleIds?: string[] | null;
  /** Optional human-readable reason, or null. */
  reason?: string | null;
  /** Peer Servers the signal was successfully delivered to. */
  deliveredToPeers: string[];
  /** Peer Servers the signal is still pending delivery to. */
  pendingToPeers: string[];
  /** Peer Servers the signal failed to deliver to. */
  failedToPeers: string[];
  /** Idempotency key for the signal, or null. */
  idempotencyKey: string | null;
  /** Co-signature state of the signal, or null. */
  coSignStatus?: CoSignStatus | null;
  /** Hex Ed25519 counter-signature on the signal, or null. */
  counterSignature?: string | null;
  /** ISO 8601 expiry of the signal, or null. */
  validUntil?: string | null;
  /** Hex sha256 binding the signal to the terminal outcome, or null. */
  outcomeHash?: string | null;
  /** Origin of the signal relative to this Server. */
  source?: 'outbound' | 'inbound' | 'local';
  /** Peer the signal was received from (inbound only), or null. */
  receivedFrom?: Record<string, unknown> | null;
}

/**
 * Parameters for `POST /v1/records`.
 *
 * - Admin keys: set `principalAgentId` to name the principal explicitly.
 * - Agent keys: `principalAgentId` may be omitted; the server defaults it to
 *   the authenticated agent. Set `performerAgentId` to delegate to another agent.
 */
export interface CreateRecordParams {
  /**
   * Agent ID that serves as principal (the party assigning the work).
   * Required for admin-authored Records; optional for agent keys (defaults
   * to the authenticated agent).
   */
  principalAgentId?: string;
  /** Performer agent ID. Omit for self-commitment on agent keys. */
  performerAgentId?: string;
  /**
   * Org scope. Optional: admin keys typically leave this to the server
   * to infer from the key's org context.
   */
  orgId?: string;
  /** Record Type, e.g. 'ACH-PROC-v1'. Determines criteria schema. */
  type: RecordType;
  /**
   * Publisher label pinning WHICH registration of `type` this Record binds to.
   * Only needed when two publishers offer the same type in the org (an imported
   * peer manifest alongside a local registration); that case is refused with
   * 422 `/problems/ambiguous-publisher` and the candidate labels on
   * `AgledgerApiError.publishers` rather than the engine picking one. Re-send
   * with one of those labels. `schemas.list()` carries `publisher` on every row.
   */
  publisher?: string;
  /** Type schema version. */
  contractVersion?: string;
  /** Platform identifier. */
  platform?: string;
  /** External reference ID on the platform. */
  platformRef?: string;
  /** Acceptance criteria. Typed per Type when using generic overload. */
  criteria: Record<string, unknown>;
  /** Numeric tolerance bands (e.g., `{ quantityPct: 5 }`). */
  tolerance?: Record<string, unknown>;
  /** ISO 8601 deadline for completion. */
  deadline?: string;
  /** Max completion submissions allowed. Null/omit for unlimited. */
  maxSubmissions?: number;
  /**
   * Maximum rework cycles this Record allows (1-20). Omit to inherit the org
   * default `enforcement.defaultMaxRevisions` (3 unless the org set it).
   * Immutable once the Record is created. Reaching the cap refuses the next
   * resubmit with 422 and leaves the Record where it was, so the principal can
   * still verdict, cancel or dispute it.
   */
  maxRevisions?: number;
  /** Operating mode: cleartext (default) or encrypted. */
  operatingMode?: OperatingMode;
  /** Gate mode: auto (default; auto-settles against the principal's pre-configured predicates), or principal (engine advisory pass, then the principal renders accept/reject). */
  gateMode?: GateMode;
  /** EU AI Act risk classification. */
  riskClassification?: RiskClassification;
  /** EU AI Act high-risk domain (only when riskClassification=high). */
  euAiActDomain?: EuAiActDomain;
  /** Human oversight configuration. */
  humanOversight?: Record<string, unknown>;
  /** Parent Record ID for delegation. */
  parentRecordId?: string;
  /**
   * Declare that this Record replaces an earlier one, making that earlier
   * Record stale. The target must be visible to you and in the same org; it
   * does NOT have to share this Record's parent or type. Create-only and
   * immutable thereafter, and inside the create-time signature. A
   * checkpoint-style pattern uses this together with `parentRecordId`: every
   * checkpoint is a child of the same root and supersedes the previous head.
   */
  supersedesRecordId?: string;
  /**
   * External references to attach at creation. Append-only, and capped per
   * request and per Record (both org-configurable).
   */
  references?: EntityReferenceInput[];
  /**
   * V1 sharing override for federated counterparties. `true` ships a signed
   * copy of terminal-state transitions and Settlement Signals to the peer;
   * `false` keeps the Record private to this Server. Omit to inherit the
   * contract type's `defaultShare`. The chain itself is local either way.
   */
  share?: boolean;
  /** External task ID from caller's system. */
  externalTaskId?: string;
  /** Project grouping reference. */
  projectRef?: string;
  /** Record IDs this depends on. */
  dependsOn?: string[];
  /** Arbitrary metadata. */
  metadata?: Record<string, unknown>;
  /** Optional outcome (success/failure/denied/partial); stored on metadata.outcome and surfaced on the response. */
  outcome?: 'success' | 'failure' | 'denied' | 'partial' | (string & {});
  /** Optional grouping ID: multiple Records sharing a correlationId can be queried together. */
  correlationId?: string;
  /** Free-form identifier of the human or upstream system that asked for the work. */
  requestedBy?: string;
  /** Auto-transition to ACTIVE after create (CREATED → register → activate in one request). */
  autoActivate?: boolean;
  /** Constraint inheritance mode. */
  constraintInheritance?: ConstraintInheritanceMode;
  /** Per-field enforcement overrides. */
  enforcementOverrides?: Record<string, unknown>;
}

export interface UpdateRecordParams {
  criteria?: Record<string, unknown>;
  tolerance?: Record<string, unknown>;
  deadline?: string;
  riskClassification?: RiskClassification;
  euAiActDomain?: EuAiActDomain;
  humanOversight?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface ListRecordsParams extends ListParams {
  orgId?: string;
  status?: RecordStatus;
  /** Filter by Type. */
  type?: RecordType;
  /** Filter by performer agent ID. */
  performerAgentId?: string;
  /**
   * Narrow the calling agent's auto-scope to one side of the Record.
   * Agent keys only: admin/platform keys 400. On an admin or platform key the
   * equivalent narrowing is {@link ListRecordsParams.performerAgentId}.
   */
  role?: 'performer' | 'principal' | (string & {});
  /** ISO 8601 lower bound on createdAt. */
  from?: string;
  /** ISO 8601 upper bound on createdAt. */
  to?: string;
  /** Filter to Records with (true) or without (false) an open dispute. */
  hasDispute?: boolean;
  /** Filter by dispute lifecycle status. */
  disputeStatus?: DisputeStatus;
  /** Filter to imported (true) or native (false) Records. */
  imported?: boolean;
  /** Filter by originating system identifier. */
  source?: string;
  /**
   * Agent-recovery query: return every Record whose next action awaits
   * the caller's structural side, across all statuses (open proposals, ACTIVE work,
   * revision requests, counter-proposals/verdicts). Agent keys only: admin/platform
   * keys 400 (use the per-row `awaitingActor` field instead).
   */
  actionable?: boolean;
}

/** Options for {@link RecordsResource.get}. */
export interface GetRecordParams {
  /**
   * Re-verify the Record's audit chain and cross-check the served row against it,
   * returning the result on {@link RecordRow.integrity}. Costs a chain
   * walk; omit for plain reads.
   */
  integrity?: boolean;
}

export interface SearchRecordsParams extends ListParams {
  orgId?: string;
  status?: RecordStatus;
  type?: RecordType;
  /**
   * Narrow the calling agent's auto-scope to one side of the Record.
   * Agent keys only: admin/platform keys 400.
   *
   * There is deliberately no `principalAgentId` here: no record endpoint accepts
   * one, and the search querystring rejects unknown properties, so offering it
   * produced a 400. On an admin or platform key the replacement for it is
   * {@link SearchRecordsParams.performerAgentId}, not this field.
   */
  role?: 'performer' | 'principal' | (string & {});
  performerAgentId?: string;
  category?: string;
  projectRef?: string;
  from?: string;
  to?: string;
  sort?: 'createdAt' | 'updatedAt' | (string & {});
  order?: 'asc' | 'desc';
  externalTaskId?: string;
  parentRecordId?: string;
  correlationId?: string;
  updatedAfter?: string;
  updatedBefore?: string;
  gateMode?: GateMode;
  operatingMode?: OperatingMode;
  /** Filter to Records with (true) or without (false) an open dispute. */
  hasDispute?: boolean;
  disputeStatus?: DisputeStatus;
  /** Filter to imported (true) or native (false) Records. */
  imported?: boolean;
  /** Filter by originating system identifier. */
  source?: string;
  /**
   * Restrict to Records that have been superseded (true) or are still current
   * (false). On an append-only ledger every past state keeps matching a filter
   * forever, so `superseded: false` is what makes "what is the state of my work
   * right now" answerable in one query.
   */
  superseded?: boolean;
  /** Filter to the successors of a Record: those declaring this id as superseded. */
  supersedesRecordId?: string;
  /**
   * Filter on signed criteria values. Unlike {@link SearchRecordsParams.metadata},
   * criteria sits inside the record signature, so this selects on the same bytes
   * an auditor verifies offline. Top-level keys only, max 5.
   */
  criteria?: Record<string, unknown>;
  /**
   * Filter on unsigned metadata annotations. Top-level keys only, max 5.
   * Use {@link SearchRecordsParams.criteria} for anything that has to be both
   * findable and provable.
   */
  metadata?: Record<string, unknown>;
  /** External entity reference filter: the referencing system, e.g. `jira`. */
  'ref.system'?: string;
  /** External entity reference filter: the entity type, e.g. `issue`. */
  'ref.type'?: string;
  /** External entity reference filter: the entity id within the system. */
  'ref.id'?: string;
}

/**
 * Parameters for delegating a Record (child Record under a parent).
 * Creates a Record via the unified `POST /v1/records` with `parentRecordId`.
 */
export interface DelegateRecordParams {
  principalAgentId?: string;
  performerAgentId?: string;
  type: RecordType;
  contractVersion?: string;
  platform?: string;
  criteria: Record<string, unknown>;
}

/** Result of a batch Record fetch. */
export interface BatchGetRecordsResult {
  data: RecordRow[];
}

/** Per-item options for bulk-create. */
export interface BulkCreateRecordItem extends CreateRecordParams {
  /** Per-Record idempotency key (caller-supplied). Replay-safe for high-volume notarize ingest. Scoped to (callerOwnerId, key); 7-day TTL. */
  idempotencyKey?: string;
}


/** Structural validation result for completions. */
export type StructuralValidation = 'ACCEPTED' | 'INVALID' | 'WARNING' | (string & {});

/**
 * A completion: structured evidence submitted by a performer claiming completion of a Record.
 * The principal reviews the completion and renders a verdict (accept/reject).
 */
export interface Completion {
  id: string;
  recordId: string;
  agentId: string;
  evidence: Record<string, unknown>;
  evidenceHash?: string;
  /** Structural validation result: ACCEPTED, INVALID, or WARNING. */
  structuralValidation: 'ACCEPTED' | 'INVALID' | 'WARNING' | (string & {});
  /** Schema validation errors, if any. */
  validationErrors?: string[] | null;
  /** Validation warnings (non-blocking). */
  warnings?: Array<{ rule: string; message: string; details?: Record<string, unknown> }>;
  /** Current status of the parent Record (denormalized). */
  recordStatus?: RecordStatus;
  /** Denormalized gate verdict on the parent Record: accept, reject, or null until the gate evaluates. */
  verdict?: Verdict | null;
  /** Reason attached to the most recent verdict, or null. */
  lastVerdictReason?: string | null;
  /**
   * The auto-gate's settlement decision, surfaced inline so the caller learns
   * settle-vs-hold-vs-reject at completion time without a follow-up GET.
   * `structuralValidation: 'ACCEPTED'` means only the body parsed; this
   * field carries the gate's decision. Null when the gate did not render inline
   * (encrypted Records, principal-mode held at PENDING_VERDICT, or the inline run
   * was skipped); read `recordStatus` and `records.get(id)` in that case.
   */
  settlementSignal?: CompletionSettlementSignal | null;
  /** Idempotency key used when submitting. */
  idempotencyKey?: string | null;
  createdAt: string;
  /** Suggested next API calls after completion submission. */
  nextSteps?: NextStep[];
}

/**
 * The auto-gate's inline settlement decision on a {@link Completion}.
 * A leaner projection than {@link SettlementSignalSummary} (no federation delivery
 * state), carrying just the gate outcome the caller needs at completion time.
 */
export interface CompletionSettlementSignal {
  /** The gate decision in GET /v1/records vocabulary: SETTLE, HOLD, or RELEASE. */
  recommendation: 'SETTLE' | 'HOLD' | 'RELEASE';
  /** Engine verdict that drove the recommendation. */
  outcome: 'accept' | 'reject';
  /**
   * Discriminator code (same as the settlement webhook), e.g. `AUTO_SETTLE`, or
   * `AUTO_SETTLE_WITHIN_TOLERANCE` when the gate cleared only via a
   * non-zero tolerance band rather than the base criteria threshold. Null when
   * not classifiable.
   */
  reasonCode?: string | null;
}

export interface SubmitCompletionParams {
  evidence: Record<string, unknown>;
  evidenceHash?: string;
  idempotencyKey?: string;
}


/** The principal verdict value. Known values: accept, reject. Accepts any string for forward compatibility. */
export type Verdict = 'accept' | 'reject' | (string & {});
/** Known values: SETTLE, HOLD, RELEASE. Accepts any string for forward compatibility. */
export type SettlementSignal = 'SETTLE' | 'HOLD' | 'RELEASE' | (string & {});

/** Result of an on-demand gate evaluation (`POST /v1/records/{id}/evaluate`). */
export interface GateEvaluationResult {
  recordId: string;
  completions: Array<{
    completionId: string;
    phase1Result?: Record<string, unknown> | null;
    phase2Result?: Record<string, unknown> | null;
  }>;
  overallStatus: string;
  /** Suggested next API calls after evaluation. */
  nextSteps?: NextStep[];
}

/** Gate status for a Record (`GET /v1/records/{id}/gate-status`). */
export interface GateStatus {
  recordId: string;
  phase1Status: string;
  phase2Status: string;
  lastEvaluatedAt?: string | null;
  pendingRules?: string[];
}


export interface SubmitVerdictParams {
  completionId: string;
  /**
   * The principal verdict: accept settles to FULFILLED, reject to FAILED.
   * Uses the exported `Verdict` union (open for forward compatibility) so
   * code generic over `Verdict`-typed variables composes here without an
   * extra narrowing step. New verdict literals may appear in future API
   * versions; the autocomplete still surfaces the known ones.
   */
  verdict: Verdict;
  /** Optional per-field check results (principal-defined). */
  checks?: Record<string, unknown>;
  /** Optional free-text notes explaining the verdict (recorded in the audit trail). */
  notes?: string;
  /** Reason for the verdict (alias for notes; either is accepted, notes takes precedence). */
  reason?: string;
}

export interface VerdictResult {
  recordId: string;
  completionId: string;
  /** The principal verdict: same open `Verdict` union as the write side. */
  verdict: Verdict;
  /** Settlement recommendation to downstream financial systems. */
  recommendation: SettlementSignal;
  /**
   * Record status after the verdict settled: FULFILLED (accept) or FAILED
   * (reject), same vocabulary as the Record GET. Surfaced inline so
   * the caller learns where the Record landed without a follow-up fetch.
   */
  recordStatus?: RecordStatus;
  reporterType: string;
  reportedAt: string;
  /** Suggested next API calls after submitting the verdict. */
  nextSteps?: NextStep[];
}


export interface RecordStatusSummary {
  countsByStatus: Record<string, number>;
  total: number;
}


/**
 * Lifecycle status of a dispute.
 *
 * Known values: EVIDENCE_WINDOW, PENDING_RESOLUTION, RESOLVED, WITHDRAWN.
 * Accepts any string for forward compatibility.
 *
 * This is the full set the Server serves, and the set every dispute-status
 * filter validates against. The tier ladder (`TIER_2_REVIEW`, `ESCALATED`,
 * `TIER_3_ARBITRATION`) is gone: a dispute the engine does not auto-resolve
 * waits at `PENDING_RESOLUTION` for the principal to render an outcome. The
 * three query params that take this type declare a strict enum, so a retired
 * value is a 400.
 */
export type DisputeStatus =
  | 'EVIDENCE_WINDOW'
  | 'PENDING_RESOLUTION'
  | 'RESOLVED'
  | 'WITHDRAWN'
  | (string & {});

/** Known dispute grounds. */
export type DisputeGrounds =
  | 'equivalent_item'
  | 'fraudulent_completion'
  | 'record_ambiguity'
  | 'pricing_dispute'
  | 'quality_issue'
  | 'verdict_disagreement'
  | 'other'
  | (string & {});

/** Dispute object. Note: GET /dispute returns { dispute, evidence } envelope. */
export interface Dispute {
  id: string;
  recordId: string;
  initiatedByRole: string;
  initiatedById: string;
  grounds: DisputeGrounds;
  context?: string;
  status: DisputeStatus;
  outcome?: string | null;
  resolutionRationale?: string | null;
  evidenceWindowClosesAt?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
  /** Suggested next API calls for this dispute. */
  nextSteps?: NextStep[];
}

/** A single piece of evidence submitted on a dispute. */
export interface DisputeEvidence {
  id: string;
  disputeId: string;
  evidenceType: string;
  payload: Record<string, unknown>;
  /** Hex sha256 over the canonical evidence payload. */
  payloadHash: string;
  /** ID of the party that submitted the evidence. */
  submittedById: string;
  /** Role of the submitting party. */
  submittedByRole: string;
  createdAt: string;
}

/** Response envelope from GET /dispute: includes both dispute and evidence. */
export interface DisputeResponse {
  dispute: Dispute;
  evidence: DisputeEvidence[];
  /** Suggested next API calls for this dispute. */
  nextSteps?: NextStep[];
}

export interface CreateDisputeParams {
  grounds: DisputeGrounds;
  context?: string;
}

/**
 * Outcome the principal renders on a dispute.
 *
 * `OVERTURNED` means the disputed verdict does not stand: a Record whose
 * pre-dispute status was FAILED settles at FULFILLED with the verdict
 * re-rendered as accept, and one that was already FULFILLED or REMEDIATED is
 * restored to that terminal. Either way a RELEASE Settlement Signal follows
 * with `reasonCode: DISPUTE_OVERTURNED`. `UPHELD` means the verdict stands and
 * the Record returns to exactly the status it held before the dispute, with no
 * signal.
 */
export type DisputeOutcome = 'UPHELD' | 'OVERTURNED';

/** Parameters for rendering the outcome of a dispute. */
export interface ResolveDisputeParams {
  outcome: DisputeOutcome;
  /** Why this outcome was rendered, recorded on the dispute (max 2000 chars). */
  rationale?: string;
}

/** Query parameters for the org-wide dispute listing. */
export interface ListDisputesParams extends ListParams {
  status?: DisputeStatus;
  recordId?: string;
}


/**
 * Event types a webhook subscription can fire on: every member of the
 * `POST /v1/webhooks` `eventTypes` enum, plus the `*` wildcard. Accepts any
 * string for forward compatibility.
 *
 * This is a SUBSET of {@link EventType}, the `/v1/events` query enum. Seven
 * types are queryable there and rejected here. Three are replay surface that
 * was never subscribable: `record.settled` (a deprecated alias of
 * `record.fulfilled`), `record.released` and `dispute.evidence_window_closed`.
 * Settlement outcomes reach webhooks as `signal.emitted` / `signal.received`,
 * not as per-variant types. Two are retired: `dispute.escalated` and
 * `record.proposal_counter_proposed` stay queryable so historical events remain
 * readable, and no new one is ever written. Two are engine-internal failure
 * events with no subscription form: `system.cascading_gate_enqueue_failed` and
 * `system.verification_enqueue_failed`. Naming any of the seven in a
 * subscription is a 400.
 */
export type WebhookEventType =
  // Wildcard: subscribe to every event type
  | '*'
  // Record lifecycle
  | 'record.created'
  | 'record.recorded'
  | 'record.registered'
  | 'record.activated'
  | 'record.completion_submitted'
  | 'record.completion_invalid'
  | 'record.gate_complete'
  // Principal-mode record held at PROCESSING awaiting the principal verdict;
  // payload carries the `completionId` to verdict against plus the engine/rollup
  // advisory result.
  | 'record.gate_held'
  | 'record.fulfilled'
  | 'record.failed'
  | 'record.expired'
  | 'record.cancelled'
  // Agent-to-agent
  | 'record.proposed'
  | 'record.proposal_accepted'
  | 'record.proposal_rejected'
  | 'record.delegated'
  | 'record.revision_requested'
  // Cascading gate
  | 'cascading.gate.complete'
  // EU AI Act compliance filings
  | 'record.ai_impact_assessment_filed'
  | 'record.compliance_attestation_filed'
  // Settlement & disputes
  | 'signal.emitted'
  | 'signal.received'
  | 'dispute.opened'
  | 'dispute.resolved'
  | 'dispute.withdrawn'
  // Federation
  | 'federation.record.state_changed'
  | 'federation.settlement.signal'
  | 'federation.dispute'
  // Federation-projected lifecycle (thin federation payload shape, distinct
  // from the local-shape `record.<state>` events)
  | 'record.federation_activated'
  | 'record.federation_fulfilled'
  | 'record.federation_failed'
  | 'record.federation_remediated'
  | 'record.federation_recorded'
  | 'record.federation_cancelled'
  | 'record.federation_expired'
  | 'record.federation_proposal_rejected'
  // Entity references
  | 'record.reference_added'
  | 'agent.reference_added'
  | (string & {});

/**
 * Webhook delivery signing scheme.
 *
 * `hmac` is the shared-secret default. `ed25519` and `ecdsa-p256-sha256` are
 * the asymmetric tier: both are RFC 9421 HTTP Message Signatures over the
 * Server vault key, verifiable against `/v1/verification-keys` with no shared
 * secret, and both verify through the same `verifyRfc9421` call. Which of the
 * two a Server offers depends on its signing key, so read
 * `capabilities.signingAlgorithms` from `GET /v1/conformance` rather than
 * assuming `ed25519`.
 */
export type WebhookSigningAlg = 'hmac' | 'ed25519' | 'ecdsa-p256-sha256';

export interface Webhook {
  id: string;
  url: string;
  eventTypes: WebhookEventType[] | null;
  /** Record-type filter for record-scoped events; see {@link CreateWebhookParams.recordTypes}. */
  recordTypes?: string[];
  isActive: boolean;
  /** Whether deliveries are paused. */
  isPaused: boolean;
  format: 'standard' | 'cloudevents';
  /**
   * Delivery signing scheme. `hmac` (shared secret, default) or `ed25519`
   * (RFC 9421 HTTP Message Signatures signed with the Server vault key,
   * verifiable against /v1/verification-keys: non-repudiation, no shared
   * secret). Verify ed25519 deliveries with `verifyRfc9421` from
   * `@agledger/sdk/webhooks`.
   *
   * `ecdsa-p256-sha256` is the FIPS-mode counterpart of `ed25519`: same RFC
   * 9421 scheme and same verification call, signed under ES256 instead.
   */
  signingAlg: WebhookSigningAlg;
  /** Only present on creation/rotation of an `hmac` subscription (one-time). Absent for `ed25519`. */
  secret?: string;
  /** Whether a secret grace period is active after rotation. */
  secretGraceActive?: boolean;
  /** When the secret grace period expires (ISO 8601). */
  secretGraceExpiresAt?: string | null;
  /** Circuit breaker state: closed (healthy), open (stopped), half_open (testing). */
  circuitState?: 'closed' | 'open' | 'half_open';
  /** Number of consecutive delivery failures. */
  consecutiveFailures?: number;
  /** Last successful delivery timestamp (ISO 8601). */
  lastSuccessfulAt?: string | null;
  /** Last failed delivery timestamp (ISO 8601), or null if none. */
  lastFailureAt?: string | null;
  createdAt: string;
  /** Suggested next API calls for this webhook. */
  nextSteps?: NextStep[];
}

export interface CreateWebhookParams {
  url: string;
  eventTypes: WebhookEventType[];
  format?: 'standard' | 'cloudevents';
  /**
   * Delivery signing scheme. Omit for the default (`hmac`), except a
   * subscription that lists a settlement event (`signal.emitted`/
   * `signal.received`/`federation.settlement.signal`) defaults to `ed25519`
   * when the Server has a vault signing key. Requesting `ed25519` on a Server
   * without `VAULT_SIGNING_KEY` returns 422. A FIPS-mode Server signs under
   * `ecdsa-p256-sha256` instead; request whichever the Server advertises in
   * `capabilities.signingAlgorithms` on `GET /v1/conformance`.
   */
  signingAlg?: WebhookSigningAlg;
  /**
   * Record-type filter for record-scoped events. `["*"]` means all
   * record types (wildcard sentinel). Any other array means record events are
   * delivered ONLY for the listed types (fail-closed). Omit for all types.
   * 1-100 entries, each 1-100 chars.
   */
  recordTypes?: string[];
}

/**
 * Mutable fields on an existing webhook subscription. The signing scheme and
 * payload format are fixed at create time; the API rejects any other field
 * (`additionalProperties: false`).
 */
export interface UpdateWebhookParams {
  url?: string;
  eventTypes?: WebhookEventType[];
  /** Pause (true) or resume (false) deliveries; the subscription stays active. */
  isPaused?: boolean;
  /** Replace the record-type filter; see {@link CreateWebhookParams.recordTypes}. */
  recordTypes?: string[];
}

export interface WebhookDelivery {
  id: string;
  /** Event type that triggered this delivery (e.g. `record.created`). */
  type: string;
  status: string;
  attemptNumber: number;
  responseStatus: number | null;
  responseBody: string | null;
  /** Signature sent with the delivery: the `X-AGLedger-Signature` value for hmac subs, or the RFC 9421 `Signature` header value for ed25519 subs. */
  signature: string | null;
  /** Raw JSON body sent: the exact bytes covered by the signature (HMAC input for hmac, Content-Digest for ed25519). */
  requestBody: string | null;
  nextRetryAt: string | null;
  createdAt: string;
  deliveredAt: string | null;
}

export interface WebhookTestResult {
  statusCode: number;
  body: string;
  durationMs: number;
  success: boolean;
  deliveryId: string;
  httpStatus: number;
  latencyMs: number;
}


/** Parameters for `GET /v1/agents/{agentId}/drift`. */
export interface GetAgentDriftParams {
  /** Window length in days, 1 to 365. Default 7. */
  window?: number;
  /** Narrow `byType` to one type. `overall` is unaffected. */
  type?: string;
}

/** Parameters for `GET /v1/agents/drift`. */
export interface ListFleetDriftParams extends CursorListParams {
  /** Window length in days, 1 to 365. Default 7. */
  window?: number;
}

/** The two windows a drift reading was computed over. */
export interface DriftWindow {
  days: number;
  currentFrom: string;
  currentTo: string;
  baselineFrom: string;
  baselineTo: string;
}

/** Counts of what an agent did inside one window. */
export interface DriftBucket {
  from: string;
  to: string;
  /**
   * Records created in the window with this agent as the acting party: named
   * as performer, or as principal when no performer is named.
   */
  records: number;
  /** Completions this agent submitted that passed structural validation. */
  completions: number;
  /**
   * Gate verdicts rendered on this agent's records: the final verdict on each
   * completion, so a principal-gated record counts the principal's verdict and
   * not the engine's structural pass before it. Zero for a notarize-only agent.
   */
  verdicts: number;
  accepted: number;
  rejected: number;
  /** Disputes resolved OVERTURNED in the window on this agent's records. */
  overturned: number;
  /** `accepted / verdicts`. Null when the window holds no verdict. */
  acceptanceRate: number | null;
  /**
   * Median milliseconds from record activation to completion submitted. A
   * resubmission after a revision request measures from the original
   * activation. Null when the window holds no completion.
   */
  medianCompletionMs: number | null;
}

/**
 * `current` minus `baseline`, field by field. The sign says the direction;
 * nothing here says whether a direction is good. Null where either side is.
 */
export interface DriftChange {
  records: number;
  completions: number;
  verdicts: number;
  overturned: number;
  acceptanceRate: number | null;
  medianCompletionMs: number | null;
}

/** One series: the current window, the window before it, and the difference. */
export interface DriftSeries {
  current: DriftBucket;
  baseline: DriftBucket;
  change: DriftChange;
}

/** Drift for one agent, overall and per type. */
export interface AgentDrift {
  agentId: string;
  window: DriftWindow;
  overall: DriftSeries;
  /**
   * One entry per type the agent touched in either window. Always the
   * complete set; this listing does not page.
   */
  byType: Array<DriftSeries & { type: string }>;
}

/** One agent's roll-up row in the org-wide fleet listing. */
export interface FleetDriftRow extends DriftSeries {
  agentId: string;
  displayName: string;
}

/** A page of {@link FleetDriftRow}, with the window every row was computed over. */
export interface FleetDriftPage extends Page<FleetDriftRow> {
  window: DriftWindow;
}

/** Filters for `GET /v1/agents/{agentId}/history`. */
export interface AgentHistoryParams extends CursorListParams {
  /** Filter by type. */
  type?: string;
  /** Filter by gate verdict. */
  outcome?: Verdict;
  /** Records created on or after this instant (ISO-8601). */
  from?: string;
  /** Records created on or before this instant (ISO-8601). */
  to?: string;
}

/** One record in an agent's history. */
export interface AgentHistoryEntry {
  recordId: string;
  type: string;
  /** Record status at the time of the read. */
  status: RecordStatus;
  /** Gate verdict: `accept`, `reject`, or `PENDING` when none has been rendered. */
  outcome: string;
  createdAt: string;
  completedAt?: string | null;
}

/** A single counterparty-pair row in {@link VerdictStatistics}. */
export interface VerdictStatisticsRow {
  /** Performer in the pair (present on `asPrincipal` rows). */
  performerAgentId?: string;
  /** Principal in the pair (present on `asPerformer` rows). */
  principalAgentId?: string;
  /** Count of transitions into FULFILLED (accept verdict) for this pair. */
  verdictAcceptCount: number;
  /** Count of transitions into VERDICT_REJECTED (reject verdict) for this pair. */
  verdictRejectCount: number;
  /** Count of CANCELLED_IN_PROGRESS terminations after at least one completion was submitted. */
  cancelAfterCompletionCount: number;
  /** When the first counted event occurred for this pair. */
  firstEventAt: string;
  /** When the most recent counted event occurred for this pair. */
  lastEventAt: string;
}

/**
 * Own verdict-distribution counters from `/v1/records/me/verdict-statistics`,
 * decomposed by the calling agent's structural role on each counterparty pair.
 */
export interface VerdictStatistics {
  /** The calling agent. */
  agentId: string;
  /** Counters for pairs where the calling agent acted as principal (rows keyed by performer). */
  asPrincipal: { data: VerdictStatisticsRow[]; total: number };
  /** Counters for pairs where the calling agent acted as performer (rows keyed by principal). */
  asPerformer: { data: VerdictStatisticsRow[]; total: number };
}


/**
 * Event types queryable on `GET /v1/events` via {@link ListEventsParams.eventType}.
 *
 * A deliberate superset of {@link WebhookEventType}, by seven members: the
 * three replay-only types (`record.settled`, `record.released`,
 * `dispute.evidence_window_closed`), the two retired ones still readable in
 * history (`dispute.escalated`, `record.proposal_counter_proposed`), and the
 * two engine-internal failure events (`system.cascading_gate_enqueue_failed`,
 * `system.verification_enqueue_failed`). There is no `*` member, because the
 * wildcard is a subscription filter and not a type any event carries. Accepts
 * any string for forward compatibility.
 */
export type EventType =
  | 'agent.reference_added'
  | 'cascading.gate.complete'
  | 'dispute.escalated'
  | 'dispute.evidence_window_closed'
  | 'dispute.opened'
  | 'dispute.resolved'
  | 'dispute.withdrawn'
  | 'federation.dispute'
  | 'federation.record.state_changed'
  | 'federation.settlement.signal'
  | 'record.activated'
  | 'record.ai_impact_assessment_filed'
  | 'record.cancelled'
  | 'record.completion_invalid'
  | 'record.completion_submitted'
  | 'record.compliance_attestation_filed'
  | 'record.created'
  | 'record.delegated'
  | 'record.expired'
  | 'record.failed'
  | 'record.federation_activated'
  | 'record.federation_cancelled'
  | 'record.federation_expired'
  | 'record.federation_failed'
  | 'record.federation_fulfilled'
  | 'record.federation_proposal_rejected'
  | 'record.federation_recorded'
  | 'record.federation_remediated'
  | 'record.fulfilled'
  | 'record.gate_complete'
  | 'record.gate_held'
  | 'record.proposal_accepted'
  | 'record.proposal_counter_proposed'
  | 'record.proposal_rejected'
  | 'record.proposed'
  | 'record.recorded'
  | 'record.reference_added'
  | 'record.registered'
  | 'record.released'
  | 'record.revision_requested'
  | 'record.settled'
  | 'signal.emitted'
  | 'signal.received'
  | 'system.cascading_gate_enqueue_failed'
  | 'system.verification_enqueue_failed'
  | (string & {});

/** Query parameters for the global event listing (`GET /v1/events`). */
export interface ListEventsParams extends ListParams {
  /** ISO timestamp: events created at or after this instant (inclusive). Required. */
  since: string;
  /**
   * ISO timestamp: events created strictly before this instant (exclusive).
   * Pair it with `since` to close the window and make the page reproducible;
   * consecutive windows compose without overlap when the next `since` equals
   * the previous `until`.
   */
  until?: string;
  /** Only events attached to this record (UUID). */
  recordId?: string;
  /**
   * Only events of this type. The `/v1/events` enum is a superset of the
   * subscribable {@link WebhookEventType} set, so `record.settled`,
   * `record.released` and `dispute.evidence_window_closed` are queryable here.
   */
  eventType?: EventType;
  /** Sort order by creation time (default: `asc`). */
  order?: 'asc' | 'desc';
}

export interface AgledgerEvent {
  id: string;
  /** Event type (e.g. `record.created`). Wire field is `type`, not `eventType`. */
  type: string;
  recordId: string | null;
  agentId: string | null;
  /** Event-specific payload. Wire field is `data`, not `payload`. */
  data: Record<string, unknown>;
  createdAt: string;
}


export interface ComplianceExport {
  exportId: string;
  status: 'processing' | 'ready';
  downloadUrl?: string;
  createdAt?: string;
  expiresAt?: string;
  /**
   * Rows in the export. Capped at 10000, newest first. Read `truncated`
   * before treating this as the size of the match set.
   */
  recordCount?: number;
  /**
   * True when the filters matched more than the 10000-row export cap, so the
   * export holds only the newest 10000 rows (API v1.3.4). Window
   * with `filters.from` / `filters.to` to cover the rest. Exports created
   * before this field existed report `false`.
   *
   * On a download, the same answer rides the `X-AGLedger-Export-Truncated`
   * response header, which is the only carrier for a `csv` download: the body
   * is raw rows, and a notice line would corrupt the parse.
   */
  truncated?: boolean;
  /**
   * Total rows the filters matched at creation time, before the cap. Equals
   * `recordCount` unless `truncated`. Header twin on a download:
   * `X-AGLedger-Export-Total-Records`.
   */
  totalRecords?: number;
  /** Suggested next API calls. */
  nextSteps?: NextStep[];
}

export interface ExportComplianceParams {
  /**
   * `csv` / `json` are SIEM-ingest shapes; `html` renders an inspector-ready
   * report (narrative + per-record table + /attestation URLs) sized for EU AI
   * Act Article 12 inspector audits.
   */
  format: 'csv' | 'json' | 'html';
  filters?: {
    orgId?: string;
    from?: string;
    to?: string;
    contractTypes?: string[];
  };
  /**
   * Optional column selection. Omit for the default rich row (~24 accountability
   * fields, including the EU AI Act `assessment*` and `complianceAttestation*`
   * columns). Pass to thin the export for SIEM or widen it for regulator packets
   * (e.g. `criteria`, `complianceAttestations`, `chainIntegrity`). Unknown names
   * 400 with the allowed set in the response body. Max 64.
   */
  fields?: string[];
  /**
   * Inline cryptographic evidence into the packet so a regulator can verify each
   * claim offline without calling back to the API. Currently the only
   * value is `signed-statements` (embeds each record's full COSE_Sign1 chain plus a
   * `verification` block); omit for a reference-only export.
   */
  embed?: string[];
}

export interface AiImpactAssessment {
  id: string;
  recordId: string;
  /** The formally-assessed tier; always one of the four tiers (never `unclassified`). */
  riskLevel: EuAiActRiskTier;
  domain: EuAiActDomain;
  humanOversight?: Record<string, unknown>;
  testingResults?: Record<string, unknown>;
  createdAt: string;
}

export interface CreateAiImpactAssessmentParams {
  riskLevel: EuAiActRiskTier;
  domain: EuAiActDomain;
  humanOversight?: Record<string, unknown>;
  testingResults?: Record<string, unknown>;
}



export type ComplianceRecordType = 'workplace_notification' | 'affected_persons' | 'input_data_quality' | 'fundamental_rights_impact_assessment' | (string & {});

export interface ComplianceRecord {
  id: string;
  recordId: string;
  orgId: string;
  recordType: ComplianceRecordType;
  attestation: Record<string, unknown>;
  attestedBy: string;
  attestedAt: string;
  createdAt: string;
}

export interface CreateComplianceRecordParams {
  recordType: ComplianceRecordType;
  attestation: Record<string, unknown>;
  attestedBy: string;
  attestedAt?: string;
}


/**
 * Actor envelope embedded in canonical audit payloads, hash-chained into
 * the payload so callers can attribute each vault entry to a specific API
 * key / role / owner without trusting external metadata.
 */
export interface AuditActor {
  actor_key_id: string | null;
  actor_role: ApiKeyRole | (string & {}) | null;
  actor_owner_id: string | null;
}

export interface AuditExportEntry {
  /** Per-record monotonic chain position (1-indexed). Canonical field on current exports. */
  chainPosition?: number;
  /** @deprecated Legacy alias for `chainPosition` (pre-v0.25 exports). */
  position?: number;
  /** Canonical entry timestamp (engine v0.25+). */
  createdAt?: string;
  /** @deprecated Pre-v0.25 alias for `createdAt`. */
  timestamp?: string;
  recordId?: string;
  /** API-key id of the credential that performed this state-change. */
  actorId?: string | null;
  actorRole?: 'admin' | 'agent' | 'platform' | null;
  /** Owner id of the API key, one of org id (admin), agent id (agent), or platform sentinel. */
  actorOwnerId?: string;
  /** Human-readable label for the actor owner. Display PROJECTION, NOT signature-covered. */
  actorDisplayName?: string | null;
  /** Owner table discriminator; pairs with `actorOwnerId`. */
  actorOwnerType?: 'agent' | 'org' | 'platform' | null;
  /**
   * OIDC issuer URI when the request authenticated via an admin OIDC bearer.
   * NULL on API-key paths. Paired with `actorOidcSub`. The same
   * identity is signature-covered inside `predicate.on_behalf_of.oidc`; an
   * offline verifier cross-checks them via `@agledger/sdk/verify`.
   */
  actorOidcIss?: string | null;
  /** OIDC subject (stable user id at the IdP), paired with `actorOidcIss`. */
  actorOidcSub?: string | null;
  /**
   * `true` iff the engine synthesized `actorOidcIss/Sub` (admin OIDC / WIF
   * path) rather than them riding in a delegated `on_behalf_of` claim. Input
   * for the offline verifier's OIDC-actor cross-check; without it that check
   * stays `skipped_no_input`. Engine ≥ v0.26.x.
   */
  actorOidcSynthesized?: boolean;
  entryType: string;
  /**
   * Auditor-readable label for `entryType` (e.g. RECORD_STATE_CHANGE →
   * "Record state transitioned"). Display PROJECTION, NOT signature-covered;
   * the canonical machine-readable name stays in `entryType`. Replaced the
   * pre-launch `description` placeholder (engine v0.26.x+).
   */
  humanReadableLabel?: string;
  payload: Record<string, unknown>;
  /** Actor envelope surfaced from canonical payload's `_actor` key. */
  actor?: AuditActor;
  /**
   * Completion evidence body, present only when the export was fetched with
   * `?evidence=true` AND this is a COMPLETION_SUBMITTED entry.
   * UNSIGNED projection, bound to the chain by hash only: recompute SHA-256
   * over the RFC 8785 (JCS) canonicalization of this object and compare against
   * `payload.evidenceHash`. Encrypted-mode records inline the stored ciphertext
   * envelope; their `evidenceHash` is client-supplied over the cleartext.
   */
  evidence?: Record<string, unknown>;
  integrity: {
    /** sha256 of the canonical COSE_Sign1 envelope bytes (chain linkage value). */
    payloadHash: string;
    previousHash: string | null;
    /**
     * Base64-encoded canonical COSE_Sign1 (RFC 9052, tag 18, EdDSA) envelope
     * over an in-toto v1 Statement payload. Feed to `@agledger/sdk/verify` with
     * the matching `signingKeyId` public key for cryptographic verification.
     */
    coseSign1: string;
    signingKeyId: string | null;
    /** Engine-side per-entry validity at export time. Cross-checked offline. */
    valid: boolean;
    /**
     * Optional base64-encoded SCITT Receipt (COSE_Sign1 per
     * draft-ietf-cose-merkle-tree-proofs-18) for this leaf. Present only when
     * `?receipts=true` AND the engine has a `VAULT_SIGNING_KEY`. Carries the
     * per-record Merkle root signed at issuance + an RFC 9162 inclusion proof
     * at unprotected label 396.
     */
    receipt?: string;
  };
}

/**
 * Per-entry signature coverage discriminator surfaced on the export envelope.
 * A green `chainIntegrity: true` does NOT imply every entry was cryptographically
 * signed; read this to tell hash-chain-only from hash-chain-and-signatures apart.
 */
export interface AuditSignatureCoverage {
  /** Entries written by an engine with VAULT_SIGNING_KEY. */
  signed: number;
  /** Entries with signing_key_id IS NULL (engine booted without a key). */
  unsigned: number;
  total: number;
}

/** Localizes a chain-integrity failure. Null on a clean chain. */
/**
 * Why a Record's hash chain failed verification (top-level reason code).
 * The `cert_*` / `agent_signature_invalid` modes were added with OIDC
 * ephemeral-cert actor binding (API v0.25.x).
 */
export type AuditChainIntegrityReason =
  | 'chain_broken_at'
  /**
   * The record exists but its chain holds no entries. Every creation path
   * appends an entry in the same transaction as the record, so an empty chain
   * is every entry gone, not a record that was never chained. Reported rather
   * than passed as a trivially valid chain.
   */
  | 'audit_vault_empty'
  | 'audit_vault_row_missing_for_checkpoint'
  | 'checkpoint_hash_mismatch'
  | 'payload_drift'
  | 'oidc_actor_drift'
  | 'cert_actor_drift'
  | 'cert_expired'
  | 'cert_missing'
  | 'agent_signature_invalid'
  // API v1.3.2: the vault fails closed on per-entry signature
  // verification. `signature_invalid` = a COSE_Sign1 signature did not verify
  // against its resolved key; `signing_key_unknown` = the entry names a
  // signing_key_id the key registry cannot resolve; `signing_key_drift` = the
  // denormalized signing_key_id column names a different key than the
  // signature-covered kid in the entry's protected header.
  | 'signature_invalid'
  | 'signing_key_unknown'
  | 'signing_key_drift'
  /**
   * The entry is signed under a COSE algorithm this engine build cannot verify.
   * Not a tamper signal: the chain may be intact and simply need a newer
   * verifier. Check `minVerifierVersion` on the key in `/v1/verification-keys`.
   */
  | 'unsupported_algorithm'
  | null;

/** Specific failure mode inside `chainIntegrityDetail`. */
export type AuditChainFailure =
  | 'previous_hash_mismatch'
  | 'payload_hash_mismatch'
  | 'checkpoint_anchor_mismatch'
  | 'audit_vault_truncated'
  | 'payload_drift'
  | 'oidc_actor_drift'
  | 'cert_actor_drift'
  | 'cert_expired'
  | 'cert_missing'
  | 'agent_signature_invalid'
  /**
   * Per-entry signature failures. These reached `chainIntegrityDetail.failure`
   * with the v1.3.2 fail-closed verification work but were never mirrored here,
   * so the SDK narrowed the union tighter than the wire. Same meanings as on
   * {@link AuditChainIntegrityReason}.
   */
  | 'signature_invalid'
  | 'signing_key_unknown'
  | 'signing_key_drift'
  | 'unsupported_algorithm'
  | null;

export interface AuditChainIntegrityDetail {
  brokenAtPosition: number | null;
  brokenAtEntryId: string | null;
  expectedPreviousHash: string | null;
  actualPreviousHash: string | null;
  expectedPayloadHash: string | null;
  actualPayloadHash: string | null;
  failure: AuditChainFailure;
}

/** Audit export envelope returned by GET /v1/records/{id}/audit-export. */
export interface RecordAuditExport {
  /** Mirrors `exportMetadata.recordId`. */
  recordId?: string;
  /** Mirrors `exportMetadata.chainIntegrity`. */
  chainIntegrity?: boolean;
  chainIntegrityReason?: AuditChainIntegrityReason;
  chainIntegrityDetail?: AuditChainIntegrityDetail | null;
  signatureCoverage?: AuditSignatureCoverage;
  /**
   * Hash-chain + signature discriminator. `hash_chain_only` = chain valid,
   * zero entries signed (no Ed25519 verification possible).
   * `hash_chain_partial_signatures` = chain valid + subset signed (rotation or
   * mixed booting). `hash_chain_and_signatures` = chain valid AND every entry
   * signed. `invalid` = chainIntegrity is false. Auditors should NOT conclude
   * "Ed25519-verified" from chainIntegrity alone; read this.
   */
  integrityLevel?: 'hash_chain_only' | 'hash_chain_partial_signatures' | 'hash_chain_and_signatures' | 'invalid';
  /** `2.0` since the COSE_Sign1 cutover. */
  exportFormatVersion?: string;
  /** `RFC8949-CDE` since 2.0: deterministic CBOR per RFC 8949 §4.2.1. */
  canonicalization?: string;
  signingPublicKey?: string | null;
  signingPublicKeys?: Record<string, string>;
  exportMetadata: {
    recordId: string;
    orgId: string | null;
    /** Record Type. */
    type: string;
    operatingMode?: 'cleartext' | 'encrypted';
    exportDate: string;
    totalEntries: number;
    /** Latest signed checkpoint position for this Record, or null if no checkpoint has been written yet. */
    expectedEntries?: number | null;
    chainIntegrity: boolean;
    chainIntegrityReason?: AuditChainIntegrityReason;
    chainIntegrityDetail?: AuditChainIntegrityDetail | null;
    signatureCoverage?: AuditSignatureCoverage;
    integrityLevel?: 'hash_chain_only' | 'hash_chain_partial_signatures' | 'hash_chain_and_signatures' | 'invalid';
    /** `2.0` since the COSE_Sign1 cutover. */
    exportFormatVersion: string;
    /** `RFC8949-CDE` since 2.0: deterministic CBOR per RFC 8949 §4.2.1. */
    canonicalization: string;
    /** Active signing key at export time (SPKI DER base64). */
    signingPublicKey: string | null;
    /**
     * Map of keyId → SPKI DER base64 public key. Includes retired keys referenced
     * by entries in this export. Required for offline verification when keys
     * have rotated mid-trail.
     */
    signingPublicKeys?: Record<string, string>;
    /**
     * Map of keyId → activation/retirement window. Input for the offline
     * verifier's temporal key-validity check (`@agledger/sdk/verify`): an entry
     * written before its signing key's activation fails `CHAIN_KEY_NOT_YET_ACTIVE`,
     * and one written after retirement fails `CHAIN_KEY_EXPIRED`.
     * Additive since engine v0.26.x; older exports omit it and that check
     * stays `skipped_no_input`.
     */
    signingKeyWindows?: Record<string, { activatedAt: string; retiredAt: string | null }>;
  };
  entries: AuditExportEntry[];
}

/**
 * Which chain a checkpoint anchors (API v1.3.4).
 *
 * All three are the same signed-checkpoint construction over a different
 * chain. Only `record` is keyed by a real record id.
 */
export type VaultCheckpointChain = 'record' | 'schema' | 'admin';

/** A row from `GET /v1/audit-vault/checkpoints`: signed Merkle anchors. */
export interface VaultCheckpoint {
  id: string;
  /**
   * The uuid this checkpoint is keyed to. **Read `chain` before treating it
   * as a record id.** Only `chain: 'record'` rows point at a real record; on
   * `'schema'` and `'admin'` this is a derived key that resolves to no
   * record, and fetching it returns 404 by design.
   */
  recordId: string;
  /**
   * Which chain this row anchors. `record` is the per-record chain, `schema`
   * is an org's schema-registration chain (record-less), `admin` is the
   * platform-ops chain. Added in API v1.3.4; absent on older servers.
   */
  chain?: VaultCheckpointChain;
  chainPosition: number;
  /** sha256 of cose_sign1 envelope bytes. */
  payloadHash: string;
  /** Base64-encoded canonical COSE_Sign1 envelope (`vault-checkpoint` claim). */
  coseSign1: string;
  signingKeyId: string | null;
  createdAt: string;
}

/** Pagination + filter for vault checkpoints. */
export interface ListVaultCheckpointsParams {
  recordId?: string;
  cursor?: string;
  limit?: number;
}

/**
 * A page of vault checkpoints plus the sweep schedule the engine returns
 * alongside it. The schedule is what distinguishes "this install has not
 * checkpointed yet" from "checkpoints are missing", so it travels with the
 * page rather than requiring a second call.
 */
export interface VaultCheckpointPage extends Page<VaultCheckpoint> {
  checkpointing?: VaultCheckpointingSchedule;
}


/**
 * Where a SIEM stream poll starts. Pass `since` to open a walk or `cursor` to
 * continue one: exactly one of them, never both and never neither. The SDK
 * rejects either mistake before the request leaves the process, because the
 * endpoint 400s on both.
 */
export interface AuditStreamParams {
  /**
   * ISO timestamp: only events created strictly after this instant, compared at
   * microsecond resolution. Opens a walk. Omit it when resuming from `cursor`.
   */
  since?: string;
  /**
   * The previous response's {@link AuditStreamResult.cursor}, sent back
   * verbatim. Continues a walk exactly after the last row already handed over.
   *
   * Do not take this apart. It pairs a full-precision instant with a row id
   * because rows written in one transaction share a `created_at`, so a
   * time-only boundary cannot address a position inside that group and skips
   * every row sharing the newest instant.
   */
  cursor?: string;
  /** Max events to return per page (default: 100, max: 1000). */
  limit?: number;
  /** Response format: 'ocsf' (OCSF-mapped) or 'raw' (default: 'ocsf'). */
  format?: 'ocsf' | 'raw';
}

export interface AuditStreamResult {
  /** Parsed NDJSON events. Shape depends on format param. */
  events: Record<string, unknown>[];
  /**
   * Resume position after the last row on this page, as
   * `<RFC 3339 instant>_<uuid>`. Send it back verbatim as
   * {@link AuditStreamParams.cursor}. Null when the page is empty.
   */
  cursor: string | null;
  /**
   * Whether this page produced rows. On a cursor walk that is the only honest
   * local signal: a page shorter than `limit` is not the end of the stream,
   * because the Server holds back rows whose transaction has not committed.
   * A zero-row page means this poll is exhausted, not that the stream is.
   */
  hasMore: boolean;
  /**
   * Whole seconds by which this page stops short of now, because a transaction
   * open on the Server has not committed and rows stamped inside it are not yet
   * visible. `0` means the page runs up to the present; a large value means an
   * empty page is not evidence that nothing has happened. Null when the Server
   * sent no `X-AGLedger-Stream-Holdback-Seconds` header.
   */
  holdbackSeconds: number | null;
}


/**
 * Org-admin reads checkpoint (SCITT-style signed tree head). Wire fields: the
 * timestamp is `checkpointAt` (not `createdAt`) and the signed envelope is
 * `coseSign1Base64` (not `sthBytes`/`signature`).
 */
export interface OrgReadsCheckpoint {
  id: string;
  orgId: string;
  treeSize: number;
  rootHash: string;
  checkpointAt: string;
  logId?: string;
  /** Base64 of the canonical COSE_Sign1 (RFC 9052) envelope over the STH. */
  coseSign1Base64?: string;
  signingKeyId?: string | null;
  witnessSignature?: string | null;
  witnessKeyId?: string | null;
  witnessCosignedAt?: string | null;
}

/**
 * Where the org-reads sweep schedule was read from.
 *
 * Named rather than inline so enum-member parity can see it: `parseUnions`
 * reads `export type X =` declarations, so a union spelled inside an interface
 * field is invisible to the guard that exists to catch enum drift.
 */
export type OrgReadsCheckpointingSource = 'worker' | 'config' | (string & {});

/**
 * When the org-reads checkpoint sweep runs, and when it last did.
 *
 * The sweep is time-driven, so an install that has logged qualifying reads
 * still returns an empty checkpoint list until the first run. Read this before
 * reporting checkpoints as missing.
 *
 * Distinct from {@link VaultCheckpointingSchedule}, which describes the
 * `/v1/audit-vault/checkpoints` sweep and carries `anchoringEnabled`. This
 * schedule has no anchoring posture.
 */
export interface OrgReadsCheckpointingSchedule {
  /** Cron the sweep runs on, in UTC. Fixed cadence; there is no env knob. */
  cron: string;
  /** Cadence in minutes derived from `cron`. Null when the schedule is not a fixed interval. */
  intervalMinutes: number | null;
  /** ISO 8601 timestamp of the next scheduled sweep, or null. */
  nextRunAt: string | null;
  /** Newest checkpoint in the caller's org; null until the first sweep lands one. */
  lastCheckpointAt: string | null;
  /** `worker` when read from the schedule the worker registered, `config` when this process fell back to its own defaults. */
  source: OrgReadsCheckpointingSource;
}

/**
 * A page of org-reads checkpoints plus the sweep schedule the engine returns
 * alongside it. The schedule always travels with the page, so an empty `data`
 * can be read against the cadence that produced it rather than requiring a
 * second call.
 */
export interface OrgReadsCheckpointPage extends Page<OrgReadsCheckpoint> {
  checkpointing: OrgReadsCheckpointingSchedule;
}

/**
 * One entry in the org's read-transparency log: a single qualifying cross-party
 * admin read. These rows are the Merkle leaves the signed checkpoints cover, so
 * an empty listing here is what separates "no qualifying reads have happened"
 * from "the sweep has not run yet".
 */
export interface OrgAdminRead {
  id: string;
  orgId: string;
  /** Position in the Merkle tree; the listing is ordered by it, oldest first. */
  leafIndex: number;
  /** sha256 hex of the row's COSE_Sign1 bytes: the leaf the checkpoints cover. */
  leafHash: string;
  recordId: string;
  /** API key that performed the read. */
  callerKeyId: string;
  filterApplied: string;
  /** `interactive`, `scheduled-job`, or `export-batch:<uuid>`. */
  readContext: string;
  exportBatchId: string | null;
  readAt: string;
}

/** Pagination for the org-reads checkpoint listing. */
export interface ListOrgReadsCheckpointsParams {
  /** 1..200, default 50. */
  limit?: number;
  /** Offset-based paging; ignored when `cursor` is set. */
  offset?: number;
  /** `nextCursor` from the previous page, sent back with the same query parameters. */
  cursor?: string;
}

/** Pagination for the org-reads leaf listing (`GET /v1/audit/org-reads`). */
export interface ListOrgAdminReadsParams {
  /** 1..200, default 50. */
  limit?: number;
  /** Offset-based paging; ignored when `cursor` is set. */
  offset?: number;
  /** `nextCursor` from the previous page, sent back with the same query parameters. */
  cursor?: string;
}

/** Cosign payload for an org-reads checkpoint. */
export interface CosignCheckpointParams {
  /** Identifier for the witness key (verifier-supplied; e.g. fingerprint or DID). */
  witnessKeyId: string;
  /** Witness signature over the checkpoint's STH bytes. Format/algorithm is the customer's choice. */
  witnessSignature: string;
}

/**
 * Inclusion-proof response for a leaf within an org-reads checkpoint. Wire
 * fields: the audit path array is `path` (not `proof`); there is no
 * `checkpointId` on the response.
 */
export interface OrgReadsInclusionProof {
  leafIndex: number;
  leafHash: string;
  treeSize?: number;
  /** Sibling hashes from leaf up to the signed root. */
  path: string[];
  rootHash: string;
}

/**
 * SCITT Transparency Service configuration document
 * (`GET /.well-known/scitt-configuration`, unauthenticated). Mirrors the
 * SCRAPI discovery shape: endpoints and supported algorithms/policies.
 */
export interface ScittConfiguration {
  issuer?: string;
  registration_endpoint: string;
  resolution_endpoint: string;
  checkpoint_endpoint?: string;
  jwks_uri: string;
  supported_signature_algorithms: string[];
  supported_registration_policies: string[];
  llms_txt?: string;
}

/**
 * A signed checkpoint (tree head) for the org's SCITT transparency log
 * (`GET /v1/scitt/checkpoint`). The signature covers the canonical
 * signature-input string, which is prefixed by `logId`.
 */
export interface ScittCheckpoint {
  treeSize: number;
  rootHex: string;
  logId: string;
  iat: number;
  kid: string;
  signature: string;
}


/** Vault scan job request body for `POST /v1/admin/vault/scan`. */
export interface StartVaultScanParams {
  /** Optional list of Record IDs to scan. Omit to scan all Records. */
  recordIds?: string[];
  /** Convenience: scan a single Record. Merged into recordIds if both are given. */
  recordId?: string;
}

/** Vault anchor verify request body. */
export interface VerifyVaultAnchorsParams {
  recordId: string;
  /** Specific chain position to verify (omit for latest 10). */
  chainPosition?: number;
}


/** Backfill source entry for `POST /v1/admin/records/import`. */
export interface BackfillRecord {
  principalAgentId: string;
  performerAgentId?: string | null;
  type: string;
  /**
   * Publisher label pinning which registration of `type` this item binds to.
   * Only needed when two publishers offer the same type in the org; that case
   * returns 422 `/problems/ambiguous-publisher` with the candidate list rather
   * than picking one, exactly as `POST /v1/records` does. The imported Record
   * binds to the registration named here, so it reads back with that
   * `publisher` and a `schemaUrl` scoped to it.
   */
  publisher?: string;
  contractVersion?: string;
  platform: string;
  platformRef?: string | null;
  criteria: Record<string, unknown>;
  /** Terminal status from the historical system. */
  terminalStatus:
    | 'FULFILLED'
    | 'REMEDIATED'
    | 'REJECTED'
    | 'RECORDED'
    | 'EXPIRED'
    | 'CANCELLED'
    | 'FAILED'
    | (string & {});
  createdAt: string;
  activatedAt?: string;
  /** Required when terminalStatus = 'FULFILLED'. */
  fulfilledAt?: string;
  metadata?: Record<string, unknown> | null;
}

export interface AdminImportRecordsParams {
  orgId: string;
  /** Free-form label identifying the source system. Recorded in every imported vault entry. */
  source: string;
  /** Up to 100 entries per batch. */
  records: BackfillRecord[];
}

/** One imported row, aligned 1:1 with the request `records[]`. */
export interface BackfillImportedRecord {
  /** Position in the request `records[]` array. */
  index: number;
  recordId: string;
  /** Vault chain position of the `BACKFILL_IMPORT` entry. */
  chainPosition: number;
}

export interface AdminImportRecordsResult {
  /** Source label that was recorded in vault entries. */
  source: string;
  /** Number of Records imported. */
  count: number;
  /** One entry per imported Record, in request order. */
  imported: BackfillImportedRecord[];
  /** Suggested next API calls (e.g. spot-check audit export of the first imported Record). */
  nextSteps?: NextStep[];
}

/** Query parameters for `GET /v1/admin/records`. */
export interface QueryAdminRecordsParams extends ListParams {
  orgId?: string;
  status?: string;
  type?: string;
  agentId?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  from?: string;
  to?: string;
}


export type { ApiKeyRole, KeyOwnerType } from './scopes.js';
import type { ApiKeyRole, KeyOwnerType } from './scopes.js';

export interface AccountProfile {
  apiKeyId: string;
  role: ApiKeyRole;
  /**
   * Owner of the key. When `ownerType === 'agent'` this IS the agent id; when
   * it is `'org'` this is the org id. There is no separate `agentId` field:
   * one was declared here through 1.7.0 and `/v1/auth/me` has never returned
   * it, so reading it always yielded `undefined`.
   */
  ownerId: string;
  ownerType: KeyOwnerType | (string & {});
  scopes: string[] | null;
  /** Org ID the key is scoped to, if any. */
  orgId?: string | null;
  name?: string | null;
  createdAt?: string | null;
  /** Expiry of this credential, or `null` when it does not expire. */
  expiresAt?: string | null;
  /** IP allowlist enforced on this key, or `null` when the key is unrestricted. */
  allowedIps?: string[] | null;
  /**
   * Credential class for this session. `ephemeral_cert` = OIDC-bound
   * short-lived signing cert (Mode 2); `oidc` = direct OIDC bearer (admin
   * Mode 1); `api_key` = long-lived `agl_` key.
   */
  authType?: 'api_key' | 'ephemeral_cert' | 'oidc';
  /** Present (non-null) only for `ephemeral_cert` sessions: the bound short-lived signing cert. */
  cert?: { id: string; thumbprint: string; expiresAt: string } | null;
  /** Present (non-null) for OIDC-bound sessions: the upstream IdP identity that minted the credential. */
  oidc?: { iss: string; sub: string } | null;
}


export interface HealthResponse {
  status: string;
  version?: string;
  /**
   * @deprecated `GET /health` declares only `status`, `version` and
   * `timestamp`, and the Server strips anything its response schema does not
   * declare, so this never arrives. Kept so callers compile. Process uptime is
   * on {@link SystemHealth.uptime} (`GET /v1/admin/system-health`).
   */
  uptime?: number;
  /**
   * @deprecated Never served: see {@link HealthResponse.uptime}. Database state
   * is {@link SystemHealth.database}, and it is an object, not a string.
   */
  database?: string;
  timestamp: string;
}

export interface StatusComponent {
  name: string;
  status: string;
  latencyMs?: number;
}

export interface StatusResponse {
  status: 'operational' | 'degraded' | 'maintenance' | 'outage' | (string & {});
  components: StatusComponent[];
  activeIncidents: Array<Record<string, unknown>>;
  uptime: number;
  timestamp: string;
}

export interface ConformanceResponse {
  /**
   * Feature capability flags: which features are wired on this install.
   * The set grows as the engine gains capabilities; read flags defensively
   * via the open-ended index signature rather than assuming a fixed shape.
   */
  capabilities?: {
    recordLifecycle?: boolean;
    twoPhaseGate?: boolean;
    auditVault?: boolean;
    hashChainIntegrity?: boolean;
    ed25519Signatures?: boolean;
    /**
     * Signature algorithms this build can sign chain envelopes with, e.g.
     * `['Ed25519']`. The engine derives `ed25519Signatures` from this same
     * registry, so the two cannot disagree. A non-default algorithm also
     * requires the server's boot-time opt-in; per-key algorithm resolution
     * for verification lives on `GET /v1/verification-keys`.
     */
    signingAlgorithms?: string[];
    delegationChains?: boolean;
    cascadingGate?: boolean;
    disputeResolution?: boolean;
    /**
     * `GET /v1/agents/{agentId}/drift` and `GET /v1/agents/drift`: what each
     * agent did in the current window against the window before it. A change
     * is the signal; there is no score.
     */
    agentDrift?: boolean;
    webhookDelivery?: boolean;
    a2aProtocol?: boolean;
    encryptedMode?: boolean;
    euAiActCompliance?: boolean;
    scittRegistration?: boolean;
    signedStatementExport?: boolean;
    sigstoreBundleExport?: boolean;
    coseMerkleReceipts?: boolean;
    oidcWorkloadIdentity?: boolean;
    ephemeralCerts?: boolean;
    trustedIssuers?: boolean;
    agentSignatureCoSign?: boolean;
    [key: string]: boolean | string[] | undefined;
  };
  /** Number of registered contract types in this org. */
  contractTypes?: number;
  /** URL to list all type schemas (criteria + evidence structure). */
  schemasUrl?: string;
  /** Supported settlement signal types (e.g. SETTLE, HOLD, RELEASE). */
  settlementSignals?: string[];
  /**
   * The numeric caps this install enforces. Read these rather than hardcoding:
   * several are org-configurable, so the value here is what THIS Server will
   * actually accept.
   */
  limits?: {
    /** Serialized UTF-8 criteria byte cap, org default. */
    criteriaMaxBytesDefault?: number;
    /** Max `references` entries in one attach call. */
    referencesMaxPerRequest?: number;
    /** Cumulative per-Record references cap, org default. */
    referencesMaxPerRecordDefault?: number;
    /** Max keys on a single reference's `attributes` object. */
    referenceAttributesMaxKeys?: number;
    /** Max top-level keys on Record `metadata`. */
    metadataMaxProperties?: number;
    /** Transport cap on the whole `POST /v1/records` body. */
    recordBodyMaxBytes?: number;
    /** Delegation chain depth cap, org default. */
    delegationMaxDepthDefault?: number;
    /** Absolute delegation depth ceiling; the per-org cap cannot exceed it. */
    delegationMaxDepthCeiling?: number;
    /** Shortest `cursor` every paginated route accepts. Tokens are opaque:
     *  round-trip `nextCursor` verbatim with the same query parameters. */
    cursorMaxLength?: number;
    /** A `?limit=` up to this value is accepted on every paginated listing.
     *  Some admin and compliance listings accept more; each route's own
     *  OpenAPI `maximum` is authoritative. */
    paginationLimitMax?: number;
    /** Cursor cap for `GET /v1/records/search`, wider than the shared one
     *  because that route binds its full filter set into the token. Size
     *  cursor storage to this value; no route mints a longer token. */
    searchCursorMaxLength?: number;
    [key: string]: number | undefined;
  };
  /** AGLedger API version. */
  version?: string;
}


export interface AdminOrg {
  id: string;
  /** Display name (called `name` in the API). */
  name: string;
  recordCount?: number;
  createdAt: string;
  /**
   * When this account was deactivated, or null while it is active. A
   * deactivated account refuses every credential bound to it and cannot be
   * issued a new one; clear it with {@link AdminResource.reactivateOrg}.
   */
  deactivatedAt?: string | null;
  /**
   * `provisioning` while this row is reconciled from the provisioning
   * directory, null otherwise. A provisioning-managed row refuses deactivate
   * and reactivate with 409: remove it from the YAML and reload instead.
   */
  managedBy?: 'provisioning' | null;
  /** Suggested next API calls after org creation. */
  nextSteps?: NextStep[];
}

export interface AdminAgent {
  id: string;
  displayName: string | null;
  agentCardUrl?: string | null;
  recordCount?: number;
  createdAt: string;
  /**
   * When this account was deactivated, or null while it is active. A
   * deactivated account refuses every credential bound to it and cannot be
   * issued a new one; clear it with {@link AdminResource.reactivateAgent}.
   */
  deactivatedAt?: string | null;
  /**
   * `provisioning` while this row is reconciled from the provisioning
   * directory, null otherwise. A provisioning-managed row refuses deactivate
   * and reactivate with 409: remove it from the YAML and reload instead.
   */
  managedBy?: 'provisioning' | null;
  /** Suggested next API calls after agent creation. */
  nextSteps?: NextStep[];
}

/**
 * Parameters for creating a new org via admin endpoint.
 * @example
 * ```ts
 * const org = await client.admin.createOrg({ name: 'Acme Corp' });
 * console.log(org.id);
 * ```
 */
export interface CreateOrgParams {
  /** Legal or internal name for the org. */
  name: string;
  /** Customer-facing display name. */
  displayName: string;
  /** Initial configuration object. */
  config?: Record<string, unknown>;
}

/**
 * Parameters for creating a new agent via admin endpoint.
 */
export interface CreateAgentParams {
  /** Org ID the agent belongs to. */
  orgId: string;
  /** The agent's name, unique within the org. */
  displayName: string;
  /** A2A agent card URL for verification. */
  agentCardUrl?: string;
  /**
   * Issuer URL of the external identity this agent answers to, matching a
   * registered trusted issuer. Set with `oidcSub` or not at all. With both
   * set, `POST /v1/auth/oidc/cert` resolves this agent from a token carrying
   * that issuer and subject.
   */
  oidcIss?: string;
  /**
   * Subject claim of the external identity, verbatim as the IdP issues it:
   * the object id of an Azure managed identity, `system:serviceaccount:<ns>:<name>`
   * for a Kubernetes service-account token, the SPIFFE ID of a workload.
   * Unique per (org, issuer).
   */
  oidcSub?: string;
}

/** How an enforcement rule is applied: skip it, warn on it, or block on it. */
export type EnforcementMode = 'none' | 'advisory' | 'enforced';

/** Whether a resolved enforcement value came from the org or from the engine default. */
export type EnforcementSource = 'org' | 'default';

/**
 * The enforcement knobs, fully resolved. Every field is present: read
 * {@link OrgConfig.enforcementSource} to tell an org override from an engine
 * default, and {@link OrgConfig.config}`.enforcement` for the overrides alone.
 */
export interface EnforcementSettings {
  /** Default constraint inheritance mode for new delegated Records. Default: `none`. */
  constraintInheritanceDefault: ConstraintInheritanceMode;
  /** Maximum delegation chain depth (1-10). Default: 5. */
  maxDelegationDepth: number;
  /** Maximum criteria payload size in bytes (1024-65536). Default: 10240. */
  criteriaSizeLimitBytes: number;
  /** When true, enforcement violations log warnings instead of blocking. Default: false. */
  advisoryMode: boolean;
  /** How tolerance-based gate rules are enforced. Default: `enforced`. */
  toleranceEnforcement: EnforcementMode;
  /** How deadline checks are enforced. Default: `enforced`. */
  deadlineEnforcement: EnforcementMode;
  /** How schema validation is enforced for criteria and completion evidence. Default: `enforced`. */
  schemaValidation: EnforcementMode;
  /** How the `maxSubmissions` completion cap is enforced. Default: `enforced`. */
  maxSubmissionsMode: EnforcementMode;
  /**
   * Revision cap stamped onto a Record at create when the create body sends no
   * `maxRevisions` (1-20). Default: 3. A change applies to Records created
   * afterwards; existing Records keep the cap they were stamped with.
   */
  defaultMaxRevisions: number;
  /** How expression-based custom gate rules are enforced. Default: `enforced`. */
  expressionRuleMode: EnforcementMode;
  /** Maximum custom types this org can register (10-10000). Default: 50. */
  maxContractTypes: number;
  /** Maximum versions per type (1-1000). Default: 100. */
  maxVersionsPerType: number;
  /** Maximum `fieldMappings` on one type (1-200). Default: 50. */
  maxFieldMappingsPerType: number;
  /** Maximum tolerance entries on one Record (1-500). Default: 50. */
  maxToleranceEntriesPerRecord: number;
  /** Maximum active webhook subscriptions per org (1-1000). Default: 50. */
  maxWebhookSubscriptions: number;
  /** Maximum external references per Record (5-200). Default: 50. */
  maxRecordReferences: number;
  /** Maximum external references per agent (5-100). Default: 25. */
  maxAgentReferences: number;
  /** Maximum active API keys per owner, org or agent (5-100). Default: 25. */
  maxApiKeysPerOwner: number;
  /** Whether a Record may carry per-field `enforcementOverrides`. Overrides can only relax, never tighten. Default: false. */
  allowRecordOverrides: boolean;
}

/**
 * Automatic re-check run once when a dispute is opened. Absent or null means no
 * re-check runs and the dispute waits at `PENDING_RESOLUTION`. When set, the
 * type's gate rules are re-run with the widening below and a PASS resolves the
 * dispute `OVERTURNED` with a reporter of `system`. Only applies to Records in
 * `auto` gate mode whose type declares rules to re-run.
 */
export interface AutoReadjudicateConfig {
  /** Multiplier applied to every numeric tolerance band on the re-run (1-3). 1 re-runs at the original bands. */
  toleranceExpansion: number;
  /** Grace added to deadline checks on the re-run, in seconds (0-86400). */
  deadlineGraceSeconds: number;
}

/** Dispute handling for an org. */
export interface DisputesConfig {
  autoReadjudicate?: AutoReadjudicateConfig | null;
}

/**
 * The org config document: only what an operator explicitly set. A key absent
 * here is a key running on its engine default. Read {@link OrgConfig.enforcement}
 * for the values actually in force.
 */
export interface OrgConfigDocument {
  enforcement?: Partial<EnforcementSettings>;
  disputes?: DisputesConfig;
  /** Approved supplier IDs for the `supplier_approved` gate rule. */
  approvedSuppliers?: string[];
}

/** Org configuration payload. */
export interface OrgConfig {
  id?: string;
  /** What the operator explicitly stored, not what is in force. */
  config?: OrgConfigDocument;
  /** The enforcement values actually in force, org overrides resolved over engine defaults. */
  enforcement?: EnforcementSettings;
  /** Per field, whether the resolved value came from the org or from the engine default. */
  enforcementSource?: Record<keyof EnforcementSettings, EnforcementSource>;
  /** The engine defaults, which is where a cleared override lands. */
  enforcementDefaults?: EnforcementSettings;
  nextSteps?: NextStep[];
  [key: string]: unknown;
}

/**
 * Parameters for merge-updating org configuration (PATCH semantics).
 *
 * Only provided fields are updated, key by key: a key you omit keeps whatever
 * it had. Send a key as `null` to drop that override and return the key to its
 * engine default, or send a whole block as `null` to drop every override in it
 * at once.
 */
export interface SetOrgConfigParams {
  enforcement?: { [K in keyof EnforcementSettings]?: EnforcementSettings[K] | null } | null;
  disputes?: DisputesConfig | null;
  /**
   * Replaced wholesale by the array you send; `null` removes the list, which is
   * how the allow-list goes back to unset.
   */
  approvedSuppliers?: string[] | null;
}

/** Parameters for listing webhooks with optional URL filter. */
export interface ListWebhooksParams extends ListParams {
  /** Filter webhooks by exact URL match. */
  url?: string;
}

/**
 * Parameters for `GET /v1/admin/api-keys`, which serves two listings.
 *
 * Passing `ownerId` selects single-owner mode; omitting it lists every key on
 * the install (platform keys only). The remaining filters apply to cross-owner
 * mode. Both modes page, and both cap at `limit` (default 200), so a caller
 * that reads `data` and stops on a large install is reading a partial listing:
 * check `hasMore`, or use {@link AdminResource.listAllApiKeys}.
 *
 * A `cursor` minted under `ownerId` carries that owner, and replaying it
 * without the same `ownerId` is a `400` naming the owner to put back rather
 * than a silent slide into the install-wide listing at the same offset. Send
 * the cursor back alongside the same filters that produced it.
 */
export interface ListApiKeysParams extends ListParams {
  /** List one owner's keys. Omit for cross-owner mode (platform keys only). */
  ownerId?: string;
  /** Cross-owner filter: only keys whose owning org matches. */
  orgId?: string;
  /** Cross-owner filter. */
  ownerType?: KeyOwnerType;
  /** Cross-owner filter. */
  role?: ApiKeyRole;
  /** Cross-owner filter: true = active, false = revoked or disabled. */
  isActive?: boolean;
  /** Cross-owner filter: keys created strictly before this ISO-8601 timestamp. */
  createdBefore?: string;
  /**
   * Cross-owner filter: keys whose expiry falls strictly before this ISO-8601
   * timestamp. The rotation queue. Keys with no expiry are NOT matched; ask
   * for those with `neverExpires: true`.
   */
  expiresBefore?: string;
  /**
   * Cross-owner filter: `true` returns only keys with no expiry, `false` only
   * keys that have one. The inventory an install adopting a key lifetime cap
   * needs, since the cap bounds what is minted from then on, not what exists.
   */
  neverExpires?: boolean;
}

export interface AdminApiKey {
  id: string;
  /** API key role: admin, agent, or platform. */
  role?: ApiKeyRole | (string & {});
  ownerId: string;
  ownerType: KeyOwnerType;
  /** Whether the key is active. */
  isActive: boolean;
  /** Human-readable label. */
  label?: string | null;
  /** API key scopes. Null = full access for the role. */
  scopes?: string[] | null;
  /** Scope profile name if created with a profile. */
  scopeProfile?: string | null;
  /** Environment: live or test. */
  environment?: string;
  /** Rate limit tier. */
  rateLimitTier?: string;
  /** Key prefix (agl_adm_, agl_agt_, agl_plt_). */
  prefix?: string;
  createdAt: string;
  lastUsedAt?: string;
  expiresAt?: string | null;
  /** Key that created this key. */
  createdByKeyId?: string | null;
  /** Scheduled deactivation time. */
  deactivatesAt?: string | null;
}

export interface CreateApiKeyParams {
  /** Role for the key: admin, agent, or platform. */
  role: ApiKeyRole;
  ownerId: string;
  /** Owner class. An admin key is owned by an org: `role: 'admin'` + `ownerType: 'org'`. */
  ownerType: KeyOwnerType;
  /** Human-readable label. */
  label?: string;
  /** Explicit scopes to set on the key. */
  scopes?: string[];
  /** Convenience profile name: expands to a predefined scope array. Takes precedence over `scopes`. */
  scopeProfile?: string;
  /** Optional expiration date (ISO 8601). */
  expiresAt?: string;
  /** Environment: live or test. Default: live. */
  environment?: 'live' | 'test';
  /** IP allowlist. Null = any IP. */
  allowedIps?: string[];
}

/**
 * Parameters for PATCH /v1/admin/api-keys/{keyId}. Only status and scopes are
 * mutable; `label`, `expiresAt`, and `allowedIps` are settable only at create
 * time (the API rejects them here: `additionalProperties: false`).
 */
export interface UpdateApiKeyParams {
  isActive?: boolean;
  /** Audit note recorded with the change. */
  reason?: string;
  scopes?: string[] | null;
  scopeProfile?: string | null;
}

/** Result of creating an API key via the admin endpoint. */
export interface CreateApiKeyResult {
  /** The raw key string: show once, then discard. Prefix matches role (agl_adm_, agl_agt_, agl_plt_). */
  apiKey: string;
  keyId: string;
  scopes: string[] | null;
  scopeProfile: string | null;
}

export interface WebhookDlqEntry {
  id: string;
  webhookId: string;
  event: string;
  payload: Record<string, unknown>;
  failureReason: string;
  attemptCount: number;
  createdAt: string;
}

/** Per-queue pg-boss job counts, as reported by the admin ops surfaces. */
export interface QueueCounts {
  waiting: number;
  active: number;
  delayed: number;
  failed: number;
}

/** Response of `GET /v1/admin/system-health`. */
export interface SystemHealth {
  /**
   * `degraded` when the database cannot serve, or when anything is dead-lettered
   * (a pg-boss `*-dlq` queue holding work, or rows in the webhook dead-letter
   * table). Failure counts on live queues deliberately do not move it: those are
   * retries still in flight. Read {@link SystemHealth.degradedReasons} for what
   * moved it rather than fanning out across the drill-down endpoints.
   */
  status: 'healthy' | 'degraded' | (string & {});
  /** One entry per condition making `status` degraded; empty when healthy. */
  degradedReasons: string[];
  /** Process uptime in seconds. */
  uptime: number;
  database: {
    status: 'healthy' | 'degraded' | (string & {});
    /** `SELECT 1` round-trip latency in ms. */
    latencyMs: number | null;
    pool: {
      /** Total connections in the pool. */
      total: number;
      /** Idle connections available. */
      idle: number;
      /** Queued connection requests. */
      waiting: number;
    };
  };
  /** Job counts for every queue the product runs, keyed by queue name. */
  queues: Record<string, QueueCounts>;
  /**
   * Deliveries parked in the webhook dead-letter table. Not an entry in
   * {@link SystemHealth.queues} because it is not a queue: a permanently failed
   * delivery (SSRF refusal, 410, 4xx, an undecryptable secret) never reaches the
   * pg-boss dead-letter queue, so that queue reads ~0 whatever is parked.
   * Non-zero degrades `status`; recover from `GET /v1/admin/webhook-dlq`.
   */
  webhookDeadLetters: number;
  process: {
    /** Resident set size in MB. */
    rssMb: number;
    /** V8 heap used in MB. */
    heapUsedMb: number;
    /** V8 heap total in MB. */
    heapTotalMb: number;
  };
  timestamp: string;
}

export interface DeactivateOrgParams {
  reason?: string;
}

export interface DeactivateAgentParams {
  reason?: string;
}

/** Result of deactivating an org or an agent. */
export interface DeactivateResult {
  id: string;
  accountType: string;
  /** Number of API keys revoked alongside the account. */
  keysRevoked: number;
  nextSteps?: NextStep[];
}

export interface ReactivateParams {
  reason?: string;
}

/** Result of reactivating an org or an agent. */
export interface ReactivateResult {
  id: string;
  accountType: string;
  /**
   * False when the account was already active, which is a no-op rather than
   * an error: an operator running it twice during an incident wants the
   * account on.
   */
  wasDeactivated: boolean;
  /** When it had been deactivated, or null when it was already active. */
  deactivatedAt: string | null;
  /**
   * Suggested actions after reactivation. Minting a replacement key comes
   * first: reactivation does not restore the revoked ones.
   */
  nextSteps?: NextStep[];
}

export interface SetCapabilitiesParams {
  contractTypes: string[];
}

/** Snapshot of an owner's rate-limit exemption. */
export interface RateLimitExemption {
  ownerId: string;
  ownerType?: KeyOwnerType | (string & {});
  reason?: string | null;
  createdAt?: string;
}

/** Static-provisioning status payload. */
export interface ProvisioningStatus {
  /** False when no provisioning directory is configured; the counters are then zero. */
  configured: boolean;
  configPath?: string;
  /** Reloads report what would change and write nothing. */
  dryRun?: boolean;
  /** Whether a reload removes rows absent from the YAML. */
  prune?: boolean;
  lastReloadAt?: string | null;
  /** Rows currently reconciled from the directory, by resource. */
  managed?: {
    orgs?: number;
    agents?: number;
    webhooks?: number;
    schemas?: number;
  };
  /**
   * Files in the provisioning directory that cannot be loaded right now, one
   * entry per failure, empty when the directory is clean. A file that fails to
   * parse is skipped whole and its resources are silently absent while the
   * rest of the reconcile succeeds and the Server boots healthy, so a
   * non-empty list here is the only signal that config-as-code is partially
   * applied. Re-read from disk on each call.
   */
  loadErrors?: string[];
  /**
   * True when a reload right now would skip pruning entirely: `prune` is on
   * AND `loadErrors` is non-empty. Prune reads "absent from the YAML" as "the
   * operator removed it", which is only sound when the YAML was understood.
   */
  pruneSuppressed?: boolean;
}

/** Per-resource counters from a provisioning reload. */
export interface ProvisioningReloadCounts {
  created: number;
  updated: number;
  pruned: number;
  createdNames?: string[];
  updatedNames?: string[];
  prunedNames?: string[];
}

/** One `api_keys` row a provisioning reload created. */
export interface ProvisioningGeneratedKey {
  ownerName?: string;
  ownerType?: string;
  label?: string;
  /** `api_keys.id`. Pass it to {@link AdminResource.updateApiKey} to disable the key. */
  keyId?: string;
  /**
   * Where the key material came from: `generated` if the Server minted it,
   * `supplied` if the provisioning YAML carried an `apiKey`.
   */
  source?: 'generated' | 'supplied';
  /**
   * One-shot plaintext readout, present on `source: 'generated'` only and
   * only in this response: it is never logged and cannot be retrieved later.
   */
  apiKey?: string;
}

/** Result of `POST /v1/admin/provisioning/reload`. */
export interface ProvisioningReloadResult {
  orgs?: ProvisioningReloadCounts;
  agents?: ProvisioningReloadCounts;
  webhooks?: ProvisioningReloadCounts;
  schemas?: ProvisioningReloadCounts;
  apiKeys?: {
    created?: number;
    skipped?: number;
    /**
     * One entry per key row this reconcile created. Capture any `apiKey` here
     * or disable the key: the plaintext exists nowhere else.
     */
    generated?: ProvisioningGeneratedKey[];
  };
  errors?: Array<{ resource?: string; name?: string; error?: string }>;
  trustedIssuers?: {
    /** False when the directory has no trusted_issuers file. */
    configured?: boolean;
    filePath?: string;
    total?: number;
    inserted?: number;
    updated?: number;
    deleted?: number;
    skipped?: {
      /** Rows left alone because an admin created them outside provisioning. */
      admin_managed?: number;
      malformed_yaml?: number;
    };
    errors?: unknown[];
  };
  loadedAt?: string;
  dryRun?: boolean;
  nextSteps?: NextStep[];
}

/** Diagnostic support-bundle payload (JSON envelope). */
export interface SupportBundle {
  instanceId: string;
  generatedAt: string;
  sections: Record<string, unknown>;
}

/** License instance identifier response. */
export interface LicenseInstanceInfo {
  instanceId: string;
  createdAt?: string;
}

/** One entry in the scope-profiles discovery response. */
export interface ScopeProfileInfo {
  name: string;
  description: string;
  allowedRoles: Array<ApiKeyRole | (string & {})>;
  scopes: string[];
}

/** Record lifecycle discovery response (`GET /lifecycle`). */
export interface RecordLifecycleInfo {
  statuses: string[];
  transitions: Record<string, string[]>;
  terminalStatuses: string[];
}

/** Query parameters for the platform-wide audit vault export. */
export interface AuditVaultExportParams {
  /** Include entries created at or after this ISO 8601 timestamp. */
  from?: string;
  /** Include entries created before this ISO 8601 timestamp. */
  to?: string;
  /** Filter to one Record's entries. */
  recordId?: string;
  /** Filter to entries whose Record names this agent as performer or principal. */
  agentId?: string;
  format?: 'json' | 'ndjson';
  /** Opaque pagination cursor from the previous response. */
  cursor?: string;
  limit?: number;
}


export interface AgentCard {
  name: string;
  description?: string;
  url: string;
  capabilities?: Record<string, unknown>;
  authentication?: Record<string, unknown>;
  skills?: Array<{
    id: string;
    name: string;
    description?: string;
  }>;
}

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
  id?: string | number;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
  id?: string | number;
}


/**
 * RFC 9457 problem-details response shape returned by the API on every error
 * (`application/problem+json`). The SDK tolerates absent fields; only `error`
 * and `message` are practically guaranteed.
 */
export interface ApiErrorResponse {
  // RFC 9457 standard fields
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;

  // AGLedger extension fields
  /** Machine-readable error code (e.g., NOT_FOUND, VALIDATION_ERROR, FORBIDDEN). */
  error?: string;
  /** Human-readable error description. */
  message?: string;
  /** Unique request identifier for support correlation. */
  requestId?: string;
  /** Stable code alias: some endpoints set `code`, others set `error`; SDK normalizes. */
  code?: string;
  /** Whether the client should retry this request. */
  retryable?: boolean;
  /** Seconds to wait before retrying. Present on 429 bodies; the SDK also
   *  reads it into {@link RateLimitError.retryAfter} when the header is absent. */
  retryAfterSeconds?: number;
  /** Validation error details (present on 400/422). */
  details?: ValidationErrorDetail[] | Record<string, unknown> | unknown[] | null;
  /** Structured validation errors (RFC 9457 extension, present on 400). */
  errors?: Record<string, unknown>[] | null;
  /** Suggested correction when a typo is detected. */
  suggestion?: string;
  /**
   * Documentation link.
   *
   * @deprecated No route emits this. The engine's ErrorResponse schema has no
   * `docUrl` property, so Fastify strips it from every serialized body and the
   * field is always `undefined`. Read `docs` instead. Kept only so existing
   * callers still compile.
   */
  docUrl?: string;
  /**
   * Pointer to the discovery-document section describing the failed scheme,
   * e.g. `"/llms.txt (Federation Signing Scheme section)"`. Paired with
   * `signInputTemplate` and `hint` on the federation 401.
   */
  docs?: string;
  /** Machine-readable recovery guidance pointing to relevant endpoints. */
  recoveryHint?: string;
  /** Concrete GET URL the agent should re-fetch (set on 422 INVALID_ACTION when the path includes a Record id). */
  refreshUrl?: string;
  /** Permission scopes the key is missing on 403. */
  missingScopes?: string[];
  /** License features missing for the current tier. */
  missingFeatures?: string[];
  /** Current license tier. */
  currentTier?: string;
  /** Required tier for the missing features. */
  requiredTier?: string;
  /** Guided next actions for AI agents. */
  nextSteps?: NextStep[];
  /** State details for 422 INVALID_ACTION. */
  currentState?: string;
  attemptedAction?: string;
  attemptedTransition?: string;
  validTransitions?: string[];
  allowedActions?: string[];
  /** Permitted enum values when a field failed an enum constraint or "no such X" lookup. */
  allowedValues?: unknown[];
  /** Role/actor labels permitted for this action. */
  allowedActors?: string[];
  /** Reason code for 409 conflicts. */
  reason?: string;
  /**
   * The Record deadline that had already passed when the request was refused,
   * on the system TIME_OUT 422 (API v1.3.2). Pairs with `terminalReason` /
   * `previousStatus` on the terminalize envelope.
   */
  deadline?: string;
  /** Schema/field hints for 400 record/completion creation errors. */
  hint?: string;
  requiredFields?: string[];
  optionalFields?: string[];
  examplePayload?: Record<string, unknown>;
  schemaUrl?: string;
  recordType?: string;
  /** Schema validation errors. */
  validationErrors?: Record<string, unknown>[];
  constraintViolations?: Record<string, unknown>[];
  constraint?: string;
  /** Expected JSON type or value, paired with `received` on validation errors. */
  expected?: string;

  /**
   * Candidate publisher labels on a 422 `/problems/ambiguous-publisher`.
   * Emitted by `/v1/schemas/{type}` reads and writes (pin with the `publisher`
   * option) and by Record creation (pin with `publisher` in the body).
   */
  publishers?: string[];
  /**
   * Registry version slot a schema conflict is on: the integer MAJOR component
   * of `manifest.version`. Emitted on a `CONFLICTING_VERSION` 409.
   */
  registryVersion?: number;
  /**
   * Records written against the exact registration a refused
   * `schemas.delete()` would have removed. Paired with
   * `unattributableRecords` on the delete precondition.
   */
  pinnedRecords?: number;
  /**
   * Records of this type carrying no registration pin, so they block a delete
   * under any publisher label. A non-zero count here blocks the delete even
   * when `pinnedRecords` is 0.
   */
  unattributableRecords?: number;
  /** Publisher label on the conflicting schema row. */
  publisher?: string;
  /** Manifest version string on the conflicting schema row. */
  version?: string;
  /** `sha256:<hex>` digest of the manifest already registered at this (publisher, type, version). */
  existingDigest?: string;
  /** `sha256:<hex>` digest of the manifest the caller just submitted. */
  incomingDigest?: string;
  /** `sha256:<hex>` digest the receiver holds for the same (publisher, type, version, org). */
  localDigest?: string;
  /** `sha256:<hex>` digest the federation peer claimed in `schemaRef.manifestDigest`. */
  peerDigest?: string;

  /** Display status of the Record when the request was refused. */
  currentStatus?: string;
  /** Display statuses from which a dispute is accepted. Poll until the Record reaches one, then retry. */
  disputeableWhen?: string[];
  /** Disputes already filed against this Record (open + terminal), when the cap is hit. */
  disputeCount?: number;
  /** Maximum disputes allowed on this Record. Pairs with `disputeCount`. */
  maxDisputes?: number;
  /** The currently-open dispute, or null once all prior disputes terminalized. */
  openDisputeId?: string | null;
  /** Revisions consumed when OVERFLOW_REJECT fired. */
  revisionCount?: number;
  /** Configured `maxRevisions` cap on the Record. */
  maxRevisions?: number;
  /** Machine-readable label naming the system action that terminalized the Record (e.g. OVERFLOW_REJECT, TIME_OUT). */
  terminalReason?: string;
  /** Display status immediately before the terminal transition. */
  previousStatus?: string;
  /** State the caller asked the resource to move to, on a federation terminal-conflict 422. */
  attemptedState?: string;
  /** The parent Record that rejected a delegation attempt. */
  parentRecordId?: string;

  /** The background job this request was refused in favour of. Present on 409 VAULT_SCAN_IN_FLIGHT. */
  jobId?: string;
  /** Byte template the proof-of-possession signature must cover. Present on the federation 401. */
  signInputTemplate?: string;
  /** Replacement path for an endpoint retired in a migration. Present on some 404s. */
  migratedTo?: string;
}

export interface ValidationErrorDetail {
  field: string;
  message: string;
  constraint?: string;
  expected?: unknown;
  actual?: unknown;
}


/** Reason for revoking a peer. */
export type RevocationReason = 'key_compromise' | 'decommission' | 'administrative';

/** Principal verdict relayed for federated Records. */
export type FederationVerdict = 'accept' | 'reject';

/** Settlement signal type relayed between peers. */
export type FederationSettlementSignal = 'SETTLE' | 'HOLD' | 'RELEASE';

/**
 * Locally-held Schema Catalog manifest identity for a federated artifact
 * (Schema Catalog rev 6 §5.1). Relayed on federation requests so the peer
 * can resolve the contract type without a shared registry.
 */
export interface FederationSchemaRef {
  /** Publisher label (`local` for engine-authored, free-form coordination label otherwise). */
  publisher: string;
  type: string;
  /** Dotted numeric version, e.g. `1` or `1.2`. */
  version: string;
  /** `sha256:<64 hex>` digest of the manifest. */
  manifestDigest: string;
}


/** Parameters for submitting a cross-boundary state transition. */
export interface SubmitStateTransitionParams {
  recordId: string;
  state: string;
  type: string;
  idempotencyKey: string;
  schemaRef?: FederationSchemaRef;
  principalAgentId?: string;
  performerAgentId?: string;
  coSignRequired?: boolean;
  correlationId?: string;
  projectRef?: string;
  externalTaskId?: string;
  operatingMode?: string;
  /** Parent record id on the firing Server (the peer projects the delegation edge). */
  parentRecordId?: string;
  /** Root record id of the delegation tree on the firing Server. */
  rootRecordId?: string;
  /** Delegation depth (0 = root). Omitted for non-delegated transitions. */
  chainDepth?: number;
}

/** Result of a state transition submission. */
export interface StateTransitionResult {
  ack: boolean;
  state?: string;
  recordId?: string;
  [key: string]: unknown;
}


/** Parameters for relaying a Settlement Signal to a counterparty peer. */
export interface RelaySignalParams {
  recordId: string;
  /** Recommendation to the downstream financial system (SETTLE / HOLD / RELEASE). */
  recommendation: FederationSettlementSignal;
  outcomeHash: string;
  validUntil: string;
  idempotencyKey: string;
  outcome?: FederationVerdict | null;
  counterSignature?: string;
  schemaRef?: FederationSchemaRef;
  /**
   * Machine-readable cause for the signal
   * (`AUTO_SETTLE` / `AUTO_SETTLE_WITHIN_TOLERANCE` / `AUTO_FAIL` /
   * `PRINCIPAL_ACCEPT` / `PRINCIPAL_REJECT` / `DISPUTE_OVERTURNED` / `TIMED_OUT` /
   * `REMEDIATED` / `CANCEL_PRE_WORK` / `CANCEL_IN_PROGRESS` / `OVERFLOW_REJECT` /
   * `ARBITRATION_*` …). `AUTO_SETTLE_WITHIN_TOLERANCE` marks an
   * auto-settle that cleared only via a non-zero tolerance band. Null on older peers.
   */
  reasonCode?: string | null;
  /** ruleIds that failed when a gate evaluation produced this HOLD. Null for non-rule terminals or older peers. */
  failingRuleIds?: string[] | null;
  /** Free-text hint (engine summary or principal verdict notes). Null on older peers. */
  reason?: string | null;
}

/** Result of a signal relay. */
export interface SignalRelayResult {
  relayed: boolean;
  recordId?: string;
  [key: string]: unknown;
}


/** Parameters for requesting a co-signature on a federated record. */
export interface SubmitCoSignRequestParams {
  recordId: string;
  recommendation: FederationSettlementSignal;
  outcomeHash: string;
  state: string;
  performerHubId: string;
  validUntil: string;
  idempotencyKey: string;
  outcome?: FederationVerdict | null;
  schemaRef?: FederationSchemaRef;
}

/** Result of a co-sign request. */
export interface CoSignRequestResult {
  queued: boolean;
  recordId?: string;
  [key: string]: unknown;
}


/**
 * Dispute-protocol action, lowercase. The route declares a strict enum, so a
 * value outside this set is a 400. Note these are past tense and do not match
 * the `DisputeGrounds` or `DisputeStatus` casing.
 *
 * `escalated` is inbound compatibility only. The tier ladder is gone, so this
 * Server never emits it; it stays accepted for one release so a peer still on
 * the previous version can finish a rolling upgrade, and the receiver projects
 * such a message to `PENDING_RESOLUTION`. Do not send it.
 */
export type DisputeProtocolAction = 'opened' | 'resolved' | 'withdrawn' | 'escalated';

/** Parameters for submitting a federation dispute-protocol message. */
export interface SubmitDisputeProtocolParams {
  recordId: string;
  /** Dispute-protocol action. Strict enum on the route. */
  action: DisputeProtocolAction;
  disputeId: string;
  /**
   * Post-action dispute status (`EVIDENCE_WINDOW` on opened, `RESOLVED` on
   * resolved, `WITHDRAWN` on withdrawn). Declared free-form by the route, so
   * this stays open, but the named values are the ones it means.
   */
  disputeStatus: DisputeStatus;
  idempotencyKey: string;
  /**
   * Accepted and ignored. The tier ladder is gone: this exists for one release
   * so a peer still on the previous version can finish a rolling upgrade. Never
   * emitted, never stored, never read.
   */
  tier?: number;
  grounds?: string;
  outcome?: string;
  initiatedByRole?: 'principal' | 'performer';
  schemaRef?: FederationSchemaRef;
}

/** Result of a federation dispute-protocol submission. */
export interface DisputeProtocolResult {
  received: boolean;
  disputeId?: string;
  [key: string]: unknown;
}


/**
 * Parameters for establishing a peer relationship with another AGLedger
 * instance. All five are required and the route refuses anything else: the
 * single-use `peeringToken` in the body is what admits the call, so the route
 * carries no other authentication.
 */
export interface PeerHandshakeParams {
  peerHubId: string;
  peerUrl: string;
  signingPublicKey: string;
  peeringToken: string;
  boundOrgId: string;
}

/**
 * Result of a peer handshake: the receiver's side of the registration.
 *
 * `peerHubId` is the identifier every `/federation/v1/admin/peers/{peerHubId}`
 * path takes, in canonical lowercase. `peerId` is the receiver-local row id and
 * no admin path accepts it.
 */
export interface PeerHandshakeResult {
  /** Always true: a refusal is a thrown 4xx, never a false here. */
  peered: true;
  /** Receiver-local row id of the registration. */
  peerId: string;
  /** The hub id the registration is filed under, canonical lowercase. */
  peerHubId: string;
  /** Peer status as created (`active`). */
  status: string;
  serverSigningPublicKey: string;
  nextSteps?: NextStep[];
}


/** Query parameters for listing federation DLQ entries (admin). */
export interface ListFederationDlqParams {
  limit?: number;
  cursor?: string;
}

/** A failed outbound federation message in the dead-letter queue. */
export interface FederationDlqEntry {
  id: string;
  jobType: string;
  recordId: string | null;
  agentId: string | null;
  payload: Record<string, unknown>;
  errorMessage: string;
  attempts: number;
  /** When this message first failed, as distinct from when the row was written. */
  firstFailedAt: string;
  createdAt: string;
}


/** Parameters for updating a webhook circuit breaker (admin). */
export interface UpdateCircuitBreakerParams {
  state: 'closed' | 'open' | 'half_open';
}

/** Result of a circuit breaker update. */
export interface CircuitBreakerResult {
  id: string;
  circuitState: string;
  consecutiveFailures: number;
}


/** Parameters for updating agent identity. */
export interface UpdateAgentParams {
  agentClass?: AgentClass;
  ownerRef?: string | null;
  orgUnit?: string | null;
  description?: string;
  /** Public AgentCard URL (A2A). Pass null to clear. */
  agentCardUrl?: string | null;
  /**
   * Issuer URL of an external identity this agent answers to, matching a
   * registered trusted issuer. Set with `oidcSub`: a subject is unique only
   * within its issuer, and a half-set pair is refused. Pass null on both to
   * unbind.
   */
  oidcIss?: string | null;
  /** Subject claim of the external identity, verbatim as the IdP issues it. */
  oidcSub?: string | null;
}

/** Agent classification: personal (human-owned), system (always-on), team (shared), ephemeral (per-task). */
export type AgentClass = 'personal' | 'system' | 'team' | 'ephemeral';


/**
 * Full agent identity returned by the agents resource. Wire field is
 * `displayName` (not `name`); there is no `slug` or `updatedAt` on this surface.
 */
export interface AgentProfile {
  id: string;
  orgId: string | null;
  displayName: string;
  agentClass: string | null;
  agentCardUrl: string | null;
  ownerRef: string | null;
  orgUnit: string | null;
  description: string | null;
  /** Issuer of the external identity bound to this agent, or null when unbound. */
  oidcIss?: string | null;
  /** Subject of the external identity bound to this agent, or null when unbound. */
  oidcSub?: string | null;
  references?: Record<string, unknown>[];
  /** When an operator deactivated this agent, or null while it is active. */
  deactivatedAt?: string | null;
  createdAt: string;
}


/** An external reference linking an AGLedger entity to an external system. */
export interface EntityReference {
  id: string;
  system: string;
  refType: string;
  refId: string;
  displayName?: string | null;
  uri?: string | null;
  attributes?: Record<string, unknown>;
  createdAt: string;
  createdBy: string;
}

/**
 * An external reference as supplied by the caller, on record create or on the
 * append-only attach endpoints. Distinct from {@link EntityReference}, which is
 * what the API returns: `id`, `createdAt` and `createdBy` are server-assigned.
 */
export interface EntityReferenceInput {
  /** External system identifier: lowercase alphanumeric plus dots, hyphens, underscores. */
  system: string;
  /** Reference type within the system, e.g. `sales-order`, `ticket`. */
  refType: string;
  /** External identifier within the system. */
  refId: string;
  /** Human-readable label, snapshotted at attachment time and not refreshed. */
  displayName?: string;
  /** URL back to the source system. https only. */
  uri?: string;
  /** Flat key-value metadata: max 10 keys, max 4KB total. */
  attributes?: Record<string, unknown>;
}

/** Result of a reverse-lookup by external reference. */
export interface ReferenceLookupResult {
  references: EntityReference[];
  entityType: string;
  entityId: string;
}


/** A vault Ed25519 signing key. */
export interface VaultSigningKey {
  id: string;
  publicKey: string;
  algorithm: string;
  status: 'active' | 'retired';
  createdAt: string;
  rotatedAt: string | null;
}

/** A vault trust anchor (hash-chain checkpoint). */
export interface VaultAnchor {
  id: string;
  chainPosition: number;
  entryHash: string;
  previousHash: string | null;
  createdAt: string;
}

/** Result of verifying vault trust anchors. */
export interface VaultAnchorVerifyResult {
  valid: boolean;
  anchorsChecked: number;
  errors: string[];
}

/**
 * pg-boss job state for an asynchronous vault integrity scan.
 *
 * Open-ended on purpose: the queue owns this vocabulary and has already
 * changed it once (`expired` is no longer emitted; `cancelled` and `retry`
 * arrived with the pg-boss exclusive-policy work). Branch on `completed` and
 * `failed`, and treat anything else as still running.
 */
export type VaultScanState =
  | 'created'
  | 'active'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'retry'
  | (string & {});

/**
 * When the checkpoint sweep runs, and when it last did.
 *
 * Checkpoints are written on a schedule, not per Record, so a fresh install
 * legitimately returns an empty checkpoint list until the first sweep fires
 * no matter how many Records it holds, and a scan reports `healthy: true`
 * throughout that window. Read this before concluding checkpoints are missing.
 */
export interface VaultCheckpointingSchedule {
  /** Cron expression the sweep runs on, in UTC. */
  cron: string;
  /** Cadence in minutes derived from `cron`. Null when the schedule is not a fixed interval. */
  intervalMinutes: number | null;
  /** ISO 8601 timestamp of the next scheduled sweep, or null. */
  nextRunAt: string | null;
  /** ISO 8601 timestamp of the most recent checkpoint, or null before the first sweep. */
  lastCheckpointAt: string | null;
  /** Where the schedule was read from: the running `worker`, or static `config`. */
  source: 'worker' | 'config' | (string & {});
  /** Whether checkpoint anchoring is enabled at all. */
  anchoringEnabled: boolean;
}

/** A broken-record finding from a vault scan. */
export interface VaultScanBrokenRecord {
  recordId: string;
  brokenAt: number;
  reason: string;
  expectedEntries?: number;
}

/**
 * A broken record-less chain from a full vault scan: either the single
 * platform-ops chain (`admin`) or one org's schema-registration chain (`schema`).
 */
export interface VaultScanBrokenChain {
  /** `admin` is the single platform-ops chain; `schema` is one org's schema chain. */
  chain: 'admin' | 'schema';
  /** The org whose schema chain broke; null for the platform-ops chain and platform-level schema events. */
  orgId: string | null;
  brokenAt: number;
  /**
   * Same failure taxonomy as `VaultScanBrokenRecord.reason` (plus the schema-chain-only
   * `schema_chain_missing_for_subjects`). Left as `string` on purpose: the server may add
   * codes and an open type keeps a new value from becoming a compile break.
   */
  reason: string;
}

/**
 * The record-less chains a full scan walks: the platform-ops chain
 * (admin key + account events) and each org's schema-registration chain. These
 * have no `records` row, so the per-record scan cannot see them; a tamper here
 * folds into `VaultScanResult.healthy`. Absent on a `recordIds`-scoped scan.
 */
export interface VaultScanGlobalChains {
  /** Record-less chains walked (buckets with at least one entry). */
  total: number;
  verified: number;
  broken: number;
  /** Subset of `broken`, broken on per-entry signature verification. */
  signatureErrors: number;
  /** Capped at 100 entries; `brokenChainsTruncated === true` means more broke. */
  brokenChains: VaultScanBrokenChain[];
  brokenChainsTruncated: boolean;
}

/** Scan findings, present once `state === 'completed'`, otherwise null. */
export interface VaultScanResult {
  recordsScanned: number;
  verified: number;
  broken: number;
  signatureErrors: number;
  /**
   * True iff `broken === 0` and `signatureErrors === 0` and `globalChains.broken === 0`.
   * The single field to branch on; a full scan folds the record-less chains into it.
   */
  healthy: boolean;
  brokenRecords: VaultScanBrokenRecord[];
  brokenRecordsTruncated: boolean;
  /** Record-less chain findings. Present on a full scan; absent on a `recordIds`-scoped scan. */
  globalChains?: VaultScanGlobalChains;
  /**
   * Checkpoint sweep schedule at the time of the scan. Read it before treating
   * an absent checkpoint as a finding: `lastCheckpointAt` is null on any
   * install whose first sweep has not fired yet.
   *
   * Omits `lastCheckpointAt`, which only the checkpoint list carries. Every
   * member is optional here: the engine marks none of them required on the
   * scan envelope, unlike the checkpoint list where all six are.
   */
  checkpointing?: Partial<Omit<VaultCheckpointingSchedule, 'lastCheckpointAt'>>;
  scannedAt: string;
}

/** Status of an asynchronous vault integrity scan job. */
export interface VaultScanJob {
  jobId: string;
  /** pg-boss job state: created → active → completed/failed/expired. */
  state: VaultScanState;
  startedAt?: string | null;
  completedAt?: string | null;
  /** Null until `state === 'completed'`. */
  result?: VaultScanResult | null;
  nextSteps?: NextStep[];
}

/** A vault scan job summary as returned in the scan-list view. */
export interface VaultScanSummary {
  jobId: string;
  state: VaultScanState;
  startedAt?: string | null;
  completedAt?: string | null;
  result?: VaultScanResult | null;
}

/** Response of `GET /v1/admin/vault/scan`: current and recent scan jobs. */
export interface VaultScanList {
  active: VaultScanSummary | null;
  lastCompleted: VaultScanSummary | null;
  recent: VaultScanSummary[];
  nextSteps?: NextStep[];
}


/** Auth cache statistics. */
export interface AuthCacheStats {
  size: number;
  hitRate: number;
  evictions: number;
}


/** License tier identifier. */
export type LicenseTier = 'developer' | 'enterprise' | (string & {});

/** Platform license information and entitlements. */
export interface LicenseInfo {
  /** License validity gate ('valid' / 'invalid' / 'expired'). */
  validity: string;
  tier: LicenseTier;
  /**
   * Where the license was loaded from: a PEM file, a compact key (the form a
   * Helm values file carries), the marketplace, or nowhere.
   */
  source?: 'pem' | 'compact' | 'marketplace' | 'none' | (string & {});
  features: string[];
  customerId?: string | null;
  customerName?: string | null;
  instanceId?: string | null;
  licensedThrough?: string | null;
  releaseDate?: string | null;
  licenseId?: string | null;
  checkedAt?: string;
  error?: string | null;
  nextSteps?: NextStep[];
}


/** A vault signing public key for independent audit chain verification. */
export interface VerificationKey {
  keyId: string;
  algorithm: string;
  /**
   * COSE algorithm label (RFC 9053) this key signs under, e.g. -8 (EdDSA) or
   * -7 (ES256). Authoritative per key; the response-level `coseAlgorithm`
   * describes the active key only.
   */
  coseAlgorithm?: number;
  /** Minimum @agledger/verify version able to verify entries signed under this key. */
  minVerifierVersion?: string;
  /** Base64-encoded SPKI DER public key. */
  publicKey: string;
  /**
   * Base64 of the raw 32-byte Ed25519 public key, what raw-key verifiers
   * (RFC 9421 / Standard-Webhooks-style) consume, vs the SPKI-DER `publicKey`.
   * Same key, different encoding. Present only on Ed25519 keys: a raw key
   * carries no AlgorithmIdentifier, so other algorithms publish SPKI only.
   */
  publicKeyRaw?: string;
  status: 'active' | 'retired' | (string & {});
  activatedAt: string;
  retiredAt: string | null;
}

/** Response from GET /v1/verification-keys. */
export interface VerificationKeysResponse {
  data: VerificationKey[];
  canonicalization: string;
  /**
   * Hash basis advertised by the engine. Optional: not every server build
   * emits it; absent means the implicit COSE/Ed25519 default (`SHA-256`).
   * Kept in step with the Python SDK.
   */
  hashAlgorithm?: string;
  /**
   * Algorithm of the ACTIVE signing key, not of the response. Null on a Server
   * with no active vault signing key. Per-key values live on
   * {@link VerificationKey.algorithm}, and a rotation across algorithms leaves
   * retired keys here under a different one, so verify each entry against the
   * key it names rather than against this.
   */
  signatureAlgorithm?: string | null;
  /** COSE algorithm label of the active signing key, e.g. -8 (EdDSA) or -7 (ES256). Null when there is none. */
  coseAlgorithm?: number | null;
  /** Template for the canonical signature-input string (v0.25.x). */
  signatureInputTemplate?: string;
}


/**
 * Peering status of a federation peer.
 *
 * Named rather than inline for the same reason as
 * {@link OrgReadsCheckpointingSource}: an inline field union is not something
 * the enum-parity guard can read, so its members would drift unchecked.
 */
export type FederationPeerStatus = 'active' | 'revoked' | (string & {});

/** A peer Server in peer-to-peer federation. */
export interface FederationPeer {
  /** Receiver-local row id. No admin path takes it. */
  peerId: string;
  /** The identifier every `/federation/v1/admin/peers/{peerHubId}` path takes. */
  peerHubId: string;
  peerUrl: string;
  status: FederationPeerStatus;
  createdAt: string;
  /**
   * Failed delivery attempts since the last success, reset to 0 on a 2xx. Not
   * purely a reachability count: a peer that answers and rejects the payload
   * counts here too, because the message did not get through either way.
   * `lastDeliveryError` says which, naming the status code when the peer answered.
   */
  consecutiveDeliveryFailures?: number;
  /**
   * When an outbound message last reached this peer with a 2xx. Null means
   * nothing has been delivered yet, not that the peer is unreachable.
   */
  lastDeliveryAt?: string | null;
  /** Why the most recent delivery attempt failed, cleared on the next success. */
  lastDeliveryError?: string | null;
}

/** Parameters for listing known peer servers (`GET /federation/v1/admin/peers`). */
export interface ListPeersParams extends ListParams {
  /** Filter by peering status. */
  status?: FederationPeer['status'];
}

/** A single-use peering token for peer-to-peer federation setup. */
export interface PeeringToken {
  token: string;
  expiresAt: string;
}


/** Who a trusted issuer's tokens may authenticate as. */
export type TrustedIssuerAppliesTo = 'agent' | 'principal' | 'admin' | 'any';

/** The agent scope profiles a trusted issuer may grant to the agents it creates. */
export type AutoProvisionScopeProfile = 'agent-full' | 'agent-readonly' | 'agent-performer-only';

/**
 * A trusted OIDC issuer. Tokens minted by this issuer can be exchanged for
 * ephemeral signing certs via `POST /v1/auth/oidc/cert`.
 */
export interface TrustedIssuer {
  id: string;
  /** Org the issuer is scoped to; null means platform-wide. */
  orgId: string | null;
  issuerUrl: string;
  jwksUri: string;
  expectedAudience: string;
  /** Expected `azp` claim (multi-audience tokens); null to skip the check. */
  expectedAzp: string | null;
  appliesTo: TrustedIssuerAppliesTo;
  /** Logical-name → IdP-claim-name map, e.g. `{ scopes: 'groups' }`. */
  claimMapping: Record<string, string>;
  /** Override of the default allowed signature algs; null inherits defaults. */
  allowedAlgs: string[] | null;
  maxCredentialTtlSeconds: number;
  /**
   * When true, the first `POST /v1/auth/oidc/cert` from a subject this Server
   * has never seen creates the agent under this issuer's org (agentClass
   * `ephemeral`) instead of refusing the exchange.
   */
  autoProvisionAgents: boolean;
  /**
   * Scope profile granted to agents this issuer creates, and the scope ceiling
   * for every cert minted from it: the IdP's mapped `scopes` claim intersects
   * this set and can never widen past it.
   */
  autoProvisionScopeProfile: AutoProvisionScopeProfile | null;
  /**
   * Ceiling on how many agents this issuer may auto-provision in its org.
   * Checked inside the creating transaction; at the limit the token exchange
   * is refused with the count and the limit named.
   */
  autoProvisionMaxAgents: number;
  label: string | null;
  /** `provisioning` when sourced from static config; null when API-managed. */
  managedBy: 'provisioning' | null;
  createdBy: string | null;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string;
}

/** Parameters for registering a trusted OIDC issuer. */
export interface CreateTrustedIssuerParams {
  /** Org to scope the issuer to; omit/null for platform-wide. */
  orgId?: string | null;
  issuerUrl: string;
  jwksUri?: string;
  expectedAudience: string;
  expectedAzp?: string | null;
  appliesTo?: TrustedIssuerAppliesTo;
  claimMapping?: Record<string, string>;
  allowedAlgs?: string[] | null;
  maxCredentialTtlSeconds?: number;
  /**
   * Let the first token exchange from an unknown subject create the agent.
   * Requires `orgId` and `autoProvisionScopeProfile`.
   */
  autoProvisionAgents?: boolean;
  /** Scope profile granted to auto-provisioned agents, and the cert scope ceiling. */
  autoProvisionScopeProfile?: AutoProvisionScopeProfile | null;
  /** Ceiling on agents this issuer may auto-provision. Default 1000. */
  autoProvisionMaxAgents?: number;
  label?: string | null;
  enabled?: boolean;
}

/** Parameters for updating a trusted OIDC issuer (merge semantics). */
export interface UpdateTrustedIssuerParams {
  issuerUrl?: string;
  jwksUri?: string;
  expectedAudience?: string;
  expectedAzp?: string | null;
  appliesTo?: TrustedIssuerAppliesTo;
  claimMapping?: Record<string, string>;
  allowedAlgs?: string[] | null;
  maxCredentialTtlSeconds?: number;
  /**
   * Let the first token exchange from an unknown subject create the agent.
   * Requires `orgId` and `autoProvisionScopeProfile`.
   */
  autoProvisionAgents?: boolean;
  /** Scope profile granted to auto-provisioned agents, and the cert scope ceiling. */
  autoProvisionScopeProfile?: AutoProvisionScopeProfile | null;
  /** Ceiling on agents this issuer may auto-provision. Default 1000. */
  autoProvisionMaxAgents?: number;
  label?: string | null;
  enabled?: boolean;
}

/** Filters for `GET /v1/admin/trusted-issuers`. */
export interface ListTrustedIssuersParams {
  appliesTo?: TrustedIssuerAppliesTo;
  orgId?: string;
  enabled?: boolean;
  managedBy?: 'provisioning';
  limit?: number;
  offset?: number;
  /** Opaque page token from the previous page's `nextCursor`. Replay it with
   * the same filters that produced it. */
  cursor?: string;
}

/** Result of revoking all live certs issued under a trusted issuer. */
export interface RevokeTrustedIssuerCertsResult {
  issuerId: string;
  revokedCount: number;
  nextSteps?: NextStep[];
}

/**
 * An ephemeral signing cert minted from an OIDC token. Short-lived; bound to
 * the OIDC subject and a per-call public-key thumbprint.
 */
export interface EphemeralCert {
  id: string;
  trustedIssuerId: string;
  orgId: string | null;
  agentId: string | null;
  oidcIss: string;
  oidcSub: string;
  publicKeyThumbprint: string;
  scopes: string[];
  issuedAt: string;
  expiresAt: string;
  signingKeyId: string;
  revokedAt: string | null;
}

/** Parameters for `POST /v1/auth/oidc/cert`: exchange an OIDC token for a cert. */
/** Options for {@link AuthResource.rotateKey}. */
export interface RotateKeyParams {
  /**
   * Overlap window (seconds) the OLD key stays valid after rotation.
   * Omit to revoke the old key immediately.
   */
  gracePeriodSeconds?: number;
}

/** Result of `POST /v1/auth/keys/rotate`. */
export interface RotateKeyResult {
  /** New API key (plaintext, shown once). Use as the Bearer token. */
  apiKey: string;
  role?: ApiKeyRole | (string & {});
  /** True when the old key was deactivated immediately (no grace window). */
  previousKeyDeactivated?: boolean;
  /** When the old key stops working under a grace window; null on immediate cutover. */
  previousKeyDeactivatesAt?: string | null;
  /**
   * When the REPLACEMENT key expires. Null unless the install caps key
   * lifetime, which binds the replacement exactly as it binds a freshly
   * minted key: rotation is not a way around the cap. Schedule the next
   * rotation before this instant.
   */
  expiresAt?: string | null;
  nextSteps?: NextStep[];
}

export interface IssueEphemeralCertParams {
  oidcToken: string;
  /** Caller-generated public key (JWK) the cert will be bound to. */
  publicKeyJwk: Record<string, unknown>;
  /** base64url signature over the canonical proof string (proof-of-possession). */
  proofOfPossession: string;
  /** Target agent identity; defaults from the mapped OIDC claims. */
  agentId?: string;
}

/** Result of issuing an ephemeral cert: the cert plus its detached JWS. */
export interface IssueEphemeralCertResult {
  cert: EphemeralCert;
  /** The cert as a detached JWS, for offline verification. */
  certJws: string;
  nextSteps?: NextStep[];
}

/** Result of revoking a single ephemeral cert. */
export interface RevokeEphemeralCertResult extends EphemeralCert {
  revokedAt: string;
  nextSteps?: NextStep[];
}

/** A consolidated operations snapshot from `GET /v1/admin/ops-summary`. */
export interface OpsSummary {
  timestamp: string;
  license: {
    tier: string;
    validity: string;
    licensedThrough: string | null;
  };
  system: {
    /**
     * The same field `GET /v1/admin/system-health` reports: `degraded` when the
     * database cannot serve or anything is dead-lettered.
     */
    status: 'healthy' | 'degraded' | (string & {});
    /** One entry per condition making `status` degraded; empty when healthy. */
    degradedReasons: string[];
    uptimeSeconds: number;
    databaseLatencyMs: number | null;
  };
  /** Job counts per queue, keyed by queue name. */
  queues: Record<string, QueueCounts>;
  federation: {
    peers: {
      /**
       * Registration state: peers allowed to receive. A peer counts here from
       * the moment it is registered, whether or not it has ever taken a
       * delivery. Read it with the three delivery counts below, which partition
       * it.
       */
      active: number;
      revoked: number;
      /** Active peers whose last delivery attempt succeeded. */
      delivering: number;
      /**
       * Active peers with consecutive failed delivery attempts. Per-peer detail,
       * including the error and the failure count, at
       * `GET /federation/v1/admin/peers`.
       */
      failing: number;
      /**
       * Active peers with no delivery attempt recorded at all. A peer that has
       * only ever failed counts under `failing`, not here. Expected for a peer
       * registered but not yet shared to; an incident for one that has been.
       */
      neverDelivered: number;
    };
  };
  vault: {
    signingKeys: { active: number; retired: number };
    /**
     * External vault-anchoring posture. `enabled: false` means signed
     * checkpoints exist only in the application database.
     *
     * `enabled`, `bucket`, and `intervalMinutes` reflect the API process's own
     * config; `workerEnabled` is the observed posture of the worker that runs
     * the sweep. When `reconciled` is false the two disagree (env drift between
     * the API and worker services) and the worker is authoritative for whether
     * anchoring really happens. Null `workerEnabled`/`reconciled` means the
     * worker posture could not be determined.
     */
    anchoring: {
      enabled: boolean;
      /** Tamper-exposure window between checkpoint and anchor sweeps. */
      intervalMinutes: number;
      bucket: string | null;
      workerEnabled: boolean | null;
      reconciled: boolean | null;
    };
    /**
     * Read-transparency (`org_admin_reads`) checkpoint sweep posture. The sweep
     * runs in the worker on a fixed cron; there is no env knob.
     *
     * Platform-wide, unlike the per-org block on
     * `GET /v1/audit/org-reads/checkpoints`: `lastCheckpointAt` is the newest
     * checkpoint across all orgs, null until the first sweep lands one.
     * `workerScheduled: null` means the worker posture could not be determined.
     */
    orgReadsCheckpoints: {
      cron: string;
      lastCheckpointAt: string | null;
      workerScheduled: boolean | null;
    };
  };
  webhooks: {
    circuitBreakers: { closed: number; half_open: number; open: number };
  };
  /**
   * Audit-log partition runway, one entry per monthly-partitioned table.
   * `runwayDays` = days until the latest partition's upper bound (null when
   * the table has no monthly partition); `defaultRows` = rows in the catch-all
   * DEFAULT partition (should be ~0).
   */
  partitions: Array<{ table: string; runwayDays: number | null; defaultRows: number }>;
  nextSteps?: NextStep[];
}


/**
 * A row in the org agent directory returned by `GET /v1/agents`.
 * Use this for peer discovery; for full agent identity use `agents.get(id)`.
 */
export interface AgentDirectoryEntry {
  id: string;
  orgId: string;
  displayName: string | null;
  agentCardUrl: string | null;
  agentClass: 'personal' | 'system' | 'team' | 'ephemeral';
  orgUnit: string | null;
  description: string | null;
  /**
   * When an operator deactivated this agent, or null while it is active. Only
   * ever non-null on a listing that asked for deactivated agents.
   */
  deactivatedAt?: string | null;
  createdAt: string;
}

/** Filters for the org agent directory (`GET /v1/agents`). */
export interface ListAgentsParams extends CursorListParams {
  /**
   * `false` (the default) drops the agents an operator deactivated, which a new
   * Record cannot name. `true` adds them back, told apart by a non-null
   * `deactivatedAt`. The value is bound into `nextCursor`, so set it before the
   * walk starts rather than partway through.
   */
  includeDeactivated?: boolean;
}

/** A federated agent synced into the local directory from a peer. */
export interface PeerAgent {
  id: string;
  orgId: string;
  displayName: string;
  agentClass: string;
  /** The peer hub this agent originated from. */
  originPeerHubId: string;
  createdAt: string;
}

/** Filters for `GET /v1/peer-agents`. */
export interface ListPeerAgentsParams {
  cursor?: string;
  limit?: number;
  /** Restrict to agents synced from a specific peer hub. */
  peerHubId?: string;
}

/**
 * Response of `GET /v1/peer-agents`. This is an audited read, so it carries a
 * `recordRead` checkpoint reference alongside the agent page.
 */
export interface PeerAgentsResponse {
  data: PeerAgent[];
  total?: number;
  nextCursor?: string | null;
  hasMore?: boolean;
  recordRead?: {
    leafIndex: number;
    leafHash: string;
    signedCheckpointRef: string | null;
  };
  nextSteps?: NextStep[];
}


/** Parameters for withdrawing a dispute. Reason is optional context. */
export interface WithdrawDisputeParams {
  reason?: string;
}
