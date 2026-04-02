/**
 * AGLedger™ SDK — Agents Resource
 * Patent Pending. Copyright 2026 AGLedger LLC. All rights reserved.
 *
 * Manage agent identity and references.
 */

import type { HttpClient } from '../http.js';
import type { AgentProfile, UpdateAgentParams, RequestOptions } from '../types.js';

export class AgentsResource {
  constructor(private readonly http: HttpClient) {}

  /** Get an agent by ID. */
  async get(agentId: string, options?: RequestOptions): Promise<AgentProfile> {
    return this.http.get<AgentProfile>(`/v1/agents/${agentId}`, undefined, options);
  }

  /** Update an agent's identity fields. */
  async update(agentId: string, params: UpdateAgentParams, options?: RequestOptions): Promise<AgentProfile> {
    return this.http.patch<AgentProfile>(`/v1/agents/${agentId}`, params, options);
  }

  /** Add external references to an agent. */
  async addReferences(agentId: string, references: Record<string, unknown>[], options?: RequestOptions): Promise<Record<string, unknown>> {
    return this.http.post(`/v1/agents/${agentId}/references`, { references }, options);
  }

  /** Get an agent's external references. */
  async getReferences(agentId: string, options?: RequestOptions): Promise<Record<string, unknown>> {
    return this.http.get(`/v1/agents/${agentId}/references`, undefined, options);
  }
}
