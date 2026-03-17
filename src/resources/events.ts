/**
 * AGLedger™ SDK — Events & Audit Resource
 * Patent Pending. Copyright 2026 AGLedger LLC. All rights reserved.
 */

import type { HttpClient } from '../http.js';
import type { AgledgerEvent, AuditChain, Page, ListParams, RequestOptions, AutoPaginateOptions } from '../types.js';

export class EventsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * List events globally. Requires `since` parameter (ISO timestamp).
   * GET /v1/events?since=...&order=asc|desc
   */
  async list(
    params: { since: string; order?: 'asc' | 'desc' } & ListParams,
    options?: RequestOptions,
  ): Promise<Page<AgledgerEvent>> {
    return this.http.getPage<AgledgerEvent>(
      '/v1/events',
      params as unknown as Record<string, unknown>,
      options,
    );
  }

  /** Auto-paginating iterator. Yields individual events across all pages. */
  listAll(
    params: { since: string; order?: 'asc' | 'desc' } & ListParams,
    options?: RequestOptions & AutoPaginateOptions,
  ): AsyncGenerator<AgledgerEvent> {
    return this.http.paginate<AgledgerEvent>(
      '/v1/events',
      params as unknown as Record<string, unknown>,
      options,
    );
  }

  /** Get the hash-chained audit trail for a mandate. */
  async getAuditChain(mandateId: string, options?: RequestOptions): Promise<AuditChain> {
    return this.http.get<AuditChain>(`/v1/mandates/${mandateId}/audit`, undefined, options);
  }
}
