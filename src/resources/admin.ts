import type { HttpClient } from '../http.js';
import type {
  AdminEnterprise,
  AdminAgent,
  AdminApiKey,
  WebhookDlqEntry,
  SystemHealth,
  SetCapabilitiesParams,
  Page,
  ListParams,
  RequestOptions,
  ContractType,
  CreateApiKeyParams,
  UpdateApiKeyParams,
  CreateApiKeyResult,
  CreateEnterpriseParams,
  CreateAgentParams,
  EnterpriseConfig,
  SetEnterpriseConfigParams,
  QueryAdminMandatesParams,
  UpdateCircuitBreakerParams,
  CircuitBreakerResult,
  LicenseInfo,
  LicenseInstanceInfo,
  VaultSigningKey,
  VaultAnchor,
  VaultAnchorVerifyResult,
  VaultScanJob,
  AuthCacheStats,
  ProvisioningStatus,
  SupportBundle,
  RateLimitExemption,
  DeactivateAccountParams,
} from '../types.js';

/**
 * Admin resource — tenant governance, key management, enterprise provisioning,
 * and platform operations. In v0.20.0 the role label changed: admin keys carry
 * role `admin` (was `enterprise`) and the prefix is `agl_adm_`.
 */
export class AdminResource {
  constructor(private readonly http: HttpClient) {}

  /** List all enterprises on the platform. */
  listEnterprises(params?: ListParams, options?: RequestOptions): Promise<Page<AdminEnterprise>> {
    return this.http.getPage<AdminEnterprise>('/v1/admin/enterprises', params as Record<string, unknown>, options);
  }

  /**
   * Create a new enterprise. Returns the enterprise resource (flat object).
   * Slug is auto-generated from name if omitted.
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
   */
  createAgent(params: CreateAgentParams, options?: RequestOptions): Promise<AdminAgent> {
    return this.http.post<AdminAgent>('/v1/admin/agents', params, options);
  }

  /** Deactivate an account (enterprise or agent). Revokes all API keys. */
  deactivateAccount(accountId: string, params: DeactivateAccountParams, options?: RequestOptions): Promise<Record<string, unknown>> {
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
   * Merge-update an enterprise's configuration (PATCH semantics).
   * Only provided fields are updated; others are preserved.
   */
  updateEnterpriseConfig(enterpriseId: string, params: SetEnterpriseConfigParams, options?: RequestOptions): Promise<EnterpriseConfig> {
    return this.http.patch<EnterpriseConfig>(`/v1/admin/enterprises/${enterpriseId}/config`, params, options);
  }

  /** List all API keys on the platform. */
  listApiKeys(params?: ListParams, options?: RequestOptions): Promise<Page<AdminApiKey>> {
    return this.http.getPage<AdminApiKey>('/v1/admin/api-keys', params as Record<string, unknown>, options);
  }

  /** Create a new API key with required role, owner, and optional scopes or scope profile. */
  createApiKey(params: CreateApiKeyParams, options?: RequestOptions): Promise<CreateApiKeyResult> {
    return this.http.post('/v1/admin/api-keys', params, options);
  }

  /** Update an API key (activate/deactivate, rename, adjust scopes). */
  updateApiKey(keyId: string, params: UpdateApiKeyParams, options?: RequestOptions): Promise<AdminApiKey> {
    return this.http.patch<AdminApiKey>(`/v1/admin/api-keys/${keyId}`, params, options);
  }

  /** Enable or disable an API key. Convenience wrapper around updateApiKey. */
  toggleApiKey(keyId: string, isActive: boolean, options?: RequestOptions): Promise<AdminApiKey> {
    return this.updateApiKey(keyId, { isActive }, options);
  }

  /** Revoke multiple API keys at once. */
  bulkRevokeApiKeys(keyIds: string[], options?: RequestOptions): Promise<{ revoked: number }> {
    return this.http.post('/v1/admin/api-keys/bulk-revoke', { keyIds }, options);
  }

  /** Get license status and entitlements. */
  getLicense(options?: RequestOptions): Promise<LicenseInfo> {
    return this.http.get<LicenseInfo>('/v1/admin/license', undefined, options);
  }

  /** Get the stable instance identifier (licensing + support). */
  getLicenseInstanceId(options?: RequestOptions): Promise<LicenseInstanceInfo> {
    return this.http.get<LicenseInstanceInfo>('/v1/admin/license/instance-id', undefined, options);
  }

  /** Reload the license file from disk without restarting the service. */
  reloadLicense(options?: RequestOptions): Promise<{ reloaded: boolean }> {
    return this.http.post('/v1/admin/license/reload', {}, options);
  }

  /** List mandates across all enterprises (platform admin). Supports filters. */
  listMandates(params?: QueryAdminMandatesParams, options?: RequestOptions): Promise<Page<Record<string, unknown>>> {
    return this.http.getPage('/v1/admin/mandates', params as Record<string, unknown>, options);
  }

  /** Reload the static-provisioning config from disk. */
  reloadProvisioning(options?: RequestOptions): Promise<{ reloaded: boolean }> {
    return this.http.post('/v1/admin/provisioning/reload', {}, options);
  }

  /** Get the current static-provisioning status (loaded entries, last reload). */
  getProvisioningStatus(options?: RequestOptions): Promise<ProvisioningStatus> {
    return this.http.get<ProvisioningStatus>('/v1/admin/provisioning/status', undefined, options);
  }

  /** Reload the agent discovery cache. */
  reloadDiscovery(options?: RequestOptions): Promise<{ reloaded: boolean }> {
    return this.http.post('/v1/admin/discovery/reload', {}, options);
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

  /** List all owner-level rate limit exemptions. */
  listRateLimitExemptions(options?: RequestOptions): Promise<RateLimitExemption[]> {
    return this.http.get<RateLimitExemption[]>('/v1/admin/rate-limit-exemptions', undefined, options);
  }

  /** Get a specific owner's rate-limit exemption (404 if none). */
  getRateLimitExemption(ownerId: string, options?: RequestOptions): Promise<RateLimitExemption> {
    return this.http.get<RateLimitExemption>(`/v1/admin/rate-limit-exemptions/${ownerId}`, undefined, options);
  }

  /** Grant rate limit exemption to an owner. */
  setRateLimitExemption(ownerId: string, params?: Record<string, unknown>, options?: RequestOptions): Promise<RateLimitExemption> {
    return this.http.put<RateLimitExemption>(`/v1/admin/rate-limit-exemptions/${ownerId}`, params ?? {}, options);
  }

  /** Remove rate limit exemption from an owner. */
  deleteRateLimitExemption(ownerId: string, options?: RequestOptions): Promise<Record<string, unknown>> {
    return this.http.delete(`/v1/admin/rate-limit-exemptions/${ownerId}`, undefined, options);
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

  /** Download a diagnostic support bundle (config snapshot, recent logs). */
  getSupportBundle(options?: RequestOptions): Promise<SupportBundle> {
    return this.http.get<SupportBundle>('/v1/admin/support-bundle', undefined, options);
  }

  /** Upload a support bundle to AGLedger support (opt-in). */
  uploadSupportBundle(options?: RequestOptions): Promise<{ uploaded: boolean; bundleId?: string }> {
    return this.http.post('/v1/admin/support-bundle/upload', {}, options);
  }
}
