import { describe, it, expect, expectTypeOf } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  AuditStreamParams,
  AuditStreamResult,
  EventType,
  FederationPeer,
  FederationPeerStatus,
  FederationPeerStatusFilter,
  ListEventsParams,
  ListPeersParams,
  OpsSummary,
  OrgAdminRead,
  OrgReadsCheckpointPage,
  OrgReadsCheckpointingSchedule,
  OrgReadsCheckpointingSource,
  PeerHandshakeResult,
  VaultCheckpointingSchedule,
  WebhookEventType,
} from '../types.js';
import type { OrgReadsCheckpointsResource } from '../resources/audit.js';

/**
 * API v1.6.0 client-facing deltas. Every one of them lives in a response body
 * or an inline (non-component) schema, the surface neither routes.json nor
 * schema-fields.json pins: one covers request fields, the other the named
 * `components.schemas` models.
 *
 * These assertions are type-only, and `expectTypeOf` erases to nothing at
 * runtime, so vitest running this file proves nothing about them. What checks
 * them is `npm run typecheck`, which compiles this file through
 * `tsconfig.typetests.json`. Before that existed the whole file was inert: the
 * main tsconfig excludes `src/__tests__` and vitest is not run with
 * `--typecheck`, so `expectTypeOf<AuditStreamResult['holdbackSeconds']>()
 * .toEqualTypeOf<boolean>()` passed. The last describe block below is the
 * runtime half: it keeps a new type-test file from landing outside that
 * compile.
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

  it('the status filter is the closed set, narrower than the peer status it filters on', () => {
    // API 1.7.0: the peer status response type stays open (the Server may add a
    // status), the filter does not (the querystring 400s on anything else).
    expectTypeOf<ListPeersParams['status']>().toEqualTypeOf<FederationPeerStatusFilter | undefined>();
    expectTypeOf<'active'>().toMatchTypeOf<FederationPeer['status']>();
    expectTypeOf<'active'>().toMatchTypeOf<FederationPeerStatusFilter>();
    // An arbitrary string types as a peer status and does NOT type as a filter.
    expectTypeOf<'suspended'>().toMatchTypeOf<FederationPeer['status']>();
    expectTypeOf<'suspended'>().not.toMatchTypeOf<FederationPeerStatusFilter>();
  });
});

describe('v1.6.0: events take a closing bound', () => {
  it('since is required and until is not', () => {
    expectTypeOf<ListEventsParams['since']>().toEqualTypeOf<string>();
    expectTypeOf<undefined>().toMatchTypeOf<ListEventsParams['until']>();
    expectTypeOf<string>().toMatchTypeOf<NonNullable<ListEventsParams['until']>>();
  });

  it('carries every filter the route serves, so no caller needs a cast', () => {
    // Excess-property checking rejects an unknown key in an object literal, so
    // a filter missing from this type is a filter the SDK cannot express.
    expectTypeOf<string>().toMatchTypeOf<NonNullable<ListEventsParams['recordId']>>();
    expectTypeOf<EventType>().toMatchTypeOf<NonNullable<ListEventsParams['eventType']>>();
    expectTypeOf<string>().toMatchTypeOf<NonNullable<ListEventsParams['cursor']>>();
  });
});

describe('v1.6.0: the subscribable set is not the queryable set', () => {
  it('the replay-only types are queryable and not subscribable', () => {
    // `POST /v1/webhooks` 400s on each of these. They typed clean before.
    expectTypeOf<'record.released'>().toMatchTypeOf<EventType>();
    expectTypeOf<'dispute.evidence_window_closed'>().toMatchTypeOf<EventType>();
  });

  it('the wildcard subscribes, and is not a type an event carries', () => {
    expectTypeOf<'*'>().toMatchTypeOf<WebhookEventType>();
  });
});

describe('v1.6.0: a proof is addressed by Merkle position', () => {
  it('takes the leafIndex a leaf row carries, not its stringification', () => {
    type Proof = OrgReadsCheckpointsResource['proof'];
    expectTypeOf<Parameters<Proof>[1]>().toEqualTypeOf<number>();
    expectTypeOf<OrgAdminRead['leafIndex']>().toEqualTypeOf<Parameters<Proof>[1]>();
  });
});

describe('the field unions the enum guard could not see are named now', () => {
  it('binds each field to its alias, so parseUnions has something to pin', () => {
    expectTypeOf<OrgReadsCheckpointingSchedule['source']>()
      .toEqualTypeOf<OrgReadsCheckpointingSource>();
    expectTypeOf<FederationPeer['status']>().toEqualTypeOf<FederationPeerStatus>();
  });
});

/**
 * `expectTypeOf` is erased at runtime, so a type-test file is checked only if
 * a compiler reads it. `tsconfig.typetests.json` must cover every test file:
 * all of `src`, with `src/__tests__` not excluded.
 */
describe('tsconfig.typetests.json reads every test file', () => {
  const here = dirname(fileURLToPath(import.meta.url));

  it('includes src and does not exclude the tests', () => {
    const config = readFileSync(resolve(here, '../../tsconfig.typetests.json'), 'utf8');
    const parsed = JSON.parse(config.replace(/^\s*\/\/.*$/gm, ''));
    expect(parsed.files).toBeUndefined();
    expect(parsed.include).toContain('src');
    expect(JSON.stringify(parsed.exclude ?? [])).not.toContain('__tests__');
  });
});
