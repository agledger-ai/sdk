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
  SchemaListItem,
  TypeSchema,
  SchemaValidationResult,

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

  // Records
  AcceptanceStatus,
  RecordStatus,
  RecordTransitionAction,
  OperatingMode,
  GateMode,
  RiskClassification,
  EuAiActRiskTier,
  EuAiActDomain,
  ConstraintInheritanceMode,
  EvidenceType,
  RecordRow,
  RecordIntegrity,
  CreateRecordParams,
  UpdateRecordParams,
  ListRecordsParams,
  GetRecordParams,
  SearchRecordsParams,
  DelegateRecordParams,
  CounterProposeParams,
  BatchGetRecordsResult,
  BulkCreateRecordItem,
  SignedStatement,
  SettlementSignalSummary,
  RecordReadCompletion,

  // Completions
  StructuralValidation,
  Completion,
  CompletionSettlementSignal,
  SubmitCompletionParams,

  // Gate (evaluation + status)
  SettlementSignal,
  GateEvaluationResult,
  GateStatus,

  // Verdict (principal accept/reject)
  Verdict,
  SubmitVerdictParams,
  VerdictResult,
  VerdictStatistics,
  VerdictStatisticsRow,

  // Disputes
  DisputeStatus,
  DisputeGrounds,
  Dispute,
  DisputeResponse,
  DisputeEvidence,
  CreateDisputeParams,
  ListDisputesParams,
  WithdrawDisputeParams,

  // Webhooks
  WebhookEventType,
  Webhook,
  CreateWebhookParams,
  UpdateWebhookParams,
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
  VaultCheckpoint,
  ListVaultCheckpointsParams,

  // Org-admin reads checkpoints (SCITT-style)
  OrgReadsCheckpoint,
  CosignCheckpointParams,
  OrgReadsInclusionProof,

  // SCITT Transparency Service (SCRAPI discovery + checkpoint)
  ScittConfiguration,
  ScittCheckpoint,

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
  AdminOrg,
  AdminAgent,
  AdminApiKey,
  CreateOrgParams,
  CreateAgentParams,
  OrgConfig,
  SetOrgConfigParams,
  CreateApiKeyParams,
  UpdateApiKeyParams,
  CreateApiKeyResult,
  WebhookDlqEntry,
  SystemHealth,
  SetCapabilitiesParams,
  DeactivateOrgParams,
  DeactivateAgentParams,
  RateLimitExemption,
  ProvisioningStatus,
  SupportBundle,
  LicenseInstanceInfo,
  ListWebhooksParams,
  AdminImportRecordsParams,
  AdminImportRecordsResult,
  BackfillRecord,
  QueryAdminRecordsParams,

  // Admin — Trusted OIDC issuers & ephemeral certs
  TrustedIssuer,
  TrustedIssuerAppliesTo,
  CreateTrustedIssuerParams,
  UpdateTrustedIssuerParams,
  ListTrustedIssuersParams,
  RevokeTrustedIssuerCertsResult,
  EphemeralCert,
  RotateKeyParams,
  IssueEphemeralCertParams,
  IssueEphemeralCertResult,
  RevokeEphemeralCertResult,

  // Admin — Operations summary
  OpsSummary,

  // A2A Protocol
  AgentCard,
  JsonRpcRequest,
  JsonRpcResponse,

  // Federation — Enums
  RevocationReason,
  FederationVerdict,
  FederationSettlementSignal,

  // Federation — Peer Operations
  PeerHandshakeParams,
  PeerHandshakeResult,
  SubmitStateTransitionParams,
  StateTransitionResult,
  RelaySignalParams,
  SignalRelayResult,
  SubmitCoSignRequestParams,
  CoSignRequestResult,
  SubmitDisputeProtocolParams,
  DisputeProtocolResult,

  // Federation — Admin
  FederationDlqEntry,

  // Admin — Circuit breaker / search
  UpdateCircuitBreakerParams,
  CircuitBreakerResult,

  // Agents
  AgentProfile,
  AgentDirectoryEntry,
  UpdateAgentParams,
  PeerAgent,
  ListPeerAgentsParams,
  PeerAgentsResponse,

  // References
  EntityReference,
  ReferenceLookupResult,

  // Admin — Vault
  VaultSigningKey,
  VaultAnchor,
  VaultAnchorVerifyResult,
  VaultScanJob,
  VaultScanState,
  VaultScanResult,
  VaultScanBrokenRecord,
  VaultScanSummary,
  VaultScanList,

  // Admin — Auth Cache
  AuthCacheStats,

  // Admin — License
  LicenseTier,
  LicenseInfo,

  // Verification Keys (public)
  VerificationKey,
  VerificationKeysResponse,

  // Federation — Peers
  FederationPeer,
  PeeringToken,

  // Federation — Reputation
  ContributeReputationParams,
  FederationAgentReputation,

  // Federation — Peer Sync
  AgentDirectorySyncParams,

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
export { recordToContext, completionToContext, errorToContext } from './prompt-context.js';
