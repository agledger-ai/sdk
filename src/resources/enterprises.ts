/**
 * AGLedger™ SDK — Enterprises Resource (Agent Approval Registry)
 * Patent Pending. Copyright 2026 AGLedger LLC. All rights reserved.
 */

import type { HttpClient } from '../http.js';
import type {
  EnterpriseAgentRecord,
  ApprovalConfig,
  ApproveAgentParams,
  RevokeAgentParams,
  UpdateAgentStatusParams,
  BulkApproveAgentParams,
  BulkApproveResult,
  ListEnterpriseAgentsParams,
  Page,
  RequestOptions,
} from '../types.js';

export class EnterprisesResource {
  constructor(private readonly http: HttpClient) {}

  async approveAgent(
    enterpriseId: string,
    agentId: string,
    params?: ApproveAgentParams,
    options?: RequestOptions,
  ): Promise<EnterpriseAgentRecord> {
    return this.http.put<EnterpriseAgentRecord>(
      `/v1/enterprises/${enterpriseId}/agents/${agentId}`,
      params,
      options,
    );
  }

  async revokeAgent(
    enterpriseId: string,
    agentId: string,
    params?: RevokeAgentParams,
    options?: RequestOptions,
  ): Promise<void> {
    return this.http.delete<void>(
      `/v1/enterprises/${enterpriseId}/agents/${agentId}`,
      params,
      options,
    );
  }

  async updateAgentStatus(
    enterpriseId: string,
    agentId: string,
    params: UpdateAgentStatusParams,
    options?: RequestOptions,
  ): Promise<EnterpriseAgentRecord> {
    return this.http.patch<EnterpriseAgentRecord>(
      `/v1/enterprises/${enterpriseId}/agents/${agentId}`,
      params,
      options,
    );
  }

  async bulkApprove(
    enterpriseId: string,
    params: BulkApproveAgentParams,
    options?: RequestOptions,
  ): Promise<BulkApproveResult> {
    return this.http.post<BulkApproveResult>(
      `/v1/enterprises/${enterpriseId}/agents/bulk`,
      params,
      options,
    );
  }

  async listAgents(
    enterpriseId: string,
    params?: ListEnterpriseAgentsParams,
    options?: RequestOptions,
  ): Promise<Page<EnterpriseAgentRecord>> {
    return this.http.getPage<EnterpriseAgentRecord>(
      `/v1/enterprises/${enterpriseId}/agents`,
      params as Record<string, unknown>,
      options,
    );
  }

  async getAgent(
    enterpriseId: string,
    agentId: string,
    options?: RequestOptions,
  ): Promise<EnterpriseAgentRecord> {
    return this.http.get<EnterpriseAgentRecord>(
      `/v1/enterprises/${enterpriseId}/agents/${agentId}`,
      undefined,
      options,
    );
  }

  async getApprovalConfig(
    enterpriseId: string,
    options?: RequestOptions,
  ): Promise<ApprovalConfig> {
    return this.http.get<ApprovalConfig>(
      `/v1/enterprises/${enterpriseId}/approval-config`,
      undefined,
      options,
    );
  }

  async setApprovalConfig(
    enterpriseId: string,
    params: ApprovalConfig,
    options?: RequestOptions,
  ): Promise<ApprovalConfig> {
    return this.http.put<ApprovalConfig>(
      `/v1/enterprises/${enterpriseId}/approval-config`,
      params,
      options,
    );
  }
}
