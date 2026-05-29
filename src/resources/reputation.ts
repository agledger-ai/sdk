import type { HttpClient } from '../http.js';
import type {
  ReputationScore,
  ReputationHistoryEntry,
  Page,
  ListParams,
  RequestOptions,
} from '../types.js';

export class ReputationResource {
  constructor(private readonly http: HttpClient) {}

  /** Get all per-Type reputation scores for an agent. */
  getAgent(agentId: string, options?: RequestOptions): Promise<Page<ReputationScore>> {
    return this.http.getPage<ReputationScore>(`/v1/agents/${agentId}/reputation`, undefined, options);
  }

  /** Get the reputation score for an agent for a specific Type. */
  getByType(agentId: string, type: string, options?: RequestOptions): Promise<ReputationScore> {
    return this.http.get<ReputationScore>(`/v1/agents/${agentId}/reputation/${type}`, undefined, options);
  }

  /** Get transaction history for an agent over a time range. */
  getHistory(
    agentId: string,
    params?: ListParams & { from?: string; to?: string; type?: string; outcome?: 'PASS' | 'FAIL' },
    options?: RequestOptions,
  ): Promise<Page<ReputationHistoryEntry>> {
    return this.http.getPage<ReputationHistoryEntry>(
      `/v1/agents/${agentId}/history`,
      params as Record<string, unknown>,
      options,
    );
  }
}
