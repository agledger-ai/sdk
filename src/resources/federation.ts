import type { HttpClient } from '../http.js';
import type {
  RequestOptions,
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
} from '../types.js';

/**
 * Federation peer-facing surface. These endpoints are reached by peer
 * AGLedger instances over the federation protocol: typical SDK users
 * don't call them directly; they're used by federation infrastructure code.
 */
export class FederationResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Establish a peer relationship with another AGLedger instance.
   *
   * The single-use peering token in the body is what admits the call, so the
   * route carries no other authentication. It is checked first: an unknown,
   * consumed or expired token is a 401 before anything else about the request
   * is looked at. A token minted for a different `peerHubId` is a 422 and is
   * not consumed. The receiver answers with its own signing key and the hub id
   * the registration is filed under.
   */
  peerHandshake(
    params: PeerHandshakeParams,
    options?: RequestOptions,
  ): Promise<PeerHandshakeResult> {
    return this.http.post('/federation/v1/peer', params, options);
  }

  /**
   * Submit a cross-boundary state transition to a peer.
   * The receiver validates against its state machine and acknowledges with
   * the current peer-side state.
   */
  submitStateTransition(
    params: SubmitStateTransitionParams,
    options?: RequestOptions,
  ): Promise<StateTransitionResult> {
    return this.http.post('/federation/v1/state-transitions', params, options);
  }

  /**
   * Relay a Settlement Signal (SETTLE / HOLD) to a counterparty peer.
   * The receiver co-signs the signal for non-repudiation. A receiver that
   * registered the record's type with `coSignRequired: true` refuses a signal
   * without `counterSignature` with 422, `retryable: false`, reason
   * `co_sign_required`. The receiver ignores `reason`; see
   * {@link RelaySignalParams.reason}.
   */
  relaySignal(
    params: RelaySignalParams,
    options?: RequestOptions,
  ): Promise<SignalRelayResult> {
    return this.http.post('/federation/v1/signals', params, options);
  }

  /** Request a co-signature on a federated artifact. */
  submitCoSignRequest(
    params: SubmitCoSignRequestParams,
    options?: RequestOptions,
  ): Promise<CoSignRequestResult> {
    return this.http.post('/federation/v1/co-sign-requests', params, options);
  }

  /** Submit a dispute-protocol message to a federated counterparty. */
  submitDisputeProtocol(
    params: SubmitDisputeProtocolParams,
    options?: RequestOptions,
  ): Promise<DisputeProtocolResult> {
    return this.http.post('/federation/v1/disputes', params, options);
  }
}
