import type { HttpClient } from '../http.js';
import type {
  Dispute,
  DisputeResponse,
  CreateDisputeParams,
  EvidenceType,
  RequestOptions,
  Page,
  ListDisputesParams,
} from '../types.js';

export class DisputesResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * List disputes across the tenant. Filter by status or recordId.
   * Backed by `GET /v1/disputes`.
   */
  list(params?: ListDisputesParams, options?: RequestOptions): Promise<Page<Dispute>> {
    return this.http.getPage<Dispute>('/v1/disputes', params as unknown as Record<string, unknown>, options);
  }

  /**
   * Initiate a dispute on a Record. Returns the dispute object (from the create envelope).
   *
   * @example
   * ```ts
   * const dispute = await client.disputes.create('rec-123', {
   *   grounds: 'pricing_dispute',
   *   context: 'Invoice amount exceeds agreed tolerance',
   * });
   * ```
   */
  async create(recordId: string, params: CreateDisputeParams, options?: RequestOptions): Promise<Dispute> {
    const response = await this.http.post<Record<string, unknown>>(`/v1/records/${recordId}/dispute`, params, options);
    // API may return { dispute, tier1Result } envelope on create
    return (response.dispute ?? response) as Dispute;
  }

  /**
   * Get the dispute for a Record, including submitted evidence.
   * Returns the full envelope: `{ dispute, evidence }`.
   */
  get(recordId: string, options?: RequestOptions): Promise<DisputeResponse> {
    return this.http.get<DisputeResponse>(`/v1/records/${recordId}/dispute`, undefined, options);
  }

  /** Escalate a dispute to the next review tier. */
  escalate(recordId: string, options?: RequestOptions): Promise<Dispute> {
    return this.http.post<Dispute>(`/v1/records/${recordId}/dispute/escalate`, undefined, options);
  }

  /**
   * Submit additional evidence for a dispute.
   *
   * @example
   * ```ts
   * await client.disputes.submitEvidence('rec-123', {
   *   evidenceType: 'document',
   *   payload: { url: 'https://...', description: 'Invoice copy' },
   * });
   * ```
   */
  submitEvidence(
    recordId: string,
    params: { evidenceType: EvidenceType; payload: Record<string, unknown> },
    options?: RequestOptions,
  ): Promise<Record<string, unknown>> {
    return this.http.post(`/v1/records/${recordId}/dispute/evidence`, params, options);
  }
}
