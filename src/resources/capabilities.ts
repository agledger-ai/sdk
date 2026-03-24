/**
 * AGLedger™ SDK — Capabilities Resource
 * Patent Pending. Copyright 2026 AGLedger LLC. All rights reserved.
 *
 * Manage agent contract type capabilities.
 */

import type { HttpClient } from '../http.js';
import type { ContractType, SetCapabilitiesParams, RequestOptions } from '../types.js';

export class CapabilitiesResource {
  constructor(private readonly http: HttpClient) {}

  /** Get an agent's registered contract type capabilities. */
  async get(agentId: string, options?: RequestOptions): Promise<{ agentId: string; capabilities: ContractType[] }> {
    return this.http.get(`/v1/agents/${agentId}/capabilities`, undefined, options);
  }

  /** Set the authenticated agent's own capabilities (replaces all). */
  async set(agentId: string, params: SetCapabilitiesParams, options?: RequestOptions): Promise<{ agentId: string; capabilities: ContractType[] }> {
    return this.http.put(`/v1/agents/${agentId}/capabilities`, params, options);
  }
}
