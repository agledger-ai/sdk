import type { HttpClient } from '../http.js';
import type { RecordType, SetCapabilitiesParams, RequestOptions } from '../types.js';

export class CapabilitiesResource {
  constructor(private readonly http: HttpClient) {}

  /** Get an agent's registered Type capabilities. */
  get(agentId: string, options?: RequestOptions): Promise<{ agentId: string; capabilities: RecordType[] }> {
    return this.http.get(`/v1/agents/${agentId}/capabilities`, undefined, options);
  }

  /** Set the authenticated agent's own capabilities (replaces all). */
  set(agentId: string, params: SetCapabilitiesParams, options?: RequestOptions): Promise<{ agentId: string; capabilities: RecordType[] }> {
    return this.http.put(`/v1/agents/${agentId}/capabilities`, params, options);
  }
}
