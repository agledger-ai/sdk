import type { HttpClient } from '../http.js';
import type {
  Mandate,
  CreateMandateParams,
  UpdateMandateParams,
  ListMandatesParams,
  SearchMandatesParams,
  DelegateMandateParams,
  CreateAgentMandateParams,
  CounterProposeParams,
  BatchGetMandatesResult,
  Page,
  BulkCreateResult,
  MandateTransitionAction,
  RequestOptions,
  AutoPaginateOptions,
  TypedCreateMandateParams,
  ReportOutcomeParams,
  OutcomeResult,
  MandateStatusSummary,
  AuditChain,
} from '../types.js';
import { getValidTransitions as getTransitions } from '../mandate-lifecycle.js';

export class MandatesResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Create a mandate. When `contractType` is a known Agentic Contract
   * Specification type, `criteria` is typed to that contract's schema.
   */
  create<T extends string>(params: TypedCreateMandateParams<T>, options?: RequestOptions): Promise<Mandate>;
  create(params: CreateMandateParams, options?: RequestOptions): Promise<Mandate>;
  create(params: CreateMandateParams, options?: RequestOptions): Promise<Mandate> {
    return this.http.post<Mandate>('/v1/mandates', params, options);
  }

  /** Create a mandate via agent auth (POST /v1/mandates/agent). */
  createAgent(params: CreateAgentMandateParams, options?: RequestOptions): Promise<Mandate> {
    return this.http.post<Mandate>('/v1/mandates/agent', params, options);
  }

  /** Get a mandate by ID. */
  get(id: string, options?: RequestOptions): Promise<Mandate> {
    return this.http.get<Mandate>(`/v1/mandates/${id}`, undefined, options);
  }

  /** List mandates with optional filters. */
  list(params: ListMandatesParams, options?: RequestOptions): Promise<Page<Mandate>> {
    return this.http.getPage<Mandate>('/v1/mandates', params as unknown as Record<string, unknown>, options);
  }

  /** Auto-paginating iterator. Yields individual mandates across all pages. */
  listAll(params: ListMandatesParams, options?: RequestOptions & AutoPaginateOptions): AsyncGenerator<Mandate> {
    return this.http.paginate<Mandate>('/v1/mandates', params as unknown as Record<string, unknown>, options);
  }

  /** Search mandates with advanced filters (status, contract type, date range). */
  search(params: SearchMandatesParams, options?: RequestOptions): Promise<Page<Mandate>> {
    return this.http.getPage<Mandate>('/v1/mandates/search', params as unknown as Record<string, unknown>, options);
  }

  /** Update a mandate's mutable fields. */
  update(id: string, params: UpdateMandateParams, options?: RequestOptions): Promise<Mandate> {
    return this.http.patch<Mandate>(`/v1/mandates/${id}`, params, options);
  }

  /** Transition a mandate to a new state (register, activate, settle, cancel, refund). */
  transition(id: string, action: MandateTransitionAction, reason?: string, options?: RequestOptions): Promise<Mandate> {
    const body: Record<string, unknown> = { action };
    if (reason) body.reason = reason;
    return this.http.post<Mandate>(`/v1/mandates/${id}/transition`, body, options);
  }

  /** Cancel a mandate with an optional reason. */
  cancel(id: string, reason?: string, options?: RequestOptions): Promise<Mandate> {
    return this.transition(id, 'cancel', reason, options);
  }

  /** Accept a PROPOSED mandate (as performer). */
  accept(id: string, options?: RequestOptions): Promise<Mandate> {
    return this.http.post<Mandate>(`/v1/mandates/${id}/accept`, {}, options);
  }

  /** Reject a PROPOSED mandate (as performer). */
  reject(id: string, reason?: string, options?: RequestOptions): Promise<Mandate> {
    return this.http.post<Mandate>(`/v1/mandates/${id}/reject`, reason ? { reason } : {}, options);
  }

  /** Counter-propose modified terms on a PROPOSED mandate. Sets acceptanceStatus to COUNTER_PROPOSED. */
  counterPropose(id: string, params: CounterProposeParams, options?: RequestOptions): Promise<Mandate> {
    return this.http.post<Mandate>(`/v1/mandates/${id}/counter-propose`, params, options);
  }

  /** Accept a counter-proposal on a mandate. */
  acceptCounter(id: string, options?: RequestOptions): Promise<Mandate> {
    return this.http.post<Mandate>(`/v1/mandates/${id}/accept-counter`, {}, options);
  }

  /** Get the full delegation chain for a mandate. */
  getChain(id: string, options?: RequestOptions): Promise<Mandate[]> {
    return this.http.get<Mandate[]>(`/v1/mandates/${id}/chain`, undefined, options);
  }

  /** Get direct sub-mandates of a mandate. */
  getSubMandates(id: string, options?: RequestOptions): Promise<Page<Mandate>> {
    return this.http.getPage<Mandate>(`/v1/mandates/${id}/sub-mandates`, undefined, options);
  }

  /** Delegate a mandate by creating a child mandate via agent auth. */
  delegate(id: string, params: DelegateMandateParams, options?: RequestOptions): Promise<Mandate> {
    return this.createAgent({
      ...params,
      parentMandateId: id,
    } as CreateAgentMandateParams, options);
  }

  /** Create multiple mandates in a single request. */
  bulkCreate(mandates: CreateMandateParams[], options?: RequestOptions): Promise<BulkCreateResult> {
    return this.http.post<BulkCreateResult>('/v1/mandates/bulk', { mandates }, options);
  }

  /** Fetch multiple mandates by ID in a single request (max 100). Results returned in request order; missing/inaccessible IDs are omitted. */
  batchGet(ids: string[], options?: RequestOptions): Promise<BatchGetMandatesResult> {
    if (ids.length === 0 || ids.length > 100) {
      throw new RangeError(`batchGet requires 1–100 IDs, got ${ids.length}`);
    }
    return this.http.post<BatchGetMandatesResult>('/v1/mandates/batch', { ids }, options);
  }

  /** Get audit trail for a mandate. */
  getAudit(id: string, options?: RequestOptions): Promise<AuditChain> {
    return this.http.get<AuditChain>(`/v1/mandates/${id}/audit`, undefined, options);
  }

  /** List mandates where the authenticated agent is principal. */
  listAsPrincipal(options?: RequestOptions): Promise<Page<Mandate>> {
    return this.http.getPage<Mandate>('/v1/mandates/agent/principal', undefined, options);
  }

  /** List mandates proposed to the authenticated agent. */
  listProposals(options?: RequestOptions): Promise<Page<Mandate>> {
    return this.http.getPage<Mandate>('/v1/mandates/agent/proposals', undefined, options);
  }

  /** Request revision after principal rejection (rework loop). Principal only. */
  requestRevision(id: string, reason?: string, options?: RequestOptions): Promise<Mandate> {
    return this.http.post<Mandate>(`/v1/mandates/${id}/revision`, reason ? { reason } : {}, options);
  }

  /** Create a mandate and immediately activate it. Three API calls (create → register → activate) — if a step fails, the mandate ID is in the error. */
  async createAndActivate(params: CreateMandateParams, options?: RequestOptions): Promise<Mandate> {
    const mandate = await this.create(params, options);
    await this.transition(mandate.id, 'register', undefined, options);
    return this.transition(mandate.id, 'activate', undefined, options);
  }

  /** Report principal verdict (outcome) on a mandate receipt. */
  reportOutcome(id: string, params: ReportOutcomeParams, options?: RequestOptions): Promise<OutcomeResult> {
    return this.http.post<OutcomeResult>(`/v1/mandates/${id}/outcome`, params, options);
  }

  /** Get mandate counts grouped by status. */
  getSummary(params?: { enterpriseId?: string }, options?: RequestOptions): Promise<MandateStatusSummary> {
    return this.http.get<MandateStatusSummary>('/v1/mandates/summary', params as Record<string, unknown>, options);
  }

  /** Get the delegation graph for a mandate. */
  getGraph(id: string, options?: RequestOptions): Promise<Record<string, unknown>> {
    return this.http.get(`/v1/mandates/${id}/graph`, undefined, options);
  }

  /** Get valid transitions for a mandate's current status. Client-side lookup, no API call. */
  getValidTransitions(mandate: Mandate): readonly string[] {
    return getTransitions(mandate.status);
  }
}
