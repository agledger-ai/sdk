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
  CreateApiKeyParams,
  CreateApiKeyResult,
} from '../types.js';

export class AdminResource {
  constructor(private readonly http: HttpClient) {}

  /** List all enterprises on the platform. */
  async listEnterprises(params?: ListParams, options?: RequestOptions): Promise<Page<AdminEnterprise>> {
    return this.http.getPage<AdminEnterprise>('/v1/admin/enterprises', params as Record<string, unknown>, options);
  }

  /** List all registered agents on the platform. */
  async listAgents(params?: ListParams, options?: RequestOptions): Promise<Page<AdminAgent>> {
    return this.http.getPage<AdminAgent>('/v1/admin/agents', params as Record<string, unknown>, options);
  }

  /** Update an account's trust level (sandbox, active, verified). */
  async updateTrustLevel(accountId: string, params: UpdateTrustLevelParams, options?: RequestOptions): Promise<Record<string, unknown>> {
    return this.http.patch(`/v1/admin/accounts/${accountId}/trust-level`, params, options);
  }

  /** Set an agent's contract type capabilities. */
  async setCapabilities(agentId: string, params: SetCapabilitiesParams, options?: RequestOptions): Promise<Record<string, unknown>> {
    return this.http.patch(`/v1/admin/agents/${agentId}/capabilities`, params, options);
  }

  /** Get capabilities of all agents in the fleet. */
  async getFleetCapabilities(options?: RequestOptions): Promise<Page<{ agentId: string; capabilities: ContractType[] }>> {
    return this.http.getPage('/v1/admin/agents/capabilities', undefined, options);
  }

  /** List all API keys on the platform. */
  async listApiKeys(params?: ListParams, options?: RequestOptions): Promise<Page<AdminApiKey>> {
    return this.http.getPage<AdminApiKey>('/v1/admin/api-keys', params as Record<string, unknown>, options);
  }

  /** Create a new API key with optional scopes or scope profile. */
  async createApiKey(params: CreateApiKeyParams, options?: RequestOptions): Promise<CreateApiKeyResult> {
    return this.http.post('/v1/admin/api-keys', params, options);
  }

  /** Enable or disable an API key. */
  async toggleApiKey(keyId: string, active: boolean, options?: RequestOptions): Promise<AdminApiKey> {
    return this.http.patch<AdminApiKey>(`/v1/admin/api-keys/${keyId}`, { active }, options);
  }

  /** Revoke multiple API keys at once. */
  async bulkRevokeApiKeys(keyIds: string[], options?: RequestOptions): Promise<{ revoked: number }> {
    return this.http.post('/v1/admin/api-keys/bulk-revoke', { keyIds }, options);
  }

  /** List webhook dead-letter queue entries. */
  async listDlq(params?: ListParams, options?: RequestOptions): Promise<Page<WebhookDlqEntry>> {
    return this.http.getPage<WebhookDlqEntry>('/v1/admin/webhook-dlq', params as Record<string, unknown>, options);
  }

  /** Retry a single dead-letter queue entry. */
  async retryDlq(dlqId: string, options?: RequestOptions): Promise<Record<string, unknown>> {
    return this.http.post(`/v1/admin/webhook-dlq/${dlqId}/retry`, undefined, options);
  }

  /** Retry all dead-letter queue entries. */
  async retryAllDlq(options?: RequestOptions): Promise<{ retried: number }> {
    return this.http.post('/v1/admin/webhook-dlq/retry-all', undefined, options);
  }

  /** Get system health metrics (platform admin). */
  async getSystemHealth(options?: RequestOptions): Promise<SystemHealth> {
    return this.http.get<SystemHealth>('/v1/admin/system-health', undefined, options);
  }
}
