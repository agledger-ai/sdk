/**
 * AGLedger™ SDK — References Resource
 * Patent Pending. Copyright 2026 AGLedger LLC. All rights reserved.
 *
 * Reverse lookup for external references.
 */

import type { HttpClient } from '../http.js';
import type { ReferenceLookupResult, RequestOptions } from '../types.js';

export class ReferencesResource {
  constructor(private readonly http: HttpClient) {}

  /** Look up an entity by external reference. */
  async lookup(params: { system: string; refType: string; refId: string }, options?: RequestOptions): Promise<ReferenceLookupResult> {
    return this.http.get<ReferenceLookupResult>('/v1/references', params as Record<string, string>, options);
  }

  /** Add external references to a mandate. */
  async addMandateReferences(mandateId: string, references: Record<string, unknown>[], options?: RequestOptions): Promise<Record<string, unknown>> {
    return this.http.post(`/v1/mandates/${mandateId}/references`, { references }, options);
  }

  /** Get a mandate's external references. */
  async getMandateReferences(mandateId: string, options?: RequestOptions): Promise<Record<string, unknown>> {
    return this.http.get(`/v1/mandates/${mandateId}/references`, undefined, options);
  }
}
