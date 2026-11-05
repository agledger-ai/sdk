import type { HttpClient } from '../http.js';
import type {
  ConformanceResponse,
  FederationKeyHistory,
  RequestOptions,
  Listing,
  ScopeProfileInfo,
  RecordLifecycleInfo,
} from '../types.js';

/**
 * Discovery resource: unauthenticated (or lightly authenticated) public
 * metadata endpoints. Useful for agent onboarding and capability probing.
 */
export class DiscoveryResource {
  constructor(private readonly http: HttpClient) {}

  /** List every scope profile. Public discovery endpoint; one response, no cursor. */
  getScopeProfiles(options?: RequestOptions): Promise<Listing<ScopeProfileInfo>> {
    return this.http.get<Listing<ScopeProfileInfo>>('/v1/scope-profiles', undefined, options);
  }

  /** Get the server's protocol conformance summary (features, Types, limits). */
  getConformance(options?: RequestOptions): Promise<ConformanceResponse> {
    return this.http.get<ConformanceResponse>('/v1/conformance', undefined, options);
  }

  /**
   * Get this Server's federation key history
   * (`GET /.well-known/agledger-federation-keys.json`, no auth): every
   * federation signing key it has held, with validity windows and the signed
   * statements linking them. Empty `keys` while federation is not configured.
   */
  getFederationKeys(options?: RequestOptions): Promise<FederationKeyHistory> {
    return this.http.get<FederationKeyHistory>('/.well-known/agledger-federation-keys.json', undefined, options);
  }

  /** Get the Record lifecycle state machine (display statuses, transitions). */
  getLifecycle(options?: RequestOptions): Promise<RecordLifecycleInfo> {
    return this.http.get<RecordLifecycleInfo>('/lifecycle', undefined, options);
  }
}
