import type { HttpClient } from '../http.js';
import type {
  Dispute,
  DisputeResponse,
  CreateDisputeParams,
  EvidenceType,
  RequestOptions,
} from '../types.js';

export class DisputesResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Initiate a dispute on a mandate. Returns the dispute object (from the create envelope).
   *
   * @example
   * ```ts
   * const dispute = await client.disputes.create('mnd-123', {
   *   grounds: 'pricing_dispute',
   *   context: 'Invoice amount exceeds agreed tolerance',
   * });
   * ```
   */
  async create(mandateId: string, params: CreateDisputeParams, options?: RequestOptions): Promise<Dispute> {
    const response = await this.http.post<Record<string, unknown>>(`/v1/mandates/${mandateId}/dispute`, params, options);
    // API may return { dispute, tier1Result } envelope on create
    return (response.dispute ?? response) as Dispute;
  }

  /**
   * Get the dispute for a mandate, including submitted evidence.
   * Returns the full envelope: `{ dispute, evidence }`.
   */
  get(mandateId: string, options?: RequestOptions): Promise<DisputeResponse> {
    return this.http.get<DisputeResponse>(`/v1/mandates/${mandateId}/dispute`, undefined, options);
  }

  /** Escalate a dispute to the next review tier. */
  escalate(mandateId: string, options?: RequestOptions): Promise<Dispute> {
    return this.http.post<Dispute>(`/v1/mandates/${mandateId}/dispute/escalate`, undefined, options);
  }

  /**
   * Submit additional evidence for a dispute.
   *
   * @example
   * ```ts
   * await client.disputes.submitEvidence('mnd-123', {
   *   evidenceType: 'document',
   *   payload: { url: 'https://...', description: 'Invoice copy' },
   * });
   * ```
   */
  submitEvidence(
    mandateId: string,
    params: { evidenceType: EvidenceType; payload: Record<string, unknown> },
    options?: RequestOptions,
  ): Promise<Record<string, unknown>> {
    return this.http.post(`/v1/mandates/${mandateId}/dispute/evidence`, params, options);
  }
}
