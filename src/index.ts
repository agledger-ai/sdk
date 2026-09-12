// Client
export { AgledgerClient, createFederationClient } from './client.js';

// Types: everything exported for downstream consumers
export type {
  // Next Steps (HATEOAS)
  NextStep,

  // Client config
  AgledgerClientOptions,
  RequestOptions,

  // Pagination
  ListParams,
  ListCompletionsParams,
  LimitParams,
  CursorListParams,
  OffsetListParams,
  Page,
  AutoPaginateOptions,

  // Batch
  BatchResult,
  BulkCreateResult,

  // Record Types
  RecordType,
  SchemaListItem,
  ListSchemasParams,
  TypeSchema,
  SchemaValidationResult,
  SchemaKeywordWarning,

  // Schema Development Toolkit
  SchemaVersionStatus,
  SchemaCompatibilityMode,
  MetaSchema,
  ExpressionHelperDoc,
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
  SchemaManifest,
  SchemaManifestExport,
  SchemaImportParams,
  SchemaRulesConfig,
  SchemaRulesResult,
  SchemaScopeOptions,
  SchemaDeleteResult,
  SchemaLifecycleResult,
  RegisterSchemaParams,
  SchemaVersionDetail,
  UpdateSchemaVersionParams,
  SchemaCompatibilityResult,
  ExportSchemaOptions,

  // Records
  AcceptanceStatus,
  RecordStatus,
  RecordStatusFilter,
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
  BatchGetRecordsResult,
  BulkCreateRecordItem,
  SignedStatement,
  SettlementSignalSummary,
  CoSignStatus,
  CoSignPeerLeg,
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
  DisputeStatusFilter,
  DisputeProtocolAction,
  DisputeGrounds,
  DisputeOutcome,
  Dispute,
  DisputeResponse,
  DisputeEvidence,
  CreateDisputeParams,
  ResolveDisputeParams,
  ListDisputesParams,
  WithdrawDisputeParams,

  // Webhooks
  WebhookEventType,
  Webhook,
  CreateWebhookParams,
  UpdateWebhookParams,
  WebhookDelivery,
  WebhookTestResult,

  // Agent drift
  GetAgentDriftParams,
  ListFleetDriftParams,
  DriftWindow,
  DriftBucket,
  DriftChange,
  DriftSeries,
  AgentDrift,
  FleetDriftRow,
  FleetDriftPage,
  AgentHistoryParams,
  AgentHistoryEntry,

  // Events & Audit
  AgledgerEvent,
  EventType,
  ListEventsParams,

  // Rate limits
  RateLimitInfo,

  // Compliance & EU AI Act
  ComplianceExport,
  ExportComplianceParams,
  AiImpactAssessment,
  CreateAiImpactAssessmentParams,

  // Compliance Records (per-Record)
  ComplianceRecordType,
  ComplianceRecord,
  CreateComplianceRecordParams,

  // Audit Export (per-Record)
  AuditExportEntry,
  AuditChainFailure,
  AuditChainIntegrityDetail,
  AuditChainIntegrityReason,
  AuditSignatureCoverage,
  BackfillImportedRecord,
  FederationSchemaRef,
  AuditActor,
  RecordAuditExport,

  // Audit Stream (SIEM) & Vault
  AuditStreamParams,
  AuditStreamResult,
  AuditVaultExportParams,
  VaultCheckpoint,
  VaultCheckpointChain,
  VaultCheckpointPage,
  VaultCheckpointingSchedule,
  ListVaultCheckpointsParams,

  // Org-admin reads checkpoints (SCITT-style)
  OrgReadsCheckpoint,
  OrgReadsCheckpointPage,
  OrgReadsCheckpointingSchedule,
  OrgReadsCheckpointingSource,
  ListOrgReadsCheckpointsParams,
  OrgAdminRead,
  ListOrgAdminReadsParams,
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
  KeyOwnerType,
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
  OrgConfigDocument,
  SetOrgConfigParams,
  EnforcementSettings,
  EnforcementMode,
  EnforcementSource,
  DisputesConfig,
  AutoReadjudicateConfig,
  CreateApiKeyParams,
  UpdateApiKeyParams,
  CreateApiKeyResult,
  WebhookDlqEntry,
  WebhookHealthEntry,
  SystemHealth,
  QueueCounts,
  WebhookSigningAlg,
  SetCapabilitiesParams,
  DeactivateOrgParams,
  DeactivateAgentParams,
  DeactivateResult,
  ReactivateParams,
  ReactivateResult,
  RateLimitExemption,
  ProvisioningStatus,
  ProvisioningReloadCounts,
  ProvisioningGeneratedKey,
  ProvisioningReloadResult,
  SupportBundle,
  LicenseInstanceInfo,
  ListWebhooksParams,
  ListApiKeysParams,
  AdminImportRecordsParams,
  AdminImportRecordsResult,
  BackfillRecord,
  QueryAdminRecordsParams,

  // Admin: Trusted OIDC issuers & ephemeral certs
  TrustedIssuer,
  TrustedIssuerAppliesTo,
  AutoProvisionScopeProfile,
  CreateTrustedIssuerParams,
  UpdateTrustedIssuerParams,
  ListTrustedIssuersParams,
  RevokeTrustedIssuerCertsResult,
  EphemeralCert,
  RotateKeyParams,
  RotateKeyResult,
  IssueEphemeralCertParams,
  IssueEphemeralCertResult,
  RevokeEphemeralCertResult,

  // Admin: Operations summary
  OpsSummary,

  // A2A Protocol
  AgentCard,
  JsonRpcRequest,
  JsonRpcResponse,

  // Federation: Enums
  RevocationReason,
  FederationVerdict,
  FederationSettlementSignal,

  // Federation: Peer Operations
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

  // Federation: Admin
  FederationDlqEntry,

  // Admin: Circuit breaker / search
  UpdateCircuitBreakerParams,
  CircuitBreakerResult,

  // Agents
  AgentProfile,
  AgentDirectoryEntry,
  ListAgentsParams,
  UpdateAgentParams,
  AgentClass,
  PeerAgent,
  ListPeerAgentsParams,
  PeerAgentsResponse,

  // References
  EntityReference,
  EntityReferenceInput,
  ReferenceLookupResult,

  // Admin: Vault
  VaultSigningKey,
  VaultAnchor,
  VaultAnchorVerifyResult,
  VaultAnchorVerifyRow,
  VaultScanJob,
  VaultScanState,
  VaultScanResult,
  VaultScanBrokenRecord,
  VaultScanBrokenChain,
  VaultScanGlobalChains,
  VaultScanSummary,
  VaultScanList,

  // Admin: Auth Cache
  AuthCacheStats,

  // Admin: License
  LicenseTier,
  LicenseInfo,

  // Verification Keys (public)
  VerificationKey,
  VerificationKeysResponse,

  // Federation: Peers
  FederationPeer,
  FederationPeerStatus,
  FederationPeerStatusFilter,
  ListPeersParams,
  PeeringToken,

  // Federation: Peer Sync

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
  ConfigurationError,
  SignatureVerificationError,
  SignatureAlgorithmUnavailableError,
  PaginationLimitError,
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
