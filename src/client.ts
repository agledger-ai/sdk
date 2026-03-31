/**
 * AGLedger™ SDK — Client
 * Patent Pending. Copyright 2026 AGLedger LLC. All rights reserved.
 */

import type { AgledgerClientOptions, RateLimitInfo } from './types.js';
import { HttpClient } from './http.js';
import { MandatesResource } from './resources/mandates.js';
import { ReceiptsResource } from './resources/receipts.js';
import { VerificationResource } from './resources/verification.js';
import { DisputesResource } from './resources/disputes.js';
import { WebhooksResource } from './resources/webhooks.js';
import { ReputationResource } from './resources/reputation.js';
import { EventsResource } from './resources/events.js';
import { SchemasResource } from './resources/schemas.js';
import { DashboardResource } from './resources/dashboard.js';
import { ComplianceResource } from './resources/compliance.js';
import { RegistrationResource } from './resources/registration.js';
import { HealthResource } from './resources/health.js';
import { ProxyResource } from './resources/proxy.js';
import { AdminResource } from './resources/admin.js';
import { A2aResource } from './resources/a2a.js';
import { CapabilitiesResource } from './resources/capabilities.js';
import { NotarizeResource } from './resources/notarize.js';
import { EnterprisesResource } from './resources/enterprises.js';
import { ProjectsResource } from './resources/projects.js';
import { FederationResource } from './resources/federation.js';
import { FederationAdminResource } from './resources/federation-admin.js';

export class AgledgerClient {
  private readonly http: HttpClient;

  readonly mandates: MandatesResource;
  readonly receipts: ReceiptsResource;
  readonly verification: VerificationResource;
  readonly disputes: DisputesResource;
  readonly webhooks: WebhooksResource;
  readonly reputation: ReputationResource;
  readonly events: EventsResource;
  readonly schemas: SchemasResource;
  readonly dashboard: DashboardResource;
  readonly compliance: ComplianceResource;
  readonly registration: RegistrationResource;
  readonly health: HealthResource;
  readonly proxy: ProxyResource;
  readonly admin: AdminResource;
  readonly a2a: A2aResource;
  readonly capabilities: CapabilitiesResource;
  readonly notarize: NotarizeResource;
  readonly enterprises: EnterprisesResource;
  readonly projects: ProjectsResource;
  readonly federation: FederationResource;
  readonly federationAdmin: FederationAdminResource;

  /** Rate limit info from the most recent API response. Null if headers not present. */
  get rateLimitInfo(): RateLimitInfo | null {
    return this.http.rateLimitInfo;
  }

  /**
   * Request ID from the most recent API response (`X-Request-Id` header).
   * Useful for debugging and correlating requests across mandate chains.
   * Null if the API did not return the header.
   */
  get lastRequestId(): string | null {
    return this.http.lastRequestId;
  }

  constructor(options: AgledgerClientOptions) {
    const http = new HttpClient(options);
    this.http = http;
    this.mandates = new MandatesResource(http);
    this.receipts = new ReceiptsResource(http);
    this.verification = new VerificationResource(http);
    this.disputes = new DisputesResource(http);
    this.webhooks = new WebhooksResource(http);
    this.reputation = new ReputationResource(http);
    this.events = new EventsResource(http);
    this.schemas = new SchemasResource(http);
    this.dashboard = new DashboardResource(http);
    this.compliance = new ComplianceResource(http);
    this.registration = new RegistrationResource(http);
    this.health = new HealthResource(http);
    this.proxy = new ProxyResource(http);
    this.admin = new AdminResource(http);
    this.a2a = new A2aResource(http);
    this.capabilities = new CapabilitiesResource(http);
    this.notarize = new NotarizeResource(http);
    this.enterprises = new EnterprisesResource(http);
    this.projects = new ProjectsResource(http);
    this.federation = new FederationResource(http);
    this.federationAdmin = new FederationAdminResource(http);
  }
}

/**
 * Create a lightweight federation client for gateways that only have a bearer token
 * (obtained from {@link FederationResource.register}).
 *
 * @example
 * ```ts
 * const fc = createFederationClient({ bearerToken: result.bearerToken });
 * await fc.federation.heartbeat({ gatewayId, agentCount: 0, mandateCount: 0, timestamp: new Date().toISOString() });
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
