import type { HttpClient } from '../http.js';
import type {
  ProxySession,
  CreateSessionParams,
  SyncSessionParams,
  SyncSessionResult,
  ToolCallBatchItem,
  SidecarMandateBatchItem,
  SidecarReceiptBatchItem,
  ToolCatalogBatchItem,
  ProxySidecarMandate,
  ProxySidecarReceipt,
  ProxyToolCall,
  ProxyToolCatalogEntry,
  UpdateSidecarMandateParams,
  SessionAnalytics,
  AnalyticsSummary,
  MandateSummary,
  AlignmentAnalysis,
  BatchResult,
  Page,
  ListParams,
  RequestOptions,
} from '../types.js';


export class ProxySessionsResource {
  constructor(private readonly http: HttpClient) {}

  /** Create a new proxy session. */
  create(params: CreateSessionParams, options?: RequestOptions): Promise<ProxySession> {
    return this.http.post<ProxySession>('/v1/proxy/sessions', params, options);
  }

  /** Get a proxy session by ID. */
  get(sessionId: string, options?: RequestOptions): Promise<ProxySession> {
    return this.http.get<ProxySession>(`/v1/proxy/sessions/${sessionId}`, undefined, options);
  }

  /** List proxy sessions. */
  list(params?: ListParams, options?: RequestOptions): Promise<Page<ProxySession>> {
    return this.http.getPage<ProxySession>('/v1/proxy/sessions', params as Record<string, unknown>, options);
  }

  /** Unified sync: session + tool calls + sidecar mandates + sidecar receipts + tool catalog in a single request. */
  sync(params: SyncSessionParams, options?: RequestOptions): Promise<SyncSessionResult> {
    return this.http.post<SyncSessionResult>(
      '/v1/proxy/sync',
      params,
      { ...options, timeout: options?.timeout ?? 60_000 },
    );
  }
}


export class ProxyToolCallsResource {
  constructor(private readonly http: HttpClient) {}

  /** Ingest a batch of tool calls for a session. */
  ingest(sessionId: string, items: ToolCallBatchItem[], options?: RequestOptions): Promise<BatchResult<ProxyToolCall>> {
    return this.http.post<BatchResult<ProxyToolCall>>(
      `/v1/proxy/sessions/${sessionId}/tool-calls`,
      { items },
      options,
    );
  }

  /** List tool calls for a session. */
  list(sessionId: string, params?: ListParams, options?: RequestOptions): Promise<Page<ProxyToolCall>> {
    return this.http.getPage<ProxyToolCall>(
      `/v1/proxy/sessions/${sessionId}/tool-calls`,
      params as Record<string, unknown>,
      options,
    );
  }
}


export class ProxySidecarMandatesResource {
  constructor(private readonly http: HttpClient) {}

  /** Ingest a batch of sidecar mandates for a session. */
  ingest(sessionId: string, items: SidecarMandateBatchItem[], options?: RequestOptions): Promise<BatchResult<ProxySidecarMandate>> {
    return this.http.post<BatchResult<ProxySidecarMandate>>(
      `/v1/proxy/sessions/${sessionId}/sidecar-mandates`,
      { items },
      options,
    );
  }

  /** List sidecar mandates across sessions, optionally filtered by sessionId. */
  list(params?: ListParams & { sessionId?: string }, options?: RequestOptions): Promise<Page<ProxySidecarMandate>> {
    return this.http.getPage<ProxySidecarMandate>(
      '/v1/proxy/sidecar-mandates',
      params as Record<string, unknown>,
      options,
    );
  }

  /** List sidecar mandates for a specific session. */
  listBySession(sessionId: string, params?: ListParams, options?: RequestOptions): Promise<Page<ProxySidecarMandate>> {
    return this.http.getPage<ProxySidecarMandate>(
      `/v1/proxy/sessions/${sessionId}/sidecar-mandates`,
      params as Record<string, unknown>,
      options,
    );
  }

  /** Update a sidecar mandate (e.g., formalize or dismiss). */
  update(id: string, params: UpdateSidecarMandateParams, options?: RequestOptions): Promise<ProxySidecarMandate> {
    return this.http.patch<ProxySidecarMandate>(`/v1/proxy/sidecar-mandates/${id}`, params, options);
  }

  /** Formalize a sidecar mandate by linking it to a backend mandate ID. */
  formalize(id: string, formalizedMandateId: string, options?: RequestOptions): Promise<ProxySidecarMandate> {
    return this.update(id, { status: 'FORMALIZED', formalizedMandateId }, options);
  }

  /** Dismiss a sidecar mandate (mark as not actionable). */
  dismiss(id: string, options?: RequestOptions): Promise<ProxySidecarMandate> {
    return this.update(id, { status: 'DISMISSED' }, options);
  }
}


export class ProxySidecarReceiptsResource {
  constructor(private readonly http: HttpClient) {}

  /** Ingest a batch of sidecar receipts for a session. */
  ingest(sessionId: string, items: SidecarReceiptBatchItem[], options?: RequestOptions): Promise<BatchResult<ProxySidecarReceipt>> {
    return this.http.post<BatchResult<ProxySidecarReceipt>>(
      `/v1/proxy/sessions/${sessionId}/sidecar-receipts`,
      { items },
      options,
    );
  }

  /** List sidecar receipts for a specific session. */
  listBySession(sessionId: string, params?: ListParams, options?: RequestOptions): Promise<Page<ProxySidecarReceipt>> {
    return this.http.getPage<ProxySidecarReceipt>(
      `/v1/proxy/sessions/${sessionId}/sidecar-receipts`,
      params as Record<string, unknown>,
      options,
    );
  }
}


export class ProxyToolCatalogResource {
  constructor(private readonly http: HttpClient) {}

  /** Ingest a batch of tool catalog entries for a session. */
  ingest(sessionId: string, items: ToolCatalogBatchItem[], options?: RequestOptions): Promise<BatchResult<ProxyToolCatalogEntry>> {
    return this.http.post<BatchResult<ProxyToolCatalogEntry>>(
      `/v1/proxy/sessions/${sessionId}/tool-catalog`,
      { items },
      options,
    );
  }

  /** List tool catalog entries for a session. */
  list(sessionId: string, options?: RequestOptions): Promise<Page<ProxyToolCatalogEntry>> {
    return this.http.getPage<ProxyToolCatalogEntry>(
      `/v1/proxy/sessions/${sessionId}/tool-catalog`,
      undefined,
      options,
    );
  }
}


export class ProxyAnalyticsResource {
  constructor(private readonly http: HttpClient) {}

  /** Get analytics for a specific session. */
  getSession(sessionId: string, options?: RequestOptions): Promise<SessionAnalytics> {
    return this.http.get<SessionAnalytics>(`/v1/proxy/sessions/${sessionId}/analytics`, undefined, options);
  }

  /** Get aggregated analytics summary across sessions. */
  getSummary(params?: { from?: string; to?: string }, options?: RequestOptions): Promise<AnalyticsSummary> {
    return this.http.get<AnalyticsSummary>('/v1/proxy/analytics', params as Record<string, unknown>, options);
  }

  /** Get mandate summary for a session (detected vs formalized counts). */
  getMandateSummary(sessionId: string, options?: RequestOptions): Promise<MandateSummary> {
    return this.http.get<MandateSummary>(`/v1/proxy/sessions/${sessionId}/mandate-summary`, undefined, options);
  }

  /** Get alignment analysis for a session (coverage gaps, missing categories). */
  getAlignment(sessionId: string, options?: RequestOptions): Promise<AlignmentAnalysis> {
    return this.http.get<AlignmentAnalysis>(`/v1/proxy/sessions/${sessionId}/alignment`, undefined, options);
  }
}


export class ProxyResource {
  readonly sessions: ProxySessionsResource;
  readonly toolCalls: ProxyToolCallsResource;
  readonly sidecarMandates: ProxySidecarMandatesResource;
  readonly sidecarReceipts: ProxySidecarReceiptsResource;
  readonly toolCatalog: ProxyToolCatalogResource;
  readonly analytics: ProxyAnalyticsResource;

  constructor(http: HttpClient) {
    this.sessions = new ProxySessionsResource(http);
    this.toolCalls = new ProxyToolCallsResource(http);
    this.sidecarMandates = new ProxySidecarMandatesResource(http);
    this.sidecarReceipts = new ProxySidecarReceiptsResource(http);
    this.toolCatalog = new ProxyToolCatalogResource(http);
    this.analytics = new ProxyAnalyticsResource(http);
  }

  /** Convenience: unified sync (delegates to sessions.sync). */
  syncSession(params: SyncSessionParams, options?: RequestOptions): Promise<SyncSessionResult> {
    return this.sessions.sync(params, options);
  }
}
