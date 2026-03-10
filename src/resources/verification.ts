/**
 * AGLedger™ SDK — Verification Resource
 * Patent Pending. Copyright 2026 AGLedger LLC. All rights reserved.
 */

import type { HttpClient } from '../http.js';
import type { VerificationResult, VerificationStatus, RequestOptions } from '../types.js';

export class VerificationResource {
  constructor(private readonly http: HttpClient) {}

  async verify(mandateId: string, receiptIds?: string[], options?: RequestOptions): Promise<VerificationResult> {
    return this.http.post<VerificationResult>(
      `/v1/mandates/${mandateId}/verify`,
      receiptIds?.length ? { receiptIds } : undefined,
      options,
    );
  }

  async getStatus(mandateId: string, options?: RequestOptions): Promise<VerificationStatus> {
    return this.http.get<VerificationStatus>(`/v1/mandates/${mandateId}/verification-status`, undefined, options);
  }
}
