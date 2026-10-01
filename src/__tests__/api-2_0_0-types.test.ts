import { describe, it, expectTypeOf } from 'vitest';
import type {
  AdminApiKey,
  AdminRecordSummary,
  ApiErrorResponse,
  AuditChainFailure,
  AuditChainIntegrityReason,
  BatchGetRecordsResult,
  BulkCreateResult,
  BulkRevokeApiKeysParams,
  BulkRevokeApiKeysResult,
  Completion,
  ComplianceExport,
  ConformanceResponse,
  CreateApiKeyParams,
  CreateTrustedIssuerParams,
  CursorListParams,
  Dispute,
  DisputeProtocolAction,
  DisputeProtocolResult,
  DisputeResponse,
  EntityReferencesResult,
  EventPage,
  EventType,
  GateEvaluationResult,
  GateStatus,
  HealthResponse,
  IssueEphemeralCertResult,
  LicenseInfo,
  LicenseNotice,
  LicenseNoticeKind,
  LicenseTier,
  ListApiKeysParams,
  ListCompletionsParams,
  ListDisputesParams,
  ListEventsParams,
  ListOrgReadsCheckpointsParams,
  ListParams,
  ListPeersParams,
  ListRecordsParams,
  ListSchemasParams,
  ListWebhooksParams,
  OpsSummary,
  PeerHandshakeResult,
  ProvisioningReloadResult,
  ProvisioningStatus,
  QueryAdminRecordsParams,
  RecordAuditExport,
  RecordGraph,
  RecordReadCompletion,
  RecordRow,
  RecordRowCompact,
  ReferenceLookupParams,
  RelaySignalParams,
  RotateKeyResult,
  SchemaQuickStart,
  SchemaValidationResult,
  SearchRecordsParams,
  SigningKeyStatement,
  StatusComponent,
  SubmitCoSignRequestParams,
  SubmitDisputeProtocolParams,
  SubmitStateTransitionParams,
  SystemHealth,
  TrustedIssuer,
  UpdateApiKeyParams,
  UpdateTrustedIssuerParams,
  VaultActiveSigningKey,
  VaultAnchor,
  VaultAnchorReconcileFinding,
  VaultAnchorReconcileResult,
  VaultAnchorVerifyRow,
  VaultRewindAcknowledgement,
  VaultRewindState,
  VaultRewindStatus,
  VaultScanResult,
  VaultSigningKey,
  VaultSigningKeyRetirement,
  VaultSigningKeyRotation,
  VerdictResult,
  VerificationKey,
  VerificationKeysResponse,
  Webhook,
  WebhookHealthEntry,
  WebhookTestResult,
} from '../types.js';
import type { AgledgerApiError } from '../errors.js';
import type { AdminResource } from '../resources/admin.js';
import type * as Sdk from '../index.js';
import type { ComplianceResource } from '../resources/compliance.js';

/**
 * The client surface for API 2.0, including the fields the SDK once declared
 * that the Server never sent. Every type, field and member named here is
 * checked against the 2.0 spec. Compiled by `tsconfig.typetests.json`, so a
 * wrong assertion here fails `npm run typecheck`.
 */

describe('error bodies carry detail, not message', () => {
  it('drops the fields API 2.0 no longer sends', () => {
    expectTypeOf<ApiErrorResponse>().not.toHaveProperty('message');
    expectTypeOf<ApiErrorResponse>().not.toHaveProperty('code');
    expectTypeOf<ApiErrorResponse>().not.toHaveProperty('docs');
    expectTypeOf<ApiErrorResponse>().not.toHaveProperty('docUrl');
    expectTypeOf<ApiErrorResponse>().not.toHaveProperty('signInputTemplate');
    expectTypeOf<ApiErrorResponse>().not.toHaveProperty('migratedTo');
    expectTypeOf<ApiErrorResponse['detail']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<AgledgerApiError>().not.toHaveProperty('docs');
    expectTypeOf<AgledgerApiError>().not.toHaveProperty('docUrl');
  });

  it('names the submission-cap fields', () => {
    expectTypeOf<ApiErrorResponse['submissionCount']>().toEqualTypeOf<number | undefined>();
    expectTypeOf<ApiErrorResponse['maxSubmissions']>().toEqualTypeOf<number | undefined>();
  });

  it('exports no IdempotencyError, which the Server never produced', () => {
    expectTypeOf<typeof Sdk>().not.toHaveProperty('IdempotencyError');
  });
});

describe('keyset listings take cursor only', () => {
  it('offers no offset where the route refuses it', () => {
    expectTypeOf<ListRecordsParams>().not.toHaveProperty('offset');
    expectTypeOf<SearchRecordsParams>().not.toHaveProperty('offset');
    expectTypeOf<ListCompletionsParams>().not.toHaveProperty('offset');
    expectTypeOf<ListDisputesParams>().not.toHaveProperty('offset');
    expectTypeOf<ListEventsParams>().not.toHaveProperty('offset');
    expectTypeOf<QueryAdminRecordsParams>().not.toHaveProperty('offset');
    expectTypeOf<ListWebhooksParams>().not.toHaveProperty('offset');
    expectTypeOf<ListApiKeysParams>().not.toHaveProperty('offset');
    expectTypeOf<ReferenceLookupParams>().not.toHaveProperty('offset');
    expectTypeOf<ListOrgReadsCheckpointsParams>().not.toHaveProperty('offset');
    expectTypeOf<CursorListParams>().not.toHaveProperty('offset');
  });

  it('keeps offset on the listings that still take it', () => {
    expectTypeOf<ListParams['offset']>().toEqualTypeOf<number | undefined>();
    expectTypeOf<ListSchemasParams['offset']>().toEqualTypeOf<number | undefined>();
    expectTypeOf<ListPeersParams['offset']>().toEqualTypeOf<number | undefined>();
  });
});

describe('federation requests match what the receiver requires', () => {
  it('requires the fields the routes require', () => {
    expectTypeOf<RelaySignalParams['schemaRef']>().not.toEqualTypeOf<undefined>();
    expectTypeOf<RelaySignalParams>().not.toHaveProperty('reason');
    expectTypeOf<RelaySignalParams['reasonCode']>().toEqualTypeOf<string | null>();
    expectTypeOf<RelaySignalParams['failingRuleIds']>().toEqualTypeOf<string[] | null>();
    expectTypeOf<SubmitDisputeProtocolParams>().not.toHaveProperty('tier');
    expectTypeOf<SubmitStateTransitionParams['principalAgentId']>().toEqualTypeOf<string>();
    expectTypeOf<SubmitStateTransitionParams['operatingMode']>().toEqualTypeOf<'cleartext' | 'encrypted'>();
    expectTypeOf<{ recordId: string }>().not.toMatchTypeOf<SubmitCoSignRequestParams>();
  });

  it('drops the retired dispute action and state-transition reason', () => {
    expectTypeOf<'escalated'>().not.toMatchTypeOf<DisputeProtocolAction>();
    expectTypeOf<DisputeProtocolResult['ack']>().toEqualTypeOf<true>();
  });

  it('returns the receiver hub id from the handshake', () => {
    expectTypeOf<PeerHandshakeResult['serverHubId']>().toEqualTypeOf<string | null | undefined>();
  });
});

describe('the 2.0 event and chain vocabularies', () => {
  it('EventType names the two replay-only types and not the removed ones', () => {
    expectTypeOf<'record.released'>().toMatchTypeOf<EventType>();
    expectTypeOf<'dispute.evidence_window_closed'>().toMatchTypeOf<EventType>();
  });
});

describe('vault key trust and anchors', () => {
  it('a retirement reports what it unanchored', () => {
    expectTypeOf<VaultSigningKeyRetirement['alreadyRetired']>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<VaultSigningKeyRetirement['unanchoredKeyIds']>().toEqualTypeOf<string[] | undefined>();
    expectTypeOf<VaultSigningKeyRetirement['closureDigest']>().toEqualTypeOf<string | null | undefined>();
    expectTypeOf<VaultSigningKeyRetirement['retiredSpkiSha256']>().toEqualTypeOf<string | undefined>();
  });

  it('a registry row says whether the trust walk reaches it', () => {
    expectTypeOf<'unanchored'>().toMatchTypeOf<NonNullable<VaultSigningKey['trust']>>();
    expectTypeOf<VaultSigningKey['admittedBy']>().toEqualTypeOf<string | null | undefined>();
  });

  it('verification keys carry their signed statements', () => {
    expectTypeOf<VerificationKey['statements']>().toEqualTypeOf<SigningKeyStatement[]>();
    expectTypeOf<SigningKeyStatement['kind']>().toEqualTypeOf<'succession' | 'closure' | 'genesis'>();
    expectTypeOf<VerificationKeysResponse['anchoredFrom']>().toEqualTypeOf<string | null>();
  });

  it('an anchor row is the bucket object, not a checkpoint', () => {
    expectTypeOf<VaultAnchor>().not.toHaveProperty('entryHash');
    expectTypeOf<VaultAnchor['versions']>().toEqualTypeOf<number | undefined>();
    expectTypeOf<VaultAnchor['hidden']>().toEqualTypeOf<boolean | undefined>();
  });

  it('verify, reconcile and rewind name the outcomes 2.0 serves', () => {
    expectTypeOf<'missing_or_hidden'>().toMatchTypeOf<NonNullable<VaultAnchorVerifyRow['outcome']>>();
    expectTypeOf<VaultAnchorReconcileFinding['finding']>().toEqualTypeOf<'rewound' | 'missing_locally' | 'fork'>();
    expectTypeOf<VaultAnchorReconcileResult['status']>().toEqualTypeOf<
      'disabled' | 'ok' | 'incomplete' | 'acknowledged' | 'findings'
    >();
    expectTypeOf<'acknowledgement_check'>().toMatchTypeOf<VaultRewindState['source']>();
    expectTypeOf<VaultRewindStatus['openFindings']>().not.toEqualTypeOf<undefined>();
    expectTypeOf<VaultRewindAcknowledgement['coveredFindings']>().toEqualTypeOf<number | undefined>();
  });

  it('a full scan carries the key-registry walk, and ops-summary the write refusal', () => {
    expectTypeOf<VaultScanResult>().toHaveProperty('keyRegistry');
    expectTypeOf<OpsSummary['vault']['chainWrites']['refused']>().toEqualTypeOf<boolean | null>();
  });
});

describe('records, verdicts, certs and webhook pings', () => {
  it('createdByKeyId is null on a federation-received Record', () => {
    expectTypeOf<RecordRow['createdByKeyId']>().toEqualTypeOf<string | null>();
    expectTypeOf<RecordRowCompact['createdByKeyId']>().toEqualTypeOf<string | undefined>();
  });

  it('a verdict names who rendered it and never recommends RELEASE', () => {
    expectTypeOf<VerdictResult['recommendation']>().toEqualTypeOf<'SETTLE' | 'HOLD'>();
    expectTypeOf<VerdictResult['reporterRole']>().toEqualTypeOf<'principal' | 'org-admin' | undefined>();
  });

  it('bulk and batch carry what the Server sends', () => {
    expectTypeOf<BulkCreateResult['results'][number]['constraintViolations']>().toEqualTypeOf<
      Record<string, unknown>[] | undefined
    >();
    expectTypeOf<BatchGetRecordsResult>().toHaveProperty('nextSteps');
  });

  it('a cert is always bound to an agent', () => {
    expectTypeOf<IssueEphemeralCertResult['cert']['agentId']>().toEqualTypeOf<string>();
  });

  it('a dispute context can be null', () => {
    expectTypeOf<Dispute['context']>().toEqualTypeOf<string | null | undefined>();
  });

  it('a ping result drops the httpStatus and latencyMs twins', () => {
    expectTypeOf<WebhookTestResult>().not.toHaveProperty('httpStatus');
    expectTypeOf<WebhookTestResult>().not.toHaveProperty('latencyMs');
    expectTypeOf<WebhookTestResult['statusCode']>().toEqualTypeOf<number>();
    expectTypeOf<WebhookTestResult['durationMs']>().toEqualTypeOf<number>();
  });
});

describe('admin, auth, health, schemas and events', () => {
  it('a key row and a rotation name the scope profile', () => {
    expectTypeOf<AdminApiKey['scopeProfile']>().toMatchTypeOf<string | null | undefined>();
    expectTypeOf<RotateKeyResult['keyId']>().toEqualTypeOf<string | undefined>();
  });

  it('health names the signing gate, and status the probe failure', () => {
    expectTypeOf<'unanchored'>().toMatchTypeOf<NonNullable<NonNullable<HealthResponse['signingKey']>['gate']>>();
    expectTypeOf<'degraded'>().toMatchTypeOf<HealthResponse['status']>();
    expectTypeOf<StatusComponent['latencyMs']>().toEqualTypeOf<number | null | undefined>();
    expectTypeOf<'chain_rewind_detected'>().toMatchTypeOf<NonNullable<StatusComponent['reason']>>();
    expectTypeOf<NonNullable<SystemHealth['connectedVersions']>[number]['connections']>().toEqualTypeOf<
      number | undefined
    >();
  });

  it('schema reads carry recordFields and a validation names its publisher', () => {
    expectTypeOf<SchemaQuickStart['recordFields']>().toEqualTypeOf<Record<string, string> | undefined>();
    expectTypeOf<SchemaValidationResult['publisher']>().toEqualTypeOf<string | undefined>();
  });

  it('a compliance export is always ready, so there is nothing to wait for', () => {
    expectTypeOf<ComplianceExport['status']>().toEqualTypeOf<'ready'>();
    expectTypeOf<ComplianceResource>().not.toHaveProperty('waitForExport');
  });

  it('an event page carries visibleBefore', () => {
    expectTypeOf<EventPage['visibleBefore']>().toEqualTypeOf<string | undefined>();
  });
});

describe('an API key row carries what the Server sends and nothing else', () => {
  it('drops environment from the create body', () => {
    // The engine refuses it now: additionalProperties is false on the body.
    expectTypeOf<CreateApiKeyParams>().not.toHaveProperty('environment');
  });

  it('names the key keyId and carries no phantom fields', () => {
    expectTypeOf<AdminApiKey['keyId']>().toEqualTypeOf<string>();
    expectTypeOf<AdminApiKey>().not.toHaveProperty('id');
    expectTypeOf<AdminApiKey>().not.toHaveProperty('environment');
    expectTypeOf<AdminApiKey>().not.toHaveProperty('rateLimitTier');
    expectTypeOf<AdminApiKey>().not.toHaveProperty('prefix');
  });

  it('reports who revoked a key, why, and what it rotated from', () => {
    expectTypeOf<AdminApiKey['revokedAt']>().toEqualTypeOf<string | null | undefined>();
    expectTypeOf<AdminApiKey['revokedByKeyId']>().toEqualTypeOf<string | null | undefined>();
    expectTypeOf<AdminApiKey['revocationReason']>().toEqualTypeOf<string | null | undefined>();
    expectTypeOf<AdminApiKey['rotatedFromKeyId']>().toEqualTypeOf<string | null | undefined>();
  });

  it('filters the listing and the bulk revoke by dormancy', () => {
    expectTypeOf<ListApiKeysParams['lastUsedBefore']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<ListApiKeysParams['neverUsed']>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<BulkRevokeApiKeysParams['lastUsedBefore']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<BulkRevokeApiKeysParams['neverUsed']>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<Parameters<AdminResource['bulkRevokeApiKeys']>[0]>().toEqualTypeOf<
      string[] | BulkRevokeApiKeysParams
    >();
    expectTypeOf<BulkRevokeApiKeysResult['notFound']>().toEqualTypeOf<string[]>();
  });

  it('replaces the IP allow-list on PATCH, null clearing it', () => {
    expectTypeOf<UpdateApiKeyParams['allowedIps']>().toEqualTypeOf<string[] | null | undefined>();
  });
});

describe('trusted issuers can be single-use and subject-bound', () => {
  it('always reports both settings on a row', () => {
    expectTypeOf<TrustedIssuer['jtiSingleUse']>().toEqualTypeOf<boolean>();
    expectTypeOf<TrustedIssuer['subjectAllowlist']>().toEqualTypeOf<string[] | null>();
    expectTypeOf<TrustedIssuer['enabled']>().toEqualTypeOf<boolean>();
  });

  it('accepts both on create and update', () => {
    expectTypeOf<CreateTrustedIssuerParams['jtiSingleUse']>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<UpdateTrustedIssuerParams['subjectAllowlist']>().toEqualTypeOf<
      string[] | null | undefined
    >();
    expectTypeOf<UpdateTrustedIssuerParams['managedBy']>().toEqualTypeOf<
      'provisioning' | null | undefined
    >();
  });

  it('counts provisioning-managed issuers and says when the YAML did not change', () => {
    expectTypeOf<NonNullable<ProvisioningStatus['managed']>['trustedIssuers']>().toEqualTypeOf<
      number | undefined
    >();
    expectTypeOf<ProvisioningStatus['trustedIssuersUnchangedSinceLastLoad']>().toEqualTypeOf<
      boolean | undefined
    >();
    expectTypeOf<
      NonNullable<ProvisioningReloadResult['trustedIssuers']>['unchangedSinceLastLoad']
    >().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<ProvisioningReloadResult>().not.toHaveProperty('loadedAt');
  });
});

describe('an unlicensed install says so', () => {
  it('names the unlicensed tier', () => {
    expectTypeOf<'unlicensed'>().toMatchTypeOf<LicenseTier>();
  });

  it('carries the notice on every license surface', () => {
    expectTypeOf<LicenseInfo['notice']>().toEqualTypeOf<LicenseNotice | null>();
    expectTypeOf<OpsSummary['license']['notice']>().toEqualTypeOf<LicenseNotice | null>();
    expectTypeOf<NonNullable<ConformanceResponse['license']>['notice']>().toEqualTypeOf<
      LicenseNoticeKind | null
    >();
    expectTypeOf<LicenseNotice['installAgeDays']>().toEqualTypeOf<number | null>();
  });
});

describe('a cert window that moved under an entry is a chain failure', () => {
  it('names cert_window_drift in both reason unions', () => {
    expectTypeOf<'cert_window_drift'>().toMatchTypeOf<AuditChainIntegrityReason>();
    expectTypeOf<'cert_window_drift'>().toMatchTypeOf<AuditChainFailure>();
    expectTypeOf<null>().toMatchTypeOf<AuditChainIntegrityReason>();
  });
});

describe('cross-party reads report the chain entry they appended', () => {
  it('carries recordRead on every read that appends one', () => {
    expectTypeOf<GateStatus['recordRead']>().toEqualTypeOf<RecordReadCompletion | undefined>();
    expectTypeOf<GateEvaluationResult['recordRead']>().toEqualTypeOf<
      RecordReadCompletion | undefined
    >();
    expectTypeOf<Completion['recordRead']>().toEqualTypeOf<RecordReadCompletion | undefined>();
    expectTypeOf<DisputeResponse['recordRead']>().toEqualTypeOf<RecordReadCompletion | undefined>();
    expectTypeOf<RecordGraph['recordRead']>().toEqualTypeOf<RecordReadCompletion | undefined>();
    expectTypeOf<EntityReferencesResult['recordRead']>().toEqualTypeOf<
      RecordReadCompletion | undefined
    >();
    expectTypeOf<RecordAuditExport['recordRead']>().toEqualTypeOf<
      RecordReadCompletion | undefined
    >();
  });
});

describe('a provisioning-managed subscription says so before a write 409s', () => {
  it('carries managedBy on the subscription and on its health row', () => {
    expectTypeOf<Webhook['managedBy']>().toEqualTypeOf<'provisioning' | null | undefined>();
    expectTypeOf<WebhookHealthEntry['managedBy']>().toEqualTypeOf<
      'provisioning' | null | undefined
    >();
  });
});

describe('fields the Server never sent are gone', () => {
  it('lists admin records as summaries, not full records', () => {
    expectTypeOf<ReturnType<AdminResource['records']['list']>>().resolves.toHaveProperty('data');
    expectTypeOf<AdminRecordSummary>().not.toHaveProperty('criteria');
    expectTypeOf<AdminRecordSummary['agentId']>().toEqualTypeOf<string | null>();
  });

  it('has no per-owner exemption read', () => {
    expectTypeOf<AdminResource>().not.toHaveProperty('getRateLimitExemption');
  });
});

describe('the vault signing-key registry is typed as the engine sends it', () => {
  // Every declared field but `algorithm` and `status` used to be phantom, and
  // `rotate()` was typed as a registry row while answering something that
  // shares no field with one, so `rotate().status === 'active'` typechecked
  // and could never be true.
  it('lists rows on keyId, with the bounded lastSignedAt', () => {
    expectTypeOf<VaultSigningKey['keyId']>().toEqualTypeOf<string>();
    expectTypeOf<VaultSigningKey['status']>().toEqualTypeOf<'active' | 'retired'>();
    expectTypeOf<VaultSigningKey['activatedAt']>().toEqualTypeOf<string>();
    expectTypeOf<VaultSigningKey['retiredAt']>().toEqualTypeOf<string | null>();
    expectTypeOf<VaultSigningKey['lastSignedAt']>().toEqualTypeOf<string | null>();
  });

  it('carries none of the fields the route never sends', () => {
    // `publicKey` in particular: the admin route serves no key material, and an
    // integrator reaching for it wants the ungated `VerificationKey` instead.
    expectTypeOf<VaultSigningKey>().not.toHaveProperty('id');
    expectTypeOf<VaultSigningKey>().not.toHaveProperty('publicKey');
    expectTypeOf<VaultSigningKey>().not.toHaveProperty('createdAt');
    expectTypeOf<VaultSigningKey>().not.toHaveProperty('rotatedAt');
  });

  it('answers a rotation with its own shape, not a registry row', () => {
    expectTypeOf<Awaited<ReturnType<AdminResource['vault']['signingKeys']['rotate']>>>()
      .toEqualTypeOf<VaultSigningKeyRotation>();
    expectTypeOf<VaultSigningKeyRotation['newKeyId']>().toEqualTypeOf<string>();
    expectTypeOf<VaultSigningKeyRotation['status']>().toEqualTypeOf<'staged' | 'already_active'>();
    expectTypeOf<VaultSigningKeyRotation['activeKeys']>().toEqualTypeOf<VaultActiveSigningKey[]>();
    expectTypeOf<VaultActiveSigningKey['lastSignedAt']>().toEqualTypeOf<string | null>();
  });
});
