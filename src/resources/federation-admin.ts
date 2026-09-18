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
  ): Promise<{ deleted: true; peerHubId: string; nextSteps?: NextStep[] }> {
    return this.http.delete(`/federation/v1/admin/peers/${peerHubId}`, undefined, options);
  }

  /** List failed outbound federation messages in the dead-letter queue. */
  listDlq(
    params?: { limit?: number; cursor?: string },
    options?: RequestOptions,
  ): Promise<Page<FederationDlqEntry>> {
    return this.http.getPage<FederationDlqEntry>('/federation/v1/admin/dlq', params as Record<string, unknown>, options);
  }

  /**
   * Recover stuck or failed outbound federation jobs. `{ dryRun: true }`
   * reports what would be recovered and changes nothing.
   */
  recoverDlq(
    params: { limit?: number; dryRun?: boolean } = {},
    options?: RequestOptions,
  ): Promise<{ recovered: number; inspected: number; dryRun: boolean; nextSteps?: NextStep[] }> {
    return this.http.post('/federation/v1/admin/dlq/recover', params, options);
  }

  /**
   * This instance's federation identity: the hub id a peer must be given, the
   * handshake signing key, and whether it can complete a handshake at all.
   * `instanceId` is null and `configured` false until the Server has both a
   * UUID hub id and a signing key; `nextSteps` names what is missing.
   */
  getInstance(options?: RequestOptions): Promise<{
    instanceId: string | null;
    configured: boolean;
    /** SPKI-DER, base64. The peer verifies this Server's signed messages against it. */
    signingPublicKey?: string | null;
    nextSteps: NextStep[];
  }> {
    return this.http.get('/federation/v1/admin/instance', undefined, options);
  }
}
