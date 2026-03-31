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
}
