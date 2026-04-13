import type { HttpClient } from '../http.js';
import type {
  DashboardSummary,
  DashboardMetrics,
  DashboardMetricsParams,
  DashboardAgent,
  DashboardAgentParams,
  DashboardAlert,
  ListParams,
  Page,
  RequestOptions,
} from '../types.js';

export class DashboardResource {
  constructor(private readonly http: HttpClient) {}

  /** Get a high-level dashboard summary (mandate counts, active agents, etc.). */
  getSummary(options?: RequestOptions): Promise<DashboardSummary> {
    return this.http.get<DashboardSummary>('/v1/dashboard/summary', undefined, options);
  }

  /** Get dashboard metrics over a time range. */
  getMetrics(params?: DashboardMetricsParams, options?: RequestOptions): Promise<DashboardMetrics> {
    return this.http.get<DashboardMetrics>('/v1/dashboard/metrics', params as Record<string, unknown>, options);
  }

  /** List agents with dashboard-level activity stats. */
  listAgents(params?: DashboardAgentParams, options?: RequestOptions): Promise<Page<DashboardAgent>> {
    return this.http.getPage<DashboardAgent>(
      '/v1/dashboard/agents',
      params as unknown as Record<string, unknown>,
      options,
    );
  }

  /** Get dashboard alerts. */
  getAlerts(params?: ListParams, options?: RequestOptions): Promise<Page<DashboardAlert>> {
    return this.http.getPage<DashboardAlert>('/v1/dashboard/alerts', params as Record<string, unknown>, options);
  }

  /** Get dashboard disputes. */
  getDisputes(params?: ListParams, options?: RequestOptions): Promise<Page<Record<string, unknown>>> {
    return this.http.getPage<Record<string, unknown>>('/v1/dashboard/disputes', params as Record<string, unknown>, options);
  }

  /** Get dashboard audit trail. */
  getAuditTrail(params?: ListParams, options?: RequestOptions): Promise<Page<Record<string, unknown>>> {
    return this.http.getPage<Record<string, unknown>>('/v1/dashboard/audit-trail', params as Record<string, unknown>, options);
  }
}
