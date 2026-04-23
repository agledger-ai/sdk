import type { HttpClient } from '../http.js';
import type {
  ConformanceResponse,
  RequestOptions,
  ScopeProfileInfo,
  MandateLifecycleInfo,
} from '../types.js';

/**
 * Discovery resource — unauthenticated (or lightly authenticated) public
 * metadata endpoints. Useful for agent onboarding and capability probing.
 */
export class DiscoveryResource {
  constructor(private readonly http: HttpClient) {}

  /** List all available scope profiles. Public discovery endpoint. */
  getScopeProfiles(options?: RequestOptions): Promise<ScopeProfileInfo[]> {
    return this.http.get<ScopeProfileInfo[]>('/v1/scope-profiles', undefined, options);
  }

  /** Get the server's protocol conformance summary (features, contract types, limits). */
  getConformance(options?: RequestOptions): Promise<ConformanceResponse> {
    return this.http.get<ConformanceResponse>('/v1/conformance', undefined, options);
  }

  /** Get the mandate lifecycle state machine (display statuses, transitions). */
  getLifecycle(options?: RequestOptions): Promise<MandateLifecycleInfo> {
    return this.http.get<MandateLifecycleInfo>('/lifecycle', undefined, options);
  }
}
