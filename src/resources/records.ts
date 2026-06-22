import type { HttpClient } from '../http.js';
import type {
  RecordRow,
  CreateRecordParams,
  UpdateRecordParams,
  ListRecordsParams,
  GetRecordParams,
  SearchRecordsParams,
  DelegateRecordParams,
  CounterProposeParams,
  BatchGetRecordsResult,
  Page,
  BulkCreateResult,
  BulkCreateRecordItem,
  RecordTransitionAction,
  RequestOptions,
  AutoPaginateOptions,
  SubmitVerdictParams,
  VerdictResult,
  RecordAuditExport,
  VerdictStatistics,
} from '../types.js';
import { getValidTransitions as getTransitions } from '../record-lifecycle.js';

export class RecordsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Create a Record. `criteria` is validated server-side against the JSON
   * Schema you registered for `type` (`POST /v1/schemas`) — the SDK does not
   * impose a per-type criteria shape.
   *
   * Admin keys pass `principalAgentId`; agent keys default it to the
   * authenticated agent.
   */
  create(params: CreateRecordParams, options?: RequestOptions): Promise<RecordRow> {
    return this.http.post<RecordRow>('/v1/records', params, options);
  }

  /**
   * Get a Record by ID. Pass `{ integrity: true }` to re-verify the audit chain
   * and cross-check the served row against it (result on {@link RecordRow.integrity}).
   */
  get(id: string, params?: GetRecordParams, options?: RequestOptions): Promise<RecordRow> {
    return this.http.get<RecordRow>(
      `/v1/records/${id}`,
      params as unknown as Record<string, unknown>,
      options,
    );
  }

  /** List Records with optional filters. */
  list(params?: ListRecordsParams, options?: RequestOptions): Promise<Page<RecordRow>> {
    return this.http.getPage<RecordRow>('/v1/records', params as unknown as Record<string, unknown>, options);
  }

  /** Auto-paginating iterator. Yields individual Records across all pages. */
  listAll(params?: ListRecordsParams, options?: RequestOptions & AutoPaginateOptions): AsyncGenerator<RecordRow> {
    return this.http.paginate<RecordRow>('/v1/records', params as unknown as Record<string, unknown>, options);
  }

  /** Search Records with advanced filters (status, type, date range, correlationId). */
  search(params?: SearchRecordsParams, options?: RequestOptions): Promise<Page<RecordRow>> {
    return this.http.getPage<RecordRow>('/v1/records/search', params as unknown as Record<string, unknown>, options);
  }

  /** Update a Record's mutable fields. */
  update(id: string, params: UpdateRecordParams, options?: RequestOptions): Promise<RecordRow> {
    return this.http.patch<RecordRow>(`/v1/records/${id}`, params, options);
  }

  /**
   * Transition a Record to a new state. Read `nextActions` on the Record
   * response for the exact set valid right now (display state `CREATED` covers
   * two internal states which accept different actions).
   */
  transition(id: string, action: RecordTransitionAction, reason?: string, options?: RequestOptions): Promise<RecordRow> {
    const body: Record<string, unknown> = { action };
    if (reason) body.reason = reason;
    return this.http.post<RecordRow>(`/v1/records/${id}/transition`, body, options);
  }

  /** Cancel a Record with an optional reason. */
  cancel(id: string, reason?: string, options?: RequestOptions): Promise<RecordRow> {
    return this.http.post<RecordRow>(`/v1/records/${id}/cancel`, reason ? { reason } : {}, options);
  }

  /** Accept a PROPOSED Record (as performer). */
  accept(id: string, options?: RequestOptions): Promise<RecordRow> {
    return this.http.post<RecordRow>(`/v1/records/${id}/accept`, {}, options);
  }

  /** Reject a PROPOSED Record (as performer). The API accepts only `message` here. */
  reject(id: string, message?: string, options?: RequestOptions): Promise<RecordRow> {
    return this.http.post<RecordRow>(`/v1/records/${id}/reject`, message ? { message } : {}, options);
  }

  /** Counter-propose modified terms on a PROPOSED Record. Sets acceptanceStatus to COUNTER_PROPOSED. */
  counterPropose(id: string, params: CounterProposeParams, options?: RequestOptions): Promise<RecordRow> {
    return this.http.post<RecordRow>(`/v1/records/${id}/counter-propose`, params, options);
  }

  /** Accept a counter-proposal on a Record. */
  acceptCounter(id: string, options?: RequestOptions): Promise<RecordRow> {
    return this.http.post<RecordRow>(`/v1/records/${id}/accept-counter`, {}, options);
  }

  /** Get the full delegation chain for a Record. */
  async getChain(id: string, options?: RequestOptions): Promise<RecordRow[]> {
    // The endpoint returns a paginated envelope (`{ data, total, hasMore, ... }`).
    // Unwrap to the row array; normalizePage also tolerates a bare-array shape.
    const page = await this.http.getPage<RecordRow>(`/v1/records/${id}/chain`, undefined, options);
    return page.data;
  }

  /** Get direct sub-Records of a Record. */
  getSubRecords(id: string, options?: RequestOptions): Promise<Page<RecordRow>> {
    return this.http.getPage<RecordRow>(`/v1/records/${id}/sub-records`, undefined, options);
  }

  /**
   * Delegate a Record by creating a child Record. Uses the unified
   * `POST /v1/records` endpoint with `parentRecordId` set.
   */
  delegate(id: string, params: DelegateRecordParams, options?: RequestOptions): Promise<RecordRow> {
    return this.create({
      ...params,
      parentRecordId: id,
    } as CreateRecordParams, options);
  }

  /**
   * Create multiple Records in a single request. Each item may carry an
   * `idempotencyKey` for replay-safe high-volume ingest.
   */
  bulkCreate(records: BulkCreateRecordItem[], options?: RequestOptions): Promise<BulkCreateResult> {
    return this.http.post<BulkCreateResult>('/v1/records/bulk', { records }, options);
  }

  /** Fetch multiple Records by ID in a single request (max 100). Results returned in request order; missing/inaccessible IDs are omitted. */
  batchGet(ids: string[], options?: RequestOptions): Promise<BatchGetRecordsResult> {
    if (ids.length === 0 || ids.length > 100) {
      throw new RangeError(`batchGet requires 1–100 IDs, got ${ids.length}`);
    }
    return this.http.post<BatchGetRecordsResult>('/v1/records/batch', { ids }, options);
  }

  /**
   * Export the per-Record, hash-chained audit trail.
   *
   * Vault entries carry an `_actor` envelope (key id, role, owner id) folded
   * into the canonical payload; the hash chain covers it.
   */
  getAuditExport(
    recordId: string,
    params?: { format?: 'json' | 'csv' | 'ndjson'; receipts?: boolean },
    options?: RequestOptions,
  ): Promise<RecordAuditExport> {
    return this.http.get<RecordAuditExport>(`/v1/records/${recordId}/audit-export`, params as Record<string, unknown>, options);
  }

  /**
   * Fetch the canonical COSE_Sign1 envelope stream for a Record's chain.
   *
   * Returns the chain as `application/cose-sequence` — a concatenation of
   * tagged COSE_Sign1 messages (each begins with `0xd2 0x84 …`). Pair with
   * `@agledger/sdk/verify` for cryptographic verification.
   */
  getAttestation(recordId: string, options?: RequestOptions): Promise<Uint8Array> {
    return this.http.requestBinary('GET', `/v1/records/${recordId}/attestation`, {
      ...options,
      accept: 'application/cose-sequence',
    });
  }

  /**
   * Fetch the sigstore-bundle v0.3.2 projection of a Record's chain — one
   * bundle per chain entry. For Rekor / in-toto / sigstore-policy-controller
   * ingest. NOT cryptographically verifiable end-to-end (the inner DSSE
   * signature is byte-incompatible with the canonical COSE_Sign1 signature);
   * verify cryptographically via `getAttestation()` (COSE_Sign1) instead.
   */
  getAttestationBundle(
    recordId: string,
    options?: RequestOptions,
  ): Promise<{ data: Array<Record<string, unknown>> }> {
    return this.http.get<{ data: Array<Record<string, unknown>> }>(
      `/v1/records/${recordId}/attestation.bundle`,
      undefined,
      options,
    );
  }

  /** List Records proposed to the authenticated agent (pending acceptance). */
  listProposals(options?: RequestOptions): Promise<Page<RecordRow>> {
    return this.http.getPage<RecordRow>('/v1/records/agent/proposals', undefined, options);
  }

  /** Request revision after principal rejection (rework loop). Principal only. */
  requestRevision(id: string, reason?: string, options?: RequestOptions): Promise<RecordRow> {
    return this.http.post<RecordRow>(`/v1/records/${id}/revision`, reason ? { reason } : {}, options);
  }

  /** Create a Record and immediately activate it. Three API calls (create → register → activate) — if a step fails, the Record ID is in the error. */
  async createAndActivate(params: CreateRecordParams, options?: RequestOptions): Promise<RecordRow> {
    const record = await this.create(params, options);
    await this.transition(record.id, 'register', undefined, options);
    return this.transition(record.id, 'activate', undefined, options);
  }

  /** Submit the principal verdict (accept/reject) on a Record completion. */
  submitVerdict(id: string, params: SubmitVerdictParams, options?: RequestOptions): Promise<VerdictResult> {
    return this.http.post<VerdictResult>(`/v1/records/${id}/verdict`, params, options);
  }

  /** Get the delegation graph for a Record. */
  getGraph(id: string, options?: RequestOptions): Promise<Record<string, unknown>> {
    return this.http.get(`/v1/records/${id}/graph`, undefined, options);
  }

  /**
   * Verdict statistics for the authenticated agent — per (principal, performer)
   * pair counters of accept / reject / cancel-after-completion, decomposed into
   * `asPrincipal` and `asPerformer`. Agent role only; admin/platform get 403
   * with a hint.
   */
  myVerdictStatistics(options?: RequestOptions): Promise<VerdictStatistics> {
    return this.http.get<VerdictStatistics>('/v1/records/me/verdict-statistics', undefined, options);
  }

  /** Get valid transitions for a Record's current status. Client-side lookup, no API call. */
  getValidTransitions(record: RecordRow): readonly string[] {
    return getTransitions(record.status);
  }
}
