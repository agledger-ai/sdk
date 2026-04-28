// Client
export { AgledgerClient, createFederationClient } from './client.js';

// Types — everything exported for downstream consumers
export type {
  // Next Steps (HATEOAS)
  NextStep,

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

  // Record Types
  RecordType,
  TypeSchema,
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

  // Typed criteria per Type (Agentic Contract Specification)
  ProcurementCriteria,
  DeliverableCriteria,
  DataProcessingCriteria,
  TransactionCriteria,
  OrchestrationCriteria,
  CommunicationCriteria,
  AuthorizationCriteria,
  InfrastructureCriteria,
  DestructiveCriteria,
  AnalyzeCriteria,
  CoordinationCriteria,
  MonitoringCriteria,
  ReviewCriteria,

  // Typed evidence per Type
  ProcurementEvidence,
  DeliverableEvidence,
  DataProcessingEvidence,
  TransactionEvidence,
  OrchestrationEvidence,
  CommunicationEvidence,
  AuthorizationEvidence,
  InfrastructureEvidence,
  DestructiveEvidence,
  AnalyzeEvidence,
  CoordinationEvidence,
  MonitoringEvidence,
  ReviewEvidence,

  // Type maps and helpers
  CriteriaMap,
  EvidenceMap,
  CriteriaFor,
  EvidenceFor,
  TypedCreateRecordParams,
  TypedSubmitReceiptParams,

  // Records
  AcceptanceStatus,
  RecordStatus,
  RecordTransitionAction,
  OperatingMode,
  VerificationMode,
  RiskClassification,
  ConstraintInheritanceMode,
  EvidenceType,
  RecordRow,
  CreateRecordParams,
  UpdateRecordParams,
  ListRecordsParams,
  SearchRecordsParams,
  DelegateRecordParams,
  CounterProposeParams,
  BatchGetRecordsResult,
  BulkCreateRecordItem,
  VaultReceipt,
  RecordReadReceipt,

  // Receipts
  StructuralValidation,
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
  VerdictStatistics,

  // Disputes
  DisputeStatus,
  DisputeGrounds,
  Dispute,
  DisputeResponse,
  CreateDisputeParams,
  ListDisputesParams,

  // Webhooks
  WebhookEventType,
  Webhook,
  CreateWebhookParams,
  WebhookDelivery,
  WebhookTestResult,

  // Reputation
  ReputationScore,
  ReputationHistoryEntry,

  // Events & Audit
  AgledgerEvent,

  // Rate limits
  RateLimitInfo,

  // Compliance & EU AI Act
  ComplianceExport,
  ExportComplianceParams,
  AiImpactAssessment,
  CreateAiImpactAssessmentParams,
  EuAiActReport,

  // Compliance Records (per-Record)
  ComplianceRecordType,
  ComplianceRecord,
  CreateComplianceRecordParams,

  // Audit Export (per-Record)
  AuditExportEntry,
  AuditActor,
  RecordAuditExport,

  // Audit Stream (SIEM) & Vault
  AuditStreamParams,
  AuditStreamResult,
  AuditVaultExportParams,

  // Tenant-admin reads checkpoints (SCITT-style)
  TenantReadsCheckpoint,
  CosignCheckpointParams,
  TenantReadsInclusionProof,

  // Vault admin
  StartVaultScanParams,
  VerifyVaultAnchorsParams,

  // Auth & identity
  ApiKeyRole,
  AccountProfile,

  // Health & Conformance & Discovery
  HealthResponse,
  StatusComponent,
  StatusResponse,
  ConformanceResponse,
  ScopeProfileInfo,
  RecordLifecycleInfo,

  // Admin
  AdminEnterprise,
  AdminAgent,
  AdminApiKey,
  CreateEnterpriseParams,
  CreateAgentParams,
  EnterpriseConfig,
  SetEnterpriseConfigParams,
  CreateApiKeyParams,
  UpdateApiKeyParams,
  CreateApiKeyResult,
  WebhookDlqEntry,
  SystemHealth,
  SetCapabilitiesParams,
  DeactivateAccountParams,
  RateLimitExemption,
  ProvisioningStatus,
  SupportBundle,
  LicenseInstanceInfo,
  ListWebhooksParams,
  AdminImportRecordsParams,
  AdminImportRecordsResult,
  BackfillRecord,
  QueryAdminRecordsParams,

  // A2A Protocol
  AgentCard,
  JsonRpcRequest,
  JsonRpcResponse,

  // Federation — Enums
  HubState,
  GatewayStatus,
  RevocationReason,
  FederationVerificationOutcome,
  FederationSettlementSignal,
  FederationAuditEntryType,

  // Federation — Gateway Operations
  RegisterGatewayParams,
  RegisterGatewayResult,
  HeartbeatParams,
  HeartbeatResult,
  RegisterFederatedAgentParams,
  FederationAgent,
  ListFederatedAgentsParams,
  SubmitStateTransitionParams,
  StateTransitionResult,
  RelaySignalParams,
  SignalRelayResult,
  RotateGatewayKeyParams,
  RevokeGatewayParams,
  FederationCatchUpParams,

  // Federation — Admin
  CreateRegistrationTokenParams,
  FederationRegistrationToken,
  ListFederationGatewaysParams,
  FederationGateway,
  AdminRevokeGatewayParams,
  QueryFederationRecordsParams,
  FederationRecord,
  FederationAuditLogParams,
  FederationAuditEntry,
  FederationHealthSummary,
  ResetSequenceParams,
  ListOutboundDlqParams,
  FederationDlqEntry,

  // Admin — Circuit breaker / search
  UpdateCircuitBreakerParams,
  CircuitBreakerResult,

  // Agents
  AgentProfile,
  UpdateAgentParams,

  // References
  EntityReference,
  ReferenceLookupResult,

  // Admin — Vault
  VaultSigningKey,
  VaultAnchor,
  VaultAnchorVerifyResult,
  VaultScanJob,

  // Admin — Auth Cache
  AuthCacheStats,

  // Admin — License
  LicenseTier,
  LicenseInfo,

  // Verification Keys (public)
  VerificationKey,
  VerificationKeysResponse,

  // Federation — Hub Keys
  HubSigningKey,

  // Federation — Peers
  FederationPeer,
  PeeringToken,

  // Federation — Schema Publishing
  SchemaPublishParams,
  SchemaConfirmParams,

  // Federation — Record Criteria
  FederationRecordCriteria,
  SubmitRecordCriteriaParams,
  RecordCriteriaStatus,

  // Federation — Reputation
  ReputationContribution,
  ContributeReputationParams,
  FederationAgentReputation,

  // Federation — Peer Sync
  RevocationBroadcastParams,
  AgentDirectorySyncParams,
  PeerRegistrationParams,

  // Errors
  ApiErrorResponse,
  ValidationErrorDetail,
} from './types.js';

// Error classes
export {
  AgledgerError,
  AgledgerApiError,
  AuthenticationError,
  PermissionError,
  NotFoundError,
  ConflictError,
  IdempotencyError,
  ValidationError,
  UnprocessableError,
  RateLimitError,
  ConnectionError,
  TimeoutError,
  SignatureVerificationError,
} from './errors.js';

// Scopes
export { Scopes, ScopeProfiles } from './scopes.js';
export type { Scope, ScopeProfile, ScopeProfileName } from './scopes.js';

// Record State Machine
export {
  RECORD_TRANSITIONS,
  TERMINAL_STATUSES,
  canTransitionTo,
  getValidTransitions,
  isTerminalStatus,
} from './record-lifecycle.js';

// Prompt Context Builders
export { recordToContext, receiptToContext, errorToContext } from './prompt-context.js';
