import type { HttpClient } from '../http.js';
import type {
  AgentDrift,
  AgentHistoryEntry,
  AgentHistoryParams,
  AutoPaginateOptions,
  FleetDriftPage,
  FleetDriftRow,
  GetAgentDriftParams,
  ListFleetDriftParams,
  Page,
  RequestOptions,
} from '../types.js';

/**
 * Agent drift: what an agent did in the current window, the same counts for
 * the window before it, and the difference. The difference is the signal.
 * There is no score, no weighting and no threshold; an acceptance rate that
 * moves from 0.8 to 1.0 is as much of a change as one that moves to 0.6, and
 * both are for whoever watches the agent to look into. Everything is computed
 * on read from records, completions, verdicts and disputes.
 */
export class DriftResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Drift for one agent, overall and per type. Admin keys read any agent in
   * their org; an agent key reads itself. A notarize-only agent shows records
   * and nothing else, since its records carry no completion and no verdict.
   */
  getAgent(agentId: string, params?: GetAgentDriftParams, options?: RequestOptions): Promise<AgentDrift> {
    return this.http.get<AgentDrift>(`/v1/agents/${agentId}/drift`, params as Record<string, unknown>, options);
  }

  /**
   * One roll-up row per agent in the caller's org. Takes an org-bound admin
   * key: a platform key carries no org, so there is no fleet to list. Pages
   * by cursor; the `window` the page was computed over rides alongside `data`.
   */
  async listFleet(params?: ListFleetDriftParams, options?: RequestOptions): Promise<FleetDriftPage> {
    const { page, envelope } = await this.http.getPageWithEnvelope<FleetDriftRow>(
      '/v1/agents/drift',
      params as Record<string, unknown>,
      options,
    );
    return { ...page, window: envelope['window'] as FleetDriftPage['window'] };
  }

  /**
   * Auto-paginating iterator over every agent's drift row in the org. Each
   * page is computed against the same `window` parameter, so the rows are
   * comparable across the walk.
   */
  listAllFleet(
    params?: ListFleetDriftParams,
    options?: RequestOptions & AutoPaginateOptions,
  ): AsyncGenerator<FleetDriftRow> {
    return this.http.paginate<FleetDriftRow>('/v1/agents/drift', params as Record<string, unknown>, options);
  }

  /**
   * Per-record history for an agent: one row per record with its status and
   * gate outcome. Cursor-paged; filters are bound into the cursor, so replay
   * it with the same params that produced it.
   */
  getAgentHistory(
    agentId: string,
    params?: AgentHistoryParams,
    options?: RequestOptions,
  ): Promise<Page<AgentHistoryEntry>> {
    return this.http.getPage<AgentHistoryEntry>(
      `/v1/agents/${agentId}/history`,
      params as Record<string, unknown>,
      options,
    );
  }
}
