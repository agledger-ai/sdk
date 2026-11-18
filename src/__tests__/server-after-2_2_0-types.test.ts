import { describe, it, expectTypeOf } from 'vitest';
import type {
  AuditChainIntegrityReasonCode,
  ComplianceExport,
  ExportComplianceParams,
  OpsSummary,
  RelaySignalParams,
  VaultScanDistrustedEntry,
  VaultScanOrgAdminReads,
  VaultScanOrgReadsDistrustedEntry,
  VaultScanResult,
} from '../index.js';

describe('a Server later than 2.2.0: checkpoint key windows and accounted checkpoints', () => {
  it('names the checkpoint key-window and accounted-run reasons on an audit export', () => {
    expectTypeOf<'checkpoint_key_expired'>().toMatchTypeOf<AuditChainIntegrityReasonCode>();
    expectTypeOf<'checkpoint_key_not_yet_active'>().toMatchTypeOf<AuditChainIntegrityReasonCode>();
    expectTypeOf<'checkpoint_accounted_run_exceeded'>().toMatchTypeOf<AuditChainIntegrityReasonCode>();
    // A closed union: the scan-only reason is not an export reason.
    expectTypeOf<'accounted_checkpoint_only'>().not.toMatchTypeOf<AuditChainIntegrityReasonCode>();
    // VaultScanBreakReason and OrgReadsBreakReason are open unions, so a member
    // check here passes for any string; schema-fields.json pins them.
  });

  it('lists the checkpoints a distrusted key signed beside the entries', () => {
    expectTypeOf<VaultScanResult['distrustedCheckpoints']>().toEqualTypeOf<VaultScanDistrustedEntry[] | undefined>();
    expectTypeOf<VaultScanResult['distrustedCheckpointsTotal']>().toEqualTypeOf<number | undefined>();
    expectTypeOf<VaultScanDistrustedEntry['orgId']>().toEqualTypeOf<string | null | undefined>();
    expectTypeOf<VaultScanDistrustedEntry['recordId']>().toEqualTypeOf<string | null | undefined>();
  });

  it('lists what a distrusted key signed in the read log', () => {
    expectTypeOf<VaultScanOrgAdminReads['distrustedEntries']>().toEqualTypeOf<
      VaultScanOrgReadsDistrustedEntry[] | undefined
    >();
    expectTypeOf<VaultScanOrgAdminReads['distrustedEntriesTotal']>().toEqualTypeOf<number | undefined>();
    expectTypeOf<VaultScanOrgAdminReads['distrustedSigned']>().toEqualTypeOf<number | undefined>();
    expectTypeOf<VaultScanOrgReadsDistrustedEntry['kind']>().toEqualTypeOf<'leaf' | 'checkpoint' | undefined>();
    expectTypeOf<VaultScanOrgReadsDistrustedEntry['orgId']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<VaultScanOrgReadsDistrustedEntry['at']>().toEqualTypeOf<number | undefined>();
    expectTypeOf<VaultScanOrgReadsDistrustedEntry['keyId']>().toEqualTypeOf<string | undefined>();
  });
});

describe('a Server later than 2.2.0: ops summary, compliance export, federation signals', () => {
  it('counts stalled federation peers, required', () => {
    expectTypeOf<OpsSummary['federation']['peers']['stalled']>().toEqualTypeOf<number>();
  });

  it('carries resumeTo on a truncated compliance export', () => {
    expectTypeOf<ComplianceExport['resumeTo']>().toEqualTypeOf<string | undefined>();
  });

  it('takes only the reason codes a Server stamps on a relayed signal', () => {
    expectTypeOf<RelaySignalParams['reasonCode']>().toEqualTypeOf<
      | 'AUTO_FAIL'
      | 'AUTO_SETTLE'
      | 'AUTO_SETTLE_WITHIN_TOLERANCE'
      | 'DISPUTE_OVERTURNED'
      | 'PRINCIPAL_ACCEPT'
      | 'PRINCIPAL_REJECT'
      | null
    >();
    expectTypeOf<'TIMED_OUT'>().not.toMatchTypeOf<RelaySignalParams['reasonCode']>();
  });

  it('scopes a compliance export by reference, record ids or delegation tree', () => {
    type Filters = NonNullable<ExportComplianceParams['filters']>;
    expectTypeOf<Filters['ref']>().toEqualTypeOf<{ system?: string; refType?: string; refId?: string } | undefined>();
    expectTypeOf<Filters['recordIds']>().toEqualTypeOf<string[] | undefined>();
    expectTypeOf<Filters['rootRecordId']>().toEqualTypeOf<string | undefined>();
  });
});
