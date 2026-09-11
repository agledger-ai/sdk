import type { HttpClient } from '../http.js';
import type {
  Dispute,
  DisputeResponse,
  CreateDisputeParams,
  ResolveDisputeParams,
  EvidenceType,
  RequestOptions,
  Page,
  ListDisputesParams,
  WithdrawDisputeParams,
} from '../types.js';

export class DisputesResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * List disputes across the org. Filter by status or recordId.
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
    // The 201 is a { dispute, autoReadjudication, nextSteps } envelope. Read
    // the envelope with `client.request()` when the auto-readjudication result
    // matters: `autoResolved` says whether the engine's re-check already
    // resolved the dispute, and `reason` says why it did not.
    return (response.dispute ?? response) as Dispute;
  }

  /**
   * Get the dispute for a Record, including submitted evidence.
   * Returns the full envelope: `{ dispute, evidence }`.
   */
  get(recordId: string, options?: RequestOptions): Promise<DisputeResponse> {
    return this.http.get<DisputeResponse>(`/v1/records/${recordId}/dispute`, undefined, options);
  }

  /**
   * Render the outcome of a dispute. Takes the DISPUTE id, not the Record id:
   * read it from `disputes.list()` or from `RecordRow.disputeId`.
   *
   * The rendering is the caller's, not the engine's. `OVERTURNED` settles a
   * Record that had FAILED at FULFILLED with the verdict re-rendered as accept
   * (one already FULFILLED or REMEDIATED is restored to that terminal) and a
   * RELEASE Settlement Signal follows; `UPHELD` returns the Record to exactly
   * the status it held before the dispute and emits no signal.
   *
   * Accepted while the dispute is in `EVIDENCE_WINDOW` or `PENDING_RESOLUTION`.
   * One already `RESOLVED` or `WITHDRAWN` is refused with 422 carrying
   * `currentState` and `allowedActions`. Auth is the Record's principal or an
   * org-admin key.
   *
   * @example
   * ```ts
   * await client.disputes.resolve(dispute.id, {
   *   outcome: 'OVERTURNED',
   *   rationale: 'Delivery evidence matches the criteria within tolerance',
   * });
   * ```
   */
  resolve(
    disputeId: string,
    params: ResolveDisputeParams,
    options?: RequestOptions,
  ): Promise<Dispute> {
    return this.http.post<Dispute>(`/v1/disputes/${disputeId}/resolve`, params, options);
  }

  /** Withdraw an open dispute. Optional `reason` is recorded in the audit trail. */
  withdraw(
    recordId: string,
    params?: WithdrawDisputeParams,
    options?: RequestOptions,
  ): Promise<Dispute> {
    return this.http.post<Dispute>(
      `/v1/records/${recordId}/dispute/withdraw`,
      params ?? {},
      options,
    );
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
