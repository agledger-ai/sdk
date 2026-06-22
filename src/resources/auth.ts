import type { HttpClient } from '../http.js';
import type {
  AccountProfile,
  RequestOptions,
  RotateKeyParams,
  IssueEphemeralCertParams,
  IssueEphemeralCertResult,
} from '../types.js';

/**
 * Authentication resource — `GET /v1/auth/me` (identity + scopes),
 * `POST /v1/auth/keys/rotate` (atomic key rotation), and
 * `POST /v1/auth/oidc/cert` (OIDC-token → ephemeral signing cert exchange).
 * Account provisioning happens via the admin endpoints.
 */
export class AuthResource {
  constructor(private readonly http: HttpClient) {}

  /** Get the authenticated account profile (identity, role, scopes). */
  getMe(options?: RequestOptions): Promise<AccountProfile> {
    return this.http.get<AccountProfile>('/v1/auth/me', undefined, options);
  }

  /**
   * Rotate the current API key. The old key is revoked immediately unless
   * `{ gracePeriodSeconds }` is passed (API #793), which keeps it valid for an
   * overlap window so in-flight callers can swap without a hard cutover.
   */
  rotateKey(
    params?: RotateKeyParams,
    options?: RequestOptions,
  ): Promise<{ apiKey: string; keyId: string }> {
    return this.http.post('/v1/auth/keys/rotate', params ?? undefined, options);
  }

  /**
   * Exchange an OIDC token for a short-lived ephemeral signing cert bound to a
   * caller-supplied public key. The issuer must be registered as a trusted
   * issuer (`admin.trustedIssuers.create`).
   */
  issueEphemeralCert(
    params: IssueEphemeralCertParams,
    options?: RequestOptions,
  ): Promise<IssueEphemeralCertResult> {
    return this.http.post<IssueEphemeralCertResult>('/v1/auth/oidc/cert', params, options);
  }
}
