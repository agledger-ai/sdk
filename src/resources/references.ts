import type { HttpClient } from '../http.js';
import type { ReferenceLookupResult, RequestOptions } from '../types.js';

export class ReferencesResource {
  constructor(private readonly http: HttpClient) {}

  /** Look up an entity by external reference. */
  lookup(params: { system: string; refType: string; refId: string }, options?: RequestOptions): Promise<ReferenceLookupResult> {
    return this.http.get<ReferenceLookupResult>('/v1/references', params as Record<string, string>, options);
  }

  /** Add external references to a Record. */
  addRecordReferences(recordId: string, references: Record<string, unknown>[], options?: RequestOptions): Promise<Record<string, unknown>> {
    return this.http.post(`/v1/records/${recordId}/references`, { references }, options);
  }

  /** Get a Record's external references. */
  getRecordReferences(recordId: string, options?: RequestOptions): Promise<Record<string, unknown>> {
    return this.http.get(`/v1/records/${recordId}/references`, undefined, options);
  }

  /** Add external references to an agent. */
  addAgentReferences(agentId: string, references: Record<string, unknown>[], options?: RequestOptions): Promise<Record<string, unknown>> {
    return this.http.post(`/v1/agents/${agentId}/references`, { references }, options);
  }

  /** Get an agent's external references. */
  getAgentReferences(agentId: string, options?: RequestOptions): Promise<Record<string, unknown>> {
    return this.http.get(`/v1/agents/${agentId}/references`, undefined, options);
  }
}
