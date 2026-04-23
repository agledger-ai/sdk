import type { HttpClient } from '../http.js';
import type { AccountProfile, RequestOptions } from '../types.js';

/**
 * Authentication resource — only two routes survived v0.20.0:
 * `GET /v1/auth/me` (identity + scopes) and `POST /v1/auth/keys/rotate`
 * (atomic key rotation). Everything else (registration, password, email
 * verification) was removed; provisioning happens via admin endpoints.
 */
export class AuthResource {
  constructor(private readonly http: HttpClient) {}

  /** Get the authenticated account profile (identity, role, scopes). */
  getMe(options?: RequestOptions): Promise<AccountProfile> {
    return this.http.get<AccountProfile>('/v1/auth/me', undefined, options);
  }

  /** Rotate the current API key. Old key is immediately revoked. */
  rotateKey(options?: RequestOptions): Promise<{ apiKey: string; keyId: string }> {
    return this.http.post('/v1/auth/keys/rotate', undefined, options);
  }
}
