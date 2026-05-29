import type { HttpClient } from '../http.js';
import type {
  RequestOptions,
  Page,
  FederationPeer,
  PeeringToken,
  FederationDlqEntry,
} from '../types.js';

/**
 * Federation admin surface — operator-side management of peer servers
 * and the federation outbound DLQ. Requires the `admin` role.
 */
export class FederationAdminResource {
  constructor(private readonly http: HttpClient) {}

  /** Create a single-use peering token for hub-to-hub federation setup. */
  createPeeringToken(
    params: { label: string },
    options?: RequestOptions,
  ): Promise<PeeringToken> {
    return this.http.post<PeeringToken>('/federation/v1/admin/peering-tokens', params, options);
  }

  /** List all peer servers known to this instance. */
  listPeers(
    params?: { status?: string; limit?: number; offset?: number },
    options?: RequestOptions,
  ): Promise<Page<FederationPeer>> {
    return this.http.getPage<FederationPeer>('/federation/v1/admin/peers', params as Record<string, unknown>, options);
  }

  /** Get details for a specific peer server. */
  getPeer(
    hubId: string,
    options?: RequestOptions,
  ): Promise<FederationPeer> {
    return this.http.get<FederationPeer>(`/federation/v1/admin/peers/${hubId}`, undefined, options);
  }

  /** Revoke a peer server (irreversible). */
  revokePeer(
    hubId: string,
    params: { reason: string },
    options?: RequestOptions,
  ): Promise<{ revoked: boolean }> {
    return this.http.post(`/federation/v1/admin/peers/${hubId}/revoke`, params, options);
  }

  /** Trigger a full resync with a peer server. */
  resyncPeer(
    hubId: string,
    options?: RequestOptions,
  ): Promise<{ synced: boolean }> {
    return this.http.post(`/federation/v1/admin/peers/${hubId}/resync`, {}, options);
  }

  /** Permanently remove a revoked peer's record. */
  deletePeer(
    hubId: string,
    options?: RequestOptions,
  ): Promise<{ deleted: boolean }> {
    return this.http.delete(`/federation/v1/admin/peers/${hubId}`, undefined, options);
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

  /** This instance's federation identity (hubId, public keys, endpoint URL). */
  getInstance(options?: RequestOptions): Promise<Record<string, unknown>> {
    return this.http.get('/federation/v1/admin/instance', undefined, options);
  }
}
