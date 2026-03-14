/**
 * AGLedger™ SDK — Type Definitions
 * Patent Pending. Copyright 2026 AGLedger LLC. All rights reserved.
 */

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
  // Forward compatibility: accept any string the API returns
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
  mandateSchema: Record<string, unknown>;
  receiptSchema: Record<string, unknown>;
  rulesConfig?: {
    syncRuleIds: string[];
    asyncRuleIds: string[];
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
// Mandates
// ---------------------------------------------------------------------------

export type MandateStatus =
  | 'DRAFT'
  | 'PROPOSED'
  | 'ACCEPTED'
  | 'COUNTER_PROPOSED'
  | 'REJECTED'
  | 'REGISTERED'
  | 'ACTIVE'
  | 'PENDING_VERIFICATION'
  | 'FULFILLED'
  | 'FAILED'
  | 'DISPUTED'
  | 'CANCELLED'
  | 'REMEDIATED'
  | 'EXPIRED'
  // Internal/transitional states
  | 'RECEIPT_INVALID'
  | 'RECEIPT_ACCEPTED'
  | 'VERIFYING'
  | 'VERIFIED_PASS'
  | 'VERIFIED_FAIL'
  | 'CANCELLED_DRAFT'
  | 'CANCELLED_PRE_WORK'
  | 'CANCELLED_IN_PROGRESS'
  // Forward compatibility
  | (string & {});

export type MandateTransitionAction =
  | 'register'
  | 'activate'
  | 'settle'
  | 'cancel'
  | 'refund'
  | (string & {});

export type OperatingMode = 'standard' | 'encrypted' | 'cleartext';
export type VerificationMode = 'auto' | 'principal' | 'gated' | (string & {});

export type RiskClassification = 'unacceptable' | 'high' | 'limited' | 'minimal' | 'unclassified';

export interface Mandate {
  id: string;
  enterpriseId: string;
  agentId: string | null;
  contractType: ContractType;
  contractVersion: string;
  platform: string;
  platformRef?: string;
  status: MandateStatus;
  criteria: Record<string, unknown>;
  tolerance?: Record<string, unknown>;
  deadline?: string;
  commissionPct?: number;
  operatingMode?: OperatingMode;
  /** Verification mode: auto (rules auto-settle), principal (hold for verdict), gated (rules then verdict). */
  verificationMode?: VerificationMode;
  riskClassification?: RiskClassification;
  euAiActDomain?: string;
  humanOversight?: Record<string, unknown>;
  acceptanceStatus?: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COUNTER_PROPOSED';
  projectRef?: string;
  parentMandateId?: string;
  rootMandateId?: string;
  chainDepth?: number;
  lastTransitionReason?: string | null;
  lastTransitionBy?: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  activatedAt?: string;
  fulfilledAt?: string;
}

export interface CreateMandateParams {
  enterpriseId: string;
  contractType: ContractType;
  contractVersion: string;
  platform: string;
  platformRef?: string;
  projectRef?: string;
  criteria: Record<string, unknown>;
  tolerance?: Record<string, unknown>;
  deadline?: string;
  agentId?: string;
  commissionPct?: number;
  operatingMode?: OperatingMode;
  /** Verification mode: auto (default, rules auto-settle), principal (hold for verdict), gated (rules then verdict). */
  verificationMode?: VerificationMode;
  riskClassification?: RiskClassification;
  euAiActDomain?: string;
  humanOversight?: Record<string, unknown>;
}

export interface UpdateMandateParams {
  criteria?: Record<string, unknown>;
  tolerance?: Record<string, unknown>;
  deadline?: string;
  riskClassification?: RiskClassification;
  euAiActDomain?: string;
  humanOversight?: Record<string, unknown>;
}

export interface ListMandatesParams extends ListParams {
  enterpriseId: string;
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
  deadline?: string;
  verificationMode?: VerificationMode;
}

export interface RespondToMandateParams {
  action: 'accept' | 'reject' | 'counter';
  reason?: string;
  counterTerms?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Receipts
// ---------------------------------------------------------------------------

export type ReceiptStatus =
  | 'SUBMITTED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'INVALID'
  | (string & {});

export interface Receipt {
  id: string;
  mandateId: string;
  agentId: string;
  status: ReceiptStatus;
  evidence: Record<string, unknown>;
  evidenceHash?: string;
  notes?: string;
  verificationPhase?: string;
  verificationResult?: Record<string, unknown>;
  verificationOutcome?: VerificationOutcome;
  verificationCompletedAt?: string;
  validationErrors?: string[] | null;
  mandateStatus?: MandateStatus;
  idempotencyKey?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface SubmitReceiptParams {
  agentId: string;
  evidence: Record<string, unknown>;
  notes?: string;
  idempotencyKey?: string;
}

export interface UpdateReceiptParams {
  evidence?: Record<string, unknown>;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

export type VerificationOutcome = 'PASS' | 'FAIL' | 'REVIEW_REQUIRED' | (string & {});
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
// Disputes
// ---------------------------------------------------------------------------

export type DisputeStatus =
  | 'OPEN'
  | 'TIER_1_REVIEW'
  | 'EVIDENCE_WINDOW'
  | 'TIER_2_REVIEW'
  | 'ESCALATED'
  | 'TIER_3_ARBITRATION'
  | 'RESOLVED'
  | 'WITHDRAWN'
  | (string & {});

export interface Dispute {
  id: string;
  mandateId: string;
  receiptId: string;
  status: DisputeStatus;
  reason: string;
  evidence?: Record<string, unknown>;
  currentTier: number;
  tierHistory?: Record<string, unknown>[];
  resolution?: string;
  amount?: number;
  createdAt: string;
  updatedAt?: string;
  resolvedAt?: string;
}

export interface CreateDisputeParams {
  grounds: string;
  context?: string;
}

export interface ResolveDisputeParams {
  resolution: string;
  amount?: number;
}

// ---------------------------------------------------------------------------
// Webhooks
// ---------------------------------------------------------------------------

export type WebhookEventType =
  | 'receipt.submitted'
  | 'receipt.verified'
  | 'receipt.accepted'
  | 'receipt.rejected'
  | 'mandate.created'
  | 'mandate.registered'
  | 'mandate.activated'
  | 'mandate.fulfilled'
  | 'mandate.failed'
  | 'mandate.cancelled'
  | 'mandate.delegated'
  | 'mandate.released'
  | 'dispute.created'
  | 'dispute.resolved'
  | 'signal.emitted'
  | 'verification.complete'
  | (string & {});

export interface Webhook {
  id: string;
  url: string;
  events: WebhookEventType[];
  eventTypes?: string[] | null;
  secret?: string;
  createdAt: string;
  lastTriggeredAt?: string;
  failureCount?: number;
}

export interface CreateWebhookParams {
  url: string;
  events: WebhookEventType[];
  eventTypes?: string[];
  secret?: string;
}

export interface UpdateWebhookParams {
  url?: string;
  events?: WebhookEventType[];
  eventTypes?: string[] | null;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  payload?: Record<string, unknown>;
  requestBody?: string;
  signature?: string;
  responseBody?: string;
  responseStatus?: number;
  httpStatus?: number;
  timestamp: string;
  retryCount?: number;
  attemptNumber?: number;
  nextRetryAt?: string;
  status: string;
}

export interface WebhookTestResult {
  statusCode: number;
  body: string;
  durationMs: number;
  success?: boolean;
  deliveryId?: string;
}

// ---------------------------------------------------------------------------
// Reputation
// ---------------------------------------------------------------------------

export type ReputationTier = 'platinum' | 'gold' | 'silver' | 'bronze' | (string & {});

export interface ReputationScore {
  agentId: string;
  score: number;
  tier: ReputationTier;
  completionRate: number;
  onTimeRate: number;
  disputeRate: number;
  lastUpdatedAt: string;
  factorsBreakdown?: Record<string, unknown>;
}

export interface ReputationHistoryEntry {
  timestamp: string;
  score: number;
  tier: ReputationTier;
  changeReason?: string;
}

// ---------------------------------------------------------------------------
// Events & Audit
// ---------------------------------------------------------------------------

export interface AgledgerEvent {
  id: string;
  mandateId: string;
  eventType: string;
  actor: string;
  actorId?: string;
  timestamp: string;
  changes?: Record<string, unknown>;
  details?: Record<string, unknown>;
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
// Registration & Auth
// ---------------------------------------------------------------------------

export type AccountType = 'enterprise' | 'agent' | 'platform';

export interface RegisterParams {
  accountType: AccountType;
  email: string;
  legalName: string;
  contactEmail?: string;
}

export interface RegisterResult {
  apiKey: string;
  sandboxMode: boolean;
  verificationRequired: string;
}

export interface AccountProfile {
  id: string;
  accountType: AccountType;
  displayName?: string;
  trustLevel?: string;
  enterpriseId?: string;
  capabilities?: ContractType[];
  sandboxMode?: boolean;
  /** API key scopes. Null = full access for the role. */
  scopes?: string[] | null;
  /** Scope profile name if key was created with a profile. */
  scopeProfile?: string | null;
  createdAt: string;
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
  legalName: string;
  trustLevel: string;
  createdAt: string;
}

export interface AdminAgent {
  id: string;
  displayName: string;
  enterpriseId: string;
  trustLevel: string;
  capabilities?: ContractType[];
  createdAt: string;
}

export interface AdminApiKey {
  id: string;
  ownerId: string;
  ownerType: AccountType;
  active: boolean;
  /** API key scopes. Null = full access for the role. */
  scopes?: string[] | null;
  /** Scope profile name if created with a profile. */
  scopeProfile?: string | null;
  createdAt: string;
  lastUsedAt?: string;
  expiresAt?: string | null;
}

export interface CreateApiKeyParams {
  ownerId: string;
  ownerType: AccountType;
  /** Explicit scopes to set on the key. */
  scopes?: string[];
  /** Convenience profile name — expands to a predefined scope array. Takes precedence over `scopes`. */
  scopeProfile?: string;
  /** Optional expiration date (ISO 8601). */
  expiresAt?: string;
  /** IP allowlist. Null = any IP. */
  allowedIps?: string[];
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
}

export interface SetCapabilitiesParams {
  capabilities: ContractType[];
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

export type NotarizeStatus =
  | 'NOTARIZED'
  | 'ACCEPTED'
  | 'COUNTER_PROPOSED'
  | 'RECEIPT_SUBMITTED'
  | 'VERDICT_PASS'
  | 'VERDICT_FAIL'
  | (string & {});

export interface NotarizedMandate {
  id: string;
  hash: string;
  contractType: ContractType;
  principalId: string;
  performerId?: string;
  status: NotarizeStatus;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface NotarizeTransition {
  status: NotarizeStatus;
  actor: string;
  hash?: string;
  timestamp: string;
}

export interface NotarizeMandateParams {
  contractType: ContractType;
  payload: Record<string, unknown>;
  performerHint?: string;
  metadata?: Record<string, unknown>;
}

export interface NotarizeMandateResult {
  mandate: NotarizedMandate;
  payload: Record<string, unknown>;
}

export interface NotarizeCounterProposeParams {
  payload: Record<string, unknown>;
  reason?: string;
}

export interface NotarizeReceiptParams {
  payload: Record<string, unknown>;
}

export interface NotarizeReceiptResult {
  receiptId: string;
  hash: string;
  mandateId: string;
  mandate: NotarizedMandate;
  payload: Record<string, unknown>;
}

export interface NotarizeVerdictParams {
  outcome: 'PASS' | 'FAIL';
  reason?: string;
}

export interface NotarizeVerifyParams {
  id: string;
  payload: Record<string, unknown>;
}

export interface NotarizeVerifyResult {
  match: boolean;
  storedHash: string;
  providedHash: string;
}

export interface NotarizeHistory {
  mandateId: string;
  transitions: NotarizeTransition[];
}

// ---------------------------------------------------------------------------
// Enterprise Agent Approval Registry
// ---------------------------------------------------------------------------

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
}

export interface ValidationErrorDetail {
  field: string;
  message: string;
  constraint?: string;
  expected?: unknown;
  actual?: unknown;
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
