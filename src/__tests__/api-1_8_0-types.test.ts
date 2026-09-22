import { describe, it, expectTypeOf } from 'vitest';
import type {
  AdminApiKey,
  AdminRecordSummary,
  AuditChainFailure,
  AuditChainIntegrityReason,
  BulkRevokeApiKeysParams,
  BulkRevokeApiKeysResult,
  Completion,
  ConformanceResponse,
  CreateApiKeyParams,
  DisputeResponse,
  EntityReferencesResult,
  GateEvaluationResult,
  GateStatus,
  LicenseInfo,
  LicenseNotice,
  LicenseNoticeKind,
  LicenseTier,
  ListApiKeysParams,
  OpsSummary,
  ProvisioningReloadResult,
  ProvisioningStatus,
  RecordAuditExport,
  RecordGraph,
  RecordReadCompletion,
  TrustedIssuer,
  CreateTrustedIssuerParams,
  UpdateApiKeyParams,
  UpdateTrustedIssuerParams,
  VaultActiveSigningKey,
  VaultSigningKey,
  VaultSigningKeyRotation,
  Webhook,
  WebhookHealthEntry,
} from '../types.js';
import type { AdminResource } from '../resources/admin.js';

/**
 * API 1.8.0 client-facing deltas, plus the fields the SDK declared that the
 * Server never sent.
 *
 * Type-only, so vitest running this file proves nothing on its own. What checks
 * it is `npm run typecheck`, which compiles this file through
 * `tsconfig.typetests.json`.
 */

describe('v1.8.0: an API key row carries what the Server sends and nothing else', () => {
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
    expectTypeOf<AdminApiKey>().not.toHaveProperty('scopeProfile');
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

describe('v1.8.0: trusted issuers can be single-use and subject-bound', () => {
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

describe('v1.8.0: an unlicensed install says so', () => {
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

describe('v1.8.0: a cert window that moved under an entry is a chain failure', () => {
  it('names cert_window_drift in both reason unions', () => {
    expectTypeOf<'cert_window_drift'>().toMatchTypeOf<AuditChainIntegrityReason>();
    expectTypeOf<'cert_window_drift'>().toMatchTypeOf<AuditChainFailure>();
    expectTypeOf<null>().toMatchTypeOf<AuditChainIntegrityReason>();
  });
});

describe('v1.8.0: cross-party reads report the chain entry they appended', () => {
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

describe('v1.8.0: a provisioning-managed subscription says so before a write 409s', () => {
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

describe('v1.8.0: the vault signing-key registry is typed as the engine sends it', () => {
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
