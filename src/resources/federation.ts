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
  TypeSchema,
  SchemaPublishParams,
  SchemaConfirmParams,
  FederationRecordCriteria,
  SubmitRecordCriteriaParams,
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
  register(
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
  heartbeat(
    params: HeartbeatParams,
    options?: RequestOptions,
  ): Promise<HeartbeatResult> {
    return this.http.post('/federation/v1/heartbeat', params, options);
  }

  /** Register an agent in the federation directory. */
  registerAgent(
    params: RegisterFederatedAgentParams,
    options?: RequestOptions,
  ): Promise<{ registered: boolean }> {
    return this.http.post('/federation/v1/agents', params, options);
  }

  /** List federated agents, optionally filtered by Type. */
  listAgents(
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
  submitStateTransition(
    params: SubmitStateTransitionParams,
    options?: RequestOptions,
  ): Promise<StateTransitionResult> {
    return this.http.post('/federation/v1/state-transitions', params, options);
  }

  /**
   * Relay a settlement signal (SETTLE / HOLD / RELEASE) to the counterparty
   * gateway via the hub. The hub co-signs the signal for non-repudiation.
   */
  relaySignal(
    params: RelaySignalParams,
    options?: RequestOptions,
  ): Promise<SignalRelayResult> {
    return this.http.post('/federation/v1/signals', params, options);
  }

  /**
   * Rotate the gateway's signing and encryption keys.
   * Requires dual signatures (old key + new key) to prove continuity of identity.
   */
  rotateKey(
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
  revoke(
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
  catchUp(
    params: FederationCatchUpParams,
    options?: RequestOptions,
  ): Promise<{ data: FederationAuditEntry[]; hasMore: boolean }> {
    return this.http.get('/federation/v1/catch-up', params as unknown as Record<string, unknown>, options);
  }


  /** Stream federation events, optionally starting from a given timestamp. */
  stream(
    params?: { since?: string },
    options?: RequestOptions,
  ): Promise<Record<string, unknown>> {
    return this.http.get('/federation/v1/stream', params as Record<string, unknown>, options);
  }


  /** Publish a Type schema to the federation. */
  publishSchema(
    type: string,
    params: SchemaPublishParams,
    options?: RequestOptions,
  ): Promise<TypeSchema> {
    return this.http.post<TypeSchema>(`/federation/v1/schemas/${type}/publish`, params, options);
  }

  /** Confirm a pending schema publication. */
  confirmSchemaPublish(
    type: string,
    params: SchemaConfirmParams,
    options?: RequestOptions,
  ): Promise<TypeSchema> {
    return this.http.post<TypeSchema>(`/federation/v1/schemas/${type}/publish/confirm`, params, options);
  }


  /** List all Types available in the federation. */
  listTypes(options?: RequestOptions): Promise<TypeSchema[]> {
    return this.http.get<TypeSchema[]>('/federation/v1/contract-types', undefined, options);
  }

  /** Get details for a specific federated Type. */
  getType(
    type: string,
    options?: RequestOptions,
  ): Promise<TypeSchema> {
    return this.http.get<TypeSchema>(`/federation/v1/contract-types/${type}`, undefined, options);
  }


  /** Get cross-boundary criteria for a federated Record. */
  getRecordCriteria(
    recordId: string,
    options?: RequestOptions,
  ): Promise<FederationRecordCriteria> {
    return this.http.get<FederationRecordCriteria>(`/federation/v1/records/${recordId}/criteria`, undefined, options);
  }

  /** Submit cross-boundary criteria for a federated Record. */
  submitRecordCriteria(
    recordId: string,
    params: SubmitRecordCriteriaParams,
    options?: RequestOptions,
  ): Promise<FederationRecordCriteria> {
    return this.http.post<FederationRecordCriteria>(`/federation/v1/records/${recordId}/criteria`, params, options);
  }


  /** Contribute reputation data for an agent to the federation. */
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


  /** Broadcast key revocations to peer gateways. */
  broadcastRevocations(
    params: RevocationBroadcastParams,
    options?: RequestOptions,
  ): Promise<{ broadcast: boolean }> {
    return this.http.post('/federation/v1/peer/revocations', params, options);
  }

  /** Synchronize agent directory with a peer gateway. */
  syncAgentDirectory(
    params: AgentDirectorySyncParams,
    options?: RequestOptions,
  ): Promise<{ synced: boolean }> {
    return this.http.post('/federation/v1/peer/agent-sync', params, options);
  }
}
