/**
 * AGLedger™ SDK v1.0.0
 * Accountability and audit infrastructure for agentic systems.
 * Patent Pending. Copyright 2026 AGLedger LLC. All rights reserved.
 *
 * @packageDocumentation
 */

// Client
export { AgledgerClient } from './client.js';

// Types — everything exported for downstream consumers
export type {
  // Client config
  AgledgerClientOptions,
  RequestOptions,

  // Pagination
  ListParams,
  Page,
  AutoPaginateOptions,

  // Batch
  BatchResult,
  BulkCreateResult,

  // Contract types
  ContractType,
  ContractSchema,
  SchemaValidationResult,
  Denomination,

  // Schema Development Toolkit
  SchemaVersionStatus,
  SchemaCompatibilityMode,
  MetaSchema,
  SchemaFieldMapping,
  SchemaFieldMappingValueType,
  SchemaTemplate,
  SchemaPreviewInput,
  SchemaPreviewResult,
  SchemaPreviewError,
  SchemaDiffResult,
  SchemaDiffChange,
  SchemaExportResult,
  SchemaExportVersion,
  SchemaImportPayload,
  SchemaImportResult,
  SchemaImportDryRunResult,
  RegisterSchemaParams,
  SchemaVersionDetail,
  UpdateSchemaVersionParams,
  SchemaCompatibilityResult,
  ExportSchemaOptions,
  ImportSchemaOptions,

  // Typed criteria per contract type (Agentic Contract Specification)
  ProcurementCriteria,
  DeliverableCriteria,
  DataProcessingCriteria,
  TransactionCriteria,
  OrchestrationCriteria,
  CommunicationCriteria,
  AuthorizationCriteria,
  InfrastructureCriteria,
  DestructiveCriteria,

  // Typed evidence per contract type
  ProcurementEvidence,
  DeliverableEvidence,
  DataProcessingEvidence,
  TransactionEvidence,
  OrchestrationEvidence,
  CommunicationEvidence,
  AuthorizationEvidence,
  InfrastructureEvidence,
  DestructiveEvidence,

  // Type maps and helpers
  CriteriaMap,
  EvidenceMap,
  CriteriaFor,
  EvidenceFor,
  TypedCreateMandateParams,
  TypedSubmitReceiptParams,

  // Mandates
  MandateStatus,
  MandateTransitionAction,
  OperatingMode,
  VerificationMode,
  RiskClassification,
  Mandate,
  CreateMandateParams,
  UpdateMandateParams,
  ListMandatesParams,
  SearchMandatesParams,
  DelegateMandateParams,
  CreateAgentMandateParams,
  RespondToMandateParams,

  // Receipts
  ReceiptStatus,
  Receipt,
  SubmitReceiptParams,

  // Verification
  VerificationOutcome,
  SettlementSignal,
  VerificationResult,
  VerificationStatus,

  // Outcome (Principal Verdict)
  ReportOutcomeParams,
  OutcomeResult,

  // Mandate Summary
  MandateStatusSummary,

  // Disputes
  DisputeStatus,
  Dispute,
  CreateDisputeParams,

  // Webhooks
  WebhookEventType,
  Webhook,
  CreateWebhookParams,
  WebhookDelivery,
  WebhookTestResult,

  // Reputation
  ReputationTier,
  ReputationScore,
  ReputationHistoryEntry,

  // Events & Audit
  AgledgerEvent,
  AuditChain,

  // Rate limits
  RateLimitInfo,

  // Dashboard
  DashboardSummary,
  DashboardMetrics,
  DashboardMetricsParams,
  DashboardAgent,
  DashboardAgentParams,

  // Compliance & EU AI Act
  ComplianceExport,
  ExportComplianceParams,
  AiImpactAssessment,
  CreateAiImpactAssessmentParams,
  EuAiActReport,

  // Compliance Records (per-mandate)
  ComplianceRecordType,
  ComplianceRecord,
  CreateComplianceRecordParams,

  // Audit Export (per-mandate)
  AuditExportEntry,
  MandateAuditExport,

  // Audit Stream (SIEM)
  AuditStreamParams,
  AuditStreamResult,

  // Registration & Auth
  AccountType,
  AccountProfile,
  RegisterParams,
  RegisterResult,

  // Health & Conformance
  HealthResponse,
  StatusComponent,
  StatusResponse,
  ConformanceResponse,

  // Admin
  AdminEnterprise,
  AdminAgent,
  AdminApiKey,
  CreateEnterpriseParams,
  CreateAgentParams,
  EnterpriseConfig,
  SetEnterpriseConfigParams,
  CreateApiKeyParams,
  CreateApiKeyResult,
  WebhookDlqEntry,
  SystemHealth,
  UpdateTrustLevelParams,
  SetCapabilitiesParams,
  ListWebhooksParams,

  // A2A Protocol
  AgentCard,
  JsonRpcRequest,
  JsonRpcResponse,

  // Governance Sidecar (Proxy)
  ProxyMode,
  InterceptorAction,
  ConfidenceLevel,
  SidecarMandateStatus,
  SessionOutcome,
  ProxySession,
  CreateSessionParams,
  ToolCallBatchItem,
  SidecarMandateBatchItem,
  SidecarReceiptBatchItem,
  ToolCatalogBatchItem,
  SyncSessionParams,
  SyncSessionResult,
  ProxySidecarMandate,
  ProxySidecarReceipt,
  ProxyToolCall,
  ProxyToolCatalogEntry,
  UpdateSidecarMandateParams,
  SessionAnalytics,
  AnalyticsSummary,
  MandateSummary,
  AlignmentAnalysis,

  // Notarization (OpenClaw Agent-to-Agent Agreements)
  NotarizeStatus,
  NotarizedMandate,
  NotarizeTransition,
  NotarizeMandateParams,
  NotarizeMandateResult,
  NotarizeCounterProposeParams,
  NotarizeReceiptParams,
  NotarizeReceiptResult,
  NotarizeVerdictParams,
  NotarizeVerifyParams,
  NotarizeVerifyResult,
  NotarizeHistory,

  // Enterprise Agent Approval Registry
  EnterpriseAgentStatus,
  EnterpriseAgentRecord,
  ApprovalConfig,
  ApproveAgentParams,
  RevokeAgentParams,
  UpdateAgentStatusParams,
  BulkApproveAgentParams,
  BulkApproveResult,
  ListEnterpriseAgentsParams,

  // Errors
  ApiErrorResponse,
  ValidationErrorDetail,

  // Deprecated — use the above types instead
  /** @deprecated Use `ListParams` */
  PaginationParams,
  /** @deprecated Use `Page<T>` */
  PaginatedResponse,
  /** @deprecated Use `Page<T>` */
  CursorPaginatedResponse,
  /** @deprecated Use `AgledgerEvent` */
  AuditEvent,
} from './types.js';

// Error classes
export {
  AgledgerError,
  AgledgerApiError,
  AuthenticationError,
  PermissionError,
  NotFoundError,
  ValidationError,
  UnprocessableError,
  RateLimitError,
  ConnectionError,
  TimeoutError,
} from './errors.js';

// Scopes
export { Scopes, ScopeProfiles } from './scopes.js';
export type { Scope, ScopeProfile, ScopeProfileName } from './scopes.js';

// Mandate State Machine
export {
  MANDATE_TRANSITIONS,
  TERMINAL_STATUSES,
  canTransitionTo,
  getValidTransitions,
  isTerminalStatus,
} from './mandate-lifecycle.js';

// Prompt Context Builders
export { mandateToContext, receiptToContext, errorToContext } from './prompt-context.js';
