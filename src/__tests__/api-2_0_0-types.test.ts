import { describe, it, expectTypeOf } from 'vitest';
import type {
  ApiErrorResponse,
  CursorListParams,
  DisputeProtocolAction,
  DisputeProtocolResult,
  EventType,
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
  QueryAdminRecordsParams,
  ReferenceLookupParams,
  RelaySignalParams,
  SearchRecordsParams,
  SigningKeyStatement,
  SubmitCoSignRequestParams,
  SubmitDisputeProtocolParams,
  SubmitStateTransitionParams,
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
  VerificationKey,
  VerificationKeysResponse,
} from '../types.js';
import type { AgledgerApiError } from '../errors.js';
import type * as Sdk from '../index.js';

/**
 * The client surface for API 2.0. Compiled by `tsconfig.typetests.json`, so a
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
