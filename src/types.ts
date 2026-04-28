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
    status: number;
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
 * Record Type identifier (e.g. 'ACH-PROC-v1').
 *
 * Known values: ACH-PROC-v1, ACH-DLVR-v1, ACH-DATA-v1, ACH-TXN-v1, ACH-ORCH-v1,
 * ACH-COMM-v1, ACH-AUTH-v1, ACH-INFRA-v1, ACH-DEL-v1, ACH-ANALYZE-v1,
 * ACH-COORD-v1, ACH-MON-v1, ACH-REVIEW-v1. Accepts any string for forward
 * compatibility (custom Types registered via the Schema Development Toolkit).
 */
export type RecordType =
  | 'ACH-PROC-v1'
  | 'ACH-DLVR-v1'
  | 'ACH-DATA-v1'
  | 'ACH-TXN-v1'
  | 'ACH-ORCH-v1'
  | 'ACH-COMM-v1'
  | 'ACH-AUTH-v1'
  | 'ACH-INFRA-v1'
  | 'ACH-DEL-v1'
  | 'ACH-ANALYZE-v1'
  | 'ACH-COORD-v1'
  | 'ACH-MON-v1'
  | 'ACH-REVIEW-v1'
  | (string & {});


export interface Denomination {
  amount: number;
  currency: string;
}

// Typed Criteria per Record Type (Agentic Contract Specification)
//
// These interfaces describe the known fields for each Type.
// All criteria types also accept additional fields via intersection
// with Record<string, unknown> for forward compatibility.

/** ACH-PROC-v1: Resource acquisition and provisioning requests. */
export interface ProcurementCriteria {
  item_spec: string;
  quantity?: { target: number; tolerance_pct?: number; unit?: string };
  price_ceiling?: Denomination;
  deadline?: string;
  supplier_requirements?: { approved_list_ref?: string; min_rating?: number };
}

/** ACH-DLVR-v1: Reports, documents, and generated artifacts. */
export interface DeliverableCriteria {
  description: string;
  output_format?: string;
  language?: string;
  min_items?: number;
  budget?: Denomination;
  deadline?: string;
}

/** ACH-DATA-v1: Data processing, ETL, analysis, and transformation. */
export interface DataProcessingCriteria {
  description: string;
  output_format?: string;
  row_count_min?: number;
  budget?: Denomination;
  deadline?: string;
}

/** ACH-TXN-v1: Internal transfers, ledger entries, and settlements. */
export interface TransactionCriteria {
  description: string;
  budget?: Denomination;
  deadline?: string;
}

/** ACH-ORCH-v1: Task delegation and multi-agent coordination. */
export interface OrchestrationCriteria {
  description: string;
  target_agent?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  deadline?: string;
  delegation_depth?: number;
  parent_record_ref?: string;
}

/** ACH-COMM-v1: Notifications, messages, and alerting. */
export interface CommunicationCriteria {
  description: string;
  channel_type?: 'email' | 'chat' | 'sms' | 'webhook' | 'notification' | 'ticket';
  recipient?: string;
  subject?: string;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  requires_delivery_confirmation?: boolean;
}

/** ACH-AUTH-v1: Permission changes, credential grants, and access control. */
export interface AuthorizationCriteria {
  description: string;
  permission_change?: string;
  target_principal?: string;
  resource?: string;
  scope?: string;
  duration?: string;
  approval_required?: boolean;
}

/** ACH-INFRA-v1: Infrastructure changes, cloud provisioning, and config updates. */
export interface InfrastructureCriteria {
  description: string;
  action?: string;
  resource_type?: string;
  resource_name?: string;
  environment?: string;
  config_changes?: Record<string, unknown>;
  estimated_cost?: Denomination;
}

/** ACH-DEL-v1: Deletions, cancellations, and reversals. */
export interface DestructiveCriteria {
  description: string;
  action?: string;
  target?: string;
  reversible?: boolean;
  approval_chain?: string[];
}

/** ACH-ANALYZE-v1: Research, analysis, and investigation tasks. */
export interface AnalyzeCriteria {
  description: string;
  research_question?: string;
  scope?: string;
  budget?: Denomination;
  deadline?: string;
}

/** ACH-COORD-v1: Multi-party coordination and consensus building. */
export interface CoordinationCriteria {
  description: string;
  participants?: string[];
  consensus_threshold?: number;
  deadline?: string;
}

/** ACH-MON-v1: Monitoring, observation, threshold tracking, and alerts. */
export interface MonitoringCriteria {
  description: string;
  observed_resource?: string;
  threshold?: number;
  comparison?: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  duration_seconds?: number;
}

/** ACH-REVIEW-v1: Review, approval, and quality gate decisions. */
export interface ReviewCriteria {
  description: string;
  artifact_ref?: string;
  reviewers?: string[];
  approval_count?: number;
  rubric?: Record<string, unknown>;
}


/** ACH-PROC-v1 receipt evidence. */
export interface ProcurementEvidence {
  deliverable: string;
  deliverable_type: string;
  summary: string;
  quantity_supplied?: number;
  unit_price?: Denomination;
  total_cost?: Denomination;
  supplier?: string;
  submitted_at?: string;
}

/** ACH-DLVR-v1 receipt evidence. */
export interface DeliverableEvidence {
  deliverable: string;
  deliverable_type: string;
  summary: string;
  item_count?: number;
  language?: string;
  word_count?: number;
  submitted_at?: string;
}

/** ACH-DATA-v1 receipt evidence. */
export interface DataProcessingEvidence {
  deliverable: string;
  deliverable_type: string;
  summary?: string;
  row_count?: number;
  byte_count?: number;
  schema_summary?: string;
  submitted_at?: string;
}

/** ACH-TXN-v1 receipt evidence. */
export interface TransactionEvidence {
  deliverable: string;
  deliverable_type: string;
  summary: string;
  amount?: Denomination;
  reference?: string;
  submitted_at?: string;
}

/** ACH-ORCH-v1 receipt evidence. */
export interface OrchestrationEvidence {
  deliverable: string;
  deliverable_type: string;
  summary: string;
  participants?: number;
  sub_records_created?: number;
  sub_records_fulfilled?: number;
  submitted_at?: string;
}

/** ACH-COMM-v1 receipt evidence. */
export interface CommunicationEvidence {
  deliverable: string;
  deliverable_type: string;
  summary: string;
  channel_type?: string;
  delivery_status?: string;
  recipients_count?: number;
  delivery_receipt?: string;
  submitted_at?: string;
}

/** ACH-AUTH-v1 receipt evidence. */
export interface AuthorizationEvidence {
  deliverable: string;
  deliverable_type: string;
  summary: string;
  approver?: string;
  granted?: boolean;
  granted_at?: string;
  submitted_at?: string;
}

/** ACH-INFRA-v1 receipt evidence. */
export interface InfrastructureEvidence {
  action: string;
  resource_name: string;
  resource_type: string;
  status: string;
  environment: string;
  cost?: Denomination;
  submitted_at?: string;
}

/** ACH-ANALYZE-v1 receipt evidence. */
export interface AnalyzeEvidence {
  deliverable: string;
  deliverable_type: string;
  summary: string;
  sources_consulted?: number;
  confidence_score?: number;
  submitted_at?: string;
}

/** ACH-COORD-v1 receipt evidence. */
export interface CoordinationEvidence {
  deliverable: string;
  deliverable_type: string;
  summary: string;
  participants_engaged?: number;
  sub_records_created?: number;
  sub_records_fulfilled?: number;
  submitted_at?: string;
}

/** ACH-DEL-v1 receipt evidence. */
export interface DestructiveEvidence {
  action: string;
  target_identifier?: string;
  deletion_count?: number;
  status?: string;
  cancellation_ref?: string;
  reversal_ref?: string;
  reversal_amount?: number;
  justification?: string;
  performed_at?: string;
}

/** ACH-MON-v1 receipt evidence. */
export interface MonitoringEvidence {
  deliverable: string;
  deliverable_type: string;
  summary: string;
  alerts_triggered?: number;
  observations?: number;
  check_count?: number;
  condition_met?: boolean;
  submitted_at?: string;
}

/** ACH-REVIEW-v1 receipt evidence. */
export interface ReviewEvidence {
  decision: string;
  justification: string;
  artifact_ref: string;
  criteria_evaluated?: string[];
  findings?: Array<{ criterion: string; result: string; notes?: string }>;
  submitted_at?: string;
}


/** Maps known Type strings to their criteria interfaces. */
export interface CriteriaMap {
  'ACH-PROC-v1': ProcurementCriteria;
  'ACH-DLVR-v1': DeliverableCriteria;
  'ACH-DATA-v1': DataProcessingCriteria;
  'ACH-TXN-v1': TransactionCriteria;
  'ACH-ORCH-v1': OrchestrationCriteria;
  'ACH-COMM-v1': CommunicationCriteria;
  'ACH-AUTH-v1': AuthorizationCriteria;
  'ACH-INFRA-v1': InfrastructureCriteria;
  'ACH-DEL-v1': DestructiveCriteria;
  'ACH-ANALYZE-v1': AnalyzeCriteria;
  'ACH-COORD-v1': CoordinationCriteria;
  'ACH-MON-v1': MonitoringCriteria;
  'ACH-REVIEW-v1': ReviewCriteria;
}

/** Maps known Type strings to their evidence interfaces. */
export interface EvidenceMap {
  'ACH-PROC-v1': ProcurementEvidence;
  'ACH-DLVR-v1': DeliverableEvidence;
  'ACH-DATA-v1': DataProcessingEvidence;
  'ACH-TXN-v1': TransactionEvidence;
  'ACH-ORCH-v1': OrchestrationEvidence;
  'ACH-COMM-v1': CommunicationEvidence;
  'ACH-AUTH-v1': AuthorizationEvidence;
  'ACH-INFRA-v1': InfrastructureEvidence;
  'ACH-DEL-v1': DestructiveEvidence;
  'ACH-ANALYZE-v1': AnalyzeEvidence;
  'ACH-COORD-v1': CoordinationEvidence;
  'ACH-MON-v1': MonitoringEvidence;
  'ACH-REVIEW-v1': ReviewEvidence;
}

/** Resolves to the typed criteria for known Types, or Record<string, unknown> for unknown Types. */
export type CriteriaFor<T extends string> =
  T extends keyof CriteriaMap ? CriteriaMap[T] & Record<string, unknown> : Record<string, unknown>;

/** Resolves to the typed evidence for known Types, or Record<string, unknown> for unknown Types. */
export type EvidenceFor<T extends string> =
  T extends keyof EvidenceMap ? EvidenceMap[T] & Record<string, unknown> : Record<string, unknown>;

/** Typed Record creation params for a specific Type. */
export type TypedCreateRecordParams<T extends string> = Omit<CreateRecordParams, 'type' | 'criteria'> & {
  type: T;
  criteria: CriteriaFor<T>;
};

/** Typed receipt submission params for a specific Type. */
export type TypedSubmitReceiptParams<T extends string> = Omit<SubmitReceiptParams, 'evidence'> & {
  evidence: EvidenceFor<T>;
};

export interface TypeSchema {
  type: RecordType;
  displayName?: string;
  description?: string;
  category?: string;
  isBuiltin?: boolean;
  version?: number;
  latestVersion?: number;
  status?: SchemaVersionStatus;
  recordSchema: Record<string, unknown>;
  receiptSchema: Record<string, unknown>;
  rulesConfig?: {
    type?: string;
    syncRuleIds: string[];
    asyncRuleIds: string[];
    fieldMappings?: Record<string, unknown>[];
    commissionSourceField?: string;
  };
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
    minimalReceipt: Record<string, unknown>;
  };
}

/** Known values for SchemaFieldMapping.valueType. Accepts 'expression' for expression-based rules. */
export type SchemaFieldMappingValueType = 'number' | 'denomination' | 'string' | 'boolean' | 'datetime' | 'expression';

/** Field mapping between Record criteria and receipt evidence for verification rules. */
export interface SchemaFieldMapping {
  ruleId: string;
  criteriaPath: string;
  evidencePath: string;
  toleranceField?: string;
  valueType: SchemaFieldMappingValueType;
  /** Safe expression string. Required when valueType is 'expression'. */
  expression?: string;
}

/** Template for creating a new Record type schema. */
export interface SchemaTemplate {
  sourceType: RecordType | null;
  template: {
    type: string;
    displayName: string;
    description: string;
    recordSchema: Record<string, unknown>;
    receiptSchema: Record<string, unknown>;
    fieldMappings: SchemaFieldMapping[];
  };
}

/** Input for previewing a schema before registration. */
export interface SchemaPreviewInput {
  type: string;
  displayName: string;
  description?: string;
  category?: string;
  recordSchema: Record<string, unknown>;
  receiptSchema?: Record<string, unknown>;
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
  receipt: { changes: SchemaDiffChange[] };
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
}

/** Individual version within a schema export. */
export interface SchemaExportVersion {
  version: number;
  status: SchemaVersionStatus;
  recordSchema: Record<string, unknown>;
  receiptSchema: Record<string, unknown>;
  rulesConfig: Record<string, unknown>;
  createdAt: string;
}

/** Payload for importing a schema bundle. */
export interface SchemaImportPayload {
  exportVersion: number;
  exportedAt?: string;
  type: string;
  compatibilityMode?: string;
  versions: Record<string, unknown>[];
  [key: string]: unknown;
}

/** Result of a schema import. */
export interface SchemaImportResult {
  imported: {
    type: string;
    versionsCreated: number[];
    subjectIds: string[];
  };
}

/** Result of a dry-run schema import. */
export interface SchemaImportDryRunResult {
  valid: boolean;
  wouldCreate: {
    type: string;
    versions: number[];
  };
}

/** Parameters for registering a new custom Type schema. */
export interface RegisterSchemaParams {
  type: string;
  displayName: string;
  description?: string;
  category?: string;
  recordSchema: Record<string, unknown>;
  receiptSchema?: Record<string, unknown>;
  fieldMappings?: SchemaFieldMapping[];
  compatibilityMode?: SchemaCompatibilityMode;
}

/** Detail for a specific schema version. */
export interface SchemaVersionDetail {
  id: string;
  type: RecordType;
  version: number;
  enterpriseId: string | null;
  displayName: string;
  description: string;
  category: string;
  compatibilityMode: SchemaCompatibilityMode;
  status: SchemaVersionStatus;
  isBuiltin: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Parameters for updating a schema version. */
export interface UpdateSchemaVersionParams {
  status?: SchemaVersionStatus;
  compatibilityMode?: SchemaCompatibilityMode;
}

/** Result of a compatibility check against an existing schema. */
export interface SchemaCompatibilityResult {
  record: { compatible: boolean; changes: SchemaDiffChange[] };
  receipt: { compatible: boolean; changes: SchemaDiffChange[] };
}

/** Options for exporting a schema. */
export interface ExportSchemaOptions {
  versions?: string;
  enterpriseId?: string;
}

/** Options for importing a schema. */
export interface ImportSchemaOptions {
  dryRun?: boolean;
  enterpriseId?: string;
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
/** Known values: auto, principal, gated. Accepts any string for forward compatibility. */
export type VerificationMode = 'auto' | 'principal' | 'gated' | (string & {});

export type RiskClassification = 'high' | 'limited' | 'minimal' | 'unclassified';

/** Constraint inheritance mode from parent Record. */
export type ConstraintInheritanceMode = 'none' | 'advisory' | 'enforced';

/** Dispute evidence types. */
export type EvidenceType = 'screenshot' | 'external_lookup' | 'document' | 'communication' | 'other' | (string & {});


/**
 * Inline tamper-evident receipt for the head of a Record's audit chain.
 *
 * Lets a notarize-only caller verify the Record was chained without a
 * follow-up call to `/v1/records/{id}/audit-export`.
 */
export interface VaultReceipt {
  /** Per-Record monotonic chain position of the head entry (1-indexed). */
  chainPosition: number;
  /** Hex sha256 over the canonical (RFC 8785) entry payload. */
  leafHash: string;
  /** leafHash of the prior entry (null only on chainPosition === 1). */
  previousHash: string | null;
  /** Ed25519 signature over (chainPosition, leafHash, previousHash). Null when the engine boots without a vault signing key. */
  signature: string | null;
  /** ID of the vault signing key — resolves to a public key at GET /v1/verification-keys. */
  signingKeyId: string | null;
  /** Most recent signed checkpoint covering this chain position, or null until the next 6h sweep. */
  signedCheckpointRef: string | null;
}

/**
 * SCITT-style inclusion-proof receipt. Present only on tenant-admin
 * cross-party reads — proves the read was logged.
 */
export interface RecordReadReceipt {
  /** Per-enterprise monotonic leaf index in the tenant_admin_reads chain. */
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
  /** Enterprise tenant that owns this Record. */
  enterpriseId: string;
  /** Agent assigned as performer, or null if unassigned. */
  agentId: string | null;
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
  /** Verification mode: auto (rules auto-settle), principal (hold for verdict), gated (rules then verdict). */
  verificationMode?: VerificationMode;
  /** EU AI Act risk classification. */
  riskClassification?: RiskClassification;
  /** EU AI Act high-risk domain (only when riskClassification=high). */
  euAiActDomain?: string | null;
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
  /** Delegation-shell indicator: true when parent's principal enterprise equals this child's performer enterprise. NULL on root and on children without a performer. Informational only. */
  parentPrincipalEnterpriseMatchesPerformer?: boolean | null;
  /** Reason provided for the last state transition. */
  lastTransitionReason?: string | null;
  /** Actor who triggered the last state transition. */
  lastTransitionBy?: string | null;
  /** Reason from the most recent verdict or revision request. Persists across subsequent state changes. */
  lastVerdictReason?: string | null;
  /** ISO 8601 timestamp of the most recent verdict or revision request. */
  lastVerdictAt?: string | null;
  /** Number of receipt submissions so far. */
  submissionCount: number;
  /** Maximum allowed submissions, or null for unlimited. */
  maxSubmissions: number | null;
  /** Number of revisions consumed by RESUBMIT_RECEIPT calls. */
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
  /** Hint for receipt evidence fields, or null if no receipt expected. Use schemaUrl for the full JSON Schema. */
  receiptHint?: { requiredFields: string[]; optionalFields?: string[]; schemaUrl?: string } | null;
  /** Advisory enforcement warnings from the most recent transition. */
  advisoryWarnings?: Array<{ rule: string; message: string; details?: Record<string, unknown> }>;
  /** URL to the Type schema definition. */
  schemaUrl?: string;
  /** Verification check results, or null if not yet verified. */
  verificationChecks?: Record<string, unknown> | null;
  /** Overall verification outcome: PASS, FAIL, or null if not verified. */
  verificationOutcome?: 'PASS' | 'FAIL' | null;
  /** True when principal and performer are the same agent at creation. Auto-verdict is blocked on self-commits. */
  selfCommitment?: boolean;
  /** Constraint inheritance mode from parent Record. */
  constraintInheritance?: ConstraintInheritanceMode;
  /** True when a transition was a no-op (already in target state). */
  noOp?: boolean;
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
  references?: Array<{
    id: string;
    system: string;
    refType: string;
    refId: string;
    displayName?: string | null;
    uri?: string | null;
    attributes?: Record<string, unknown>;
    createdAt: string;
    createdBy: string;
  }>;
  /** Suggested next API calls based on current Record state. */
  nextSteps?: NextStep[];
  /** Inline tamper-evident receipt for the head of this Record's audit chain. */
  vaultReceipt?: VaultReceipt;
  /** SCITT-style inclusion-proof receipt; present only on tenant-admin cross-party reads. */
  recordRead?: RecordReadReceipt;
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
  /** Optional alias for `performerAgentId`; accepted by the API for backward compat. */
  agentId?: string;
  /**
   * Enterprise tenant scope. Optional — admin keys typically leave this to
   * the server to infer from the key's tenant context.
   */
  enterpriseId?: string;
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
  /** Max receipt submissions allowed. Null/omit for unlimited. */
  maxSubmissions?: number;
  /** Operating mode: cleartext (default) or encrypted. */
  operatingMode?: OperatingMode;
  /** Verification mode: auto (default), principal (hold for verdict), gated (rules then verdict). */
  verificationMode?: VerificationMode;
  /** EU AI Act risk classification. */
  riskClassification?: RiskClassification;
  /** EU AI Act domain. */
  euAiActDomain?: string;
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
  /** Free-form category — surfaced on the response. */
  category?: string;
  /** Optional outcome (success/failure/denied/partial); stored on metadata.outcome and surfaced on the response. */
  outcome?: 'success' | 'failure' | 'denied' | 'partial' | (string & {});
  /** Optional grouping ID — multiple Records sharing a correlationId can be queried together. */
  correlationId?: string;
  /** Free-form identifier of the human or upstream system that asked for the work. */
  requestedBy?: string;
  /** Auto-transition to ACTIVE after create (CREATED → register → activate in one request). */
  autoActivate?: boolean;
  /** Proposal message shown to the performer for A2A negotiation. */
  proposalMessage?: string;
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
  euAiActDomain?: string;
  humanOversight?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface ListRecordsParams extends ListParams {
  enterpriseId?: string;
  status?: RecordStatus;
}

export interface SearchRecordsParams extends ListParams {
  enterpriseId?: string;
  status?: RecordStatus;
  type?: RecordType;
  agentId?: string;
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
  verificationMode?: VerificationMode;
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


/** Structural validation result for receipts. */
export type StructuralValidation = 'ACCEPTED' | 'INVALID' | 'WARNING' | (string & {});

/**
 * A receipt — structured evidence submitted by a performer claiming completion of a Record.
 * The principal reviews the receipt and renders a verdict (accept/reject).
 */
export interface Receipt {
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
  /** Idempotency key used when submitting. */
  idempotencyKey?: string | null;
  createdAt: string;
  /** Suggested next API calls after receipt submission. */
  nextSteps?: NextStep[];
}

export interface SubmitReceiptParams {
  evidence: Record<string, unknown>;
  evidenceHash?: string;
  idempotencyKey?: string;
}


/** Known values: PASS, FAIL, REVIEW_REQUIRED. Accepts any string for forward compatibility. */
export type VerificationOutcome = 'PASS' | 'FAIL' | 'REVIEW_REQUIRED' | (string & {});
/** Known values: SETTLE, HOLD, RELEASE. Accepts any string for forward compatibility. */
export type SettlementSignal = 'SETTLE' | 'HOLD' | 'RELEASE' | (string & {});

export interface VerificationResult {
  recordId: string;
  receipts: Array<{
    receiptId: string;
    phase1Result?: Record<string, unknown>;
    phase2Result?: Record<string, unknown>;
  }>;
  overallStatus: string;
}

export interface VerificationStatus {
  recordId: string;
  phase1Status: string;
  phase2Status: string;
  lastVerifiedAt?: string;
  pendingRules?: string[];
}


export interface ReportOutcomeParams {
  receiptId: string;
  outcome: 'PASS' | 'FAIL';
  checks?: Record<string, unknown>;
}

export interface OutcomeResult {
  recordId: string;
  receiptId: string;
  outcome: 'PASS' | 'FAIL';
  signal: SettlementSignal;
  reporterType: string;
  reportedAt: string;
  /** Suggested next API calls after reporting outcome. */
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
  | 'fraudulent_receipt'
  | 'record_ambiguity'
  | 'pricing_dispute'
  | 'quality_issue'
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

/** Response envelope from GET /dispute — includes both dispute and evidence. */
export interface DisputeResponse {
  dispute: Dispute;
  evidence: Array<{ evidenceType: string; payload: Record<string, unknown>; submittedAt: string }>;
}

export interface CreateDisputeParams {
  grounds: DisputeGrounds;
  context?: string;
}

/** Query parameters for the tenant-wide dispute listing. */
export interface ListDisputesParams extends ListParams {
  status?: DisputeStatus;
  recordId?: string;
}


/** Known webhook event types matching the AGLedger API. Accepts any string for forward compatibility. */
export type WebhookEventType =
  | 'record.created'
  | 'record.receipt_submitted'
  | 'record.verification_complete'
  | 'record.fulfilled'
  | 'record.settled'
  | 'record.failed'
  | 'record.expired'
  | 'record.cancelled'
  | 'record.proposed'
  | 'record.proposal_accepted'
  | 'record.proposal_rejected'
  | 'record.delegated'
  | 'signal.emitted'
  | 'dispute.opened'
  | 'dispute.resolved'
  | 'record.revision_requested'
  | 'federation.record.offered'
  | 'federation.record.accepted'
  | 'federation.record.state_changed'
  | 'federation.settlement.signal'
  | 'federation.gateway.registered'
  | 'federation.gateway.revoked'
  | 'record.reference_added'
  | 'agent.reference_added'
  | (string & {});

export interface Webhook {
  id: string;
  url: string;
  eventTypes: WebhookEventType[] | null;
  isActive: boolean;
  /** Whether deliveries are paused. */
  isPaused: boolean;
  format: 'standard' | 'cloudevents';
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
  createdAt: string;
  /** Suggested next API calls for this webhook. */
  nextSteps?: NextStep[];
}

export interface CreateWebhookParams {
  url: string;
  eventTypes: WebhookEventType[];
  format?: 'standard' | 'cloudevents';
}

export interface WebhookDelivery {
  id: string;
  eventType: string;
  status: string;
  attemptNumber: number;
  responseStatus: number | null;
  responseBody: string | null;
  signature: string | null;
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
  reliabilityScore: number;
  accuracyScore: number;
  efficiencyScore: number;
  compositeScore: number;
  confidenceLevel: string;
  formulaVersion: string;
  totalRecords: number;
  totalPassed: number;
  totalVerified: number;
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

/** Per (principal, performer) verdict statistics surfaced by `/v1/records/me/verdict-statistics`. */
export interface VerdictStatistics {
  data: Array<{
    principalAgentId: string;
    performerAgentId: string;
    verdictPassCount: number;
    verdictFailCount: number;
    cancelAfterReceiptCount: number;
  }>;
}


export interface AgledgerEvent {
  id: string;
  eventType: string;
  recordId: string | null;
  agentId: string | null;
  payload: Record<string, unknown>;
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
  format: 'csv' | 'json';
  filters?: {
    enterpriseId?: string;
    from?: string;
    to?: string;
    types?: RecordType[];
  };
}

export interface AiImpactAssessment {
  id: string;
  recordId: string;
  riskLevel: RiskClassification;
  domain: string;
  overseerName?: string;
  humanOversight?: Record<string, unknown>;
  testingResults?: Record<string, unknown>;
  createdAt: string;
}

export interface CreateAiImpactAssessmentParams {
  riskLevel: RiskClassification;
  domain: string;
  humanOversight?: Record<string, unknown>;
  testingResults?: Record<string, unknown>;
}

export interface EuAiActReport {
  records: Array<{
    id: string;
    riskClassification: RiskClassification;
    domain: string;
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
  enterpriseId: string;
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
  position: number;
  timestamp: string;
  entryType: string;
  description: string;
  payload: Record<string, unknown>;
  /** Actor envelope surfaced from canonical payload's `_actor` key. */
  actor?: AuditActor;
  integrity: {
    payloadHash: string;
    /** Hash algorithm (e.g., 'SHA-256'). */
    hashAlg?: string;
    previousHash: string | null;
    signature: string | null;
    /** Signature algorithm (e.g., 'Ed25519'). */
    signatureAlg?: string;
    signingKeyId: string | null;
    valid: boolean;
  };
}

/** Audit export envelope returned by GET /v1/records/{id}/audit-export. */
export interface RecordAuditExport {
  exportMetadata: {
    recordId: string;
    enterpriseId: string | null;
    /** Record Type. */
    type: string;
    operatingMode?: 'cleartext' | 'encrypted';
    exportDate: string;
    totalEntries: number;
    /** Latest signed checkpoint position for this Record, or null if no checkpoint has been written yet. */
    expectedEntries?: number | null;
    chainIntegrity: boolean;
    chainIntegrityReason?: 'chain_broken_at' | 'audit_vault_row_missing_for_checkpoint' | 'checkpoint_hash_mismatch' | null;
    exportFormatVersion: string;
    canonicalization: string;
    /** Active signing key at export time (SPKI DER base64). */
    signingPublicKey: string | null;
    /**
     * Map of keyId → SPKI DER base64 public key. Includes retired keys referenced
     * by entries in this export. Required for offline verification when keys
     * have rotated mid-trail.
     */
    signingPublicKeys?: Record<string, string>;
  };
  entries: AuditExportEntry[];
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


/** Tenant-admin reads checkpoint (SCITT-style signed tree head). */
export interface TenantReadsCheckpoint {
  id: string;
  enterpriseId: string;
  treeSize: number;
  rootHash: string;
  /** Signed tree head bytes (base64 or canonical-bytes form, deployment-defined). */
  sthBytes?: string;
  signature?: string | null;
  signingKeyId?: string | null;
  createdAt: string;
  /** Witness cosignatures attached after creation. */
  cosignatures?: Array<{
    witnessKeyId: string;
    witnessSignature: string;
    cosignedAt: string;
  }>;
}

/** Cosign payload for a tenant-reads checkpoint. */
export interface CosignCheckpointParams {
  /** Identifier for the witness key (verifier-supplied; e.g. fingerprint or DID). */
  witnessKeyId: string;
  /** Witness signature over the checkpoint's STH bytes. Format/algorithm is the customer's choice. */
  witnessSignature: string;
}

/** Inclusion-proof response for a leaf within a tenant-reads checkpoint. */
export interface TenantReadsInclusionProof {
  checkpointId: string;
  leafIndex: number;
  leafHash: string;
  /** Sibling hashes from leaf up to the signed root. */
  proof: string[];
  rootHash: string;
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
    | 'EXPIRED'
    | 'REJECTED'
    | 'VERIFIED_FAIL'
    | 'CANCELLED_DRAFT'
    | 'CANCELLED_PRE_WORK'
    | 'CANCELLED_IN_PROGRESS'
    | (string & {});
  createdAt: string;
  activatedAt?: string;
  /** Required when terminalStatus = 'FULFILLED'. */
  fulfilledAt?: string;
  metadata?: Record<string, unknown> | null;
}

export interface AdminImportRecordsParams {
  enterpriseId: string;
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
  enterpriseId?: string;
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
  /** Enterprise ID the key is scoped to, if any. */
  enterpriseId?: string | null;
  name?: string | null;
  createdAt?: string | null;
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
  protocolVersion: string;
  features: string[];
  types: RecordType[];
  maxBatchSize?: number;
  rateLimits?: {
    requests: number;
    windowSeconds: number;
  };
}


export interface AdminEnterprise {
  id: string;
  /** Display name (called `name` in the API). */
  name: string;
  /** URL-safe identifier for the enterprise. Auto-generated if omitted on create. */
  slug: string;
  email?: string | null;
  recordCount?: number;
  createdAt: string;
  /** Suggested next API calls after enterprise creation. */
  nextSteps?: NextStep[];
}

export interface AdminAgent {
  id: string;
  displayName: string | null;
  /** URL-safe identifier for the agent. Auto-generated if omitted on create. */
  slug: string;
  email?: string | null;
  agentCardUrl?: string | null;
  recordCount?: number;
  createdAt: string;
  /** Suggested next API calls after agent creation. */
  nextSteps?: NextStep[];
}

/**
 * Parameters for creating a new enterprise via admin endpoint.
 * @example
 * ```ts
 * const enterprise = await client.admin.createEnterprise({ name: 'Acme Corp' });
 * console.log(enterprise.id, enterprise.slug);
 * ```
 */
export interface CreateEnterpriseParams {
  /** Legal or display name for the enterprise. */
  name: string;
  /** URL-safe slug (lowercase, hyphens). Auto-generated from name if omitted. */
  slug?: string;
  /** Contact email. */
  email?: string;
  /** Initial configuration object. */
  config?: Record<string, unknown>;
}

/**
 * Parameters for creating a new agent via admin endpoint.
 */
export interface CreateAgentParams {
  /** Display name for the agent. */
  name: string;
  /** URL-safe slug (lowercase, hyphens). Auto-generated from name if omitted. */
  slug?: string;
  /** Contact email. */
  email?: string;
  /** A2A agent card URL for verification. */
  agentCardUrl?: string;
  /** Enterprise ID the agent belongs to (for enterprise-scoped agents). */
  enterpriseId?: string;
}

/** Full enterprise configuration. Used with PUT semantics (full replace). */
export interface EnterpriseConfig {
  [key: string]: unknown;
}

/**
 * Parameters for replacing enterprise configuration (desired-state semantics).
 * The entire config object is replaced — omitted fields are removed.
 */
export interface SetEnterpriseConfigParams {
  [key: string]: unknown;
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

/** Parameters for PATCH /v1/admin/api-keys/{keyId}. */
export interface UpdateApiKeyParams {
  isActive?: boolean;
  label?: string | null;
  scopes?: string[] | null;
  scopeProfile?: string | null;
  expiresAt?: string | null;
  allowedIps?: string[] | null;
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

export interface DeactivateAccountParams {
  accountType: ApiKeyRole;
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
  /** Schema/field hints for 400 record/receipt creation errors. */
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


/** Hub-level state for a federated Record (simplified 6-state model). */
export type HubState = 'OFFERED' | 'ACCEPTED' | 'ACTIVE' | 'COMPLETED' | 'DISPUTED' | 'TERMINAL';

/** Gateway registration status. */
export type GatewayStatus = 'active' | 'suspended' | 'revoked';

/** Reason for revoking a gateway. */
export type RevocationReason = 'key_compromise' | 'decommission' | 'administrative';

/** Verification outcome for federated Records. */
export type FederationVerificationOutcome = 'PASS' | 'FAIL';

/** Settlement signal type relayed between gateways. */
export type FederationSettlementSignal = 'SETTLE' | 'HOLD' | 'RELEASE';

/** Federation audit log entry type. */
export type FederationAuditEntryType =
  | 'GATEWAY_REGISTERED'
  | 'GATEWAY_REVOKED'
  | 'GATEWAY_SUSPENDED'
  | 'GATEWAY_KEY_ROTATED'
  | 'AGENT_REGISTERED'
  | 'AGENT_REMOVED'
  | 'RECORD_OFFERED'
  | 'RECORD_STATE_SYNC'
  | 'SIGNAL_RELAYED'
  | 'TOKEN_CREATED'
  | 'ADMIN_REVOCATION'
  | 'SEQUENCE_RESET'
  | 'SEQUENCE_GAP'
  | 'HUB_KEY_ROTATED'
  | 'PEER_REGISTERED'
  | 'PEER_REVOKED'
  | 'AGENT_DIRECTORY_SYNCED'
  | 'REPUTATION_CONTRIBUTED';


/** Parameters for registering a new gateway with the federation hub. */
export interface RegisterGatewayParams {
  registrationToken: string;
  organizationId: string;
  signingPublicKey: string;
  encryptionPublicKey: string;
  endpointUrl: string;
  revocationSecret: string;
  timestamp: string;
  nonce: string;
  signature: string;
  displayName?: string;
  capabilities?: string[];
}

/** Result of gateway registration. Contains the bearer token for subsequent requests. */
export interface RegisterGatewayResult {
  gatewayId: string;
  hubSigningPublicKey: string;
  hubEncryptionPublicKey: string;
  bearerToken: string;
  bearerTokenExpiresAt: string;
  registeredAt: string;
}


/** Parameters for gateway heartbeat (token refresh). */
export interface HeartbeatParams {
  gatewayId: string;
  agentCount: number;
  recordCount: number;
  timestamp: string;
}

/** Result of a heartbeat. Contains a refreshed bearer token and revocation notices. */
export interface HeartbeatResult {
  ack: boolean;
  serverTime: string;
  bearerToken: string;
  bearerTokenExpiresAt: string;
  revocations: Array<{
    gatewayId: string;
    revokedAt: string;
    reason: string | null;
  }>;
}


/** Parameters for registering a federated agent. */
export interface RegisterFederatedAgentParams {
  agentId: string;
  types: string[];
  displayName?: string;
}

/** A federated agent visible in the federation directory. */
export interface FederationAgent {
  agentId: string;
  gatewayId: string;
  types: string[];
  displayName: string | null;
  registeredAt: string;
}

/** Parameters for listing federated agents. */
export interface ListFederatedAgentsParams extends ListParams {
  type?: string;
}


/** Parameters for submitting a cross-boundary state transition. */
export interface SubmitStateTransitionParams {
  recordId: string;
  gatewayId: string;
  state: string;
  type: string;
  criteriaHash: string;
  role: 'principal' | 'performer';
  seq: number;
  idempotencyKey: string;
  timestamp: string;
  nonce: string;
  signature: string;
  performerGatewayId?: string;
}

/** Result of a state transition submission. */
export interface StateTransitionResult {
  ack: boolean;
  hubState: HubState;
  subStatus: string;
  hubTimestamp: string;
  hubSignature: string;
}


/** Parameters for relaying a settlement signal. */
export interface RelaySignalParams {
  recordId: string;
  signal: FederationSettlementSignal;
  outcomeHash: string;
  signalSeq: number;
  validUntil: string;
  performerGatewayId: string;
  timestamp: string;
  nonce: string;
  performerSignature: string;
  outcome?: FederationVerificationOutcome | null;
}

/** Result of a signal relay. */
export interface SignalRelayResult {
  relayed: boolean;
  hubSignature: string;
  hubTimestamp: string;
  targetGatewayId: string;
}


/** Parameters for rotating a gateway's signing and encryption keys. */
export interface RotateGatewayKeyParams {
  newSigningPublicKey: string;
  newEncryptionPublicKey: string;
  signatureOldKey: string;
  signatureNewKey: string;
  timestamp: string;
  nonce: string;
}

/** Parameters for self-service gateway revocation (uses revocation secret, no auth). */
export interface RevokeGatewayParams {
  revocationSecret: string;
  reason: RevocationReason;
}


/** Parameters for fetching missed audit entries after a network partition. */
export interface FederationCatchUpParams {
  sincePosition: number;
  limit?: number;
}


/** Parameters for creating a federation registration token (admin). */
export interface CreateRegistrationTokenParams {
  label?: string;
  expiresInHours?: number;
  metadata?: Record<string, unknown> | null;
  allowedTypes?: string[];
}

/** A federation registration token. */
export interface FederationRegistrationToken {
  token: string;
  expiresAt: string;
}


/** Query parameters for listing federation gateways (admin). */
export interface ListFederationGatewaysParams extends ListParams {
  status?: GatewayStatus;
}

/** A registered federation gateway. */
export interface FederationGateway {
  gatewayId: string;
  organizationId: string;
  displayName: string | null;
  status: GatewayStatus;
  endpointUrl: string;
  capabilities: string[];
  lastHeartbeat: string | null;
  lastAgentCount: number;
  lastRecordCount: number;
  revokedAt: string | null;
  revocationReason: string | null;
  registeredAt: string;
}

/** Parameters for admin-initiated gateway revocation. */
export interface AdminRevokeGatewayParams {
  reason: string;
}

/** Parameters for resetting a gateway's sequence counter (admin). */
export interface ResetSequenceParams {
  newSeq?: number;
}


/** Query parameters for listing federation Records (admin). */
export interface QueryFederationRecordsParams extends ListParams {
  gatewayId?: string;
  hubState?: HubState;
  type?: string;
}

/** A federation Record as tracked by the hub. */
export interface FederationRecord {
  recordId: string;
  principalGatewayId: string;
  performerGatewayId: string | null;
  type: string;
  criteriaHash: string;
  hubState: HubState;
  subStatus: string | null;
  principalState: string | null;
  performerState: string | null;
  verificationOutcome: FederationVerificationOutcome | null;
  settlementSignal: FederationSettlementSignal | null;
  signalSeq: number;
  signalValidUntil: string | null;
  createdAt: string;
  updatedAt: string;
}


/** Query parameters for the federation audit log (admin). */
export interface FederationAuditLogParams extends ListParams {
  gatewayId?: string;
  entryType?: FederationAuditEntryType;
  recordId?: string;
}

/** A federation audit log entry (hash-chained). */
export interface FederationAuditEntry {
  id: string;
  entryType: FederationAuditEntryType;
  gatewayId: string | null;
  recordId: string | null;
  payload: Record<string, unknown>;
  payloadHash: string;
  previousHash: string | null;
  chainPosition: number;
  alg: string;
  signature: string | null;
  signatureAlg: string | null;
  signingKeyId: string | null;
  createdAt: string;
}


/** Federation health summary (admin). */
export interface FederationHealthSummary {
  gateways: {
    active: number;
    suspended: number;
    revoked: number;
  };
  records: Record<string, number>;
  auditChainLength: number;
  lastAuditEntry: string | null;
}


/** Query parameters for listing outbound DLQ entries (admin). */
export interface ListOutboundDlqParams {
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


/** Full agent identity returned by the agents resource. */
export interface AgentProfile {
  id: string;
  name: string;
  slug: string;
  agentClass: string | null;
  ownerRef: string | null;
  orgUnit: string | null;
  description: string | null;
  enterpriseId: string | null;
  agentCardUrl: string | null;
  createdAt: string;
  updatedAt: string;
}


/** An external reference linking an AGLedger entity to an external system. */
export interface EntityReference {
  system: string;
  refType: string;
  refId: string;
  metadata?: Record<string, unknown>;
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

/** Status of an asynchronous vault integrity scan job. */
export interface VaultScanJob {
  jobId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  entriesScanned?: number;
  errorsFound?: number;
  startedAt: string;
  completedAt?: string | null;
}


/** Auth cache statistics. */
export interface AuthCacheStats {
  size: number;
  hitRate: number;
  evictions: number;
}


/** License tier identifier. The API renamed `free` → `developer` in v0.17.0. */
export type LicenseTier = 'developer' | 'enterprise' | (string & {});

/** Platform license information and entitlements. */
export interface LicenseInfo {
  plan: LicenseTier;
  status: string;
  maxEnterprises?: number;
  maxAgents?: number;
  features: string[];
  expiresAt: string | null;
}


/** A vault signing public key for independent audit chain verification. */
export interface VerificationKey {
  keyId: string;
  algorithm: string;
  publicKey: string;
  status: 'active' | 'retired' | (string & {});
  activatedAt: string;
  retiredAt: string | null;
}

/** Response from GET /v1/verification-keys. */
export interface VerificationKeysResponse {
  data: VerificationKey[];
  canonicalization: string;
  hashAlgorithm: string;
  signatureAlgorithm: string;
}


/** A federation hub signing key. */
export interface HubSigningKey {
  id: string;
  publicKey: string;
  status: 'active' | 'pending' | 'expired';
  createdAt: string;
  activatedAt: string | null;
  expiredAt: string | null;
}


/** A peer gateway in hub-to-hub federation. */
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


/** Parameters for publishing a Type schema to the federation. */
export interface SchemaPublishParams {
  schema: Record<string, unknown>;
  visibility?: 'hub-only' | 'full';
}

/** Parameters for confirming a pending schema publication. */
export interface SchemaConfirmParams {
  confirmationToken: string;
}


/** Cross-boundary criteria for a federated Record. */
export interface FederationRecordCriteria {
  recordId: string;
  criteria: Record<string, unknown>;
  submittedBy: string;
  submittedAt: string;
}

/** Parameters for submitting cross-boundary Record criteria. */
export interface SubmitRecordCriteriaParams {
  criteria: Record<string, unknown>;
}

/** Criteria negotiation status for a federated Record. */
export interface RecordCriteriaStatus {
  recordId: string;
  principalSubmitted: boolean;
  performerSubmitted: boolean;
  agreementReached: boolean;
}


/** A single reputation contribution from a gateway. */
export interface ReputationContribution {
  agentId: string;
  gatewayId: string;
  type: string;
  outcome: string;
  contributedAt: string;
}

/** Parameters for contributing reputation data. */
export interface ContributeReputationParams {
  agentId: string;
  type: string;
  outcome: string;
  recordId?: string;
}

/** Aggregated federated reputation for an agent. */
export interface FederationAgentReputation {
  agentId: string;
  overallScore: number;
  contributions: number;
  byType: Record<string, { score: number; count: number }>;
}


/** Parameters for broadcasting key revocations to peer gateways. */
export interface RevocationBroadcastParams {
  gatewayId: string;
  reason: string;
  revokedAt: string;
}

/** Parameters for synchronizing the agent directory with a peer. */
export interface AgentDirectorySyncParams {
  agents: Array<{ agentId: string; types: string[] }>;
}

/** Parameters for registering a peer gateway. */
export interface PeerRegistrationParams {
  name: string;
  endpoint: string;
  publicKey: string;
  peeringToken: string;
}


