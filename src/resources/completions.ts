import type { HttpClient } from '../http.js';
import type {
  Completion,
  SubmitCompletionParams,
  Page,
  ListParams,
  RequestOptions,
  AutoPaginateOptions,
} from '../types.js';

export class CompletionsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Submit a completion. `evidence` is validated server-side against the
   * completion JSON Schema you registered for the Record's Type — the SDK does
   * not impose a per-type evidence shape.
   *
   * @example
   * client.completions.submit(recordId, {
   *   agentId: 'agent-1',
   *   evidence: { deliverable: '/out.parquet', deliverable_type: 'file_ref', row_count: 50000 },
   * });
   */
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
