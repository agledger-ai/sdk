import { describe, it, expectTypeOf } from 'vitest';
import type {
  AgentHistoryEntry,
  CoSignPeerLeg,
  CoSignStatus,
  DisputeProtocolResult,
  DisputeStatus,
  DisputeStatusFilter,
  GateStatus,
  ListCompletionsParams,
  ListDisputesParams,
  ListRecordsParams,
  QueryAdminRecordsParams,
  RecordIntegrity,
  RecordStatus,
  RecordStatusFilter,
  SearchRecordsParams,
  SettlementSignalSummary,
  StructuralValidation,
  SystemHealth,
  VaultAnchorVerifyResult,
  VaultAnchorVerifyRow,
  VaultScanResult,
  WebhookHealthEntry,
} from '../types.js';
import type { AdminResource } from '../resources/admin.js';
import type { CompletionsResource } from '../resources/completions.js';

/**
 * API v1.7.0 client-facing deltas.
 *
 * The wave that carried the 1.7.0 client sync was prepared against an untagged
 * API commit, and the tag landed sixteen commits later. Everything below is a
 * delta between those two specs, so none of it was covered by the round that
 * validated the wave. Two of them are 400s rather than missing fields: three
 * admin listings dropped `offset`, and the status filters became strict enums
 * over sets that had just lost a member.
 *
 * Type-only, so vitest running this file proves nothing on its own. What checks
 * it is `npm run typecheck`, which compiles this file through
 * `tsconfig.typetests.json`.
 */

describe('v1.7.0: the integrity block says which fields it compared', () => {
  it('carries comparedFields as a non-optional list', () => {
    expectTypeOf<RecordIntegrity['comparedFields']>().toEqualTypeOf<string[]>();
  });
});

describe('v1.7.0: a Settlement Signal answers which peer did what', () => {
  it('rolls the per-peer legs up under coSignPeers', () => {
    expectTypeOf<NonNullable<SettlementSignalSummary['coSignPeers']>>().toEqualTypeOf<
      CoSignPeerLeg[]
    >();
    expectTypeOf<CoSignPeerLeg['counterSignature']>().toEqualTypeOf<string | null>();
  });

  it('narrows a leg status below the rollup: partial is not a leg outcome', () => {
    // `partial` is a fan-out outcome no single peer can hold.
    expectTypeOf<'partial'>().toMatchTypeOf<CoSignStatus>();
    expectTypeOf<'partial'>().not.toMatchTypeOf<CoSignPeerLeg['status']>();
    expectTypeOf<'succeeded'>().toMatchTypeOf<CoSignPeerLeg['status']>();
  });
});

describe('v1.7.0: status filters are closed, the statuses they filter on are not', () => {
  /**
   * The distinction the testbed round asked for. A response union stays open so
   * a status the Server ADDS still types; a filter is the other direction, and
   * the querystring is a strict enum server-side. `PENDING_ARBITRATION` is the
   * case that pays for it: 1.7.0 removed it, and against an open filter union a
   * customer migrating off 1.10.0 met the removal as a production 400 instead of
   * a build error.
   */
  it('types a removed record status as a response value and refuses it as a filter', () => {
    expectTypeOf<'PENDING_ARBITRATION'>().toMatchTypeOf<RecordStatus>();
    expectTypeOf<'PENDING_ARBITRATION'>().not.toMatchTypeOf<RecordStatusFilter>();
    expectTypeOf<'FULFILLED'>().toMatchTypeOf<RecordStatusFilter>();
  });

  it('refuses a dispute tier that was never a status', () => {
    expectTypeOf<'TIER_2_REVIEW'>().toMatchTypeOf<DisputeStatus>();
    expectTypeOf<'TIER_2_REVIEW'>().not.toMatchTypeOf<DisputeStatusFilter>();
    expectTypeOf<'RESOLVED'>().toMatchTypeOf<DisputeStatusFilter>();
  });

  it('wires every status filter to the closed union', () => {
    expectTypeOf<ListRecordsParams['status']>().toEqualTypeOf<RecordStatusFilter | undefined>();
    expectTypeOf<SearchRecordsParams['status']>().toEqualTypeOf<RecordStatusFilter | undefined>();
    expectTypeOf<QueryAdminRecordsParams['status']>().toEqualTypeOf<
      RecordStatusFilter | undefined
    >();
    expectTypeOf<ListDisputesParams['status']>().toEqualTypeOf<DisputeStatusFilter | undefined>();
  });
});

describe('v1.7.0: three admin listings dropped offset', () => {
  /**
   * The querystring refuses unknown properties, so offering a parameter the
   * route does not take is a 400, not a no-op. These three moved to cursor-only
   * paging; `webhooks.listDlq()` (the per-webhook listing) still takes both.
   */
  it('refuses offset on the platform listings', () => {
    type OrgsParams = NonNullable<Parameters<AdminResource['listOrgs']>[0]>;
    type AgentsParams = NonNullable<Parameters<AdminResource['listAgents']>[0]>;
    type DlqParams = NonNullable<Parameters<AdminResource['listDlq']>[0]>;

    expectTypeOf<OrgsParams>().not.toHaveProperty('offset');
    expectTypeOf<AgentsParams>().not.toHaveProperty('offset');
    expectTypeOf<DlqParams>().not.toHaveProperty('offset');

    // Cursor paging is still on all three.
    expectTypeOf<OrgsParams['cursor']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<AgentsParams['cursor']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<DlqParams['cursor']>().toEqualTypeOf<string | undefined>();
  });
});

describe('v1.7.0: the completions filter does not take WARNING', () => {
  /**
   * WARNING is synthesized on read from the completion's advisory warnings, so
   * there is no column to filter on and the query enum names only two values.
   * The stored value still surfaces as WARNING on the row.
   */
  it('keeps the filter narrower than the value it filters on', () => {
    expectTypeOf<'WARNING'>().toMatchTypeOf<StructuralValidation>();
    expectTypeOf<'WARNING'>().not.toMatchTypeOf<
      NonNullable<ListCompletionsParams['structuralValidation']>
    >();
    expectTypeOf<'ACCEPTED'>().toMatchTypeOf<
      NonNullable<ListCompletionsParams['structuralValidation']>
    >();
  });

  it('offers the filter on the listing methods', () => {
    expectTypeOf<Parameters<CompletionsResource['list']>[1]>().toEqualTypeOf<
      ListCompletionsParams | undefined
    >();
  });
});

describe('v1.7.0: gate-status carries the decision, not just the phases', () => {
  it('types both phases as their enums', () => {
    expectTypeOf<GateStatus['phase1Status']>().toEqualTypeOf<
      'pending' | 'passed' | 'failed' | 'not_applicable'
    >();
    expectTypeOf<'superseded'>().toMatchTypeOf<GateStatus['phase2Status']>();
    // The phase-2 vocabulary is the wider one; `in_progress` is phase 2 only.
    expectTypeOf<'in_progress'>().not.toMatchTypeOf<GateStatus['phase1Status']>();
  });

  it('carries the verdict, the recommendation, the mode and the reporter', () => {
    expectTypeOf<'RELEASE'>().toMatchTypeOf<NonNullable<GateStatus['recommendation']>>();
    expectTypeOf<GateStatus['gateMode']>().toEqualTypeOf<'auto' | 'principal' | undefined>();
    expectTypeOf<'accessor'>().toMatchTypeOf<NonNullable<GateStatus['reporterType']>>();
    expectTypeOf<null>().toMatchTypeOf<GateStatus['verdict']>();
  });
});

describe('v1.7.0: the drift feed says which side the agent was on', () => {
  it('carries the structural role', () => {
    expectTypeOf<AgentHistoryEntry['role']>().toEqualTypeOf<'performer' | 'principal' | 'both'>();
  });
});

describe('v1.7.0: health reads fail open rather than erroring', () => {
  /**
   * A queue whose stats could not be read is `null`, and so is an uncountable
   * dead-letter table. `0` there would assert that nothing is parked.
   */
  it('admits null for an unreadable queue and an uncounted dead-letter table', () => {
    expectTypeOf<null>().toMatchTypeOf<SystemHealth['queues'][string]>();
    expectTypeOf<null>().toMatchTypeOf<SystemHealth['webhookDeadLetters']>();
    expectTypeOf<'outage'>().toMatchTypeOf<SystemHealth['database']['status']>();
  });
});

describe('v1.7.0: the vault surfaces name what they found', () => {
  it('counts records carrying no chain at all', () => {
    expectTypeOf<VaultScanResult['recordsMissingChain']>().toEqualTypeOf<number>();
    expectTypeOf<VaultScanResult['missingChainRecords']>().toEqualTypeOf<string[]>();
  });

  it('returns anchor rows rather than a verdict the engine never sent', () => {
    // Through 1.10.0 this declared `valid`, `anchorsChecked` and `errors`, none
    // of which the route has ever returned.
    expectTypeOf<VaultAnchorVerifyResult['data']>().toEqualTypeOf<VaultAnchorVerifyRow[]>();
    expectTypeOf<VaultAnchorVerifyResult>().not.toHaveProperty('valid');
    expectTypeOf<VaultAnchorVerifyResult>().not.toHaveProperty('anchorsChecked');
    expectTypeOf<'tamper'>().toMatchTypeOf<NonNullable<VaultAnchorVerifyRow['outcome']>>();
  });
});

describe('v1.7.0: webhook health is typed', () => {
  it('carries the last failure beside the breaker state', () => {
    expectTypeOf<WebhookHealthEntry['lastFailureAt']>().toEqualTypeOf<string | null>();
    expectTypeOf<'half_open'>().toMatchTypeOf<WebhookHealthEntry['circuitState']>();
  });
});

describe('v1.7.0: the federation dispute ack is an ack', () => {
  it('declares what the receiver sends', () => {
    // Through 1.10.0 this declared a required `received: boolean` the route has
    // never returned, so branching on it read `undefined` typed as `boolean`.
    expectTypeOf<DisputeProtocolResult['ack']>().toEqualTypeOf<boolean>();
    expectTypeOf<DisputeProtocolResult['applied']>().toEqualTypeOf<boolean | undefined>();
  });
});
