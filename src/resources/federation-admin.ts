import type { HttpClient } from '../http.js';
import type {
  RequestOptions,
  Page,
  FederationPeer,
  ListPeersParams,
  PeeringToken,
  FederationDlqEntry,
  NextStep,
} from '../types.js';

/**
 * Federation admin surface: operator-side management of peer Servers
 * and the federation outbound DLQ. Requires the `admin` role.
 */
export class FederationAdminResource {
  constructor(private readonly http: HttpClient) {}

  /** Create a single-use peering token for peer-to-peer federation setup. */
  createPeeringToken(
    params: { label: string },
    options?: RequestOptions,
  ): Promise<PeeringToken> {
    return this.http.post<PeeringToken>('/federation/v1/admin/peering-tokens', params, options);
  }

  /** List all peer Servers known to this instance. */
  listPeers(
    params?: ListPeersParams,
    options?: RequestOptions,
  ): Promise<Page<FederationPeer>> {
    return this.http.getPage<FederationPeer>('/federation/v1/admin/peers', params as Record<string, unknown>, options);
  }

  /** Get details for a specific peer Server. Takes `peerHubId`, not `peerId`. */
  getPeer(
    peerHubId: string,
    options?: RequestOptions,
  ): Promise<FederationPeer> {
    return this.http.get<FederationPeer>(`/federation/v1/admin/peers/${peerHubId}`, undefined, options);
  }

  /** Revoke a peer Server (irreversible). */
  revokePeer(
    peerHubId: string,
    params: { reason: string },
    options?: RequestOptions,
  ): Promise<{ revoked: true; nextSteps?: NextStep[] }> {
    return this.http.post(`/federation/v1/admin/peers/${peerHubId}/revoke`, params, options);
  }

  /** Permanently remove a revoked peer's record. */
  deletePeer(
    peerHubId: string,
    options?: RequestOptions,
  ): Promise<{ deleted: boolean }> {
    return this.http.delete(`/federation/v1/admin/peers/${peerHubId}`, undefined, options);
  }

  /** List failed outbound federation messages in the dead-letter queue. */
  listDlq(
    params?: { limit?: number; cursor?: string },
    options?: RequestOptions,
  ): Promise<Page<FederationDlqEntry>> {
    return this.http.getPage<FederationDlqEntry>('/federation/v1/admin/dlq', params as Record<string, unknown>, options);
  }

  /** Recover stuck or failed outbound federation jobs. */
  recoverDlq(
    params: Record<string, unknown> = {},
    options?: RequestOptions,
  ): Promise<{ recovered: number }> {
    return this.http.post('/federation/v1/admin/dlq/recover', params, options);
  }

  /** This instance's federation identity: hub id, both federation public keys, and whether it can complete a handshake at all. */
  getInstance(options?: RequestOptions): Promise<Record<string, unknown>> {
    return this.http.get('/federation/v1/admin/instance', undefined, options);
  }
}
