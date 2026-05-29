import type { HttpClient } from '../http.js';
import type {
  AdminOrg,
  AdminAgent,
  AdminApiKey,
  WebhookDlqEntry,
  SystemHealth,
  SetCapabilitiesParams,
  Page,
  ListParams,
  RequestOptions,
  RecordType,
  CreateApiKeyParams,
  UpdateApiKeyParams,
  CreateApiKeyResult,
  CreateOrgParams,
  CreateAgentParams,
  OrgConfig,
  SetOrgConfigParams,
  QueryAdminRecordsParams,
  UpdateCircuitBreakerParams,
  CircuitBreakerResult,
  LicenseInfo,
  LicenseInstanceInfo,
  VaultSigningKey,
  VaultAnchor,
  VaultAnchorVerifyResult,
  VaultScanJob,
  StartVaultScanParams,
  VerifyVaultAnchorsParams,
  AuthCacheStats,
  ProvisioningStatus,
  SupportBundle,
  RateLimitExemption,
  DeactivateOrgParams,
  DeactivateAgentParams,
  AdminImportRecordsParams,
  AdminImportRecordsResult,
  RecordRow,
  VaultScanList,
  TrustedIssuer,
  CreateTrustedIssuerParams,
  UpdateTrustedIssuerParams,
  ListTrustedIssuersParams,
  RevokeTrustedIssuerCertsResult,
  RevokeEphemeralCertResult,
  OpsSummary,
  NextStep,
} from '../types.js';

/**
 * Admin sub-resource for Records — org-wide listing and historical backfill.
 */
export class AdminRecordsResource {
  constructor(private readonly http: HttpClient) {}

  /** List Records across all orgs (platform admin). Supports filters. */
  list(params?: QueryAdminRecordsParams, options?: RequestOptions): Promise<Page<RecordRow>> {
    return this.http.getPage<RecordRow>('/v1/admin/records', params as Record<string, unknown>, options);
  }

  /**
   * Backfill historical Records from an external source. Up to 100 entries per
   * batch, atomic per request (any per-item failure rolls the whole batch back).
   * Each imported entry lands directly in its declared terminal state with
   * backdated timestamps and a `BACKFILL_IMPORT` vault entry tagged with the
   * given source label.
   *
   * Requires admin role + `admin:backfill` scope.
   */
  import(params: AdminImportRecordsParams, options?: RequestOptions): Promise<AdminImportRecordsResult> {
    return this.http.post<AdminImportRecordsResult>('/v1/admin/records/import', params, options);
  }
}

/**
 * Admin sub-resource for vault inspection and signing-key management.
 */
export class AdminVaultResource {
  constructor(private readonly http: HttpClient) {
    this.anchors = {
      list: (params?: { recordId?: string }, options?: RequestOptions) =>
        http.get<VaultAnchor[]>('/v1/admin/vault/anchors', params as Record<string, unknown>, options),
      verify: (params: VerifyVaultAnchorsParams, options?: RequestOptions) =>
        http.post<VaultAnchorVerifyResult>('/v1/admin/vault/anchors/verify', params, options),
    };
    this.scan = {
      run: (params?: StartVaultScanParams, options?: RequestOptions) =>
        http.post<VaultScanJob>('/v1/admin/vault/scan', params ?? {}, options),
      status: (jobId: string, options?: RequestOptions) =>
        http.get<VaultScanJob>(`/v1/admin/vault/scan/${jobId}`, undefined, options),
      list: (options?: RequestOptions) =>
        http.get<VaultScanList>('/v1/admin/vault/scan', undefined, options),
    };
    this.signingKeys = {
      list: (options?: RequestOptions) =>
        http.get<VaultSigningKey[]>('/v1/admin/vault/signing-keys', undefined, options),
      rotate: (options?: RequestOptions) =>
        http.post<VaultSigningKey>('/v1/admin/vault/signing-keys/rotate', {}, options),
    };
  }

  readonly anchors: {
    list(params?: { recordId?: string }, options?: RequestOptions): Promise<VaultAnchor[]>;
    verify(params: VerifyVaultAnchorsParams, options?: RequestOptions): Promise<VaultAnchorVerifyResult>;
  };

  readonly scan: {
    run(params?: StartVaultScanParams, options?: RequestOptions): Promise<VaultScanJob>;
    status(jobId: string, options?: RequestOptions): Promise<VaultScanJob>;
    list(options?: RequestOptions): Promise<VaultScanList>;
  };

  readonly signingKeys: {
    list(options?: RequestOptions): Promise<VaultSigningKey[]>;
    rotate(options?: RequestOptions): Promise<VaultSigningKey>;
  };
}

/**
 * Admin sub-resource for trusted OIDC issuers — register the IdPs whose tokens
 * may be exchanged for ephemeral signing certs via `POST /v1/auth/oidc/cert`.
 */
export class AdminTrustedIssuersResource {
  constructor(private readonly http: HttpClient) {}

  /** List trusted issuers, optionally filtered by org, scope, or enabled state. */
  list(params?: ListTrustedIssuersParams, options?: RequestOptions): Promise<Page<TrustedIssuer>> {
    return this.http.getPage<TrustedIssuer>('/v1/admin/trusted-issuers', params as Record<string, unknown>, options);
  }

  /** Register a trusted OIDC issuer. */
  create(params: CreateTrustedIssuerParams, options?: RequestOptions): Promise<TrustedIssuer> {
    return this.http.post<TrustedIssuer>('/v1/admin/trusted-issuers', params, options);
  }

  /** Get a trusted issuer by ID. */
  get(id: string, options?: RequestOptions): Promise<TrustedIssuer> {
    return this.http.get<TrustedIssuer>(`/v1/admin/trusted-issuers/${id}`, undefined, options);
  }

  /** Merge-update a trusted issuer (PATCH semantics). */
  update(id: string, params: UpdateTrustedIssuerParams, options?: RequestOptions): Promise<TrustedIssuer> {
    return this.http.patch<TrustedIssuer>(`/v1/admin/trusted-issuers/${id}`, params, options);
  }

  /**
   * Delete a trusted issuer. Returns 409 if live certs still reference it —
   * disable it (`update(id, { enabled: false })`) and revoke its certs first.
   */
  delete(id: string, options?: RequestOptions): Promise<{ deleted: true; id: string; nextSteps?: NextStep[] }> {
    return this.http.delete(`/v1/admin/trusted-issuers/${id}`, undefined, options);
  }

  /** Revoke every live ephemeral cert issued under this issuer. */
  revokeCerts(id: string, options?: RequestOptions): Promise<RevokeTrustedIssuerCertsResult> {
    return this.http.post<RevokeTrustedIssuerCertsResult>(`/v1/admin/trusted-issuers/${id}/revoke-certs`, {}, options);
  }
}

/**
 * Admin resource — org governance, key management, org provisioning,
 * vault inspection, and platform operations. Requires an `admin`-role key.
 */
export class AdminResource {
  readonly records: AdminRecordsResource;
  readonly vault: AdminVaultResource;
  readonly trustedIssuers: AdminTrustedIssuersResource;

  constructor(private readonly http: HttpClient) {
    this.records = new AdminRecordsResource(http);
    this.vault = new AdminVaultResource(http);
    this.trustedIssuers = new AdminTrustedIssuersResource(http);
  }

  /** Get a consolidated operations snapshot (license, system, queues, federation, vault, webhooks). */
  getOpsSummary(options?: RequestOptions): Promise<OpsSummary> {
    return this.http.get<OpsSummary>('/v1/admin/ops-summary', undefined, options);
  }

  /** Revoke a single ephemeral signing cert by ID. */
  revokeEphemeralCert(certId: string, options?: RequestOptions): Promise<RevokeEphemeralCertResult> {
    return this.http.post<RevokeEphemeralCertResult>(`/v1/admin/ephemeral-certs/${certId}/revoke`, {}, options);
  }

  /** List all orgs on the platform. */
  listOrgs(params?: ListParams, options?: RequestOptions): Promise<Page<AdminOrg>> {
    return this.http.getPage<AdminOrg>('/v1/admin/orgs', params as Record<string, unknown>, options);
  }

  /** Create a new org. Returns the org resource (flat object). */
  createOrg(params: CreateOrgParams, options?: RequestOptions): Promise<AdminOrg> {
    return this.http.post<AdminOrg>('/v1/admin/orgs', params, options);
  }

  /** List all registered agents on the platform. */
  listAgents(params?: ListParams, options?: RequestOptions): Promise<Page<AdminAgent>> {
    return this.http.getPage<AdminAgent>('/v1/admin/agents', params as Record<string, unknown>, options);
  }

  /** Create a new agent. Returns the agent resource (flat object). */
  createAgent(params: CreateAgentParams, options?: RequestOptions): Promise<AdminAgent> {
    return this.http.post<AdminAgent>('/v1/admin/agents', params, options);
  }

  /** Deactivate an org. Revokes all API keys owned by the org. */
  deactivateOrg(
    orgId: string,
    params: DeactivateOrgParams = {},
    options?: RequestOptions,
  ): Promise<Record<string, unknown>> {
    return this.http.post(`/v1/admin/orgs/${orgId}/deactivate`, params, options);
  }

  /** Deactivate an agent. Revokes the agent's API keys. */
  deactivateAgent(
    agentId: string,
    params: DeactivateAgentParams = {},
    options?: RequestOptions,
  ): Promise<Record<string, unknown>> {
    return this.http.post(`/v1/admin/agents/${agentId}/deactivate`, params, options);
  }

  /** Set an agent's Type capabilities (PUT — replaces all). */
  setCapabilities(agentId: string, params: SetCapabilitiesParams, options?: RequestOptions): Promise<Record<string, unknown>> {
    return this.http.put(`/v1/admin/agents/${agentId}/capabilities`, params, options);
  }

  /** Get capabilities of all agents in the fleet. */
  getFleetCapabilities(options?: RequestOptions): Promise<Page<{ agentId: string; capabilities: RecordType[] }>> {
    return this.http.getPage('/v1/admin/agents/capabilities', undefined, options);
  }

  /** Get an org's configuration. */
  getOrgConfig(orgId: string, options?: RequestOptions): Promise<OrgConfig> {
    return this.http.get<OrgConfig>(`/v1/admin/orgs/${orgId}/config`, undefined, options);
  }

  /**
   * Merge-update an org's configuration (PATCH semantics).
   * Only provided fields are updated; others are preserved.
   */
  updateOrgConfig(orgId: string, params: SetOrgConfigParams, options?: RequestOptions): Promise<OrgConfig> {
    return this.http.patch<OrgConfig>(`/v1/admin/orgs/${orgId}/config`, params, options);
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

  /** Flush the auth cache. Forces re-validation of all cached credentials. */
  flushAuthCache(options?: RequestOptions): Promise<{ flushed: boolean }> {
    return this.http.post('/v1/admin/auth-cache/flush', {}, options);
  }

  /** Get auth cache statistics (hit rate, size, evictions). */
  getAuthCacheStats(options?: RequestOptions): Promise<AuthCacheStats> {
    return this.http.get<AuthCacheStats>('/v1/admin/auth-cache/stats', undefined, options);
  }

  /** Flush the schema cache. Forces re-loading of all Type schemas. */
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
