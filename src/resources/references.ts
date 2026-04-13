import type { HttpClient } from '../http.js';
import type { ReferenceLookupResult, RequestOptions } from '../types.js';

export class ReferencesResource {
  constructor(private readonly http: HttpClient) {}

  /** Look up an entity by external reference. */
  lookup(params: { system: string; refType: string; refId: string }, options?: RequestOptions): Promise<ReferenceLookupResult> {
    return this.http.get<ReferenceLookupResult>('/v1/references', params as Record<string, string>, options);
  }

  /** Add external references to a mandate. */
  addMandateReferences(mandateId: string, references: Record<string, unknown>[], options?: RequestOptions): Promise<Record<string, unknown>> {
    return this.http.post(`/v1/mandates/${mandateId}/references`, { references }, options);
  }

  /** Get a mandate's external references. */
  getMandateReferences(mandateId: string, options?: RequestOptions): Promise<Record<string, unknown>> {
    return this.http.get(`/v1/mandates/${mandateId}/references`, undefined, options);
  }
}
