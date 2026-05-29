import type { HttpClient } from '../http.js';
import type { GateEvaluationResult, GateStatus, RequestOptions } from '../types.js';

export class GateResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Trigger an on-demand gate evaluation for a Record, optionally scoped to
   * specific completion IDs. In `principal` mode this produces an advisory
   * result the principal can review before submitting their verdict; in `auto`
   * mode the engine verdict is already final.
   */
  evaluate(recordId: string, completionIds?: string[], options?: RequestOptions): Promise<GateEvaluationResult> {
    return this.http.post<GateEvaluationResult>(
      `/v1/records/${recordId}/evaluate`,
      completionIds?.length ? { completionIds } : {},
      options,
    );
  }

  /** Get the current gate status (Phase 1 structural + Phase 2 evaluation) for a Record. */
  getStatus(recordId: string, options?: RequestOptions): Promise<GateStatus> {
    return this.http.get<GateStatus>(`/v1/records/${recordId}/gate-status`, undefined, options);
  }
}
