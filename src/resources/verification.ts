import type { HttpClient } from '../http.js';
import type { VerificationResult, VerificationStatus, RequestOptions } from '../types.js';

export class VerificationResource {
  constructor(private readonly http: HttpClient) {}

  /** Trigger verification for a Record, optionally specifying receipt IDs. */
  verify(recordId: string, receiptIds?: string[], options?: RequestOptions): Promise<VerificationResult> {
    return this.http.post<VerificationResult>(
      `/v1/records/${recordId}/verify`,
      receiptIds?.length ? { receiptIds } : undefined,
      options,
    );
  }

  /** Get the current verification status for a Record. */
  getStatus(recordId: string, options?: RequestOptions): Promise<VerificationStatus> {
    return this.http.get<VerificationStatus>(`/v1/records/${recordId}/verification-status`, undefined, options);
  }
}
