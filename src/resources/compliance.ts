/**
 * AGLedger™ SDK — Compliance & EU AI Act Resource
 * Patent Pending. Copyright 2026 AGLedger LLC. All rights reserved.
 */

import type { HttpClient } from '../http.js';
import type {
  ComplianceExport,
  ExportComplianceParams,
  AiImpactAssessment,
  CreateAiImpactAssessmentParams,
  EuAiActReport,
  ComplianceRecord,
  CreateComplianceRecordParams,
  MandateAuditExport,
  Page,
  ListParams,
  RequestOptions,
} from '../types.js';

export class ComplianceResource {
  constructor(private readonly http: HttpClient) {}

  /** Start a compliance data export. */
  async export(params: ExportComplianceParams, options?: RequestOptions): Promise<ComplianceExport> {
    return this.http.post<ComplianceExport>('/v1/compliance/export', params, options);
  }

  /** Check the status of a compliance export. */
  async getExportStatus(exportId: string, options?: RequestOptions): Promise<ComplianceExport> {
    return this.http.get<ComplianceExport>(`/v1/compliance/export/${exportId}`, undefined, options);
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
      await new Promise((r) => setTimeout(r, interval));
    }
    throw new Error(`Export ${exportId} did not complete within ${timeout}ms`);
  }

  /** Create an AI impact assessment for a mandate (EU AI Act). */
  async createAssessment(mandateId: string, params: CreateAiImpactAssessmentParams, options?: RequestOptions): Promise<AiImpactAssessment> {
    return this.http.post<AiImpactAssessment>(`/v1/mandates/${mandateId}/ai-impact-assessment`, params, options);
  }

  /** Get the AI impact assessment for a mandate. */
  async getAssessment(mandateId: string, options?: RequestOptions): Promise<AiImpactAssessment> {
    return this.http.get<AiImpactAssessment>(`/v1/mandates/${mandateId}/ai-impact-assessment`, undefined, options);
  }

  /** Get the EU AI Act compliance report for the enterprise. */
  async getEuAiActReport(params?: { from?: string; to?: string }, options?: RequestOptions): Promise<EuAiActReport> {
    return this.http.get<EuAiActReport>('/v1/compliance/eu-ai-act/report', params as Record<string, unknown>, options);
  }

  /** Get the enterprise audit report. */
  async getEnterpriseReport(params?: { from?: string; to?: string; format?: string }, options?: RequestOptions): Promise<Record<string, unknown>> {
    return this.http.get('/v1/audit/enterprise-report', params as Record<string, unknown>, options);
  }

  /** Trigger LLM-powered audit analysis for a mandate. */
  async analyzeAudit(mandateId: string, options?: RequestOptions): Promise<Record<string, unknown>> {
    return this.http.post('/v1/audit/enterprise-report/analyze', { mandateId }, options);
  }

  /** Create a compliance record (attestation) for a mandate. */
  async createRecord(mandateId: string, params: CreateComplianceRecordParams, options?: RequestOptions): Promise<ComplianceRecord> {
    return this.http.post<ComplianceRecord>(`/v1/mandates/${mandateId}/compliance-records`, params, options);
  }

  /** List compliance records for a mandate. */
  async listRecords(mandateId: string, params?: ListParams, options?: RequestOptions): Promise<Page<ComplianceRecord>> {
    return this.http.getPage<ComplianceRecord>(`/v1/mandates/${mandateId}/compliance-records`, params as Record<string, unknown>, options);
  }

  /** Get a specific compliance record. */
  async getRecord(mandateId: string, recordId: string, options?: RequestOptions): Promise<ComplianceRecord> {
    return this.http.get<ComplianceRecord>(`/v1/mandates/${mandateId}/compliance-records/${recordId}`, undefined, options);
  }

  /** Export the per-mandate audit trail (hash-chained, signed entries). */
  async exportMandate(mandateId: string, params?: { format?: 'json' | 'csv' | 'ndjson' }, options?: RequestOptions): Promise<MandateAuditExport> {
    return this.http.get<MandateAuditExport>(`/v1/mandates/${mandateId}/audit-export`, params as Record<string, unknown>, options);
  }
}
