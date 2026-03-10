/**
 * AGLedger™ SDK — Admin Resource
 * Patent Pending. Copyright 2026 AGLedger LLC. All rights reserved.
 *
 * Platform-only operations. Requires platform-level API key.
 */

import type { HttpClient } from '../http.js';
import type {
  AdminEnterprise,
  AdminAgent,
  AdminApiKey,
  WebhookDlqEntry,
  SystemHealth,
  UpdateTrustLevelParams,
  SetCapabilitiesParams,
  Page,
  ListParams,
  RequestOptions,
  ContractType,
} from '../types.js';

export class AdminResource {
  constructor(private readonly http: HttpClient) {}

  // --- Enterprises ---

  async listEnterprises(params?: ListParams, options?: RequestOptions): Promise<Page<AdminEnterprise>> {
    return this.http.getPage<AdminEnterprise>('/v1/admin/enterprises', params as Record<string, unknown>, options);
  }

  // --- Agents ---

  async listAgents(params?: ListParams, options?: RequestOptions): Promise<Page<AdminAgent>> {
    return this.http.getPage<AdminAgent>('/v1/admin/agents', params as Record<string, unknown>, options);
  }

  async updateTrustLevel(accountId: string, params: UpdateTrustLevelParams, options?: RequestOptions): Promise<Record<string, unknown>> {
    return this.http.patch(`/v1/admin/accounts/${accountId}/trust-level`, params, options);
  }

  async setCapabilities(agentId: string, params: SetCapabilitiesParams, options?: RequestOptions): Promise<Record<string, unknown>> {
    return this.http.patch(`/v1/admin/agents/${agentId}/capabilities`, params, options);
  }

  async getFleetCapabilities(options?: RequestOptions): Promise<Page<{ agentId: string; capabilities: ContractType[] }>> {
    return this.http.getPage('/v1/admin/agents/capabilities', undefined, options);
  }

  // --- API Keys ---

  async listApiKeys(params?: ListParams, options?: RequestOptions): Promise<Page<AdminApiKey>> {
    return this.http.getPage<AdminApiKey>('/v1/admin/api-keys', params as Record<string, unknown>, options);
  }

  async createApiKey(params: { ownerId: string; ownerType: string }, options?: RequestOptions): Promise<{ apiKey: string; keyId: string }> {
    return this.http.post('/v1/admin/api-keys', params, options);
  }

  async toggleApiKey(keyId: string, active: boolean, options?: RequestOptions): Promise<AdminApiKey> {
    return this.http.patch<AdminApiKey>(`/v1/admin/api-keys/${keyId}`, { active }, options);
  }

  async bulkRevokeApiKeys(keyIds: string[], options?: RequestOptions): Promise<{ revoked: number }> {
    return this.http.post('/v1/admin/api-keys/bulk-revoke', { keyIds }, options);
  }

  // --- Webhook DLQ ---

  async listDlq(params?: ListParams, options?: RequestOptions): Promise<Page<WebhookDlqEntry>> {
    return this.http.getPage<WebhookDlqEntry>('/v1/admin/webhook-dlq', params as Record<string, unknown>, options);
  }

  async retryDlq(dlqId: string, options?: RequestOptions): Promise<Record<string, unknown>> {
    return this.http.post(`/v1/admin/webhook-dlq/${dlqId}/retry`, undefined, options);
  }

  async retryAllDlq(options?: RequestOptions): Promise<{ retried: number }> {
    return this.http.post('/v1/admin/webhook-dlq/retry-all', undefined, options);
  }

  // --- System Health ---

  async getSystemHealth(options?: RequestOptions): Promise<SystemHealth> {
    return this.http.get<SystemHealth>('/v1/admin/system-health', undefined, options);
  }
}
