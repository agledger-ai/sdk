import { describe, it, expect, expectTypeOf } from 'vitest';
import type {
  AdminAgent,
  AdminOrg,
  AgentDrift,
  AgentHistoryParams,
  AgentProfile,
  AuditChainIntegrityReason,
  AutoProvisionScopeProfile,
  ConformanceResponse,
  CreateAgentParams,
  CreateTrustedIssuerParams,
  DriftBucket,
  DriftChange,
  FleetDriftPage,
  GetAgentDriftParams,
  LicenseInfo,
  ListApiKeysParams,
  ListFleetDriftParams,
  ProvisioningReloadResult,
  ProvisioningStatus,
  ReactivateResult,
  RotateKeyResult,
  TrustedIssuer,
  UpdateAgentParams,
  Verdict,
} from '../types.js';
import type { AdminResource } from '../resources/admin.js';
import type { AuthResource } from '../resources/auth.js';
import type { DriftResource } from '../resources/drift.js';
import { Scopes, ScopeProfiles } from '../scopes.js';

/**
 * Client-facing deltas of the API build that replaced agent reputation with
 * agent drift. Like api-1_6_0-types.test.ts, most of these live in response
 * bodies or inline schemas that neither parity snapshot pins, and the
 * `expectTypeOf` lines are checked by `npm run typecheck` through
 * tsconfig.typetests.json, not by vitest.
 */
describe('agent drift replaces agent reputation', () => {
  it('has the two windows, the change, and no score', () => {
    expectTypeOf<AgentDrift['overall']['current']>().toEqualTypeOf<DriftBucket>();
    expectTypeOf<AgentDrift['overall']['baseline']>().toEqualTypeOf<DriftBucket>();
    expectTypeOf<AgentDrift['overall']['change']>().toEqualTypeOf<DriftChange>();
    expectTypeOf<DriftBucket['acceptanceRate']>().toEqualTypeOf<number | null>();
    expectTypeOf<DriftBucket['medianCompletionMs']>().toEqualTypeOf<number | null>();
    // The change carries no accepted/rejected: the API publishes the rate, not the split.
    expectTypeOf<keyof DriftChange>().toEqualTypeOf<
      'records' | 'completions' | 'verdicts' | 'overturned' | 'acceptanceRate' | 'medianCompletionMs'
    >();
    expectTypeOf<AgentDrift['byType'][number]['type']>().toEqualTypeOf<string>();
    // @ts-expect-error there is no composite score anywhere on the surface
    expectTypeOf<AgentDrift['compositeScore']>();
  });

  it('takes window and type per agent; window, limit and cursor for the fleet', () => {
    expectTypeOf<keyof GetAgentDriftParams>().toEqualTypeOf<'window' | 'type'>();
    expectTypeOf<keyof ListFleetDriftParams>().toEqualTypeOf<'window' | 'limit' | 'cursor'>();
    expectTypeOf<FleetDriftPage['window']['days']>().toEqualTypeOf<number>();
    expectTypeOf<FleetDriftPage['data'][number]['displayName']>().toEqualTypeOf<string>();
  });

  it('the history filters are the route filters', () => {
    expectTypeOf<AgentHistoryParams['outcome']>().toEqualTypeOf<Verdict | undefined>();
    expectTypeOf<DriftResource['getAgentHistory']>().parameter(1).toEqualTypeOf<AgentHistoryParams | undefined>();
  });

  it('the scope is drift:read and the profiles carry it', () => {
    expect(Scopes.DRIFT_READ).toBe('drift:read');
    expect('REPUTATION_READ' in Scopes).toBe(false);
    expect(Object.values(Scopes)).not.toContain('reputation:read');
    expect(ScopeProfiles['admin-observer'].scopes).toContain('drift:read');
    expect(ScopeProfiles['admin-standard'].scopes).toContain('drift:read');
    expect(ScopeProfiles['agent-full'].scopes).toContain('drift:read');
  });

  it('the conformance flag is agentDrift', () => {
    expectTypeOf<NonNullable<ConformanceResponse['capabilities']>['agentDrift']>().toEqualTypeOf<boolean | undefined>();
    // @ts-expect-error reputationScoring is gone from the capability set
    expectTypeOf<NonNullable<ConformanceResponse['capabilities']>['reputationScoring']>().toEqualTypeOf<boolean | undefined>();
  });
});

describe('agent identity', () => {
  it('createAgent takes displayName and no name', () => {
    expectTypeOf<keyof CreateAgentParams>().toEqualTypeOf<'orgId' | 'displayName' | 'agentCardUrl' | 'oidcIss' | 'oidcSub'>();
    expectTypeOf<CreateAgentParams['displayName']>().toEqualTypeOf<string>();
    // @ts-expect-error the route refuses `name` with 400
    const _p: CreateAgentParams = { orgId: 'o', displayName: 'd', name: 'x' };
  });

  it('an agent can be bound to an external identity', () => {
    expectTypeOf<UpdateAgentParams['oidcIss']>().toEqualTypeOf<string | null | undefined>();
    expectTypeOf<UpdateAgentParams['oidcSub']>().toEqualTypeOf<string | null | undefined>();
    expectTypeOf<UpdateAgentParams['agentCardUrl']>().toEqualTypeOf<string | null | undefined>();
    expectTypeOf<AgentProfile['oidcIss']>().toEqualTypeOf<string | null | undefined>();
  });

  it('deactivation is visible on the listings and reversible', () => {
    expectTypeOf<AdminAgent['deactivatedAt']>().toEqualTypeOf<string | null | undefined>();
    expectTypeOf<AdminOrg['managedBy']>().toEqualTypeOf<'provisioning' | null | undefined>();
    expectTypeOf<AdminResource['reactivateAgent']>().returns.resolves.toEqualTypeOf<ReactivateResult>();
    expectTypeOf<AdminResource['reactivateOrg']>().returns.resolves.toEqualTypeOf<ReactivateResult>();
    expectTypeOf<ReactivateResult['wasDeactivated']>().toEqualTypeOf<boolean>();
  });
});

describe('operator surfaces', () => {
  it('the key listing has the rotation queue filters', () => {
    expectTypeOf<ListApiKeysParams['expiresBefore']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<ListApiKeysParams['neverExpires']>().toEqualTypeOf<boolean | undefined>();
  });

  it('a rotated key reports its own expiry, and there is no keyId on the wire', () => {
    expectTypeOf<AuthResource['rotateKey']>().returns.resolves.toEqualTypeOf<RotateKeyResult>();
    expectTypeOf<RotateKeyResult['expiresAt']>().toEqualTypeOf<string | null | undefined>();
    // @ts-expect-error the route never returned keyId
    expectTypeOf<RotateKeyResult['keyId']>();
  });

  it('trusted issuers can auto-provision agents under a scope ceiling', () => {
    expectTypeOf<AutoProvisionScopeProfile>().toEqualTypeOf<'agent-full' | 'agent-readonly' | 'agent-performer-only'>();
    expectTypeOf<TrustedIssuer['autoProvisionAgents']>().toEqualTypeOf<boolean>();
    expectTypeOf<TrustedIssuer['autoProvisionScopeProfile']>().toEqualTypeOf<AutoProvisionScopeProfile | null>();
    expectTypeOf<TrustedIssuer['autoProvisionMaxAgents']>().toEqualTypeOf<number>();
    expectTypeOf<CreateTrustedIssuerParams['autoProvisionScopeProfile']>().toEqualTypeOf<AutoProvisionScopeProfile | null | undefined>();
  });

  it('the license source knows the compact form', () => {
    expectTypeOf<'compact'>().toMatchTypeOf<NonNullable<LicenseInfo['source']>>();
    expectTypeOf<AdminResource['reloadLicense']>().returns.resolves.toEqualTypeOf<LicenseInfo>();
  });

  it('provisioning status and reload carry what the route serves', () => {
    expectTypeOf<ProvisioningStatus['configured']>().toEqualTypeOf<boolean>();
    expectTypeOf<ProvisioningStatus['pruneSuppressed']>().toEqualTypeOf<boolean | undefined>();
    // @ts-expect-error the old `loaded` flag never existed on the wire
    expectTypeOf<ProvisioningStatus['loaded']>();
    expectTypeOf<AdminResource['reloadProvisioning']>().returns.resolves.toEqualTypeOf<ProvisioningReloadResult>();
    expectTypeOf<NonNullable<NonNullable<ProvisioningReloadResult['apiKeys']>['generated']>[number]['source']>()
      .toEqualTypeOf<'generated' | 'supplied' | undefined>();
  });

  it('an empty chain is a named reason, not a pass', () => {
    expectTypeOf<'audit_vault_empty'>().toMatchTypeOf<AuditChainIntegrityReason>();
  });
});
