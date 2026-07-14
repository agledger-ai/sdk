/** A suggested next API call — guides agents through the lifecycle without prior state-machine knowledge. */
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
  /** Base URL of your AGLedger instance (default: https://agledger.example.com) */
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


/** Parameters accepted by all list endpoints. */
export interface ListParams {
  limit?: number;
  offset?: number;
  cursor?: string;
}

/**
 * Unified page type for all list endpoints.
 * Every list method returns `Page<T>` — no exceptions.
 */
export interface Page<T> {
  data: T[];
  hasMore: boolean;
  nextCursor?: string | null;
  total?: number;
}

/** Options for auto-pagination. */
export interface AutoPaginateOptions {
  /** Maximum number of pages to fetch (default: 100). Safety ceiling. */
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
 * The API ships NO built-in contract types — your org owns its entire type
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
   * Lifecycle discriminator (API #817): `auto` or `principal` for a gated type,
   * `null` for notarize-only / no-default-gate. Mirrors `defaultGateMode` on
   * `schemas.get(type)` so a row alone distinguishes a gated type from a
   * notarize-only one without a per-type GET.
   */
  defaultGateMode?: GateMode | null;
}

export interface TypeSchema {
  type: RecordType;
  displayName?: string;
  description?: string;
  category?: string;
  version?: number;
  latestVersion?: number;
  status?: SchemaVersionStatus;
  /**
   * Default gate mode for records of this type when the create payload omits
   * `gateMode`. `auto` (engine default) auto-settles against the principal's
   * pre-configured predicates; `principal` forces a principal-held verdict. An
   * explicit per-record `gateMode` always wins. Row-only metadata, not
   * canonicalized into the manifest digest.
   */
  defaultGateMode?: GateMode;
  recordSchema: Record<string, unknown>;
  completionSchema: Record<string, unknown>;
  rulesConfig?: SchemaRulesConfig;
  quickStart?: {
    criteria: Record<string, unknown>;
    evidence: Record<string, unknown>;
  };
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
export type SchemaVersionStatus = 'ACTIVE' | 'DEPRECATED' | 'DELETED' | (string & {});

/** Known values: FULL, BACKWARD, FORWARD, NONE. Accepts any string for forward compatibility. */
export type SchemaCompatibilityMode = 'FULL' | 'BACKWARD' | 'FORWARD' | 'NONE' | (string & {});

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
  expressionHelpers?: string[];
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
   * Cap on the per-record tolerance a caller may pass for this rule (API
   * #824). `0` forbids any tolerance (the rule is an undodgeable threshold
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
  /** Default gate mode for records of this type — see {@link RegisterSchemaParams.defaultGateMode}. */
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
  displayName: string;
  description: string;
  category: string;
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
  compatibility?: 'none' | 'backward' | 'forward' | 'full';
  deprecation?: { since?: string; replacedBy?: string } | null;
  /** Advisory documentation only; the engine never reads this field. */
  previousVersion?: string | null;
  fieldMappings?: Record<string, unknown>[];
  tolerances?: Record<string, unknown>;
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
  commissionSourceField?: string;
}

/**
 * A schema-version subject row, returned by `schemas.register()`,
 * `schemas.import_()`, `schemas.updateVersion()`, `schemas.getVersions()`
 * and `schemas.getVersion()`.
 *
 * `getVersion()` projects the row differently: it includes `recordSchema` and
 * `completionSchema` (and may include `latestVersion`) but omits `id`,
 * `orgId`, `compatibilityMode`, `createdAt` and `updatedAt` — hence those
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
  /** Suggested next API calls (present on write responses). */
  nextSteps?: NextStep[];
}

/** Parameters for updating a schema version. */
export interface UpdateSchemaVersionParams {
  status?: SchemaVersionStatus;
  compatibilityMode?: SchemaCompatibilityMode;
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
}

/** Performer's response to a Record proposal. */
export type AcceptanceStatus = 'PROPOSED' | 'ACCEPTED' | 'REJECTED' | 'COUNTER_PROPOSED' | (string & {});

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
  | 'PENDING_ARBITRATION'
  | 'CANCELLED'
  | 'REJECTED'
  | 'RECORDED'
  | (string & {});

/**
 * Record transition action accepted by `POST /v1/records/{id}/transition`.
 *
 * Known values: register, propose, activate, cancel. Read `nextActions` on the
 * Record response for the exact set valid right now — display state `CREATED`
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
 * plus the notary sentinel `unclassified` (nothing asserted yet — the
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
  /** ID of the vault signing key — resolves to a public key at GET /v1/verification-keys. */
  signingKeyId: string | null;
  /**
   * Signed instant of the head Signed Statement — the CWT `iat` claim (second
   * precision) sealed in the COSE_Sign1 protected header (API #877). THE
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
 * cross-party reads — proves the read was logged.
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
 * A Record — a registered commitment between a principal and a performer.
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
  /** Acceptance criteria — what the performer must deliver. Typed per Type. */
  criteria: Record<string, unknown>;
  /** Tolerance bands for numeric criteria (e.g., quantityPct: 5 allows 5% variance). */
  tolerance?: Record<string, unknown>;
  /** ISO 8601 deadline for completion. */
  deadline?: string | null;
  /** Commission percentage for the performing agent. */
  commissionPct?: number | null;
  /** Computed commission amount, or null. */
  commissionAmount?: number | null;
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
  /** IDs of child Records in the delegation chain (present on single-Record fetch only). */
  childRecordIds?: string[];
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
  /** Valid next actions from current state — exact action names accepted by /transition right now. */
  nextActions?: string[];
  /** Valid target statuses from current state. */
  validTransitions?: string[];
  /** Hint for completion evidence fields, or null if no completion expected. Use schemaUrl for the full JSON Schema. */
  completionHint?: { requiredFields: string[]; optionalFields?: string[]; schemaUrl?: string } | null;
  /** Advisory enforcement warnings from the most recent transition. */
  advisoryWarnings?: Array<{ rule: string; message: string; details?: Record<string, unknown> }>;
  /** URL to the Type schema definition. */
  schemaUrl?: string;
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
  /** Free-form taxonomy of what kind of artifact this Record represents — denormalized from the Type at create. Immutable. */
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
  awaitingActor?: 'principal' | 'performer' | 'system' | 'arbitration' | null;
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
  disputeStatus?:
    | 'EVIDENCE_WINDOW'
    | 'TIER_2_REVIEW'
    | 'ESCALATED'
    | 'TIER_3_ARBITRATION'
    | 'RESOLVED'
    | 'WITHDRAWN'
    | null;
  /** Whether a co-signature is required before settlement, or null when not configured. */
  coSignRequired?: boolean | null;
  /** Co-signature state, or null when co-sign is not configured. */
  coSignStatus?: 'not_required' | 'pending' | 'succeeded' | 'failed' | null;
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
   * evidence — treat the audit-export as authoritative.
   */
  integrity?: RecordIntegrity;
}

/** Tamper-evidence result attached to a Record read with `?integrity=true` (API #732). */
export interface RecordIntegrity {
  /**
   * True iff the full audit chain re-verifies (hash re-derive, linkage,
   * signatures, checkpoint cross-check) AND the record fields served here match
   * what the chain asserts. False ⇒ read the audit-export as the source of truth.
   */
  verified: boolean;
  /** Strength of the chain verification — whether every entry was signed or only hash-linked. */
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
 * Settlement Signal projected onto a Record — the SETTLE/HOLD/RELEASE
 * recommendation bound to the terminal verdict, plus federation delivery state.
 * One payload class on the Notify channel; the Record holds the recommendation,
 * the principal renders the decision.
 */
export interface SettlementSignalSummary {
  /** The settlement recommendation bound to the terminal verdict. */
  recommendation: 'SETTLE' | 'HOLD' | 'RELEASE';
  /** Verdict the recommendation binds to — `accept` (typically SETTLE) or `reject` (HOLD), or null. */
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
  coSignStatus?: 'not_required' | 'pending' | 'succeeded' | 'failed' | null;
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
   * Org scope. Optional — admin keys typically leave this to the server
   * to infer from the key's org context.
   */
  orgId?: string;
  /** Record Type, e.g. 'ACH-PROC-v1'. Determines criteria schema. */
  type: RecordType;
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
  /** Commission percentage for the performing agent. */
  commissionPct?: number;
  /** Max completion submissions allowed. Null/omit for unlimited. */
  maxSubmissions?: number;
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
  /** Optional grouping ID — multiple Records sharing a correlationId can be queried together. */
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
  /** Filter by the caller's role relative to the Record. */
  role?: string;
  /** ISO 8601 lower bound on createdAt. */
  from?: string;
  /** ISO 8601 upper bound on createdAt. */
  to?: string;
  /** Filter to Records with (true) or without (false) an open dispute. */
  hasDispute?: boolean;
  /** Filter by dispute lifecycle status. */
  disputeStatus?: string;
  /** Filter to imported (true) or native (false) Records. */
  imported?: boolean;
  /** Filter by originating system identifier. */
  source?: string;
  /**
   * Agent-recovery query (API #731): return every Record whose next action awaits
   * the caller's structural side, across all statuses (open proposals, ACTIVE work,
   * revision requests, counter-proposals/verdicts). Agent keys only — admin/platform
   * keys 400 (use the per-row `awaitingActor` field instead).
   */
  actionable?: boolean;
}

/** Options for {@link RecordsResource.get}. */
export interface GetRecordParams {
  /**
   * Re-verify the Record's audit chain and cross-check the served row against it,
   * returning the result on {@link RecordRow.integrity} (API #732). Costs a chain
   * walk; omit for plain reads.
   */
  integrity?: boolean;
}

export interface SearchRecordsParams extends ListParams {
  orgId?: string;
  status?: RecordStatus;
  type?: RecordType;
  principalAgentId?: string;
  performerAgentId?: string;
  from?: string;
  to?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  externalTaskId?: string;
  parentRecordId?: string;
  correlationId?: string;
  updatedAfter?: string;
  updatedBefore?: string;
  gateMode?: GateMode;
  operatingMode?: OperatingMode;
  metadata?: Record<string, unknown>;
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
  commissionPct?: number;
}

/** Parameters for counter-proposing modified terms on a Record. */
export interface CounterProposeParams {
  counterCriteria?: Record<string, unknown>;
  counterTolerance?: Record<string, unknown>;
  counterDeadline?: string;
  counterCommissionPct?: number;
  message?: string;
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
 * A completion — structured evidence submitted by a performer claiming completion of a Record.
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
   * settle-vs-hold-vs-reject at completion time without a follow-up GET (API
   * #816). `structuralValidation: 'ACCEPTED'` means only the body parsed; this
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
 * The auto-gate's inline settlement decision on a {@link Completion} (API #816).
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
   * `AUTO_SETTLE_WITHIN_TOLERANCE` (API #824) when the gate cleared only via a
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
   * The principal verdict — accept settles to FULFILLED, reject to FAILED.
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
  /** Reason for the verdict (alias for notes — either is accepted, notes takes precedence). */
  reason?: string;
}

export interface VerdictResult {
  recordId: string;
  completionId: string;
  /** The principal verdict — same open `Verdict` union as the write side. */
  verdict: Verdict;
  /** Settlement recommendation to downstream financial systems. */
  recommendation: SettlementSignal;
  /**
   * Record status after the verdict settled — FULFILLED (accept) or FAILED
   * (reject), same vocabulary as the Record GET (API #876). Surfaced inline so
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


/** Known values: OPENED, TIER_1_REVIEW, EVIDENCE_WINDOW, TIER_2_REVIEW, ESCALATED, TIER_3_ARBITRATION, RESOLVED, WITHDRAWN. Accepts any string for forward compatibility. */
export type DisputeStatus =
  | 'OPENED'
  | 'TIER_1_REVIEW'
  | 'EVIDENCE_WINDOW'
  | 'TIER_2_REVIEW'
  | 'ESCALATED'
  | 'TIER_3_ARBITRATION'
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
  currentTier: number;
  outcome?: string | null;
  resolutionRationale?: string | null;
  feeChargedTo?: string | null;
  feeAmount?: number | null;
  feeCurrency?: string | null;
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

/** Response envelope from GET /dispute — includes both dispute and evidence. */
export interface DisputeResponse {
  dispute: Dispute;
  evidence: DisputeEvidence[];
}

export interface CreateDisputeParams {
  grounds: DisputeGrounds;
  context?: string;
}

/** Query parameters for the org-wide dispute listing. */
export interface ListDisputesParams extends ListParams {
  status?: DisputeStatus;
  recordId?: string;
}


/** Known webhook event types matching the AGLedger API (39 types). Accepts any string for forward compatibility. */
export type WebhookEventType =
  // Wildcard — subscribe to every event type
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
  // advisory result (API #913).
  | 'record.gate_held'
  | 'record.fulfilled'
  | 'record.failed'
  | 'record.expired'
  | 'record.cancelled'
  // Agent-to-agent
  | 'record.proposed'
  | 'record.proposal_accepted'
  | 'record.proposal_rejected'
  | 'record.proposal_counter_proposed'
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
  | 'record.settled'
  | 'record.released'
  | 'dispute.opened'
  | 'dispute.escalated'
  | 'dispute.evidence_window_closed'
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

export interface Webhook {
  id: string;
  url: string;
  eventTypes: WebhookEventType[] | null;
  /** Record-type filter for record-scoped events — see {@link CreateWebhookParams.recordTypes}. */
  recordTypes?: string[];
  isActive: boolean;
  /** Whether deliveries are paused. */
  isPaused: boolean;
  format: 'standard' | 'cloudevents';
  /**
   * Delivery signing scheme. `hmac` (shared secret, default) or `ed25519`
   * (RFC 9421 HTTP Message Signatures signed with the Server vault key,
   * verifiable against /v1/verification-keys — non-repudiation, no shared
   * secret). Verify ed25519 deliveries with `verifyRfc9421` from
   * `@agledger/sdk/webhooks`.
   */
  signingAlg: 'hmac' | 'ed25519';
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
   * without `VAULT_SIGNING_KEY` returns 422.
   */
  signingAlg?: 'hmac' | 'ed25519';
  /**
   * Record-type filter for record-scoped events (API #825). `["*"]` means all
   * record types (wildcard sentinel). Any other array means record events are
   * delivered ONLY for the listed types (fail-closed). Omit for all types.
   * 1-100 entries, each 1-100 chars.
   */
  recordTypes?: string[];
}

/**
 * Mutable fields on an existing webhook subscription. The signing scheme and
 * payload format are fixed at create time — the API rejects any other field
 * (`additionalProperties: false`).
 */
export interface UpdateWebhookParams {
  url?: string;
  eventTypes?: WebhookEventType[];
  /** Pause (true) or resume (false) deliveries; the subscription stays active. */
  isPaused?: boolean;
  /** Replace the record-type filter — see {@link CreateWebhookParams.recordTypes}. */
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
  /** Signature sent with the delivery — the `X-AGLedger-Signature` value for hmac subs, or the RFC 9421 `Signature` header value for ed25519 subs. */
  signature: string | null;
  /** Raw JSON body sent — the exact bytes covered by the signature (HMAC input for hmac, Content-Digest for ed25519). */
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


/** Per-Type reputation score for an agent. */
export interface ReputationScore {
  agentId: string;
  type: string;
  /** Scores are `null` until the agent has history (server types them `number | null`). */
  reliabilityScore: number | null;
  accuracyScore: number | null;
  efficiencyScore: number | null;
  compositeScore: number | null;
  /** Statistical confidence (0-1) — a number, not a label. Null until the agent has history. */
  confidenceLevel: number | null;
  /** Scoring formula version (an integer, for reproducibility). */
  formulaVersion: number;
  lifetimeRecords: number;
  lifetimeVerdicts: number;
  lifetimeAccepted: number;
  lifetimeCompletions: number;
  reversals: number;
  lastUpdatedAt: string;
  recentHistory?: Record<string, unknown>[];
}

/** Transaction history entry for an agent. */
export interface ReputationHistoryEntry {
  recordId: string;
  type: string;
  status: string;
  outcome: string;
  createdAt: string;
  completedAt?: string;
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
  recordCount?: number;
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
   * claim offline without calling back to the API (API #771). Currently the only
   * value is `signed-statements` (embeds each record's full COSE_Sign1 chain plus a
   * `verification` block); omit for a reference-only export.
   */
  embed?: string[];
}

export interface AiImpactAssessment {
  id: string;
  recordId: string;
  /** The formally-assessed tier — always one of the four tiers (never `unclassified`). */
  riskLevel: EuAiActRiskTier;
  domain: EuAiActDomain;
  overseerName?: string;
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

export interface EuAiActReport {
  records: Array<{
    id: string;
    riskClassification: RiskClassification;
    domain: EuAiActDomain;
    humanOversightDesignated: boolean;
    assessmentDate?: string;
  }>;
  summary: {
    highRiskCount: number;
    auditedCount: number;
  };
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
  /** F-705: owner id of the API key — org id (admin), agent id (agent), or platform sentinel. */
  actorOwnerId?: string;
  /** F-705: human-readable label for the actor owner. Display PROJECTION — NOT signature-covered. */
  actorDisplayName?: string | null;
  /** F-705: owner table discriminator; pairs with `actorOwnerId`. */
  actorOwnerType?: 'agent' | 'org' | 'platform' | null;
  /**
   * OIDC issuer URI when the request authenticated via an admin OIDC bearer
   * (#550). NULL on API-key paths. Paired with `actorOidcSub`. The same
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
   * F-711: auditor-readable label for `entryType` (e.g. RECORD_STATE_CHANGE →
   * "Record state transitioned"). Display PROJECTION — NOT signature-covered;
   * the canonical machine-readable name stays in `entryType`. Replaced the
   * pre-launch `description` placeholder (engine v0.26.x+).
   */
  humanReadableLabel?: string;
  payload: Record<string, unknown>;
  /** Actor envelope surfaced from canonical payload's `_actor` key. */
  actor?: AuditActor;
  /**
   * Completion evidence body, present only when the export was fetched with
   * `?evidence=true` AND this is a COMPLETION_SUBMITTED entry (API #870).
   * UNSIGNED projection — the chain binds it by hash only: recompute SHA-256
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
 * signed — read this to tell hash-chain-only from hash-chain-and-signatures apart.
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
  | 'audit_vault_row_missing_for_checkpoint'
  | 'checkpoint_hash_mismatch'
  | 'payload_drift'
  | 'oidc_actor_drift'
  | 'cert_actor_drift'
  | 'cert_expired'
  | 'cert_missing'
  | 'agent_signature_invalid'
  // API #888/#893 (v1.3.2): the vault fails closed on per-entry signature
  // verification. `signature_invalid` = a COSE_Sign1 signature did not verify
  // against its resolved key; `signing_key_unknown` = the entry names a
  // signing_key_id the key registry cannot resolve; `signing_key_drift` = the
  // denormalized signing_key_id column names a different key than the
  // signature-covered kid in the entry's protected header.
  | 'signature_invalid'
  | 'signing_key_unknown'
  | 'signing_key_drift'
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
   * "Ed25519-verified" from chainIntegrity alone — read this.
   */
  integrityLevel?: 'hash_chain_only' | 'hash_chain_partial_signatures' | 'hash_chain_and_signatures' | 'invalid';
  /** `2.0` since the COSE_Sign1 cutover (#482). */
  exportFormatVersion?: string;
  /** `RFC8949-CDE` since 2.0 — deterministic CBOR per RFC 8949 §4.2.1. */
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
    /** `2.0` since the COSE_Sign1 cutover (#482). */
    exportFormatVersion: string;
    /** `RFC8949-CDE` since 2.0 — deterministic CBOR per RFC 8949 §4.2.1. */
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
     * written outside its signing key's active window fails `CHAIN_KEY_EXPIRED`.
     * Additive since engine v0.26.x — older exports omit it and that check
     * stays `skipped_no_input`.
     */
    signingKeyWindows?: Record<string, { activatedAt: string; retiredAt: string | null }>;
  };
  entries: AuditExportEntry[];
}

/** A row from `GET /v1/audit-vault/checkpoints` — signed Merkle anchors. */
export interface VaultCheckpoint {
  id: string;
  recordId: string;
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


export interface AuditStreamParams {
  /** ISO timestamp — only events after this point (required). */
  since: string;
  /** Max events to return per page (default: 100, max: 1000). */
  limit?: number;
  /** Response format: 'ocsf' (OCSF-mapped) or 'raw' (default: 'ocsf'). */
  format?: 'ocsf' | 'raw';
}

export interface AuditStreamResult {
  /** Parsed NDJSON events. Shape depends on format param. */
  events: Record<string, unknown>[];
  /** Opaque cursor for the next poll. Null if no events returned. */
  cursor: string | null;
  /** True if the number of events equals the limit (more data likely available). */
  hasMore: boolean;
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
 * SCRAPI discovery shape — endpoints and supported algorithms/policies.
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
  contractVersion?: string;
  platform: string;
  platformRef?: string | null;
  criteria: Record<string, unknown>;
  /** Terminal status from the historical system. */
  terminalStatus:
    | 'FULFILLED'
    | 'REMEDIATED'
    | 'REJECTED'
    | 'PENDING_ARBITRATION'
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

export interface AdminImportRecordsResult {
  imported: number;
  recordIds: string[];
  /** Source label that was recorded in vault entries. */
  source: string;
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


export type { ApiKeyRole } from './scopes.js';
import type { ApiKeyRole } from './scopes.js';

export interface AccountProfile {
  apiKeyId: string;
  role: ApiKeyRole;
  ownerId: string;
  ownerType: string;
  scopes: string[] | null;
  /** Agent ID when `role === 'agent'`, otherwise null. */
  agentId?: string | null;
  /** Org ID the key is scoped to, if any. */
  orgId?: string | null;
  name?: string | null;
  createdAt?: string | null;
  /**
   * Credential class for this session. `ephemeral_cert` = OIDC-bound
   * short-lived signing cert (Mode 2); `oidc` = direct OIDC bearer (admin
   * Mode 1); `api_key` = long-lived `agl_` key.
   */
  authType?: 'api_key' | 'ephemeral_cert' | 'oidc';
  /** Present (non-null) only for `ephemeral_cert` sessions — the bound short-lived signing cert. */
  cert?: { id: string; thumbprint: string; expiresAt: string } | null;
  /** Present (non-null) for OIDC-bound sessions — the upstream IdP identity that minted the credential. */
  oidc?: { iss: string; sub: string } | null;
}


export interface HealthResponse {
  status: string;
  version?: string;
  uptime?: number;
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
   * Feature capability flags — which features are wired on this install.
   * The set grows as the engine gains capabilities; read flags defensively
   * via the open-ended index signature rather than assuming a fixed shape.
   */
  capabilities?: {
    recordLifecycle?: boolean;
    twoPhaseGate?: boolean;
    auditVault?: boolean;
    hashChainIntegrity?: boolean;
    ed25519Signatures?: boolean;
    delegationChains?: boolean;
    cascadingGate?: boolean;
    disputeResolution?: boolean;
    reputationScoring?: boolean;
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
    [key: string]: boolean | undefined;
  };
  /** Number of registered contract types in this org. */
  contractTypes?: number;
  /** URL to list all type schemas (criteria + evidence structure). */
  schemasUrl?: string;
  /** Supported settlement signal types (e.g. SETTLE, HOLD, RELEASE). */
  settlementSignals?: string[];
  /** AGLedger API version. */
  version?: string;
}


export interface AdminOrg {
  id: string;
  /** Display name (called `name` in the API). */
  name: string;
  recordCount?: number;
  createdAt: string;
  /** Suggested next API calls after org creation. */
  nextSteps?: NextStep[];
}

export interface AdminAgent {
  id: string;
  displayName: string | null;
  agentCardUrl?: string | null;
  recordCount?: number;
  createdAt: string;
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
  /** Internal name for the agent. */
  name: string;
  /** Customer-facing display name. */
  displayName: string;
  /** A2A agent card URL for verification. */
  agentCardUrl?: string;
}

/** Org configuration payload. */
export interface OrgConfig {
  id?: string;
  config?: Record<string, unknown>;
  nextSteps?: NextStep[];
  [key: string]: unknown;
}

/**
 * Parameters for merge-updating org configuration (PATCH semantics).
 * Only provided fields are updated.
 */
export interface SetOrgConfigParams {
  enforcement?: Record<string, unknown>;
  approvedSuppliers?: Record<string, unknown>;
}

/** Parameters for listing webhooks with optional URL filter. */
export interface ListWebhooksParams extends ListParams {
  /** Filter webhooks by exact URL match. */
  url?: string;
}

export interface AdminApiKey {
  id: string;
  /** API key role: admin, agent, or platform. */
  role?: ApiKeyRole | (string & {});
  ownerId: string;
  ownerType: ApiKeyRole;
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
  ownerType: ApiKeyRole;
  /** Human-readable label. */
  label?: string;
  /** Explicit scopes to set on the key. */
  scopes?: string[];
  /** Convenience profile name — expands to a predefined scope array. Takes precedence over `scopes`. */
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
 * time (the API rejects them here — `additionalProperties: false`).
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
  /** The raw key string — show once, then discard. Prefix matches role (agl_adm_, agl_agt_, agl_plt_). */
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

export interface SystemHealth {
  database: string;
  queue: string;
  cache: string;
  uptime: number;
  activeConnections: number;
}

export interface DeactivateOrgParams {
  reason?: string;
}

export interface DeactivateAgentParams {
  reason?: string;
}

export interface SetCapabilitiesParams {
  contractTypes: string[];
}

/** Snapshot of an owner's rate-limit exemption. */
export interface RateLimitExemption {
  ownerId: string;
  ownerType?: ApiKeyRole | (string & {});
  reason?: string | null;
  createdAt?: string;
}

/** Static-provisioning status payload. */
export interface ProvisioningStatus {
  loaded: boolean;
  sourcePath?: string | null;
  lastLoadedAt?: string | null;
  entries?: Record<string, number>;
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
  since?: string;
  until?: string;
  format?: 'json' | 'csv' | 'ndjson';
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
  /** Stable code alias — some endpoints set `code`, others set `error`; SDK normalizes. */
  code?: string;
  /** Whether the client should retry this request. */
  retryable?: boolean;
  /** Validation error details (present on 400/422). */
  details?: ValidationErrorDetail[] | Record<string, unknown> | unknown[] | null;
  /** Structured validation errors (RFC 9457 extension, present on 400). */
  errors?: Record<string, unknown>[] | null;
  /** Suggested correction when a typo is detected. */
  suggestion?: string;
  /** Documentation link. */
  docUrl?: string;
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
  /** F-677: parent record id on the firing Server (the peer projects the delegation edge). */
  parentRecordId?: string;
  /** F-677: root record id of the delegation tree on the firing Server. */
  rootRecordId?: string;
  /** F-677: delegation depth (0 = root). Omitted for non-delegated transitions. */
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
   * F-722 / CR-11: machine-readable cause for the signal
   * (`AUTO_SETTLE` / `AUTO_SETTLE_WITHIN_TOLERANCE` / `AUTO_FAIL` /
   * `PRINCIPAL_ACCEPT` / `PRINCIPAL_REJECT` / `DISPUTE_OVERTURNED` / `TIMED_OUT` /
   * `REMEDIATED` / `CANCEL_PRE_WORK` / `CANCEL_IN_PROGRESS` / `OVERFLOW_REJECT` /
   * `ARBITRATION_*` …). `AUTO_SETTLE_WITHIN_TOLERANCE` (API #824) marks an
   * auto-settle that cleared only via a non-zero tolerance band. Null on older peers.
   */
  reasonCode?: string | null;
  /** F-722 / CR-11: ruleIds that failed when a gate evaluation produced this HOLD. Null for non-rule terminals or older peers. */
  failingRuleIds?: string[] | null;
  /** F-722 / CR-11: free-text hint (engine summary or principal verdict notes). Null on older peers. */
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


/** Parameters for submitting a federation dispute-protocol message. */
export interface SubmitDisputeProtocolParams {
  recordId: string;
  /** Dispute-protocol action (e.g. `open`, `escalate`, `resolve`, `withdraw`). */
  action: string;
  disputeId: string;
  disputeStatus: string;
  idempotencyKey: string;
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


/** Parameters for establishing a peer relationship with another AGLedger instance. */
export interface PeerHandshakeParams {
  peerHubId: string;
  peerUrl: string;
  signingPublicKey: string;
  encryptionPublicKey: string;
  peeringToken: string;
  boundOrgId: string;
  agentDirectory: Array<{ agentId: string; types: string[] }>;
}

/** Result of a peer handshake. */
export interface PeerHandshakeResult {
  established: boolean;
  peerHubId?: string;
  [key: string]: unknown;
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
  agentClass?: string;
  ownerRef?: string;
  orgUnit?: string;
  description?: string;
}


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
  references?: Record<string, unknown>[];
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

/** pg-boss job state for an asynchronous vault integrity scan. */
export type VaultScanState = 'created' | 'active' | 'completed' | 'failed' | 'expired';

/** A broken-record finding from a vault scan. */
export interface VaultScanBrokenRecord {
  recordId: string;
  brokenAt: number;
  reason: string;
  expectedEntries?: number;
}

/** Scan findings — present once `state === 'completed'`, otherwise null. */
export interface VaultScanResult {
  recordsScanned: number;
  verified: number;
  broken: number;
  signatureErrors: number;
  healthy: boolean;
  brokenRecords: VaultScanBrokenRecord[];
  brokenRecordsTruncated: boolean;
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

/** Response of `GET /v1/admin/vault/scan` — current and recent scan jobs. */
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
  /** Where the license was loaded from (e.g. 'env', 'file', 'default'). */
  source?: string;
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
  /** Base64-encoded SPKI DER public key. */
  publicKey: string;
  /**
   * Base64 of the raw 32-byte Ed25519 public key — what raw-key verifiers
   * (RFC 9421 / Standard-Webhooks-style) consume, vs the SPKI-DER `publicKey`.
   * Same key, different encoding.
   */
  publicKeyRaw: string;
  status: 'active' | 'retired' | (string & {});
  activatedAt: string;
  retiredAt: string | null;
}

/** Response from GET /v1/verification-keys. */
export interface VerificationKeysResponse {
  data: VerificationKey[];
  canonicalization: string;
  /**
   * Hash basis advertised by the engine. Optional — not every server build
   * emits it; absent means the implicit COSE/Ed25519 default (`SHA-256`).
   * Track-with-Python parity fix for F-706.
   */
  hashAlgorithm?: string;
  signatureAlgorithm?: string;
  /** Template for the canonical signature-input string (v0.25.x). */
  signatureInputTemplate?: string;
}


/** A peer server in hub-to-hub federation. */
export interface FederationPeer {
  hubId: string;
  name: string;
  endpoint: string;
  status: 'active' | 'suspended' | 'revoked';
  publicKey: string;
  lastSyncAt: string | null;
  registeredAt: string;
}

/** A single-use peering token for hub-to-hub federation setup. */
export interface PeeringToken {
  token: string;
  expiresAt: string;
}


/** Parameters for contributing aggregated reputation data for an agent. */
export interface ContributeReputationParams {
  agentId: string;
  type: string;
  /** Reporting period (e.g. '2026-Q2'). */
  period: string;
  totalRecords: number;
  totalVerified: number;
  totalPassed: number;
  signature?: string;
}

/** Aggregated federated reputation for an agent. */
export interface FederationAgentReputation {
  agentId: string;
  overallScore: number;
  contributions: number;
  byType: Record<string, { score: number; count: number }>;
}


/** Parameters for synchronizing the agent directory with a peer. */
export interface AgentDirectorySyncParams {
  peerHubId: string;
  agents: Array<{ agentId: string; types: string[] }>;
  directoryHash: string;
  /** Optional incremental-sync watermark. */
  since?: string;
}

/** Who a trusted issuer's tokens may authenticate as. */
export type TrustedIssuerAppliesTo = 'agent' | 'principal' | 'admin' | 'any';

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

/** Parameters for `POST /v1/auth/oidc/cert` — exchange an OIDC token for a cert. */
/** Options for {@link AuthResource.rotateKey}. */
export interface RotateKeyParams {
  /**
   * Overlap window (seconds) the OLD key stays valid after rotation (API #793).
   * Omit to revoke the old key immediately.
   */
  gracePeriodSeconds?: number;
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

/** Result of issuing an ephemeral cert — the cert plus its detached JWS. */
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
    status: string;
    uptimeSeconds: number;
    databaseLatencyMs: number | null;
  };
  queues: Record<string, unknown>;
  federation: {
    peers: { active: number; suspended: number; revoked: number };
  };
  vault: {
    signingKeys: { active: number; retired: number };
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
  createdAt: string;
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


/**
 * A vault checkpoint row used for offline integrity verification.
 * Each row corresponds to a hash-chained vault entry for a specific record.
 */
export interface VaultCheckpoint {
  id: string;
  recordId: string;
  chainPosition: number;
  payloadHash: string;
  signature: string | null;
  signingKeyId: string | null;
  signatureAlg: string | null;
  createdAt: string;
}

/** Query parameters for listing vault checkpoints. */
export interface ListVaultCheckpointsParams extends ListParams {
  recordId?: string;
}


/** Parameters for withdrawing a dispute. Reason is optional context. */
export interface WithdrawDisputeParams {
  reason?: string;
}
