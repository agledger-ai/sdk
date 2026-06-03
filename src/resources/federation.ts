import type { HttpClient } from '../http.js';
import type {
  RequestOptions,
  PeerHandshakeParams,
  PeerHandshakeResult,
  AgentDirectorySyncParams,
  SubmitStateTransitionParams,
  StateTransitionResult,
  RelaySignalParams,
  SignalRelayResult,
  SubmitCoSignRequestParams,
  CoSignRequestResult,
  SubmitDisputeProtocolParams,
  DisputeProtocolResult,
  ContributeReputationParams,
  FederationAgentReputation,
} from '../types.js';

/**
 * Federation peer-facing surface. These endpoints are reached by peer
 * AGLedger instances over the federation protocol — typical SDK users
 * don't call them directly; they're used by federation infrastructure code.
 */
export class FederationResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Establish a peer relationship with another AGLedger instance.
   * Caller presents a single-use peering token plus their signing/encryption
   * public keys; receiver responds with the symmetric handshake payload.
   */
  peerHandshake(
    params: PeerHandshakeParams,
    options?: RequestOptions,
  ): Promise<PeerHandshakeResult> {
    return this.http.post('/federation/v1/peer', params, options);
  }

  /** Synchronize agent directory with a peer. */
  syncAgentDirectory(
    params: AgentDirectorySyncParams,
    options?: RequestOptions,
  ): Promise<{ synced: boolean }> {
    return this.http.post('/federation/v1/peer/agent-sync', params, options);
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
   * The receiver co-signs the signal for non-repudiation.
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

  /** Contribute aggregated reputation data for an agent to the federation. */
  contributeReputation(
    params: ContributeReputationParams,
    options?: RequestOptions,
  ): Promise<{ contributed: boolean }> {
    return this.http.post('/federation/v1/reputation/contribute', params, options);
  }

  /** Get an agent's federated reputation score. */
  getAgentReputation(
    agentId: string,
    options?: RequestOptions,
  ): Promise<FederationAgentReputation> {
    return this.http.get<FederationAgentReputation>(`/federation/v1/agents/${agentId}/reputation`, undefined, options);
  }
}
