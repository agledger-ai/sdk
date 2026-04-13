import type { HttpClient } from '../http.js';
import type { VerificationResult, VerificationStatus, RequestOptions } from '../types.js';

export class VerificationResource {
  constructor(private readonly http: HttpClient) {}

  /** Trigger verification for a mandate, optionally specifying receipt IDs. */
  verify(mandateId: string, receiptIds?: string[], options?: RequestOptions): Promise<VerificationResult> {
    return this.http.post<VerificationResult>(
      `/v1/mandates/${mandateId}/verify`,
      receiptIds?.length ? { receiptIds } : undefined,
      options,
    );
  }

  /** Get the current verification status for a mandate. */
  getStatus(mandateId: string, options?: RequestOptions): Promise<VerificationStatus> {
    return this.http.get<VerificationStatus>(`/v1/mandates/${mandateId}/verification-status`, undefined, options);
  }
}
