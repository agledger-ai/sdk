/**
 * AGLedger™ SDK — Registration & Auth Resource
 * Patent Pending. Copyright 2026 AGLedger LLC. All rights reserved.
 */

import type { HttpClient } from '../http.js';
import type { RegisterParams, RegisterResult, AccountProfile, RequestOptions } from '../types.js';

export class RegistrationResource {
  constructor(private readonly http: HttpClient) {}

  /** Get the authenticated account profile. */
  async getMe(options?: RequestOptions): Promise<AccountProfile> {
    return this.http.get<AccountProfile>('/v1/auth/me', undefined, options);
  }

  /** Register a new account (enterprise or agent). */
  async register(params: RegisterParams, options?: RequestOptions): Promise<RegisterResult> {
    return this.http.post<RegisterResult>('/v1/auth/register', params, options);
  }

  /** Register an enterprise account. */
  async registerEnterprise(params: { name: string; email?: string }, options?: RequestOptions): Promise<RegisterResult> {
    return this.http.post<RegisterResult>('/v1/auth/enterprise', params, options);
  }

  /** Register an agent account. */
  async registerAgent(params: { name: string; email?: string; agentCardUrl?: string; enterpriseId?: string }, options?: RequestOptions): Promise<RegisterResult> {
    return this.http.post<RegisterResult>('/v1/auth/agent', params, options);
  }

  /** Verify an agent via A2A AgentCard URL. */
  async verifyAgentCard(agentCardUrl: string, options?: RequestOptions): Promise<Record<string, unknown>> {
    return this.http.post('/v1/auth/verify-agent-card', { agentCardUrl }, options);
  }

  /** Rotate the current API key. Old key is immediately revoked. */
  async rotateApiKey(options?: RequestOptions): Promise<{ apiKey: string }> {
    return this.http.post('/v1/auth/keys/rotate', undefined, options);
  }

  /** Verify email address with token from verification link. */
  async verifyEmail(token: string, options?: RequestOptions): Promise<{ sandboxMode: boolean; status: string }> {
    return this.http.get('/v1/auth/verify', { token }, options);
  }

  /** Send (or resend) a verification email. */
  async sendVerificationEmail(email: string, options?: RequestOptions): Promise<{ sandboxMode: boolean; status: string }> {
    return this.http.post('/v1/auth/verify-email', { email }, options);
  }
}
