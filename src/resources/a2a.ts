/**
 * AGLedger™ SDK — A2A Protocol Resource
 * Patent Pending. Copyright 2026 AGLedger LLC. All rights reserved.
 *
 * Agent-to-Agent protocol support (agent discovery + JSON-RPC 2.0).
 */

import type { HttpClient } from '../http.js';
import type { AgentCard, JsonRpcRequest, JsonRpcResponse, RequestOptions } from '../types.js';

export class A2aResource {
  constructor(private readonly http: HttpClient) {}

  /** Fetch the platform's AgentCard for A2A discovery. */
  async getAgentCard(options?: RequestOptions): Promise<AgentCard> {
    return this.http.get<AgentCard>('/.well-known/agent-card.json', undefined, options);
  }

  /** Dispatch a JSON-RPC 2.0 request to the A2A endpoint. */
  async dispatch(request: JsonRpcRequest, options?: RequestOptions): Promise<JsonRpcResponse> {
    return this.http.post<JsonRpcResponse>('/a2a', request, options);
  }

  /**
   * Convenience: call a named A2A method with params.
   * Auto-generates JSON-RPC envelope with id.
   */
  async call(method: string, params?: Record<string, unknown>, options?: RequestOptions): Promise<JsonRpcResponse> {
    return this.dispatch({
      jsonrpc: '2.0',
      method,
      params,
      id: crypto.randomUUID(),
    }, options);
  }
}
