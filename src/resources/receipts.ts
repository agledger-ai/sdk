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
   * Submit a receipt. When the Record's Type is known, pass a generic to
   * get typed `evidence` fields.
   *
   * @example
   * client.receipts.submit<'ACH-DATA-v1'>(recordId, {
   *   agentId: 'agent-1',
   *   evidence: { deliverable: '/out.parquet', deliverable_type: 'file_ref', row_count: 50000 },
   * });
   */
  submit<T extends string>(recordId: string, params: TypedSubmitReceiptParams<T>, options?: RequestOptions): Promise<Receipt>;
  submit(recordId: string, params: SubmitReceiptParams, options?: RequestOptions): Promise<Receipt>;
  submit(recordId: string, params: SubmitReceiptParams, options?: RequestOptions): Promise<Receipt> {
    return this.http.post<Receipt>(`/v1/records/${recordId}/receipts`, params, options);
  }

  get(recordId: string, receiptId: string, options?: RequestOptions): Promise<Receipt> {
    return this.http.get<Receipt>(`/v1/records/${recordId}/receipts/${receiptId}`, undefined, options);
  }

  list(recordId: string, params?: ListParams, options?: RequestOptions): Promise<Page<Receipt>> {
    return this.http.getPage<Receipt>(`/v1/records/${recordId}/receipts`, params as Record<string, unknown>, options);
  }

  /** Auto-paginating iterator. Yields individual receipts. */
  listAll(recordId: string, params?: ListParams, options?: RequestOptions & AutoPaginateOptions): AsyncGenerator<Receipt> {
    return this.http.paginate<Receipt>(`/v1/records/${recordId}/receipts`, params as Record<string, unknown>, options);
  }
}
