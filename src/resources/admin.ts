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
  CreateEnterpriseParams,
  CreateAgentParams,
  EnterpriseConfig,
  SetEnterpriseConfigParams,
} from '../types.js';

export class AdminResource {
  constructor(private readonly http: HttpClient) {}

  /** List all enterprises on the platform. */
  async listEnterprises(params?: ListParams, options?: RequestOptions): Promise<Page<AdminEnterprise>> {
    return this.http.getPage<AdminEnterprise>('/v1/admin/enterprises', params as Record<string, unknown>, options);
  }

  /**
   * Create a new enterprise. Returns the enterprise resource (flat object).
   * Slug is auto-generated from name if omitted.
   *
   * @example
   * ```ts
   * const enterprise = await client.admin.createEnterprise({ name: 'Acme Corp' });
   * console.log(enterprise.id, enterprise.slug); // slug auto-generated
   * ```
   */
  async createEnterprise(params: CreateEnterpriseParams, options?: RequestOptions): Promise<AdminEnterprise> {
    return this.http.post<AdminEnterprise>('/v1/admin/enterprises', params, options);
  }

  /** List all registered agents on the platform. */
  async listAgents(params?: ListParams, options?: RequestOptions): Promise<Page<AdminAgent>> {
    return this.http.getPage<AdminAgent>('/v1/admin/agents', params as Record<string, unknown>, options);
  }

  /**
   * Create a new agent. Returns the agent resource (flat object).
   * Slug is auto-generated from name if omitted.
   *
   * @example
   * ```ts
   * const agent = await client.admin.createAgent({ name: 'My Agent' });
   * console.log(agent.id, agent.slug); // slug auto-generated
   * ```
   */
  async createAgent(params: CreateAgentParams, options?: RequestOptions): Promise<AdminAgent> {
    return this.http.post<AdminAgent>('/v1/admin/agents', params, options);
  }

  /**
   * Update an account's trust level (sandbox, active, verified).
   * Requires both `trustLevel` and `accountType` in params.
   */
  async updateTrustLevel(accountId: string, params: UpdateTrustLevelParams, options?: RequestOptions): Promise<Record<string, unknown>> {
    return this.http.patch(`/v1/admin/accounts/${accountId}/trust-level`, params, options);
  }

  /** Deactivate an account (enterprise or agent). Revokes all API keys. */
  async deactivateAccount(accountId: string, params: { accountType: 'enterprise' | 'agent'; reason?: string }, options?: RequestOptions): Promise<Record<string, unknown>> {
    return this.http.post(`/v1/admin/accounts/${accountId}/deactivate`, params, options);
  }

  /** Set an agent's contract type capabilities (PUT — replaces all). */
  async setCapabilities(agentId: string, params: SetCapabilitiesParams, options?: RequestOptions): Promise<Record<string, unknown>> {
    return this.http.put(`/v1/admin/agents/${agentId}/capabilities`, params, options);
  }

  /** Get capabilities of all agents in the fleet. */
  async getFleetCapabilities(options?: RequestOptions): Promise<Page<{ agentId: string; capabilities: ContractType[] }>> {
    return this.http.getPage('/v1/admin/agents/capabilities', undefined, options);
  }

  /** Get an enterprise's configuration. */
  async getEnterpriseConfig(enterpriseId: string, options?: RequestOptions): Promise<EnterpriseConfig> {
    return this.http.get<EnterpriseConfig>(`/v1/admin/enterprises/${enterpriseId}/config`, undefined, options);
  }

  /**
   * Replace an enterprise's configuration (desired-state semantics).
   * Uses PUT — the entire config object is replaced; omitted fields are removed.
   *
   * @example
   * ```ts
   * const config = await client.admin.replaceEnterpriseConfig('ent_abc123', {
   *   agentApprovalRequired: true,
   *   allowSelfApproval: false,
   * });
   * ```
   */
  async replaceEnterpriseConfig(enterpriseId: string, params: SetEnterpriseConfigParams, options?: RequestOptions): Promise<EnterpriseConfig> {
    return this.http.put<EnterpriseConfig>(`/v1/admin/enterprises/${enterpriseId}/config`, params, options);
  }

  /**
   * Merge-update an enterprise's configuration (PATCH semantics).
   * Only provided fields are updated; others are preserved.
   */
  async updateEnterpriseConfig(enterpriseId: string, params: SetEnterpriseConfigParams, options?: RequestOptions): Promise<EnterpriseConfig> {
    return this.http.patch<EnterpriseConfig>(`/v1/admin/enterprises/${enterpriseId}/config`, params, options);
  }

  /** @deprecated Use {@link replaceEnterpriseConfig} instead. */
  async setEnterpriseConfig(enterpriseId: string, params: SetEnterpriseConfigParams, options?: RequestOptions): Promise<EnterpriseConfig> {
    return this.replaceEnterpriseConfig(enterpriseId, params, options);
  }

  /** List all API keys on the platform. */
  async listApiKeys(params?: ListParams, options?: RequestOptions): Promise<Page<AdminApiKey>> {
    return this.http.getPage<AdminApiKey>('/v1/admin/api-keys', params as Record<string, unknown>, options);
  }

  /** Create a new API key with required role, owner, and optional scopes or scope profile. */
  async createApiKey(params: CreateApiKeyParams, options?: RequestOptions): Promise<CreateApiKeyResult> {
    return this.http.post('/v1/admin/api-keys', params, options);
  }

  /** Enable or disable an API key. */
  async toggleApiKey(keyId: string, isActive: boolean, options?: RequestOptions): Promise<AdminApiKey> {
    return this.http.patch<AdminApiKey>(`/v1/admin/api-keys/${keyId}`, { isActive }, options);
  }

  /** Revoke multiple API keys at once. */
  async bulkRevokeApiKeys(keyIds: string[], options?: RequestOptions): Promise<{ revoked: number }> {
    return this.http.post('/v1/admin/api-keys/bulk-revoke', { keyIds }, options);
  }

  /** Get license status and entitlements. */
  async getLicense(options?: RequestOptions): Promise<Record<string, unknown>> {
    return this.http.get('/v1/admin/license', undefined, options);
  }

  /** List mandates across all enterprises (platform admin). */
  async listMandates(params?: ListParams, options?: RequestOptions): Promise<Page<Record<string, unknown>>> {
    return this.http.getPage('/v1/admin/mandates', params as Record<string, unknown>, options);
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
