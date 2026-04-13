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
  QueryAdminMandatesParams,
  UpdateCircuitBreakerParams,
  CircuitBreakerResult,
  LicenseInfo,
  VaultSigningKey,
  VaultAnchor,
  VaultAnchorVerifyResult,
  VaultScanJob,
  AuthCacheStats,
} from '../types.js';

export class AdminResource {
  constructor(private readonly http: HttpClient) {}

  /** List all enterprises on the platform. */
  listEnterprises(params?: ListParams, options?: RequestOptions): Promise<Page<AdminEnterprise>> {
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
  createEnterprise(params: CreateEnterpriseParams, options?: RequestOptions): Promise<AdminEnterprise> {
    return this.http.post<AdminEnterprise>('/v1/admin/enterprises', params, options);
  }

  /** List all registered agents on the platform. */
  listAgents(params?: ListParams, options?: RequestOptions): Promise<Page<AdminAgent>> {
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
  createAgent(params: CreateAgentParams, options?: RequestOptions): Promise<AdminAgent> {
    return this.http.post<AdminAgent>('/v1/admin/agents', params, options);
  }

  /**
   * Update an account's trust level (sandbox, active, verified).
   * Requires both `trustLevel` and `accountType` in params.
   */
  updateTrustLevel(accountId: string, params: UpdateTrustLevelParams, options?: RequestOptions): Promise<Record<string, unknown>> {
    return this.http.patch(`/v1/admin/accounts/${accountId}/trust-level`, params, options);
  }

  /** Deactivate an account (enterprise or agent). Revokes all API keys. */
  deactivateAccount(accountId: string, params: { accountType: 'enterprise' | 'agent'; reason?: string }, options?: RequestOptions): Promise<Record<string, unknown>> {
    return this.http.post(`/v1/admin/accounts/${accountId}/deactivate`, params, options);
  }

  /** Set an agent's contract type capabilities (PUT — replaces all). */
  setCapabilities(agentId: string, params: SetCapabilitiesParams, options?: RequestOptions): Promise<Record<string, unknown>> {
    return this.http.put(`/v1/admin/agents/${agentId}/capabilities`, params, options);
  }

  /** Get capabilities of all agents in the fleet. */
  getFleetCapabilities(options?: RequestOptions): Promise<Page<{ agentId: string; capabilities: ContractType[] }>> {
    return this.http.getPage('/v1/admin/agents/capabilities', undefined, options);
  }

  /** Get an enterprise's configuration. */
  getEnterpriseConfig(enterpriseId: string, options?: RequestOptions): Promise<EnterpriseConfig> {
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
  replaceEnterpriseConfig(enterpriseId: string, params: SetEnterpriseConfigParams, options?: RequestOptions): Promise<EnterpriseConfig> {
    return this.http.put<EnterpriseConfig>(`/v1/admin/enterprises/${enterpriseId}/config`, params, options);
  }

  /**
   * Merge-update an enterprise's configuration (PATCH semantics).
   * Only provided fields are updated; others are preserved.
   */
  updateEnterpriseConfig(enterpriseId: string, params: SetEnterpriseConfigParams, options?: RequestOptions): Promise<EnterpriseConfig> {
    return this.http.patch<EnterpriseConfig>(`/v1/admin/enterprises/${enterpriseId}/config`, params, options);
  }

  /** @deprecated Use {@link replaceEnterpriseConfig} instead. */
  setEnterpriseConfig(enterpriseId: string, params: SetEnterpriseConfigParams, options?: RequestOptions): Promise<EnterpriseConfig> {
    return this.replaceEnterpriseConfig(enterpriseId, params, options);
  }

  /** List all API keys on the platform. */
  listApiKeys(params?: ListParams, options?: RequestOptions): Promise<Page<AdminApiKey>> {
    return this.http.getPage<AdminApiKey>('/v1/admin/api-keys', params as Record<string, unknown>, options);
  }

  /** Create a new API key with required role, owner, and optional scopes or scope profile. */
  createApiKey(params: CreateApiKeyParams, options?: RequestOptions): Promise<CreateApiKeyResult> {
    return this.http.post('/v1/admin/api-keys', params, options);
  }

  /** Enable or disable an API key. */
  toggleApiKey(keyId: string, isActive: boolean, options?: RequestOptions): Promise<AdminApiKey> {
    return this.http.patch<AdminApiKey>(`/v1/admin/api-keys/${keyId}`, { isActive }, options);
  }

  /** Revoke multiple API keys at once. */
  bulkRevokeApiKeys(keyIds: string[], options?: RequestOptions): Promise<{ revoked: number }> {
    return this.http.post('/v1/admin/api-keys/bulk-revoke', { keyIds }, options);
  }

  /** Get license status and entitlements. */
  getLicense(options?: RequestOptions): Promise<LicenseInfo> {
    return this.http.get<LicenseInfo>('/v1/admin/license', undefined, options);
  }

  /** List mandates across all enterprises (platform admin). Supports filters by enterprise, status, contract type, agent, and date range. */
  listMandates(params?: QueryAdminMandatesParams, options?: RequestOptions): Promise<Page<Record<string, unknown>>> {
    return this.http.getPage('/v1/admin/mandates', params as Record<string, unknown>, options);
  }

  /** List webhook dead-letter queue entries. */
  listDlq(params?: ListParams, options?: RequestOptions): Promise<Page<WebhookDlqEntry>> {
    return this.http.getPage<WebhookDlqEntry>('/v1/admin/webhook-dlq', params as Record<string, unknown>, options);
  }

  /** Retry a single dead-letter queue entry. */
  retryDlq(dlqId: string, options?: RequestOptions): Promise<Record<string, unknown>> {
    return this.http.post(`/v1/admin/webhook-dlq/${dlqId}/retry`, undefined, options);
  }

  /** Retry all dead-letter queue entries. */
  retryAllDlq(options?: RequestOptions): Promise<{ retried: number }> {
    return this.http.post('/v1/admin/webhook-dlq/retry-all', undefined, options);
  }

  /** Get system health metrics (platform admin). */
  getSystemHealth(options?: RequestOptions): Promise<SystemHealth> {
    return this.http.get<SystemHealth>('/v1/admin/system-health', undefined, options);
  }


  /** List all IP addresses exempt from rate limiting. */
  listRateLimitExemptions(options?: RequestOptions): Promise<Page<string>> {
    return this.http.getPage<string>('/v1/admin/rate-limit-exemptions/ips', undefined, options);
  }

  /** Grant rate limit exemption to an IP address. */
  setRateLimitExemption(ip: string, options?: RequestOptions): Promise<{ ip: string; exempt: boolean }> {
    return this.http.put(`/v1/admin/rate-limit-exemptions/ip/${ip}`, {}, options);
  }

  /** Remove rate limit exemption from an IP address. */
  deleteRateLimitExemption(ip: string, options?: RequestOptions): Promise<{ ip: string; exempt: boolean }> {
    return this.http.delete(`/v1/admin/rate-limit-exemptions/ip/${ip}`, undefined, options);
  }


  /** Get health status of all webhooks (delivery stats, circuit breaker states). */
  getWebhookHealth(params?: ListParams, options?: RequestOptions): Promise<Page<Record<string, unknown>>> {
    return this.http.getPage('/v1/admin/webhooks/health', params as Record<string, unknown>, options);
  }

  /** Update a webhook's circuit breaker state (closed / open / half_open). */
  updateCircuitBreaker(webhookId: string, params: UpdateCircuitBreakerParams, options?: RequestOptions): Promise<CircuitBreakerResult> {
    return this.http.patch<CircuitBreakerResult>(`/v1/admin/webhooks/${webhookId}/circuit-breaker`, params, options);
  }


  /** List all vault signing keys (active and rotated). */
  listVaultSigningKeys(options?: RequestOptions): Promise<VaultSigningKey[]> {
    return this.http.get<VaultSigningKey[]>('/v1/admin/vault/signing-keys', undefined, options);
  }

  /** Rotate the vault signing key. Creates a new key and deprecates the current one. */
  rotateVaultSigningKey(options?: RequestOptions): Promise<VaultSigningKey> {
    return this.http.post<VaultSigningKey>('/v1/admin/vault/signing-keys/rotate', {}, options);
  }

  /** List vault trust anchors. */
  listVaultAnchors(options?: RequestOptions): Promise<VaultAnchor[]> {
    return this.http.get<VaultAnchor[]>('/v1/admin/vault/anchors', undefined, options);
  }

  /** Verify all vault trust anchors against their expected hashes. */
  verifyVaultAnchors(options?: RequestOptions): Promise<VaultAnchorVerifyResult> {
    return this.http.post<VaultAnchorVerifyResult>('/v1/admin/vault/anchors/verify', {}, options);
  }


  /** Start an asynchronous vault integrity scan. Returns a job ID for polling. */
  startVaultScan(options?: RequestOptions): Promise<VaultScanJob> {
    return this.http.post<VaultScanJob>('/v1/admin/vault/scan', {}, options);
  }

  /** Get the status of a vault integrity scan job. */
  getVaultScanStatus(jobId: string, options?: RequestOptions): Promise<VaultScanJob> {
    return this.http.get<VaultScanJob>(`/v1/admin/vault/scan/${jobId}`, undefined, options);
  }


  /** Flush the auth cache. Forces re-validation of all cached credentials. */
  flushAuthCache(options?: RequestOptions): Promise<{ flushed: boolean }> {
    return this.http.post('/v1/admin/auth-cache/flush', {}, options);
  }

  /** Get auth cache statistics (hit rate, size, evictions). */
  getAuthCacheStats(options?: RequestOptions): Promise<AuthCacheStats> {
    return this.http.get<AuthCacheStats>('/v1/admin/auth-cache/stats', undefined, options);
  }


  /** Flush the schema cache. Forces re-loading of all contract type schemas. */
  flushSchemaCache(options?: RequestOptions): Promise<{ flushed: boolean }> {
    return this.http.post('/v1/admin/schemas/cache/flush', {}, options);
  }


  /** List all owner-level rate limit exemptions. */
  listOwnerRateLimitExemptions(options?: RequestOptions): Promise<Record<string, unknown>[]> {
    return this.http.get('/v1/admin/rate-limit-exemptions', undefined, options);
  }

  /** Grant rate limit exemption to an owner. */
  setOwnerRateLimitExemption(ownerId: string, options?: RequestOptions): Promise<Record<string, unknown>> {
    return this.http.put(`/v1/admin/rate-limit-exemptions/${ownerId}`, {}, options);
  }

  /** Remove rate limit exemption from an owner. */
  deleteOwnerRateLimitExemption(ownerId: string, options?: RequestOptions): Promise<Record<string, unknown>> {
    return this.http.delete(`/v1/admin/rate-limit-exemptions/${ownerId}`, undefined, options);
  }
}
