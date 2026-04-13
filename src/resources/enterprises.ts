import type { HttpClient } from '../http.js';
import type {
  EnterpriseAgentRecord,
  ApproveAgentParams,
  RevokeAgentParams,
  UpdateAgentStatusParams,
  BulkApproveAgentParams,
  BulkApproveResult,
  ListEnterpriseAgentsParams,
  ApprovalConfig,
  Page,
  RequestOptions,
} from '../types.js';

export class EnterprisesResource {
  constructor(private readonly http: HttpClient) {}

  /** Approve an agent for an enterprise (idempotent PUT). */
  approveAgent(
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

  /** Revoke an agent's approval for an enterprise. */
  revokeAgent(
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

  /** Update an agent's status (e.g., suspend or reactivate). */
  updateAgentStatus(
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

  /** Approve multiple agents at once. */
  bulkApprove(
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

  /** List agents for an enterprise, optionally filtered by status. */
  listAgents(
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

  /** Get a single agent's approval record. */
  getAgent(
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

  /** Get the enterprise's agent approval configuration. */
  getApprovalConfig(
    enterpriseId: string,
    options?: RequestOptions,
  ): Promise<ApprovalConfig> {
    return this.http.get<ApprovalConfig>(
      `/v1/enterprises/${enterpriseId}/approval-config`,
      undefined,
      options,
    );
  }

  /** Set the enterprise's agent approval configuration (full replace). */
  setApprovalConfig(
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
