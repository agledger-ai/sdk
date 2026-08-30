import type { HttpClient } from '../http.js';
import type {
  ComplianceExport,
  ExportComplianceParams,
  AiImpactAssessment,
  CreateAiImpactAssessmentParams,
  ComplianceRecord,
  CreateComplianceRecordParams,
  AuditStreamParams,
  AuditStreamResult,
  AuditVaultExportParams,
  VaultCheckpoint,
  ListVaultCheckpointsParams,
  Page,
  ListParams,
  RequestOptions,
} from '../types.js';
import { ConfigurationError, PaginationLimitError } from '../errors.js';

/**
 * Compliance, audit, and EU AI Act reporting surface. The `stream` method is
 * backed by the SIEM NDJSON endpoint at `/v1/siem/stream`.
 */
export class ComplianceResource {
  constructor(private readonly http: HttpClient) {}

  /** Start a compliance data export. */
  export(params: ExportComplianceParams, options?: RequestOptions): Promise<ComplianceExport> {
    return this.http.post<ComplianceExport>('/v1/compliance/export', params, options);
  }

  /** Check the status of a compliance export. */
  getExportStatus(exportId: string, options?: RequestOptions): Promise<ComplianceExport> {
    return this.http.get<ComplianceExport>(`/v1/compliance/export/${exportId}`, undefined, options);
  }

  /** Download a completed compliance export. */
  downloadExport(exportId: string, options?: RequestOptions): Promise<Record<string, unknown>> {
    return this.http.get(`/v1/compliance/export/${exportId}/download`, undefined, options);
  }

  /**
   * Poll until a compliance export is ready or timeout.
   * Returns the completed export, or throws if it times out.
   */
  async waitForExport(
    exportId: string,
    opts?: { pollIntervalMs?: number; timeoutMs?: number; signal?: AbortSignal },
  ): Promise<ComplianceExport> {
    const interval = opts?.pollIntervalMs ?? 2_000;
    const timeout = opts?.timeoutMs ?? 120_000;
    const deadline = Date.now() + timeout;

    while (Date.now() < deadline) {
      if (opts?.signal?.aborted) {
        throw new Error('Export wait cancelled');
      }
      const result = await this.getExportStatus(exportId);
      if (result.status === 'ready') return result;
      const { promise, resolve } = Promise.withResolvers<void>();
      setTimeout(resolve, interval);
      await promise;
    }
    throw new Error(`Export ${exportId} did not complete within ${timeout}ms`);
  }

  /** Create an AI impact assessment for a Record (EU AI Act). */
  createAssessment(recordId: string, params: CreateAiImpactAssessmentParams, options?: RequestOptions): Promise<AiImpactAssessment> {
    return this.http.post<AiImpactAssessment>(`/v1/records/${recordId}/ai-impact-assessment`, params, options);
  }

  /** Get the AI impact assessment for a Record. */
  getAssessment(recordId: string, options?: RequestOptions): Promise<AiImpactAssessment> {
    return this.http.get<AiImpactAssessment>(`/v1/records/${recordId}/ai-impact-assessment`, undefined, options);
  }

  /** Create a compliance record (attestation) for a Record. */
  createRecord(recordId: string, params: CreateComplianceRecordParams, options?: RequestOptions): Promise<ComplianceRecord> {
    return this.http.post<ComplianceRecord>(`/v1/records/${recordId}/compliance-records`, params, options);
  }

  /** List compliance records for a Record. */
  listRecords(recordId: string, params?: ListParams, options?: RequestOptions): Promise<Page<ComplianceRecord>> {
    return this.http.getPage<ComplianceRecord>(`/v1/records/${recordId}/compliance-records`, params as Record<string, unknown>, options);
  }

  /** Get a specific compliance record. */
  getRecord(recordId: string, complianceRecordId: string, options?: RequestOptions): Promise<ComplianceRecord> {
    return this.http.get<ComplianceRecord>(`/v1/records/${recordId}/compliance-records/${complianceRecordId}`, undefined, options);
  }

  /** Export the entire audit vault (platform-wide; admin-only). */
  exportAuditVault(params?: AuditVaultExportParams, options?: RequestOptions): Promise<Record<string, unknown>> {
    return this.http.get('/v1/audit-vault/export', params as Record<string, unknown>, options);
  }

  /**
   * List vault checkpoints for offline integrity verification. Filter by
   * `recordId` to scope to a single record, or omit to walk the global chain.
   */
  listVaultCheckpoints(
    params?: ListVaultCheckpointsParams,
    options?: RequestOptions,
  ): Promise<Page<VaultCheckpoint>> {
    return this.http.getPage<VaultCheckpoint>(
      '/v1/audit-vault/checkpoints',
      params as Record<string, unknown>,
      options,
    );
  }

  /**
   * Pull audit events as NDJSON for SIEM ingestion.
   * Requires `audit:read` scope. Route mounted at `/v1/siem/stream`.
   *
   * Open a walk with `since`; continue it by sending the previous result's
   * `cursor` back verbatim. Never rebuild `since` from a cursor: rows written
   * in one transaction share a `created_at`, so a time-only boundary skips
   * every row sharing the newest instant.
   *
   * @example
   * ```ts
   * let page = await client.compliance.stream({ since: '2026-01-01T00:00:00Z', limit: 500 });
   * while (page.hasMore && page.cursor) {
   *   for (const event of page.events) await sendToSiem(event);
   *   page = await client.compliance.stream({ cursor: page.cursor, limit: 500 });
   * }
   * ```
   */
  async stream(params: AuditStreamParams, options?: RequestOptions): Promise<AuditStreamResult> {
    assertStreamStart(params);
    const { data, cursor, holdbackSeconds } = await this.http.getNdjson(
      '/v1/siem/stream',
      params as unknown as Record<string, unknown>,
      options,
    );
    return {
      events: data,
      cursor,
      // Not `data.length >= limit`: the Server holds back rows whose
      // transaction is still open, so a short page is not the end of the
      // stream. Whether this poll produced rows is the only honest local signal.
      hasMore: data.length > 0,
      holdbackSeconds,
    };
  }

  /**
   * Auto-paginating async iterator for SIEM streaming. Follows the cursor
   * until the stream is exhausted.
   *
   * The first request uses whatever the caller passed, `since` or `cursor`;
   * every later one sends the previous page's cursor back verbatim. The cursor
   * is never taken apart, because the instant half of it does not address a
   * position inside a group of rows that share one `created_at`.
   *
   * Unbounded, it runs behind a 100-page runaway guard, and hitting that guard
   * throws {@link PaginationLimitError}: a SIEM feed that stops early and says
   * nothing reads as a quiet window with no events in it. Pass `maxPages` to
   * take a bounded slice on purpose.
   */
  async *streamAll(
    params: AuditStreamParams,
    options?: RequestOptions & { maxPages?: number },
  ): AsyncGenerator<Record<string, unknown>, void, undefined> {
    assertStreamStart(params);
    const ceilingIsDefault = options?.maxPages === undefined;
    const maxPages = options?.maxPages ?? 100;
    let next: AuditStreamParams = params;
    let yielded = 0;
    let page = 0;

    for (; page < maxPages; page++) {
      const result = await this.stream(next, options);
      for (const event of result.events) {
        yield event;
        yielded++;
      }
      if (result.events.length === 0) return;
      if (!result.cursor) {
        // Rows came back with no resume position, so the walk cannot advance
        // and the caller asked for no bound. Stopping here would hand back a
        // prefix of the stream that reads as all of it.
        throw new PaginationLimitError(
          '/v1/siem/stream',
          page + 1,
          yielded,
          maxPages,
          `SIEM stream returned ${result.events.length} event(s) with no ` +
            `X-AGLedger-Stream-Cursor after ${yielded} item(s), so the walk cannot resume ` +
            'past them. Retry from the last cursor you held; the rows yielded so far are a ' +
            'prefix of the stream, not all of it.',
        );
      }
      // Carry the page shape forward, drop the start position: `since` and
      // `cursor` are mutually exclusive and only the cursor advances.
      next = { cursor: result.cursor, limit: params.limit, format: params.format };
    }

    if (ceilingIsDefault) {
      throw new PaginationLimitError('/v1/siem/stream', page, yielded, maxPages);
    }
  }
}

/**
 * `since` opens a walk and `cursor` continues one; the endpoint takes one or
 * the other. Sending both is a 400, and dropping one silently here would pick
 * a start position the caller did not ask for.
 */
function assertStreamStart(params: AuditStreamParams): void {
  if (params.since !== undefined && params.cursor !== undefined) {
    throw new ConfigurationError(
      "SIEM stream takes 'since' or 'cursor', not both: 'since' opens a walk and 'cursor' " +
        'continues one. Pass the previous result\'s cursor verbatim to continue, and drop ' +
        "'since'.",
    );
  }
}
