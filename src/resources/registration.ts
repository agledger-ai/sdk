import type { HttpClient } from '../http.js';
import type { AccountProfile, RequestOptions } from '../types.js';

export class RegistrationResource {
  constructor(private readonly http: HttpClient) {}

  /** Get the authenticated account profile. */
  getMe(options?: RequestOptions): Promise<AccountProfile> {
    return this.http.get<AccountProfile>('/v1/auth/me', undefined, options);
  }

  /** Verify an agent via A2A AgentCard URL. */
  verifyAgentCard(agentCardUrl: string, options?: RequestOptions): Promise<Record<string, unknown>> {
    return this.http.post('/v1/auth/verify-agent-card', { agentCardUrl }, options);
  }

  /** Rotate the current API key. Old key is immediately revoked. */
  rotateApiKey(options?: RequestOptions): Promise<{ apiKey: string }> {
    return this.http.post('/v1/auth/keys/rotate', undefined, options);
  }
}
