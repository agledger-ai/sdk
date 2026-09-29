import type { HttpClient } from '../http.js';
import type { AgentCard, JsonRpcRequest, JsonRpcResponse, RequestOptions } from '../types.js';

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
}
