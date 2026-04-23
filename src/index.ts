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
  AnalyzeCriteria,
  CoordinationCriteria,
  MonitoringCriteria,
  ReviewCriteria,

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
  AnalyzeEvidence,
  CoordinationEvidence,
  MonitoringEvidence,
  ReviewEvidence,

  // Type maps and helpers
  CriteriaMap,
  EvidenceMap,
  CriteriaFor,
  EvidenceFor,
  TypedCreateMandateParams,
  TypedSubmitReceiptParams,

  // Mandates
  AcceptanceStatus,
  MandateStatus,
  MandateTransitionAction,
  OperatingMode,
  VerificationMode,
  RiskClassification,
  ConstraintInheritanceMode,
  EvidenceType,
  Mandate,
  CreateMandateParams,
  UpdateMandateParams,
  ListMandatesParams,
  SearchMandatesParams,
  DelegateMandateParams,
  CounterProposeParams,
  BatchGetMandatesResult,

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

  // Disputes
  DisputeStatus,
  DisputeGrounds,
  Dispute,
  DisputeResponse,
  CreateDisputeParams,

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
  AuditChain,

  // Rate limits
  RateLimitInfo,

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
  AuditActor,
  MandateAuditExport,

  // Audit Stream (SIEM) & Vault
  AuditStreamParams,
  AuditStreamResult,
  AuditVaultExportParams,

  // Auth & identity
  ApiKeyRole,
  AccountType,
  AccountProfile,

  // Health & Conformance & Discovery
  HealthResponse,
  StatusComponent,
  StatusResponse,
  ConformanceResponse,
  ScopeProfileInfo,
  MandateLifecycleInfo,

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
  QueryFederationMandatesParams,
  FederationMandate,
  FederationAuditLogParams,
  FederationAuditEntry,
  FederationHealthSummary,
  ResetSequenceParams,
  ListOutboundDlqParams,
  FederationDlqEntry,

  // Admin — Circuit breaker / mandate search
  QueryAdminMandatesParams,
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

  // Federation — Mandate Criteria
  FederationMandateCriteria,
  SubmitMandateCriteriaParams,
  MandateCriteriaStatus,

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
