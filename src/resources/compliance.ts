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
  RequestOptions,
} from '../types.js';

export class ComplianceResource {
  constructor(private readonly http: HttpClient) {}

  // --- Compliance Export ---

  async export(params: ExportComplianceParams, options?: RequestOptions): Promise<ComplianceExport> {
    return this.http.post<ComplianceExport>('/v1/compliance/export', params, options);
  }

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

  // --- EU AI Act ---

  async createAssessment(mandateId: string, params: CreateAiImpactAssessmentParams, options?: RequestOptions): Promise<AiImpactAssessment> {
    return this.http.post<AiImpactAssessment>(`/v1/mandates/${mandateId}/ai-impact-assessment`, params, options);
  }

  async getAssessment(mandateId: string, options?: RequestOptions): Promise<AiImpactAssessment> {
    return this.http.get<AiImpactAssessment>(`/v1/mandates/${mandateId}/ai-impact-assessment`, undefined, options);
  }

  async getEuAiActReport(params?: { from?: string; to?: string }, options?: RequestOptions): Promise<EuAiActReport> {
    return this.http.get<EuAiActReport>('/v1/compliance/eu-ai-act/report', params as Record<string, unknown>, options);
  }

  // --- Audit Reports ---

  async getEnterpriseReport(params?: { from?: string; to?: string; format?: string }, options?: RequestOptions): Promise<Record<string, unknown>> {
    return this.http.get('/v1/audit/enterprise-report', params as Record<string, unknown>, options);
  }

  async analyzeAudit(mandateId: string, options?: RequestOptions): Promise<Record<string, unknown>> {
    return this.http.post('/v1/audit/enterprise-report/analyze', { mandateId }, options);
  }
}
