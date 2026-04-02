/**
 * AGLedger™ SDK — Federation Resource (Gateway Operations)
 * Patent Pending. Copyright 2026 AGLedger LLC. All rights reserved.
 *
 * Gateway-facing federation operations. Most methods require a bearer token
 * obtained from {@link register}. The `register` and `revoke` methods use
 * proof-of-possession / revocation secret and skip auth entirely.
 */

import type { HttpClient } from '../http.js';
import type {
  RequestOptions,
  Page,
  RegisterGatewayParams,
  RegisterGatewayResult,
  HeartbeatParams,
  HeartbeatResult,
  RegisterFederatedAgentParams,
  FederationAgent,
  ListFederatedAgentsParams,
  SubmitStateTransitionParams,
  StateTransitionResult,
  RelaySignalParams,
  SignalRelayResult,
  RotateGatewayKeyParams,
  RevokeGatewayParams,
  FederationCatchUpParams,
  FederationAuditEntry,
  ContractSchema,
  SchemaPublishParams,
  SchemaConfirmParams,
  FederationMandateCriteria,
  SubmitMandateCriteriaParams,
  ContributeReputationParams,
  FederationAgentReputation,
  RevocationBroadcastParams,
  AgentDirectorySyncParams,
} from '../types.js';

export class FederationResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Register a new gateway with the federation hub.
   * Returns a bearer token for subsequent requests.
   * This endpoint requires no Authorization header — authentication is via
   * registration token + proof-of-possession signature.
   */
  async register(
    params: RegisterGatewayParams,
    options?: RequestOptions,
  ): Promise<RegisterGatewayResult> {
    return this.http.post('/federation/v1/register', params, {
      ...options,
      authOverride: 'none',
    });
  }

  /**
   * Send a heartbeat to the hub. Refreshes the gateway's bearer token
   * and receives revocation notices for other gateways.
   * Accepts expired bearer tokens (the only endpoint that does).
   */
  async heartbeat(
    params: HeartbeatParams,
    options?: RequestOptions,
  ): Promise<HeartbeatResult> {
    return this.http.post('/federation/v1/heartbeat', params, options);
  }

  /** Register an agent in the federation directory. */
  async registerAgent(
    params: RegisterFederatedAgentParams,
    options?: RequestOptions,
  ): Promise<{ registered: boolean }> {
    return this.http.post('/federation/v1/agents', params, options);
  }

  /** List federated agents, optionally filtered by contract type. */
  async listAgents(
    params?: ListFederatedAgentsParams,
    options?: RequestOptions,
  ): Promise<Page<FederationAgent>> {
    return this.http.getPage('/federation/v1/agents', params as Record<string, unknown>, options);
  }

  /**
   * Submit a cross-boundary state transition to the hub.
   * The hub validates the transition against its state machine and returns
   * an acknowledgment with the current hub state.
   */
  async submitStateTransition(
    params: SubmitStateTransitionParams,
    options?: RequestOptions,
  ): Promise<StateTransitionResult> {
    return this.http.post('/federation/v1/state-transitions', params, options);
  }

  /**
   * Relay a settlement signal (SETTLE / HOLD / RELEASE) to the counterparty
   * gateway via the hub. The hub co-signs the signal for non-repudiation.
   */
  async relaySignal(
    params: RelaySignalParams,
    options?: RequestOptions,
  ): Promise<SignalRelayResult> {
    return this.http.post('/federation/v1/signals', params, options);
  }

  /**
   * Rotate the gateway's signing and encryption keys.
   * Requires dual signatures (old key + new key) to prove continuity of identity.
   */
  async rotateKey(
    gatewayId: string,
    params: RotateGatewayKeyParams,
    options?: RequestOptions,
  ): Promise<{ rotated: boolean }> {
    return this.http.post(`/federation/v1/gateways/${gatewayId}/rotate-key`, params, options);
  }

  /**
   * Self-service gateway revocation using the pre-shared revocation secret.
   * This endpoint requires no Authorization header.
   */
  async revoke(
    gatewayId: string,
    params: RevokeGatewayParams,
    options?: RequestOptions,
  ): Promise<{ revoked: boolean; revokedAt: string }> {
    return this.http.post(`/federation/v1/gateways/${gatewayId}/revoke`, params, {
      ...options,
      authOverride: 'none',
    });
  }

  /**
   * Fetch missed audit entries since a given chain position.
   * Used for partition recovery after network outages.
   */
  async catchUp(
    params: FederationCatchUpParams,
    options?: RequestOptions,
  ): Promise<{ data: FederationAuditEntry[]; hasMore: boolean }> {
    return this.http.get('/federation/v1/catch-up', params as unknown as Record<string, unknown>, options);
  }

  // ---------------------------------------------------------------------------
  // Event Stream
  // ---------------------------------------------------------------------------

  /** Stream federation events, optionally starting from a given timestamp. */
  async stream(
    params?: { since?: string },
    options?: RequestOptions,
  ): Promise<Record<string, unknown>> {
    return this.http.get('/federation/v1/stream', params as Record<string, unknown>, options);
  }

  // ---------------------------------------------------------------------------
  // Schema Publishing
  // ---------------------------------------------------------------------------

  /** Publish a contract type schema to the federation. */
  async publishSchema(
    contractType: string,
    params: SchemaPublishParams,
    options?: RequestOptions,
  ): Promise<ContractSchema> {
    return this.http.post<ContractSchema>(`/federation/v1/schemas/${contractType}/publish`, params, options);
  }

  /** Confirm a pending schema publication. */
  async confirmSchemaPublish(
    contractType: string,
    params: SchemaConfirmParams,
    options?: RequestOptions,
  ): Promise<ContractSchema> {
    return this.http.post<ContractSchema>(`/federation/v1/schemas/${contractType}/publish/confirm`, params, options);
  }

  // ---------------------------------------------------------------------------
  // Contract Types
  // ---------------------------------------------------------------------------

  /** List all contract types available in the federation. */
  async listContractTypes(options?: RequestOptions): Promise<ContractSchema[]> {
    return this.http.get<ContractSchema[]>('/federation/v1/contract-types', undefined, options);
  }

  /** Get details for a specific federated contract type. */
  async getContractType(
    contractType: string,
    options?: RequestOptions,
  ): Promise<ContractSchema> {
    return this.http.get<ContractSchema>(`/federation/v1/contract-types/${contractType}`, undefined, options);
  }

  // ---------------------------------------------------------------------------
  // Mandate Criteria
  // ---------------------------------------------------------------------------

  /** Get cross-boundary criteria for a federated mandate. */
  async getMandateCriteria(
    mandateId: string,
    options?: RequestOptions,
  ): Promise<FederationMandateCriteria> {
    return this.http.get<FederationMandateCriteria>(`/federation/v1/mandates/${mandateId}/criteria`, undefined, options);
  }

  /** Submit cross-boundary criteria for a federated mandate. */
  async submitMandateCriteria(
    mandateId: string,
    params: SubmitMandateCriteriaParams,
    options?: RequestOptions,
  ): Promise<FederationMandateCriteria> {
    return this.http.post<FederationMandateCriteria>(`/federation/v1/mandates/${mandateId}/criteria`, params, options);
  }

  // ---------------------------------------------------------------------------
  // Reputation
  // ---------------------------------------------------------------------------

  /** Contribute reputation data for an agent to the federation. */
  async contributeReputation(
    params: ContributeReputationParams,
    options?: RequestOptions,
  ): Promise<{ contributed: boolean }> {
    return this.http.post('/federation/v1/reputation/contribute', params, options);
  }

  /** Get an agent's federated reputation score. */
  async getAgentReputation(
    agentId: string,
    options?: RequestOptions,
  ): Promise<FederationAgentReputation> {
    return this.http.get<FederationAgentReputation>(`/federation/v1/agents/${agentId}/reputation`, undefined, options);
  }

  // ---------------------------------------------------------------------------
  // Peer-to-Peer
  // ---------------------------------------------------------------------------

  /** Broadcast key revocations to peer gateways. */
  async broadcastRevocations(
    params: RevocationBroadcastParams,
    options?: RequestOptions,
  ): Promise<{ broadcast: boolean }> {
    return this.http.post('/federation/v1/peer/revocations', params, options);
  }

  /** Synchronize agent directory with a peer gateway. */
  async syncAgentDirectory(
    params: AgentDirectorySyncParams,
    options?: RequestOptions,
  ): Promise<{ synced: boolean }> {
    return this.http.post('/federation/v1/peer/agent-sync', params, options);
  }
}
