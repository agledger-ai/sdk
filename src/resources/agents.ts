import type { HttpClient } from '../http.js';
import type {
  AgentProfile,
  AgentDirectoryEntry,
  UpdateAgentParams,
  ListParams,
  Page,
  RequestOptions,
  AutoPaginateOptions,
} from '../types.js';

export class AgentsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * List agents in the caller's tenant (peer directory).
   * Returns the lightweight directory shape — for full agent identity use
   * {@link AgentsResource.get}.
   */
  list(params?: ListParams, options?: RequestOptions): Promise<Page<AgentDirectoryEntry>> {
    return this.http.getPage<AgentDirectoryEntry>('/v1/agents', params as Record<string, unknown>, options);
  }

  /** Auto-paginating iterator over the tenant agent directory. */
  listAll(
    params?: ListParams,
    options?: RequestOptions & AutoPaginateOptions,
  ): AsyncGenerator<AgentDirectoryEntry> {
    return this.http.paginate<AgentDirectoryEntry>('/v1/agents', params as Record<string, unknown>, options);
  }

  /** Get an agent by ID. */
  get(agentId: string, options?: RequestOptions): Promise<AgentProfile> {
    return this.http.get<AgentProfile>(`/v1/agents/${agentId}`, undefined, options);
  }

  /** Update an agent's identity fields. */
  update(agentId: string, params: UpdateAgentParams, options?: RequestOptions): Promise<AgentProfile> {
    return this.http.patch<AgentProfile>(`/v1/agents/${agentId}`, params, options);
  }

  /** Add external references to an agent. */
  addReferences(agentId: string, references: Record<string, unknown>[], options?: RequestOptions): Promise<Record<string, unknown>> {
    return this.http.post(`/v1/agents/${agentId}/references`, { references }, options);
  }

  /** Get an agent's external references. */
  getReferences(agentId: string, options?: RequestOptions): Promise<Record<string, unknown>> {
    return this.http.get(`/v1/agents/${agentId}/references`, undefined, options);
  }
}
