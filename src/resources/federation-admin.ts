/**
 * AGLedger™ SDK — Federation Admin Resource (Platform Operations)
 * Patent Pending. Copyright 2026 AGLedger LLC. All rights reserved.
 *
 * Platform admin operations for managing federation gateways, mandates,
 * audit logs, and the outbound dead-letter queue. All methods use standard
 * API key auth (requires `admin:system` scope).
 */

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
} from '../types.js';

export class FederationAdminResource {
  constructor(private readonly http: HttpClient) {}

  /** Create a single-use registration token for a new gateway. */
  async createRegistrationToken(
    params?: CreateRegistrationTokenParams,
    options?: RequestOptions,
  ): Promise<FederationRegistrationToken> {
    return this.http.post('/federation/v1/admin/registration-tokens', params ?? {}, options);
  }

  /** List registered federation gateways, optionally filtered by status. */
  async listGateways(
    params?: ListFederationGatewaysParams,
    options?: RequestOptions,
  ): Promise<Page<FederationGateway>> {
    return this.http.getPage('/federation/v1/admin/gateways', params as Record<string, unknown>, options);
  }

  /** Admin-initiated gateway revocation (irreversible). */
  async revokeGateway(
    gatewayId: string,
    params: AdminRevokeGatewayParams,
    options?: RequestOptions,
  ): Promise<{ revoked: boolean; nextSteps: string[] }> {
    return this.http.post(`/federation/v1/admin/gateways/${gatewayId}/revoke`, params, options);
  }

  /** Query federation mandates tracked by the hub. */
  async queryMandates(
    params?: QueryFederationMandatesParams,
    options?: RequestOptions,
  ): Promise<Page<FederationMandate>> {
    return this.http.getPage('/federation/v1/admin/mandates', params as Record<string, unknown>, options);
  }

  /** Query the federation audit log (hash-chained). */
  async getAuditLog(
    params?: FederationAuditLogParams,
    options?: RequestOptions,
  ): Promise<Page<FederationAuditEntry>> {
    return this.http.getPage('/federation/v1/admin/audit-log', params as Record<string, unknown>, options);
  }

  /** Get the federation health summary: gateway counts, mandate counts, audit chain length. */
  async getHealth(options?: RequestOptions): Promise<FederationHealthSummary> {
    return this.http.get('/federation/v1/admin/health', undefined, options);
  }

  /**
   * Reset a gateway's sequence counter (used after backup/restore recovery).
   * @param gatewayId - Gateway UUID
   * @param params - Optional new sequence number (default: 0)
   */
  async resetSequence(
    gatewayId: string,
    params?: ResetSequenceParams,
    options?: RequestOptions,
  ): Promise<{ reset: boolean; nextSteps: string[] }> {
    return this.http.post(`/federation/v1/admin/gateways/${gatewayId}/reset-seq`, params ?? {}, options);
  }

  /** List failed outbound federation messages in the dead-letter queue. */
  async listDlq(
    params?: ListOutboundDlqParams,
    options?: RequestOptions,
  ): Promise<Page<FederationDlqEntry>> {
    return this.http.getPage('/federation/v1/admin/outbound-dlq', params as Record<string, unknown>, options);
  }

  /** Retry a failed outbound federation message (re-enqueues and removes from DLQ). */
  async retryDlq(
    dlqId: string,
    options?: RequestOptions,
  ): Promise<{ retried: boolean; nextSteps: string[] }> {
    return this.http.post(`/federation/v1/admin/outbound-dlq/${dlqId}/retry`, {}, options);
  }

  /** Permanently discard a failed outbound federation message from the DLQ. */
  async deleteDlq(
    dlqId: string,
    options?: RequestOptions,
  ): Promise<{ deleted: boolean }> {
    return this.http.delete(`/federation/v1/admin/outbound-dlq/${dlqId}`, undefined, options);
  }
}
