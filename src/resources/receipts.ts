/**
 * AGLedger™ SDK — Receipts Resource
 * Patent Pending. Copyright 2026 AGLedger LLC. All rights reserved.
 */

import type { HttpClient } from '../http.js';
import type {
  Receipt,
  SubmitReceiptParams,
  Page,
  ListParams,
  RequestOptions,
  AutoPaginateOptions,
  TypedSubmitReceiptParams,
} from '../types.js';

export class ReceiptsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Submit a receipt. When the mandate's contract type is known,
   * pass a generic to get typed `evidence` fields.
   *
   * @example
   * client.receipts.submit<'ACH-DATA-v1'>(mandateId, {
   *   agentId: 'agent-1',
   *   evidence: { deliverable: '/out.parquet', deliverable_type: 'file_ref', row_count: 50000 },
   * });
   */
  async submit<T extends string>(mandateId: string, params: TypedSubmitReceiptParams<T>, options?: RequestOptions): Promise<Receipt>;
  async submit(mandateId: string, params: SubmitReceiptParams, options?: RequestOptions): Promise<Receipt>;
  async submit(mandateId: string, params: SubmitReceiptParams, options?: RequestOptions): Promise<Receipt> {
    return this.http.post<Receipt>(`/v1/mandates/${mandateId}/receipts`, params, options);
  }

  async get(mandateId: string, receiptId: string, options?: RequestOptions): Promise<Receipt> {
    return this.http.get<Receipt>(`/v1/mandates/${mandateId}/receipts/${receiptId}`, undefined, options);
  }

  async list(mandateId: string, params?: ListParams, options?: RequestOptions): Promise<Page<Receipt>> {
    return this.http.getPage<Receipt>(`/v1/mandates/${mandateId}/receipts`, params as Record<string, unknown>, options);
  }

  /** Auto-paginating iterator. Yields individual receipts. */
  listAll(mandateId: string, params?: ListParams, options?: RequestOptions & AutoPaginateOptions): AsyncGenerator<Receipt> {
    return this.http.paginate<Receipt>(`/v1/mandates/${mandateId}/receipts`, params as Record<string, unknown>, options);
  }
}
