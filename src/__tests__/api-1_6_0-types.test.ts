import { describe, it, expectTypeOf } from 'vitest';
import type {
  AuditStreamParams,
  AuditStreamResult,
  FederationPeer,
  ListEventsParams,
  ListPeersParams,
  OpsSummary,
  OrgAdminRead,
  OrgReadsCheckpointPage,
  OrgReadsCheckpointingSchedule,
  PeerHandshakeResult,
  VaultCheckpointingSchedule,
} from '../types.js';

/**
 * API v1.6.0 client-facing deltas. Every one of them lives in a response body
 * or an inline (non-component) schema, the surface neither routes.json nor
 * schema-fields.json pins: one covers request fields, the other the named
 * `components.schemas` models.
 *
 * Type-only checks. No runtime behavior.
 */
describe('v1.6.0: SIEM stream is a cursor walk', () => {
  it('takes since or cursor, both optional', () => {
    expectTypeOf<undefined>().toMatchTypeOf<AuditStreamParams['since']>();
    expectTypeOf<undefined>().toMatchTypeOf<AuditStreamParams['cursor']>();
    expectTypeOf<string>().toMatchTypeOf<NonNullable<AuditStreamParams['cursor']>>();
  });

  it('reports the holdback window alongside the page', () => {
    expectTypeOf<AuditStreamResult['holdbackSeconds']>().toEqualTypeOf<number | null>();
    expectTypeOf<AuditStreamResult['cursor']>().toEqualTypeOf<string | null>();
  });
});

describe('v1.6.0: org-reads', () => {
  it('the checkpoint page carries its sweep schedule and the paging fields', () => {
    expectTypeOf<
      OrgReadsCheckpointPage['checkpointing']
    >().toEqualTypeOf<OrgReadsCheckpointingSchedule>();
    expectTypeOf<boolean>().toMatchTypeOf<OrgReadsCheckpointPage['hasMore']>();
    expectTypeOf<null>().toMatchTypeOf<OrgReadsCheckpointPage['nextCursor']>();
    expectTypeOf<number>().toMatchTypeOf<NonNullable<OrgReadsCheckpointPage['total']>>();
  });

  it('the schedule is not the vault schedule: no anchoring posture on it', () => {
    // Reusing VaultCheckpointingSchedule here would declare `anchoringEnabled`,
    // which this endpoint does not serve.
    expectTypeOf<VaultCheckpointingSchedule>().toHaveProperty('anchoringEnabled');
    expectTypeOf<OrgReadsCheckpointingSchedule>().not.toHaveProperty('anchoringEnabled');
    expectTypeOf<'worker'>().toMatchTypeOf<OrgReadsCheckpointingSchedule['source']>();
    expectTypeOf<'config'>().toMatchTypeOf<OrgReadsCheckpointingSchedule['source']>();
  });

  it('a leaf names its Merkle position and the key that read it', () => {
    expectTypeOf<OrgAdminRead['leafIndex']>().toEqualTypeOf<number>();
    expectTypeOf<OrgAdminRead['leafHash']>().toEqualTypeOf<string>();
    expectTypeOf<OrgAdminRead['callerKeyId']>().toEqualTypeOf<string>();
    expectTypeOf<OrgAdminRead['exportBatchId']>().toEqualTypeOf<string | null>();
  });
});

describe('v1.6.0: ops summary reports the org-reads sweep', () => {
  it('is a third shape, not either checkpointing schedule', () => {
    type Sweep = OpsSummary['vault']['orgReadsCheckpoints'];
    expectTypeOf<Sweep['cron']>().toEqualTypeOf<string>();
    expectTypeOf<Sweep['lastCheckpointAt']>().toEqualTypeOf<string | null>();
    expectTypeOf<Sweep['workerScheduled']>().toEqualTypeOf<boolean | null>();
    expectTypeOf<Sweep>().not.toHaveProperty('intervalMinutes');
    expectTypeOf<Sweep>().not.toHaveProperty('source');
  });
});

describe('v1.6.0: federation peers', () => {
  it('the handshake result names both ids and the created status', () => {
    expectTypeOf<PeerHandshakeResult['peered']>().toEqualTypeOf<true>();
    expectTypeOf<PeerHandshakeResult['peerHubId']>().toEqualTypeOf<string>();
    expectTypeOf<PeerHandshakeResult['peerId']>().toEqualTypeOf<string>();
    expectTypeOf<PeerHandshakeResult['status']>().toEqualTypeOf<string>();
  });

  it('a peer row is the one the endpoint serves', () => {
    expectTypeOf<FederationPeer['peerId']>().toEqualTypeOf<string>();
    expectTypeOf<FederationPeer['peerHubId']>().toEqualTypeOf<string>();
    expectTypeOf<FederationPeer['peerUrl']>().toEqualTypeOf<string>();
    expectTypeOf<FederationPeer['createdAt']>().toEqualTypeOf<string>();
    expectTypeOf<number>().toMatchTypeOf<
      NonNullable<FederationPeer['consecutiveDeliveryFailures']>
    >();
    // The five fields no version of this endpoint ever served.
    expectTypeOf<FederationPeer>().not.toHaveProperty('hubId');
    expectTypeOf<FederationPeer>().not.toHaveProperty('name');
    expectTypeOf<FederationPeer>().not.toHaveProperty('endpoint');
    expectTypeOf<FederationPeer>().not.toHaveProperty('publicKey');
    expectTypeOf<FederationPeer>().not.toHaveProperty('registeredAt');
  });

  it('the status filter still tracks the peer status', () => {
    expectTypeOf<ListPeersParams['status']>().toEqualTypeOf<FederationPeer['status'] | undefined>();
    expectTypeOf<'active'>().toMatchTypeOf<FederationPeer['status']>();
  });
});

describe('v1.6.0: events take a closing bound', () => {
  it('since is required and until is not', () => {
    expectTypeOf<ListEventsParams['since']>().toEqualTypeOf<string>();
    expectTypeOf<undefined>().toMatchTypeOf<ListEventsParams['until']>();
    expectTypeOf<string>().toMatchTypeOf<NonNullable<ListEventsParams['until']>>();
  });
});
