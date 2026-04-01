/**
 * AGLedger™ SDK — Type Definitions
 * Patent Pending. Copyright 2026 AGLedger LLC. All rights reserved.
 */

// ---------------------------------------------------------------------------
// Next Steps (HATEOAS guidance for AI agents)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Rate Limit Info
// ---------------------------------------------------------------------------

/** Rate limit metadata parsed from response headers. */
export interface RateLimitInfo {
  /** Max requests per window */
  limit: number;
  /** Remaining requests in current window */
  remaining: number;
  /** Unix timestamp (seconds) when the window resets */
  reset: number;
}

// ---------------------------------------------------------------------------
// Client Configuration
// ---------------------------------------------------------------------------

export interface AgledgerClientOptions {
  /** API key (Bearer token) */
  apiKey: string;
  /** Base URL (default: https://api.agledger.ai) */
  baseUrl?: string;
  /** Environment shorthand — sets baseUrl automatically. Overridden by explicit baseUrl. */
  environment?: 'production' | 'sandbox';
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
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Batch Operations
// ---------------------------------------------------------------------------

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
    data?: Mandate;
    error?: string;
  }>;
  summary: {
    total: number;
    succeeded: number;
    failed: number;
  };
}

// ---------------------------------------------------------------------------
// Contract Types
// ---------------------------------------------------------------------------

/** Known values: ACH-PROC-v1, ACH-DLVR-v1, ACH-DATA-v1, ACH-TXN-v1, ACH-ORCH-v1, ACH-COMM-v1, ACH-AUTH-v1, ACH-INFRA-v1, ACH-DEL-v1, ACH-ANALYZE-v1, ACH-COORD-v1. Accepts any string for forward compatibility. */
export type ContractType =
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
  | (string & {});

// ---------------------------------------------------------------------------
// Denomination (currency-agnostic monetary amount)
// ---------------------------------------------------------------------------

export interface Denomination {
  amount: number;
  currency: string;
}

// ---------------------------------------------------------------------------
// Typed Criteria per Contract Type (Agentic Contract Specification)
//
// These interfaces describe the known fields for each contract type.
// All criteria types also accept additional fields via intersection
// with Record<string, unknown> for forward compatibility.
// ---------------------------------------------------------------------------

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
  parent_mandate_ref?: string;
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
  action_type?: 'grant' | 'revoke' | 'create_credential' | 'rotate' | 'user_management';
  target_identity?: string;
  permission_scope?: string;
  resource_scope?: string;
  expiration?: string;
}

/** ACH-INFRA-v1: Infrastructure changes, cloud provisioning, and config updates. */
export interface InfrastructureCriteria {
  description: string;
  action_type?: 'ddl' | 'provision' | 'deploy' | 'config_change';
  resource_name?: string;
  resource_type?: string;
  environment?: string;
  region?: string;
  rollback_possible?: boolean;
}

/** ACH-ANALYZE-v1: Analysis, research, synthesis, and evaluation tasks. */
export interface AnalyzeCriteria {
  objective: string;
  scope?: string;
  output_format?: string;
  depth?: 'overview' | 'standard' | 'deep_dive';
  constraints?: { max_sources?: number; time_budget_seconds?: number; cost_budget?: Denomination };
  evaluation_criteria?: string[];
  deadline?: string;
}

/** ACH-COORD-v1: Multi-agent coordination, planning, and orchestration. */
export interface CoordinationCriteria {
  objective: string;
  participants?: string[];
  deliverables?: string[];
  success_criteria?: Record<string, unknown>;
  budget?: Denomination;
  deadline?: string;
}

/** ACH-DEL-v1: Deletions, cancellations, and reversals. */
export interface DestructiveCriteria {
  description: string;
  action_type?: 'delete' | 'cancel' | 'refund' | 'archive' | 'terminate';
  target_identifier?: string;
  is_cascade?: boolean;
  justification?: string;
  original_ref?: string;
  reversal_amount?: number;
}

// ---------------------------------------------------------------------------
// Typed Evidence per Contract Type (Agentic Contract Specification)
// ---------------------------------------------------------------------------

/** ACH-PROC-v1 receipt evidence. */
export interface ProcurementEvidence {
  item_secured: string;
  quantity: number;
  total_cost: Denomination;
  supplier: { id: string; name: string; rating?: number };
  confirmation_ref: string;
  unit_price?: Denomination;
  submitted_at?: string;
}

/** ACH-DLVR-v1 receipt evidence. */
export interface DeliverableEvidence {
  deliverable: string;
  deliverable_type: string;
  output_format?: string;
  language?: string;
  item_count?: number;
  total_cost?: Denomination;
  submitted_at?: string;
}

/** ACH-DATA-v1 receipt evidence. */
export interface DataProcessingEvidence {
  deliverable: string;
  deliverable_type: string;
  output_format?: string;
  row_count?: number;
  total_cost?: Denomination;
  submitted_at?: string;
}

/** ACH-TXN-v1 receipt evidence. */
export interface TransactionEvidence {
  confirmations: Array<{
    type?: string;
    provider?: string;
    ref?: string;
    transaction_id?: string;
    amount?: number | Denomination;
    status?: string;
    timestamp?: string;
    cost?: Denomination;
  }>;
  total_cost?: Denomination;
  summary?: string;
  submitted_at?: string;
}

/** ACH-ORCH-v1 receipt evidence. */
export interface OrchestrationEvidence {
  task_id: string;
  status?: string;
  deliverable?: string;
  completed_by?: string;
  completed_at?: string;
}

/** ACH-COMM-v1 receipt evidence. */
export interface CommunicationEvidence {
  action: string;
  message_id?: string;
  recipient?: string;
  channel?: string;
  delivery_status?: string;
  sent_at?: string;
  webhook_url?: string;
  event_type?: string;
  response_code?: number;
}

/** ACH-AUTH-v1 receipt evidence. */
export interface AuthorizationEvidence {
  action: string;
  target_identity?: string;
  permission_scope?: string;
  resource_scope?: string;
  credential_id?: string;
  status?: string;
  expires_at?: string;
  performed_at?: string;
}

/** ACH-INFRA-v1 receipt evidence. */
export interface InfrastructureEvidence {
  action: string;
  resource_name?: string;
  resource_type?: string;
  status?: string;
  deployment_id?: string;
  environment?: string;
  config_key?: string;
  previous_value?: string;
  new_value?: string;
  performed_at?: string;
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
  sub_mandates_created?: number;
  sub_mandates_fulfilled?: number;
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

// ---------------------------------------------------------------------------
// Type Maps (contract type string -> typed criteria/evidence)
// ---------------------------------------------------------------------------

/** Maps known contract type strings to their criteria interfaces. */
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
}

/** Maps known contract type strings to their evidence interfaces. */
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
}

/** Resolves to the typed criteria for known contract types, or Record<string, unknown> for unknown types. */
export type CriteriaFor<T extends string> =
  T extends keyof CriteriaMap ? CriteriaMap[T] & Record<string, unknown> : Record<string, unknown>;

/** Resolves to the typed evidence for known contract types, or Record<string, unknown> for unknown types. */
export type EvidenceFor<T extends string> =
  T extends keyof EvidenceMap ? EvidenceMap[T] & Record<string, unknown> : Record<string, unknown>;

/** Typed mandate creation params for a specific contract type. */
export type TypedCreateMandateParams<T extends string> = Omit<CreateMandateParams, 'contractType' | 'criteria'> & {
  contractType: T;
  criteria: CriteriaFor<T>;
};

/** Typed receipt submission params for a specific contract type. */
export type TypedSubmitReceiptParams<T extends string> = Omit<SubmitReceiptParams, 'evidence'> & {
  evidence: EvidenceFor<T>;
};

export interface ContractSchema {
  contractType: ContractType;
  displayName?: string;
  description?: string;
  category?: string;
  isBuiltin?: boolean;
  version?: number;
  latestVersion?: number;
  status?: SchemaVersionStatus;
  mandateSchema: Record<string, unknown>;
  receiptSchema: Record<string, unknown>;
  rulesConfig?: {
    contractType?: string;
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

// ---------------------------------------------------------------------------
// Schema Development Toolkit
// ---------------------------------------------------------------------------

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
    contractTypeMaxLength: number;
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
    minimalMandate: Record<string, unknown>;
    minimalReceipt: Record<string, unknown>;
  };
}

/** Known values for SchemaFieldMapping.valueType. Accepts 'expression' for expression-based rules. */
export type SchemaFieldMappingValueType = 'number' | 'denomination' | 'string' | 'boolean' | 'datetime' | 'expression';

/** Field mapping between mandate criteria and receipt evidence for verification rules. */
export interface SchemaFieldMapping {
  ruleId: string;
  criteriaPath: string;
  evidencePath: string;
  toleranceField?: string;
  valueType: SchemaFieldMappingValueType;
  /** Safe expression string. Required when valueType is 'expression'. */
  expression?: string;
}

/** Template for creating a new contract type schema. */
export interface SchemaTemplate {
  sourceType: ContractType | null;
  template: {
    contractType: string;
    displayName: string;
    description: string;
    mandateSchema: Record<string, unknown>;
    receiptSchema: Record<string, unknown>;
    fieldMappings: SchemaFieldMapping[];
  };
}

/** Input for previewing a schema before registration. */
export interface SchemaPreviewInput {
  contractType: string;
  displayName: string;
  description?: string;
  category?: string;
  mandateSchema: Record<string, unknown>;
  receiptSchema: Record<string, unknown>;
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
  contractType: ContractType;
  from: { version: number; createdAt: string; status: string };
  to: { version: number; createdAt: string; status: string };
  mandate: { changes: SchemaDiffChange[] };
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
  contractType: ContractType;
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
  mandateSchema: Record<string, unknown>;
  receiptSchema: Record<string, unknown>;
  rulesConfig: Record<string, unknown>;
  createdAt: string;
}

/** Payload for importing a schema bundle. */
export interface SchemaImportPayload {
  exportVersion: number;
  contractType: string;
  versions: Record<string, unknown>[];
  [key: string]: unknown;
}

/** Result of a schema import. */
export interface SchemaImportResult {
  imported: {
    contractType: string;
    versionsCreated: number[];
    subjectIds: string[];
  };
}

/** Result of a dry-run schema import. */
export interface SchemaImportDryRunResult {
  valid: boolean;
  wouldCreate: {
    contractType: string;
    versions: number[];
  };
}

/** Parameters for registering a new custom contract type schema. */
export interface RegisterSchemaParams {
  contractType: string;
  displayName: string;
  description?: string;
  category?: string;
  mandateSchema: Record<string, unknown>;
  receiptSchema: Record<string, unknown>;
  fieldMappings?: SchemaFieldMapping[];
  compatibilityMode?: SchemaCompatibilityMode;
}

/** Detail for a specific schema version. */
export interface SchemaVersionDetail {
  id: string;
  contractType: ContractType;
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
  mandate: { compatible: boolean; changes: SchemaDiffChange[] };
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

// ---------------------------------------------------------------------------
// Mandates
// ---------------------------------------------------------------------------

/** Known values: DRAFT, PROPOSED, REGISTERED, ACTIVE, RECEIPT_ACCEPTED, RECEIPT_INVALID, VERIFYING, VERIFIED_PASS, VERIFIED_FAIL, REVISION_REQUESTED, FULFILLED, REMEDIATED, EXPIRED, CANCELLED_DRAFT, CANCELLED_PRE_WORK, CANCELLED_IN_PROGRESS, REJECTED. Accepts any string for forward compatibility. */
export type MandateStatus =
  | 'DRAFT'
  | 'PROPOSED'
  | 'REGISTERED'
  | 'ACTIVE'
  | 'RECEIPT_ACCEPTED'
  | 'RECEIPT_INVALID'
  | 'VERIFYING'
  | 'VERIFIED_PASS'
  | 'VERIFIED_FAIL'
  | 'REVISION_REQUESTED'
  | 'FULFILLED'
  | 'REMEDIATED'
  | 'EXPIRED'
  | 'CANCELLED_DRAFT'
  | 'CANCELLED_PRE_WORK'
  | 'CANCELLED_IN_PROGRESS'
  | 'REJECTED'
  | (string & {});

/** Known values: register, activate, settle, cancel, refund. Accepts any string for forward compatibility. */
export type MandateTransitionAction =
  | 'register'
  | 'activate'
  | 'settle'
  | 'cancel'
  | 'refund'
  | (string & {});

export type OperatingMode = 'cleartext' | 'encrypted';
/** Known values: auto, principal, gated. Accepts any string for forward compatibility. */
export type VerificationMode = 'auto' | 'principal' | 'gated' | (string & {});

export type RiskClassification = 'high' | 'limited' | 'minimal' | 'unclassified';

/** Constraint inheritance mode from parent mandate. */
export type ConstraintInheritanceMode = 'none' | 'advisory' | 'enforced';

/** Dispute evidence types. */
export type EvidenceType = 'screenshot' | 'external_lookup' | 'document' | 'communication' | 'other' | (string & {});

/**
 * A mandate — a registered commitment between a principal and a performer.
 * Records what was asked, by whom, and when. The contract is the product.
 *
 * @example
 * ```ts
 * const mandate = await client.mandates.create({
 *   enterpriseId: 'ent_123',
 *   contractType: 'ACH-PROC-v1',
 *   contractVersion: '1',
 *   platform: 'internal',
 *   criteria: { item: 'widgets', maxQuantity: 100, maxUnitPrice: { amount: 20, currency: 'USD' } },
 * });
 * ```
 */
export interface Mandate {
  /** Unique mandate ID (UUID). */
  id: string;
  /** Enterprise that owns this mandate. */
  enterpriseId: string;
  /** Agent assigned to this mandate, or null if unassigned. */
  agentId: string | null;
  /** Agentic Contract Specification type (e.g., 'ACH-PROC-v1'). */
  contractType: ContractType;
  /** Version of the contract schema. */
  contractVersion: string;
  /** Platform where this mandate operates. */
  platform: string;
  /** External reference ID on the platform. */
  platformRef?: string;
  /** Current lifecycle status. Use `getValidTransitions()` to see allowed next states. */
  status: MandateStatus;
  /** Acceptance criteria — what the performer must deliver. Typed per contract type. */
  criteria: Record<string, unknown>;
  /** Tolerance bands for numeric criteria (e.g., quantity_pct: 5 allows 5% variance). */
  tolerance?: Record<string, unknown>;
  /** ISO 8601 deadline for completion. */
  deadline?: string;
  /** Commission percentage for the performing agent. */
  commissionPct?: number;
  /** Operating mode: cleartext (default) or encrypted. */
  operatingMode?: OperatingMode;
  /** Verification mode: auto (rules auto-settle), principal (hold for verdict), gated (rules then verdict). */
  verificationMode?: VerificationMode;
  /** EU AI Act risk classification. */
  riskClassification?: RiskClassification;
  /** EU AI Act domain (e.g., 'healthcare', 'finance'). */
  euAiActDomain?: string;
  /** Human oversight configuration for EU AI Act compliance. */
  humanOversight?: Record<string, unknown>;
  /** Performer's response to a proposed mandate. */
  acceptanceStatus?: 'PROPOSED' | 'ACCEPTED' | 'REJECTED' | 'COUNTER_PROPOSED';
  /** Project grouping reference for related mandates. */
  projectRef?: string;
  /** Parent mandate ID in a delegation chain. */
  parentMandateId?: string;
  /** Root mandate ID at the top of the delegation chain. */
  rootMandateId?: string;
  /** Depth in the delegation chain (0 = root). */
  chainDepth?: number;
  /** Reason provided for the last state transition. */
  lastTransitionReason?: string | null;
  /** Actor who triggered the last state transition. */
  lastTransitionBy?: string | null;
  /** Number of receipt submissions so far. */
  submissionCount: number;
  /** Maximum allowed submissions, or null for unlimited. */
  maxSubmissions: number | null;
  /** Optimistic concurrency version. */
  version: number;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
  /** ISO 8601 last update timestamp. */
  updatedAt: string;
  /** ISO 8601 timestamp when the mandate was activated. */
  activatedAt?: string;
  /** ISO 8601 timestamp when the mandate was fulfilled. */
  fulfilledAt?: string;
  /** Valid next actions from current state (e.g. 'register', 'activate', 'cancel'). */
  nextActions?: string[];
  /** Valid target statuses from current state. */
  validTransitions?: string[];
  /** Hint for receipt evidence fields, or null if no receipt expected. */
  receiptHint?: { requiredFields: string[]; optionalFields?: string[]; examplePayload?: Record<string, unknown> } | null;
  /** Advisory enforcement warnings from the most recent transition. */
  advisoryWarnings?: Array<{ rule: string; message: string; details?: Record<string, unknown> }>;
  /** URL to the contract type schema definition. */
  schemaUrl?: string;
  /** Verification check results, or null if not yet verified. */
  verificationChecks?: Record<string, unknown> | null;
  /** Overall verification outcome: PASS, FAIL, or null if not verified. */
  verificationOutcome?: 'PASS' | 'FAIL' | null;
  /** Agent ID of the principal (for A2A mandates). */
  principalAgentId?: string;
  /** Principal type: enterprise or agent. */
  principalType?: 'enterprise' | 'agent';
  /** IDs of child mandates in a delegation chain. */
  childMandateIds?: string[];
  /** Calculated commission amount, or null. */
  commissionAmount?: number | null;
  /** Constraint inheritance mode from parent mandate. */
  constraintInheritance?: ConstraintInheritanceMode;
  /** True when a transition was a no-op (already in target state). */
  noOp?: boolean;
  /** Project ID for grouping related mandates. */
  projectId?: string | null;
  /** External task ID from the caller's system. */
  externalTaskId?: string | null;
  /** Mandate IDs this mandate depends on. */
  dependsOn?: string[];
  /** Per-field enforcement overrides. */
  enforcementOverrides?: Record<string, unknown> | null;
  /** Arbitrary metadata attached to the mandate. */
  metadata?: Record<string, unknown> | null;
  /** ISO 8601 timestamp when the performer responded to a proposal. */
  acceptanceRespondedAt?: string | null;
  /** Suggested next API calls based on current mandate state. */
  nextSteps?: NextStep[];
}

/**
 * Parameters for creating a new mandate via enterprise auth.
 * For agent-to-agent mandates, use {@link CreateAgentMandateParams} with `mandates.createAgent()`.
 */
export interface CreateMandateParams {
  /** Enterprise ID that owns this mandate. */
  enterpriseId: string;
  /** Contract type (e.g., 'ACH-PROC-v1'). Determines criteria schema. */
  contractType: ContractType;
  /** Contract schema version. */
  contractVersion: string;
  /** Platform identifier. */
  platform: string;
  /** External reference ID on the platform. */
  platformRef?: string;
  /** Project grouping reference. */
  projectRef?: string;
  /** Acceptance criteria. Typed per contract type when using generic overload. */
  criteria: Record<string, unknown>;
  /** Numeric tolerance bands (e.g., `{ quantity_pct: 5 }`). */
  tolerance?: Record<string, unknown>;
  /** ISO 8601 deadline for completion. */
  deadline?: string;
  /** Agent ID to assign as performer. */
  agentId?: string;
  /** Commission percentage for the performing agent. */
  commissionPct?: number;
  /** Max receipt submissions allowed (1-100). Null/omit for unlimited. */
  maxSubmissions?: number;
  /** Operating mode: cleartext (default) or encrypted. */
  operatingMode?: OperatingMode;
  /** Verification mode: auto (default, rules auto-settle), principal (hold for verdict), gated (rules then verdict). */
  verificationMode?: VerificationMode;
  /** EU AI Act risk classification. */
  riskClassification?: RiskClassification;
  /** EU AI Act domain. */
  euAiActDomain?: string;
  /** Human oversight configuration. */
  humanOversight?: Record<string, unknown>;
  /** Performer agent ID. */
  performerAgentId?: string;
  /** Parent mandate ID for delegation. */
  parentMandateId?: string;
  /** Project ID for grouping. */
  projectId?: string;
  /** External task ID from caller's system. */
  externalTaskId?: string;
  /** Mandate IDs this depends on. */
  dependsOn?: string[];
  /** Arbitrary metadata. */
  metadata?: Record<string, unknown>;
  /** Auto-transition from DRAFT → REGISTERED → ACTIVE after create. */
  autoActivate?: boolean;
  /** Constraint inheritance mode. */
  constraintInheritance?: ConstraintInheritanceMode;
  /** Per-field enforcement overrides. */
  enforcementOverrides?: Record<string, unknown>;
}

export interface UpdateMandateParams {
  criteria?: Record<string, unknown>;
  tolerance?: Record<string, unknown>;
  deadline?: string;
  riskClassification?: RiskClassification;
  euAiActDomain?: string;
  humanOversight?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface ListMandatesParams extends ListParams {
  enterpriseId: string;
  status?: MandateStatus;
}

export interface SearchMandatesParams extends ListParams {
  enterpriseId: string;
  status?: MandateStatus;
  contractType?: ContractType;
  agentId?: string;
  from?: string;
  to?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  projectRef?: string;
  externalTaskId?: string;
  parentMandateId?: string;
  updatedAfter?: string;
  updatedBefore?: string;
  verificationMode?: VerificationMode;
  operatingMode?: OperatingMode;
  metadata?: Record<string, unknown>;
}

export interface DelegateMandateParams {
  principalAgentId: string;
  performerAgentId?: string;
  contractType: ContractType;
  contractVersion: string;
  platform?: string;
  criteria: Record<string, unknown>;
  commissionPct?: number;
}

export interface CreateAgentMandateParams {
  principalAgentId: string;
  performerAgentId?: string;
  contractType: ContractType;
  contractVersion: string;
  platform?: string;
  projectRef?: string;
  criteria: Record<string, unknown>;
  tolerance?: Record<string, unknown>;
  parentMandateId?: string;
  commissionPct?: number;
  maxSubmissions?: number;
  deadline?: string;
  verificationMode?: VerificationMode;
  autoActivate?: boolean;
  constraintInheritance?: ConstraintInheritanceMode;
  enforcementOverrides?: Record<string, unknown>;
  externalTaskId?: string;
  metadata?: Record<string, unknown>;
  proposalMessage?: string;
}

export interface RespondToMandateParams {
  action: 'accept' | 'reject' | 'counter';
  counterCriteria?: Record<string, unknown>;
  counterTolerance?: Record<string, unknown>;
  counterDeadline?: string;
  counterCommissionPct?: number;
  message?: string;
}

// ---------------------------------------------------------------------------
// Receipts
// ---------------------------------------------------------------------------

/** Structural validation result for receipts. */
export type StructuralValidation = 'ACCEPTED' | 'INVALID' | 'WARNING' | (string & {});

/**
 * A receipt — structured evidence submitted by a performer claiming completion of a mandate.
 * The principal reviews the receipt and renders a verdict (accept/reject).
 */
export interface Receipt {
  id: string;
  mandateId: string;
  agentId: string;
  evidence: Record<string, unknown>;
  evidenceHash?: string;
  /** Structural validation result: ACCEPTED, INVALID, or WARNING. */
  structuralValidation: 'ACCEPTED' | 'INVALID' | 'WARNING' | (string & {});
  /** Schema validation errors, if any. */
  validationErrors?: string[] | null;
  /** Validation warnings (non-blocking). */
  warnings?: Array<{ rule: string; message: string; details?: Record<string, unknown> }>;
  /** Current status of the parent mandate (denormalized). */
  mandateStatus?: MandateStatus;
  /** Idempotency key used when submitting. */
  idempotencyKey?: string | null;
  createdAt: string;
  /** Suggested next API calls after receipt submission. */
  nextSteps?: NextStep[];
}

export interface SubmitReceiptParams {
  agentId: string;
  evidence: Record<string, unknown>;
  evidenceHash?: string;
  idempotencyKey?: string;
}


// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

/** Known values: PASS, FAIL, REVIEW_REQUIRED. Accepts any string for forward compatibility. */
export type VerificationOutcome = 'PASS' | 'FAIL' | 'REVIEW_REQUIRED' | (string & {});
/** Known values: SETTLE, HOLD, RELEASE. Accepts any string for forward compatibility. */
export type SettlementSignal = 'SETTLE' | 'HOLD' | 'RELEASE' | (string & {});

export interface VerificationResult {
  mandateId: string;
  receipts: Array<{
    receiptId: string;
    phase1Result?: Record<string, unknown>;
    phase2Result?: Record<string, unknown>;
  }>;
  overallStatus: string;
}

export interface VerificationStatus {
  mandateId: string;
  phase1Status: string;
  phase2Status: string;
  lastVerifiedAt?: string;
  pendingRules?: string[];
}

// ---------------------------------------------------------------------------
// Outcome (Principal Verdict)
// ---------------------------------------------------------------------------

export interface ReportOutcomeParams {
  receiptId: string;
  outcome: 'PASS' | 'FAIL';
  checks?: Record<string, unknown>;
}

export interface OutcomeResult {
  mandateId: string;
  receiptId: string;
  outcome: 'PASS' | 'FAIL';
  signal: SettlementSignal;
  reporterType: string;
  reportedAt: string;
}

// ---------------------------------------------------------------------------
// Mandate Summary
// ---------------------------------------------------------------------------

export interface MandateStatusSummary {
  countsByStatus: Record<string, number>;
  total: number;
}

// ---------------------------------------------------------------------------
// Disputes
// ---------------------------------------------------------------------------

/** Known values: OPEN, TIER_1_REVIEW, EVIDENCE_WINDOW, TIER_2_REVIEW, ESCALATED, TIER_3_ARBITRATION, RESOLVED, DISMISSED, WITHDRAWN. Accepts any string for forward compatibility. */
export type DisputeStatus =
  | 'OPEN'
  | 'TIER_1_REVIEW'
  | 'EVIDENCE_WINDOW'
  | 'TIER_2_REVIEW'
  | 'ESCALATED'
  | 'TIER_3_ARBITRATION'
  | 'RESOLVED'
  | 'DISMISSED'
  | 'WITHDRAWN'
  | (string & {});

/** Known dispute grounds. */
export type DisputeGrounds =
  | 'equivalent_item'
  | 'fraudulent_receipt'
  | 'mandate_ambiguity'
  | 'pricing_dispute'
  | 'quality_issue'
  | 'other'
  | (string & {});

/** Dispute object. Note: GET /dispute returns { dispute, evidence } envelope. */
export interface Dispute {
  id: string;
  mandateId: string;
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


// ---------------------------------------------------------------------------
// Webhooks
// ---------------------------------------------------------------------------

/** Known webhook event types matching the AGLedger API. Accepts any string for forward compatibility. */
export type WebhookEventType =
  | 'mandate.created'
  | 'mandate.registered'
  | 'mandate.activated'
  | 'mandate.receipt_submitted'
  | 'mandate.receipt_invalid'
  | 'mandate.verification_complete'
  | 'mandate.fulfilled'
  | 'mandate.settled'
  | 'mandate.failed'
  | 'mandate.expired'
  | 'mandate.cancelled'
  | 'mandate.proposed'
  | 'mandate.proposal_accepted'
  | 'mandate.proposal_rejected'
  | 'mandate.delegated'
  | 'signal.emitted'
  | 'dispute.opened'
  | 'dispute.resolved'
  | 'proxy.session.synced'
  | 'proxy.mandate.detected'
  | 'proxy.mandate.formalized'
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

// ---------------------------------------------------------------------------
// Reputation
// ---------------------------------------------------------------------------

/** Per-contract-type reputation score for an agent. */
export interface ReputationScore {
  agentId: string;
  contractType: string;
  reliabilityScore: number;
  accuracyScore: number;
  efficiencyScore: number;
  compositeScore: number;
  confidenceLevel: string;
  formulaVersion: string;
  totalMandates: number;
  totalPassed: number;
  totalVerified: number;
  lastUpdatedAt: string;
  recentHistory?: Record<string, unknown>[];
}

/** Transaction history entry for an agent. */
export interface ReputationHistoryEntry {
  mandateId: string;
  contractType: string;
  status: string;
  outcome: string;
  createdAt: string;
  completedAt?: string;
}

// ---------------------------------------------------------------------------
// Events & Audit
// ---------------------------------------------------------------------------

export interface AgledgerEvent {
  id: string;
  eventType: string;
  mandateId: string | null;
  agentId: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface AuditChain {
  mandateId: string;
  chainStart: string;
  entries: Array<{
    index: number;
    hash: string;
    previousHash: string | null;
    event: string;
    actor: string;
    timestamp: string;
    signature?: string;
  }>;
  isValid: boolean;
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export interface DashboardSummary {
  totalMandates: number;
  activeCount: number;
  fulfilledCount: number;
  disputedCount: number;
  avgCompletionTime?: number;
  topAgents?: Array<{
    agentId: string;
    successRate: number;
  }>;
  totalSettlementSignals?: number;
  signalBreakdown?: {
    settle: number;
    hold: number;
    release: number;
  };
  disputeValue?: number;
}

export interface DashboardAgent {
  id: string;
  displayName: string;
  trustLevel: string;
  compositeScore: number | null;
  reliabilityScore: number | null;
  totalMandates: number;
  mandateCount: number;
  activeCount: number;
  errorCount: number;
}

export interface DashboardAgentParams extends ListParams {
  sort?: 'compositeScore' | 'reliabilityScore' | 'totalMandates' | 'displayName';
  order?: 'asc' | 'desc';
  trustLevel?: string;
  minScore?: number;
  maxScore?: number;
}

export interface DashboardMetrics {
  granularity?: string;
  from?: string | null;
  to?: string | null;
  series: Array<{
    timestamp: string;
    mandates: number;
    receipts: number;
    disputes: number;
    avgVerificationTime?: number;
  }>;
}

export interface DashboardMetricsParams {
  from?: string;
  to?: string;
  granularity?: 'daily' | 'weekly' | 'monthly';
}

// ---------------------------------------------------------------------------
// Compliance & EU AI Act
// ---------------------------------------------------------------------------

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
    contractTypes?: ContractType[];
  };
}

export interface AiImpactAssessment {
  id: string;
  mandateId: string;
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
  mandates: Array<{
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

// ---------------------------------------------------------------------------
// Compliance Records (per-mandate)
// ---------------------------------------------------------------------------

export type ComplianceRecordType = 'workplace_notification' | 'affected_persons' | 'input_data_quality' | 'fundamental_rights_impact_assessment' | (string & {});

export interface ComplianceRecord {
  id: string;
  mandateId: string;
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

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export type ProjectStatus = 'active' | 'completed' | 'cancelled' | (string & {});

export interface Project {
  id: string;
  enterpriseId: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectParams {
  name: string;
  description?: string;
}

export interface UpdateProjectParams {
  name?: string;
  description?: string;
  status?: ProjectStatus;
}

// ---------------------------------------------------------------------------
// Audit Export (per-mandate)
// ---------------------------------------------------------------------------

export interface AuditExportEntry {
  position: number;
  timestamp: string;
  entryType: string;
  description: string;
  payload: Record<string, unknown>;
  integrity: {
    payloadHash: string;
    previousHash: string | null;
    signature: string | null;
    signingKeyId: string | null;
    valid: boolean;
  };
}

export interface MandateAuditExport {
  exportMetadata: {
    mandateId: string;
    enterpriseId: string | null;
    contractType: string;
    exportDate: string;
    totalEntries: number;
    chainIntegrity: boolean;
    exportFormatVersion: string;
    canonicalization: string;
    signingPublicKey: string | null;
  };
  entries: AuditExportEntry[];
}

// ---------------------------------------------------------------------------
// Audit Stream (SIEM)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Registration & Auth
// ---------------------------------------------------------------------------

export type AccountType = 'enterprise' | 'agent' | 'platform';

export interface RegisterParams {
  role: AccountType;
  name: string;
  email?: string;
  agentCardUrl?: string;
  enterpriseId?: string;
}

export interface RegisterResult {
  id: string;
  apiKey: string;
  role: AccountType;
  name: string;
  trustLevel: string;
  verificationPending?: 'email' | null;
  /** Suggested next API calls after registration. */
  nextSteps?: NextStep[];
}

export interface AccountProfile {
  apiKeyId: string;
  role: AccountType;
  ownerId: string;
  ownerType: string;
  trustLevel: string;
  scopes: string[] | null;
  name?: string | null;
  email?: string | null;
  verifiedAt?: string | null;
  createdAt?: string | null;
}

// ---------------------------------------------------------------------------
// Health & Conformance
// ---------------------------------------------------------------------------

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
  contractTypes: ContractType[];
  maxBatchSize?: number;
  rateLimits?: {
    requests: number;
    windowSeconds: number;
  };
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export interface AdminEnterprise {
  id: string;
  /** Display name (called `name` in the API). */
  name: string;
  /** URL-safe identifier for the enterprise. Auto-generated if omitted on create. */
  slug: string;
  email?: string | null;
  trustLevel: string;
  verifiedAt?: string | null;
  verificationMethod?: string | null;
  mandateCount?: number;
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
  trustLevel: string;
  verifiedAt?: string | null;
  verificationMethod?: string | null;
  agentCardUrl?: string | null;
  mandateCount?: number;
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
  /** Initial trust level. Default: sandbox. */
  trustLevel?: 'sandbox' | 'active' | 'verified';
  /** Initial configuration object. */
  config?: Record<string, unknown>;
}

/**
 * Parameters for creating a new agent via admin endpoint.
 * @example
 * ```ts
 * const agent = await client.admin.createAgent({ name: 'My Agent' });
 * console.log(agent.id, agent.slug);
 * ```
 */
export interface CreateAgentParams {
  /** Display name for the agent. */
  name: string;
  /** URL-safe slug (lowercase, hyphens). Auto-generated from name if omitted. */
  slug?: string;
  /** Contact email. */
  email?: string;
  /** Initial trust level. Default: sandbox. */
  trustLevel?: 'sandbox' | 'active' | 'verified';
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
 * @example
 * ```ts
 * await client.admin.setEnterpriseConfig('ent_abc123', {
 *   agentApprovalRequired: true,
 *   allowSelfApproval: false,
 *   defaultScopes: ['mandate:read', 'receipt:write'],
 * });
 * ```
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
  /** API key role: enterprise, agent, or platform. */
  role?: string;
  ownerId: string;
  ownerType: AccountType;
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
  createdAt: string;
  lastUsedAt?: string;
  expiresAt?: string | null;
  /** Key that created this key. */
  createdByKeyId?: string | null;
  /** Scheduled deactivation time. */
  deactivatesAt?: string | null;
}

export interface CreateApiKeyParams {
  /** Role for the key: enterprise, agent, or platform. */
  role: 'enterprise' | 'agent' | 'platform';
  ownerId: string;
  ownerType: AccountType;
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

/** Result of creating an API key via the admin endpoint. */
export interface CreateApiKeyResult {
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

export interface UpdateTrustLevelParams {
  trustLevel: 'sandbox' | 'active' | 'verified';
  accountType: 'enterprise' | 'agent';
  reason?: string;
}

export interface SetCapabilitiesParams {
  contractTypes: string[];
}

// ---------------------------------------------------------------------------
// A2A Protocol
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Governance Sidecar (Proxy Sessions & Sync)
// ---------------------------------------------------------------------------

export type ProxyMode = 'observe' | 'advisory' | 'enforced';
/** Known values: ALLOWED, BLOCKED, ANNOTATED. Accepts any string for forward compatibility. */
export type InterceptorAction = 'ALLOWED' | 'BLOCKED' | 'ANNOTATED' | (string & {});
export type ConfidenceLevel = 'low' | 'medium' | 'high';
export type SidecarMandateStatus = 'SHADOW' | 'FORMALIZED' | 'DISMISSED';
export type SessionOutcome = 'active' | 'zero_action' | 'undetected' | 'inactive';

export interface ProxySession {
  id: string;
  enterpriseId: string;
  agentId?: string;
  proxyInstanceId?: string;
  startedAt: string;
  endedAt?: string;
  totalCalls: number;
  matchedCalls: number;
  coveragePercent: number;
  sidecarMandateCount: number;
  sidecarReceiptCount: number;
  proxyMode: ProxyMode;
  agentName?: string;
  agentExternalId?: string;
  agentMetadata?: Record<string, unknown>;
  errorCount: number;
  blockedCount: number;
  sessionOutcome?: SessionOutcome;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSessionParams {
  startedAt: string;
  proxyMode: ProxyMode;
  proxyInstanceId?: string;
  endedAt?: string;
  agentName?: string;
  agentExternalId?: string;
  agentMetadata?: Record<string, unknown>;
  errorCount?: number;
  blockedCount?: number;
  sessionOutcome?: SessionOutcome;
}

export interface ToolCallBatchItem {
  toolName: string;
  upstreamName?: string;
  arguments: Record<string, unknown>;
  result?: Record<string, unknown> | string;
  durationMs?: number;
  patternMatch?: Record<string, unknown>;
  sidecarMandateId?: string;
  sidecarReceiptId?: string;
  interceptorAction?: InterceptorAction;
  proxyToolCallId?: string;
  occurredAt: string;
  isError?: boolean;
  errorMessage?: string;
}

export interface SidecarMandateBatchItem {
  contractType: ContractType;
  confidence: ConfidenceLevel;
  confidenceScore: number;
  extractedCriteria: Record<string, unknown>;
  sourceToolCallId?: string;
  proxySidecarMandateId?: string;
  batchCount?: number;
  ruleId?: string;
  correlationId?: string | null;
}

export interface SidecarReceiptBatchItem {
  sidecarMandateId: string;
  extractedEvidence?: Record<string, unknown>;
  confidence: ConfidenceLevel;
  confidenceScore: number;
  sourceToolCallId?: string;
  proxySidecarReceiptId?: string;
  correlationId?: string | null;
}

export interface ToolCatalogBatchItem {
  upstreamName: string;
  toolName: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  discoveredAt: string;
}

export interface SyncSessionParams {
  session: CreateSessionParams;
  toolCalls?: ToolCallBatchItem[];
  sidecarMandates?: SidecarMandateBatchItem[];
  sidecarReceipts?: SidecarReceiptBatchItem[];
  toolCatalog?: ToolCatalogBatchItem[];
}

export interface SyncSessionResult {
  session: ProxySession;
  toolCalls: BatchResult<unknown>['summary'];
  sidecarMandates: BatchResult<unknown>['summary'];
  sidecarReceipts: BatchResult<unknown>['summary'];
  toolCatalog: BatchResult<unknown>['summary'];
  mandateIdMap: Record<string, string>;
}

export interface ProxySidecarMandate {
  id: string;
  sessionId: string;
  contractType: ContractType;
  confidence: ConfidenceLevel;
  confidenceScore: number;
  extractedCriteria: Record<string, unknown>;
  status: SidecarMandateStatus;
  formalizedMandateId?: string;
  sourceToolCallId?: string;
  batchCount?: number;
  ruleId?: string;
  correlationId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProxySidecarReceipt {
  id: string;
  sessionId: string;
  sidecarMandateId: string;
  extractedEvidence?: Record<string, unknown>;
  confidence: ConfidenceLevel;
  confidenceScore: number;
  sourceToolCallId?: string;
  correlationId?: string;
  createdAt: string;
}

export interface ProxyToolCall {
  id: string;
  sessionId: string;
  toolName: string;
  upstreamName?: string;
  arguments: Record<string, unknown>;
  result?: Record<string, unknown> | string;
  durationMs?: number;
  patternMatch?: Record<string, unknown>;
  sidecarMandateId?: string;
  sidecarReceiptId?: string;
  interceptorAction?: InterceptorAction;
  isError: boolean;
  errorMessage?: string;
  occurredAt: string;
}

export interface ProxyToolCatalogEntry {
  id: string;
  sessionId: string;
  upstreamName: string;
  toolName: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  discoveredAt: string;
}

export interface SessionAnalytics {
  totalCalls: number;
  matchedCount: number;
  coveragePercent: number;
  errorCount: number;
  blockedCount: number;
  callsByTool: Record<string, number>;
  estimatedTokenOverhead: number;
}

export interface AnalyticsSummary {
  totalSessions: number;
  totalCalls: number;
  avgCoveragePercent: number;
  contractTypeBreakdown: Record<string, number>;
}

export interface UpdateSidecarMandateParams {
  status?: SidecarMandateStatus;
  formalizedMandateId?: string;
}

export interface MandateSummary {
  sessionId: string;
  totalSidecarMandates: number;
  formalized: number;
  dismissed: number;
  pending: number;
  contractTypes: Record<string, number>;
}

export interface AlignmentAnalysis {
  sessionId: string;
  coveragePercent: number;
  missingCategories?: string[];
  recommendations?: string[];
}

// ---------------------------------------------------------------------------
// Notarization (OpenClaw Agent-to-Agent Agreements)
// ---------------------------------------------------------------------------

/** Known values: NOTARIZED, ACCEPTED, COUNTER_PROPOSED, RECEIPT_SUBMITTED, VERDICT_PASS, VERDICT_FAIL. Accepts any string for forward compatibility. */
export type NotarizeStatus =
  | 'NOTARIZED'
  | 'ACCEPTED'
  | 'COUNTER_PROPOSED'
  | 'REJECTED'
  | 'RECEIPT_SUBMITTED'
  | 'VERDICT_PASS'
  | 'VERDICT_FAIL'
  | (string & {});

export interface NotarizedMandate {
  id: string;
  payloadHash: string;
  contractType: ContractType;
  principalId: string;
  principalRole: 'enterprise' | 'agent';
  performerId?: string | null;
  status: NotarizeStatus;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface NotarizeTransition {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  actorId: string;
  actorRole: string;
  payloadHash: string | null;
  reason: string | null;
  createdAt: string;
}

export interface NotarizeMandateParams {
  contractType: ContractType;
  payload: Record<string, unknown>;
  performerHint?: string;
  metadata?: Record<string, unknown>;
}

/** Result of creating/counter-proposing a notarized mandate. Same shape as NotarizedMandate. */
export type NotarizeMandateResult = NotarizedMandate;

export interface NotarizeCounterProposeParams {
  payload: Record<string, unknown>;
  reason?: string;
}

export interface NotarizeReceiptParams {
  payload: Record<string, unknown>;
}

export interface NotarizeReceiptResult {
  id: string;
  notarizedMandateId: string;
  payloadHash: string;
  performerId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface NotarizeVerdictParams {
  verdict: 'PASS' | 'FAIL';
  reason?: string;
}

export interface NotarizeVerifyParams {
  id: string;
  payload: Record<string, unknown>;
}

export interface NotarizeVerifyResult {
  match: boolean;
  storedHash: string;
  computedHash: string;
  notarizedAt: string;
  type: 'mandate' | 'receipt';
}

export interface NotarizeHistory {
  data: NotarizeTransition[];
}

// ---------------------------------------------------------------------------
// Enterprise Agent Approval Registry
// ---------------------------------------------------------------------------

/** Known values: approved, suspended, revoked. Accepts any string for forward compatibility. */
export type EnterpriseAgentStatus = 'approved' | 'suspended' | 'revoked' | (string & {});

export interface EnterpriseAgentRecord {
  enterpriseId: string;
  agentId: string;
  status: EnterpriseAgentStatus;
  approvedBy: string | null;
  approvedAt: string;
  suspendedAt: string | null;
  revokedAt: string | null;
  reason: string | null;
}

export interface ApprovalConfig {
  agentApprovalRequired: boolean;
  allowSelfApproval: boolean;
}

export interface ApproveAgentParams { reason?: string; }
export interface RevokeAgentParams { reason?: string; }
export interface UpdateAgentStatusParams { status: 'suspended' | 'approved'; reason?: string; }
export interface BulkApproveAgentParams { agents: Array<{ agentId: string; reason?: string }>; }
export interface BulkApproveResult {
  results: Array<{ agentId: string; status: 'approved' | 'failed'; error?: string }>;
  summary: { total: number; approved: number; failed: number };
}
export interface ListEnterpriseAgentsParams extends ListParams { status?: EnterpriseAgentStatus; }

// ---------------------------------------------------------------------------
// API Error Response
// ---------------------------------------------------------------------------

export interface ApiErrorResponse {
  error: string;
  message: string;
  requestId?: string;
  code?: string;
  retryable?: boolean;
  details?: ValidationErrorDetail[] | Record<string, unknown>;
  /** Agent-friendly recovery hint (e.g. "Run `client.mandates.list()` to find valid IDs"). */
  suggestion?: string;
}

export interface ValidationErrorDetail {
  field: string;
  message: string;
  constraint?: string;
  expected?: unknown;
  actual?: unknown;
}

// ---------------------------------------------------------------------------
// Federation — Enums
// ---------------------------------------------------------------------------

/** Hub-level state for a federated mandate (simplified 6-state model). */
export type HubState = 'OFFERED' | 'ACCEPTED' | 'ACTIVE' | 'COMPLETED' | 'DISPUTED' | 'TERMINAL';

/** Gateway registration status. */
export type GatewayStatus = 'active' | 'suspended' | 'revoked';

/** Reason for revoking a gateway. */
export type RevocationReason = 'key_compromise' | 'decommission' | 'administrative';

/** Verification outcome for federated mandates. */
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
  | 'MANDATE_OFFERED'
  | 'MANDATE_STATE_SYNC'
  | 'SIGNAL_RELAYED'
  | 'TOKEN_CREATED'
  | 'ADMIN_REVOCATION'
  | 'SEQUENCE_RESET'
  | 'SEQUENCE_GAP';

// ---------------------------------------------------------------------------
// Federation — Gateway Registration
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Federation — Heartbeat
// ---------------------------------------------------------------------------

/** Parameters for gateway heartbeat (token refresh). */
export interface HeartbeatParams {
  gatewayId: string;
  agentCount: number;
  mandateCount: number;
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

// ---------------------------------------------------------------------------
// Federation — Agents
// ---------------------------------------------------------------------------

/** Parameters for registering a federated agent. */
export interface RegisterFederatedAgentParams {
  agentId: string;
  contractTypes: string[];
  displayName?: string;
}

/** A federated agent visible in the federation directory. */
export interface FederationAgent {
  agentId: string;
  gatewayId: string;
  contractTypes: string[];
  displayName: string | null;
  registeredAt: string;
}

/** Parameters for listing federated agents. */
export interface ListFederatedAgentsParams extends ListParams {
  contractType?: string;
}

// ---------------------------------------------------------------------------
// Federation — State Transitions
// ---------------------------------------------------------------------------

/** Parameters for submitting a cross-boundary state transition. */
export interface SubmitStateTransitionParams {
  mandateId: string;
  gatewayId: string;
  state: string;
  contractType: string;
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

// ---------------------------------------------------------------------------
// Federation — Settlement Signals
// ---------------------------------------------------------------------------

/** Parameters for relaying a settlement signal. */
export interface RelaySignalParams {
  mandateId: string;
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

// ---------------------------------------------------------------------------
// Federation — Key Rotation & Revocation
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Federation — Catch-Up (Partition Recovery)
// ---------------------------------------------------------------------------

/** Parameters for fetching missed audit entries after a network partition. */
export interface FederationCatchUpParams {
  sincePosition: number;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Federation — Admin: Registration Tokens
// ---------------------------------------------------------------------------

/** Parameters for creating a federation registration token (admin). */
export interface CreateRegistrationTokenParams {
  label?: string;
  expiresInHours?: number;
  metadata?: Record<string, unknown> | null;
  allowedContractTypes?: string[];
}

/** A federation registration token. */
export interface FederationRegistrationToken {
  token: string;
  expiresAt: string;
}

// ---------------------------------------------------------------------------
// Federation — Admin: Gateway Management
// ---------------------------------------------------------------------------

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
  lastMandateCount: number;
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

// ---------------------------------------------------------------------------
// Federation — Admin: Mandates
// ---------------------------------------------------------------------------

/** Query parameters for listing federation mandates (admin). */
export interface QueryFederationMandatesParams extends ListParams {
  gatewayId?: string;
  hubState?: HubState;
  contractType?: string;
}

/** A federation mandate as tracked by the hub. */
export interface FederationMandate {
  mandateId: string;
  principalGatewayId: string;
  performerGatewayId: string | null;
  contractType: string;
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

// ---------------------------------------------------------------------------
// Federation — Admin: Audit Log
// ---------------------------------------------------------------------------

/** Query parameters for the federation audit log (admin). */
export interface FederationAuditLogParams extends ListParams {
  gatewayId?: string;
  entryType?: FederationAuditEntryType;
  mandateId?: string;
}

/** A federation audit log entry (hash-chained). */
export interface FederationAuditEntry {
  id: string;
  entryType: FederationAuditEntryType;
  gatewayId: string | null;
  mandateId: string | null;
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

// ---------------------------------------------------------------------------
// Federation — Admin: Health
// ---------------------------------------------------------------------------

/** Federation health summary (admin). */
export interface FederationHealthSummary {
  gateways: {
    active: number;
    suspended: number;
    revoked: number;
  };
  mandates: Record<string, number>;
  auditChainLength: number;
  lastAuditEntry: string | null;
}

// ---------------------------------------------------------------------------
// Federation — Admin: Outbound DLQ
// ---------------------------------------------------------------------------

/** Query parameters for listing outbound DLQ entries (admin). */
export interface ListOutboundDlqParams {
  limit?: number;
  cursor?: string;
}

/** A failed outbound federation message in the dead-letter queue. */
export interface FederationDlqEntry {
  id: string;
  jobType: string;
  mandateId: string | null;
  agentId: string | null;
  payload: Record<string, unknown>;
  errorMessage: string;
  attempts: number;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Admin — Query Mandates (non-federation)
// ---------------------------------------------------------------------------

/** Query parameters for admin mandate listing. */
export interface QueryAdminMandatesParams extends ListParams {
  enterpriseId?: string;
  status?: string;
  contractType?: string;
  agentId?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  from?: string;
  to?: string;
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

// ---------------------------------------------------------------------------
// Deprecated — will be removed in v2. Use Page<T>.
// ---------------------------------------------------------------------------

/** @deprecated Use `Page<T>` instead. */
export type PaginationParams = ListParams;
/** @deprecated Use `Page<T>` instead. */
export interface PaginatedResponse<T> { data: T[]; total: number; limit: number; offset: number; }
/** @deprecated Use `Page<T>` instead. */
export interface CursorPaginatedResponse<T> { data: T[]; nextCursor?: string | null; next_cursor?: string | null; }
/** @deprecated Use `AgledgerEvent` instead. */
export type AuditEvent = AgledgerEvent;
