import type { HttpClient } from '../http.js';
import type { AgentCapabilities, SetCapabilitiesParams, RequestOptions } from '../types.js';

export class CapabilitiesResource {
  constructor(private readonly http: HttpClient) {}

  /** Get an agent's declared contract-type capabilities. */
  get(agentId: string, options?: RequestOptions): Promise<AgentCapabilities> {
    return this.http.get<AgentCapabilities>(`/v1/agents/${agentId}/capabilities`, undefined, options);
  }

  /** Set the authenticated agent's own capabilities (replaces all). */
  set(agentId: string, params: SetCapabilitiesParams, options?: RequestOptions): Promise<AgentCapabilities> {
    return this.http.put<AgentCapabilities>(`/v1/agents/${agentId}/capabilities`, params, options);
  }
}
