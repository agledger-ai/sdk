import type { HttpClient } from '../http.js';
import type {
  Completion,
  SubmitCompletionParams,
  Page,
  ListParams,
  RequestOptions,
  AutoPaginateOptions,
  TypedSubmitCompletionParams,
} from '../types.js';

export class CompletionsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Submit a completion. When the Record's Type is known, pass a generic to
   * get typed `evidence` fields.
   *
   * @example
   * client.completions.submit<'ACH-DATA-v1'>(recordId, {
   *   agentId: 'agent-1',
   *   evidence: { deliverable: '/out.parquet', deliverable_type: 'file_ref', row_count: 50000 },
   * });
   */
  submit<T extends string>(recordId: string, params: TypedSubmitCompletionParams<T>, options?: RequestOptions): Promise<Completion>;
  submit(recordId: string, params: SubmitCompletionParams, options?: RequestOptions): Promise<Completion>;
  submit(recordId: string, params: SubmitCompletionParams, options?: RequestOptions): Promise<Completion> {
    return this.http.post<Completion>(`/v1/records/${recordId}/completions`, params, options);
  }

  get(recordId: string, completionId: string, options?: RequestOptions): Promise<Completion> {
    return this.http.get<Completion>(`/v1/records/${recordId}/completions/${completionId}`, undefined, options);
  }

  list(recordId: string, params?: ListParams, options?: RequestOptions): Promise<Page<Completion>> {
    return this.http.getPage<Completion>(`/v1/records/${recordId}/completions`, params as Record<string, unknown>, options);
  }

  /** Auto-paginating iterator. Yields individual completions. */
  listAll(recordId: string, params?: ListParams, options?: RequestOptions & AutoPaginateOptions): AsyncGenerator<Completion> {
    return this.http.paginate<Completion>(`/v1/records/${recordId}/completions`, params as Record<string, unknown>, options);
  }
}
