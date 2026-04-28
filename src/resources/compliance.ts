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
  Page,
  ListParams,
  RequestOptions,
} from '../types.js';

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
   * Pull audit events as NDJSON for SIEM ingestion.
   * Returns parsed events and an opaque cursor for the next poll.
   * Requires `audit:read` scope. Route mounted at `/v1/siem/stream`.
   *
   * @example
   * ```ts
   * const page = await client.compliance.stream({ since: '2026-01-01T00:00:00Z', limit: 500 });
   * for (const event of page.events) {
   *   await sendToSiem(event);
   * }
   * ```
   */
  async stream(params: AuditStreamParams, options?: RequestOptions): Promise<AuditStreamResult> {
    const { data, cursor } = await this.http.getNdjson(
      '/v1/siem/stream',
      params as unknown as Record<string, unknown>,
      options,
    );
    return {
      events: data,
      cursor,
      hasMore: data.length >= (params.limit ?? 100),
    };
  }

  /**
   * Auto-paginating async iterator for SIEM streaming.
   * Follows the cursor automatically until no more events are available.
   */
  async *streamAll(
    params: AuditStreamParams,
    options?: RequestOptions & { maxPages?: number },
  ): AsyncGenerator<Record<string, unknown>, void, undefined> {
    const maxPages = options?.maxPages ?? 100;
    let since = params.since;

    for (let page = 0; page < maxPages; page++) {
      const result = await this.stream({ ...params, since }, options);
      for (const event of result.events) {
        yield event;
      }
      if (!result.hasMore || !result.cursor) return;
      // Extract timestamp from composite cursor (timestamp_id format)
      const underscoreIdx = result.cursor.lastIndexOf('_');
      since = underscoreIdx > 0 ? result.cursor.substring(0, underscoreIdx) : result.cursor;
    }
  }
}
