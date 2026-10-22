import type { HttpClient } from '../http.js';
import type { A2aCancelTaskParams, AgentCard, JsonRpcRequest, JsonRpcResponse, RequestOptions } from '../types.js';

export class A2aResource {
  constructor(private readonly http: HttpClient) {}

  /** Fetch the platform's AgentCard for A2A discovery. */
  getAgentCard(options?: RequestOptions): Promise<AgentCard> {
    return this.http.get<AgentCard>('/.well-known/agent-card.json', undefined, options);
  }

  /** Dispatch a JSON-RPC 2.0 request to the A2A endpoint. */
  dispatch(request: JsonRpcRequest, options?: RequestOptions): Promise<JsonRpcResponse> {
    return this.http.post<JsonRpcResponse>('/a2a', request, options);
  }

  /**
   * Convenience: call a named A2A method with params.
   * Auto-generates JSON-RPC envelope with id.
   *
   * A `SendMessage` action and its fields go in a data part of the message,
   * not on `params` itself; an `action` placed directly on `params` is refused
   * with `-32602`:
   *
   * ```ts
   * await client.a2a.call('SendMessage', {
   *   message: {
   *     role: 'user',
   *     messageId: crypto.randomUUID(),
   *     parts: [{ kind: 'data', data: { action: 'get_status', recordId } }],
   *   },
   * });
   * ```
   */
  call(method: string, params?: Record<string, unknown>, options?: RequestOptions): Promise<JsonRpcResponse> {
    return this.dispatch({
      jsonrpc: '2.0',
      method,
      params,
      id: crypto.randomUUID(),
    }, options);
  }

  /**
   * `CancelTask` with its one typed extension: the reason rides in
   * `metadata["agledger:reason"]`, held to the same cap as the `reason` on
   * `POST /v1/records/{id}/cancel`, and lands where that one does (the
   * record's `lastTransitionReason` and the signed state-change entry).
   * Name the task by `name` (`tasks/<uuid>`), `id` or `taskId`, one of them.
   *
   * ```ts
   * await client.a2a.cancelTask({ id: recordId, reason: 'superseded by a new brief' });
   * ```
   */
  cancelTask(params: A2aCancelTaskParams, options?: RequestOptions): Promise<JsonRpcResponse> {
    const { reason, ...rest } = params;
    const body: Record<string, unknown> = { ...rest };
    if (reason !== undefined) body.metadata = { 'agledger:reason': reason };
    return this.call('CancelTask', body, options);
  }
}
