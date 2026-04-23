import type { HttpClient } from '../http.js';
import type {
  RequestOptions,
  Page,
  CreateRegistrationTokenParams,
  FederationRegistrationToken,
  ListFederationGatewaysParams,
  FederationGateway,
  AdminRevokeGatewayParams,
  QueryFederationMandatesParams,
  FederationMandate,
  FederationAuditLogParams,
  FederationAuditEntry,
  FederationHealthSummary,
  ResetSequenceParams,
  ListOutboundDlqParams,
  FederationDlqEntry,
  HubSigningKey,
  FederationPeer,
  PeeringToken,
  PeerRegistrationParams,
  ReputationContribution,
  MandateCriteriaStatus,
} from '../types.js';

export class FederationAdminResource {
  constructor(private readonly http: HttpClient) {}

  /** Create a single-use registration token for a new gateway. */
  createRegistrationToken(
    params?: CreateRegistrationTokenParams,
    options?: RequestOptions,
  ): Promise<FederationRegistrationToken> {
    return this.http.post('/federation/v1/admin/registration-tokens', params ?? {}, options);
  }

  /** List registered federation gateways, optionally filtered by status. */
  listGateways(
    params?: ListFederationGatewaysParams,
    options?: RequestOptions,
  ): Promise<Page<FederationGateway>> {
    return this.http.getPage('/federation/v1/admin/gateways', params as Record<string, unknown>, options);
  }

  /** Admin-initiated gateway revocation (irreversible). */
  revokeGateway(
    gatewayId: string,
    params: AdminRevokeGatewayParams,
    options?: RequestOptions,
  ): Promise<{ revoked: boolean; nextSteps: string[] }> {
    return this.http.post(`/federation/v1/admin/gateways/${gatewayId}/revoke`, params, options);
  }

  /** Query federation mandates tracked by the hub. */
  queryMandates(
    params?: QueryFederationMandatesParams,
    options?: RequestOptions,
  ): Promise<Page<FederationMandate>> {
    return this.http.getPage('/federation/v1/admin/mandates', params as Record<string, unknown>, options);
  }

  /** Query the federation audit log (hash-chained). */
  getAuditLog(
    params?: FederationAuditLogParams,
    options?: RequestOptions,
  ): Promise<Page<FederationAuditEntry>> {
    return this.http.getPage('/federation/v1/admin/audit-log', params as Record<string, unknown>, options);
  }

  /** Get the federation health summary: gateway counts, mandate counts, audit chain length. */
  getHealth(options?: RequestOptions): Promise<FederationHealthSummary> {
    return this.http.get('/federation/v1/admin/health', undefined, options);
  }

  /**
   * Reset a gateway's sequence counter (used after backup/restore recovery).
   * @param gatewayId - Gateway UUID
   * @param params - Optional new sequence number (default: 0)
   */
  resetSequence(
    gatewayId: string,
    params?: ResetSequenceParams,
    options?: RequestOptions,
  ): Promise<{ reset: boolean; nextSteps: string[] }> {
    return this.http.post(`/federation/v1/admin/gateways/${gatewayId}/reset-seq`, params ?? {}, options);
  }

  /** List failed outbound federation messages in the dead-letter queue. */
  listDlq(
    params?: ListOutboundDlqParams,
    options?: RequestOptions,
  ): Promise<Page<FederationDlqEntry>> {
    return this.http.getPage('/federation/v1/admin/outbound-dlq', params as Record<string, unknown>, options);
  }

  /** Retry a failed outbound federation message (re-enqueues and removes from DLQ). */
  retryDlq(
    dlqId: string,
    options?: RequestOptions,
  ): Promise<{ retried: boolean; nextSteps: string[] }> {
    return this.http.post(`/federation/v1/admin/outbound-dlq/${dlqId}/retry`, {}, options);
  }

  /** Permanently discard a failed outbound federation message from the DLQ. */
  deleteDlq(
    dlqId: string,
    options?: RequestOptions,
  ): Promise<{ deleted: boolean }> {
    return this.http.delete(`/federation/v1/admin/outbound-dlq/${dlqId}`, undefined, options);
  }


  /** Rotate the federation hub's signing key. Creates a new key and deprecates the current one. */
  rotateHubKey(options?: RequestOptions): Promise<HubSigningKey> {
    return this.http.post<HubSigningKey>('/federation/v1/admin/rotate-hub-key', {}, options);
  }

  /** List all hub signing keys (active, rotated, expired). */
  listHubKeys(options?: RequestOptions): Promise<HubSigningKey[]> {
    return this.http.get<HubSigningKey[]>('/federation/v1/admin/hub-keys', undefined, options);
  }

  /** Activate a hub signing key. */
  activateHubKey(
    keyId: string,
    options?: RequestOptions,
  ): Promise<HubSigningKey> {
    return this.http.post<HubSigningKey>(`/federation/v1/admin/hub-keys/${keyId}/activate`, {}, options);
  }

  /** Expire a hub signing key. */
  expireHubKey(
    keyId: string,
    options?: RequestOptions,
  ): Promise<HubSigningKey> {
    return this.http.post<HubSigningKey>(`/federation/v1/admin/hub-keys/${keyId}/expire`, {}, options);
  }


  /** Register a new peer gateway for hub-to-hub federation. */
  registerPeer(
    params: PeerRegistrationParams,
    options?: RequestOptions,
  ): Promise<FederationPeer> {
    return this.http.post<FederationPeer>('/federation/v1/peer', params, options);
  }

  /** List all peer gateways known to this hub. */
  listPeers(options?: RequestOptions): Promise<Page<FederationPeer>> {
    return this.http.getPage<FederationPeer>('/federation/v1/admin/peers', undefined, options);
  }

  /** Get details for a specific peer gateway. */
  getPeer(
    hubId: string,
    options?: RequestOptions,
  ): Promise<FederationPeer> {
    return this.http.get<FederationPeer>(`/federation/v1/admin/peers/${hubId}`, undefined, options);
  }

  /** Revoke a peer gateway (irreversible). */
  revokePeer(
    hubId: string,
    options?: RequestOptions,
  ): Promise<{ revoked: boolean }> {
    return this.http.post(`/federation/v1/admin/peers/${hubId}/revoke`, {}, options);
  }

  /** Trigger a full resync with a peer gateway. */
  resyncPeer(
    hubId: string,
    options?: RequestOptions,
  ): Promise<{ synced: boolean }> {
    return this.http.post(`/federation/v1/admin/peers/${hubId}/resync`, {}, options);
  }

  /** Create a single-use peering token for hub-to-hub federation setup. */
  createPeeringToken(options?: RequestOptions): Promise<PeeringToken> {
    return this.http.post<PeeringToken>('/federation/v1/admin/peering-tokens', {}, options);
  }


  /** Delete a specific version of a federated contract type schema. */
  deleteSchemaVersion(
    contractType: string,
    version: string,
    options?: RequestOptions,
  ): Promise<{ deleted: boolean }> {
    return this.http.delete(`/federation/v1/admin/schemas/${contractType}/${version}`, undefined, options);
  }


  /** List reputation contributions for an agent. */
  listReputationContributions(
    agentId: string,
    options?: RequestOptions,
  ): Promise<ReputationContribution[]> {
    return this.http.get<ReputationContribution[]>(`/federation/v1/admin/reputation/${agentId}`, undefined, options);
  }

  /** Reset an agent's federated reputation (deletes all contributions). */
  resetReputation(
    agentId: string,
    options?: RequestOptions,
  ): Promise<{ reset: boolean }> {
    return this.http.delete(`/federation/v1/admin/reputation/${agentId}`, undefined, options);
  }


  /** Get encryption metadata for a federated mandate's negotiated criteria. */
  getMandateCriteriaEncryptionMetadata(
    mandateId: string,
    options?: RequestOptions,
  ): Promise<MandateCriteriaStatus> {
    return this.http.get<MandateCriteriaStatus>(`/federation/v1/admin/mandates/${mandateId}/criteria-encryption-metadata`, undefined, options);
  }
}
