import type { AgledgerClientOptions, RateLimitInfo, RequestOptions } from './types.js';
import { HttpClient } from './http.js';
import { RecordsResource } from './resources/records.js';
import { ReceiptsResource } from './resources/receipts.js';
import { VerificationResource } from './resources/verification.js';
import { DisputesResource } from './resources/disputes.js';
import { WebhooksResource } from './resources/webhooks.js';
import { ReputationResource } from './resources/reputation.js';
import { EventsResource } from './resources/events.js';
import { SchemasResource } from './resources/schemas.js';
import { ComplianceResource } from './resources/compliance.js';
import { HealthResource } from './resources/health.js';
import { AdminResource } from './resources/admin.js';
import { A2aResource } from './resources/a2a.js';
import { CapabilitiesResource } from './resources/capabilities.js';
import { FederationResource } from './resources/federation.js';
import { FederationAdminResource } from './resources/federation-admin.js';
import { AgentsResource } from './resources/agents.js';
import { ReferencesResource } from './resources/references.js';
import { VerificationKeysResource } from './resources/verification-keys.js';
import { AuthResource } from './resources/auth.js';
import { DiscoveryResource } from './resources/discovery.js';
import { AuditResource } from './resources/audit.js';

export class AgledgerClient {
  private readonly http: HttpClient;

  readonly records: RecordsResource;
  readonly receipts: ReceiptsResource;
  readonly verification: VerificationResource;
  readonly disputes: DisputesResource;
  readonly webhooks: WebhooksResource;
  readonly reputation: ReputationResource;
  readonly events: EventsResource;
  readonly schemas: SchemasResource;
  readonly compliance: ComplianceResource;
  readonly health: HealthResource;
  readonly admin: AdminResource;
  readonly a2a: A2aResource;
  readonly capabilities: CapabilitiesResource;
  readonly federation: FederationResource;
  readonly federationAdmin: FederationAdminResource;
  readonly agents: AgentsResource;
  readonly references: ReferencesResource;
  readonly verificationKeys: VerificationKeysResource;
  readonly auth: AuthResource;
  readonly discovery: DiscoveryResource;
  readonly audit: AuditResource;

  /** Rate limit info from the most recent API response. Null if headers not present. */
  get rateLimitInfo(): RateLimitInfo | null {
    return this.http.rateLimitInfo;
  }

  /**
   * Escape hatch for any API route the SDK does not yet model.
   * Forwards `method` + `path` + `body` to the API exactly as given.
   *
   * Use this to reach new or unmodeled endpoints without waiting for a
   * typed method. The return type is unknown — callers narrow it themselves.
   *
   * @example
   * ```ts
   * const result = await client.request('POST', '/v1/custom/endpoint', { foo: 'bar' });
   * ```
   */
  request<T = unknown>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    body?: unknown,
    options?: RequestOptions & { query?: Record<string, unknown> },
  ): Promise<T> {
    switch (method) {
      case 'GET':
        return this.http.get<T>(path, options?.query, options);
      case 'POST':
        return this.http.post<T>(path, body, options, options?.query);
      case 'PUT':
        return this.http.put<T>(path, body, options);
      case 'PATCH':
        return this.http.patch<T>(path, body, options);
      case 'DELETE':
        return this.http.delete<T>(path, body, options);
    }
  }

  /**
   * Request ID from the most recent API response (`X-Request-Id` header).
   * Useful for debugging and correlating requests across Record chains.
   * Null if the API did not return the header.
   */
  get lastRequestId(): string | null {
    return this.http.lastRequestId;
  }

  constructor(options: AgledgerClientOptions) {
    const http = new HttpClient(options);
    this.http = http;
    this.records = new RecordsResource(http);
    this.receipts = new ReceiptsResource(http);
    this.verification = new VerificationResource(http);
    this.disputes = new DisputesResource(http);
    this.webhooks = new WebhooksResource(http);
    this.reputation = new ReputationResource(http);
    this.events = new EventsResource(http);
    this.schemas = new SchemasResource(http);
    this.compliance = new ComplianceResource(http);
    this.health = new HealthResource(http);
    this.admin = new AdminResource(http);
    this.a2a = new A2aResource(http);
    this.capabilities = new CapabilitiesResource(http);
    this.federation = new FederationResource(http);
    this.federationAdmin = new FederationAdminResource(http);
    this.agents = new AgentsResource(http);
    this.references = new ReferencesResource(http);
    this.verificationKeys = new VerificationKeysResource(http);
    this.auth = new AuthResource(http);
    this.discovery = new DiscoveryResource(http);
    this.audit = new AuditResource(http);
  }
}

/**
 * Create a lightweight federation client for gateways that only have a bearer token
 * (obtained from {@link FederationResource.register}).
 *
 * @example
 * ```ts
 * const fc = createFederationClient({ bearerToken: result.bearerToken });
 * await fc.federation.heartbeat({ gatewayId, agentCount: 0, recordCount: 0, timestamp: new Date().toISOString() });
 * ```
 */
export function createFederationClient(options: {
  bearerToken: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  fetch?: typeof globalThis.fetch;
}): { federation: FederationResource } {
  const http = new HttpClient({
    apiKey: options.bearerToken,
    baseUrl: options.baseUrl,
    timeout: options.timeout,
    maxRetries: options.maxRetries,
    fetch: options.fetch,
  });
  return { federation: new FederationResource(http) };
}
