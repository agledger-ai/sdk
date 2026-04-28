import type { HttpClient } from '../http.js';
import type {
  ConformanceResponse,
  RequestOptions,
  ScopeProfileInfo,
  RecordLifecycleInfo,
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

  /** Get the server's protocol conformance summary (features, Types, limits). */
  getConformance(options?: RequestOptions): Promise<ConformanceResponse> {
    return this.http.get<ConformanceResponse>('/v1/conformance', undefined, options);
  }

  /** Get the Record lifecycle state machine (display statuses, transitions). */
  getLifecycle(options?: RequestOptions): Promise<RecordLifecycleInfo> {
    return this.http.get<RecordLifecycleInfo>('/lifecycle', undefined, options);
  }
}
