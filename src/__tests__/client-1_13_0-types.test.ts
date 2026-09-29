import { describe, it, expect, expectTypeOf } from 'vitest';
import type {
  AuditChainFailureCode,
  AuditChainIntegrityReasonCode,
  ComplianceExport,
  CreatePeeringTokenParams,
  NextStepCompact,
  Page,
  PeerHandshakeParams,
  PeeringToken,
  RecordCompactPage,
  RecordRow,
  RecordRowCompact,
  VaultScanBrokenChain,
  VaultScanBrokenRecord,
  VaultScanFirstFinding,
  VaultScanOrgAdminReads,
  VaultScanResult,
  VaultSigningKeyRetirement,
} from '../types.js';
import { RecordsResource } from '../resources/records.js';
import type { HttpClient } from '../http.js';
import type { AgledgerApiError } from '../errors.js';
import { ScopeProfiles, Scopes } from '../scopes.js';

/**
 * The client surface for the API release after 1.8.0. Compiled by
 * `tsconfig.typetests.json`, so a wrong assertion here fails `npm run typecheck`.
 */

describe('record reads under view=compact', () => {
  it('resolves to the compact shape only when asked for it', () => {
    // A stub transport: the calls run, and only their static types are checked.
    const r = new RecordsResource({
      get: async () => ({}),
      getPage: async () => ({ data: [], hasMore: false }),
      paginate: async function* () {},
    } as unknown as HttpClient);
    expectTypeOf(r.get('id')).toEqualTypeOf<Promise<RecordRow>>();
    expectTypeOf(r.get('id', { view: 'full' })).toEqualTypeOf<Promise<RecordRow>>();
    expectTypeOf(r.get('id', { view: 'compact', integrity: true })).toEqualTypeOf<Promise<RecordRowCompact>>();
    // A view only known at runtime gets the honest union, not the full type.
    const view = 'compact' as 'full' | 'compact';
    expectTypeOf(r.get('id', { view })).toEqualTypeOf<Promise<RecordRow | RecordRowCompact>>();

    expectTypeOf(r.list()).toEqualTypeOf<Promise<Page<RecordRow>>>();
    expectTypeOf(r.list({ view: 'compact' })).toEqualTypeOf<Promise<RecordCompactPage>>();
    expectTypeOf(r.search({ view: 'compact', status: 'ACTIVE' })).toEqualTypeOf<Promise<RecordCompactPage>>();
    expectTypeOf(r.listAll({ view: 'compact' })).toEqualTypeOf<AsyncGenerator<RecordRowCompact>>();
    expectTypeOf(r.listAll()).toEqualTypeOf<AsyncGenerator<RecordRow>>();
  });

  it('drops top-level nulls: nullable fields become optional and never null', () => {
    expectTypeOf<RecordRowCompact['id']>().toEqualTypeOf<string>();
    expectTypeOf<RecordRowCompact['submissionCount']>().toEqualTypeOf<number>();
    expectTypeOf<RecordRowCompact['performerAgentId']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<RecordRowCompact['maxSubmissions']>().toEqualTypeOf<number | undefined>();
    expectTypeOf<null>().not.toMatchTypeOf<RecordRowCompact['deadline']>();
    expectTypeOf<null>().not.toMatchTypeOf<RecordRowCompact['settlementSignal']>();
  });

  it('trims each step to the call', () => {
    expectTypeOf<NonNullable<RecordRowCompact['nextSteps']>[number]>().toEqualTypeOf<NextStepCompact>();
    expectTypeOf<NonNullable<RecordCompactPage['nextSteps']>[number]>().toEqualTypeOf<NextStepCompact>();
    expectTypeOf<NextStepCompact>().not.toHaveProperty('description');
  });
});

describe('federation peering is bound at mint', () => {
  it('mints for one hub id and one org', () => {
    expectTypeOf<CreatePeeringTokenParams['peerHubId']>().toEqualTypeOf<string>();
    expectTypeOf<CreatePeeringTokenParams['boundOrgId']>().toEqualTypeOf<string>();
    expectTypeOf<PeeringToken['peerHubId']>().toEqualTypeOf<string>();
    expectTypeOf<PeeringToken['boundOrgId']>().toEqualTypeOf<string>();
  });

  it('takes the org from the token, not the handshake body', () => {
    expectTypeOf<PeerHandshakeParams>().not.toHaveProperty('boundOrgId');
  });
});

describe('unsigned entries and checkpoints are breaks', () => {
  it('names the new chain codes', () => {
    expectTypeOf<'signature_missing'>().toMatchTypeOf<AuditChainFailureCode>();
    expectTypeOf<'signature_missing'>().toMatchTypeOf<AuditChainIntegrityReasonCode>();
    expectTypeOf<'checkpoint_unsigned'>().toMatchTypeOf<AuditChainIntegrityReasonCode>();
  });

  it('carries the scan first finding and the read-log walk', () => {
    expectTypeOf<VaultScanBrokenRecord['firstFinding']>().toEqualTypeOf<VaultScanFirstFinding | undefined>();
    expectTypeOf<VaultScanBrokenChain['firstFinding']>().toEqualTypeOf<VaultScanFirstFinding | undefined>();
    expectTypeOf<VaultScanFirstFinding['reason']>().toEqualTypeOf<
      'key_expired' | 'key_not_yet_active' | 'unsupported_algorithm'
    >();
    expectTypeOf<VaultScanResult['orgAdminReads']>().toEqualTypeOf<VaultScanOrgAdminReads | null | undefined>();
    expectTypeOf<VaultScanResult['unsupportedAlgorithm']>().toEqualTypeOf<number | undefined>();
  });
});

describe('response fields added since 1.8.0', () => {
  it('types them', () => {
    expectTypeOf<VaultSigningKeyRetirement['revokedCertCount']>().toEqualTypeOf<number | undefined>();
    expectTypeOf<ComplianceExport['format']>().toEqualTypeOf<'csv' | 'json' | 'html' | undefined>();
    expectTypeOf<AgledgerApiError['existingId']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<AgledgerApiError['reason']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<AgledgerApiError['currentState']>().toEqualTypeOf<string | undefined>();
  });
});

describe('dispute mutations need disputes:write', () => {
  it('is on agent-full and admin-standard only', () => {
    expect(Scopes.DISPUTES_WRITE).toBe('disputes:write');
    const holders = Object.values(ScopeProfiles)
      .filter((p) => p.scopes.includes(Scopes.DISPUTES_WRITE))
      .map((p) => p.name)
      .sort();
    expect(holders).toEqual(['admin-standard', 'agent-full']);
  });

  it('admin-iac can dry-run a completion against the type it registers', () => {
    expect(ScopeProfiles['admin-iac'].scopes).toContain(Scopes.SCHEMAS_READ);
  });
});
