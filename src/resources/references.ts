import type { HttpClient } from '../http.js';
import type {
  AutoPaginateOptions,
  EntityReferenceInput,
  EntityReferencesResult,
  Page,
  ReferenceLookupMatch,
  ReferenceLookupParams,
  RequestOptions,
} from '../types.js';

export class ReferencesResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Find the Records and agents that carry an external reference. One
   * reference can be attached to several entities, so this is a paged list of
   * matches, each naming its entity and the reference row.
   */
  lookup(params: ReferenceLookupParams, options?: RequestOptions): Promise<Page<ReferenceLookupMatch>> {
    return this.http.getPage<ReferenceLookupMatch>('/v1/references', params as unknown as Record<string, unknown>, options);
  }

  /** Auto-paginating {@link lookup}: yields every match across all pages. */
  lookupAll(
    params: ReferenceLookupParams,
    options?: RequestOptions & AutoPaginateOptions,
  ): AsyncGenerator<ReferenceLookupMatch> {
    return this.http.paginate<ReferenceLookupMatch>('/v1/references', params as unknown as Record<string, unknown>, options);
  }

  /** Add external references to a Record. Append-only. */
  addRecordReferences(recordId: string, references: EntityReferenceInput[], options?: RequestOptions): Promise<EntityReferencesResult> {
    return this.http.post<EntityReferencesResult>(`/v1/records/${recordId}/references`, { references }, options);
  }

  /** Get a Record's external references. */
  getRecordReferences(recordId: string, options?: RequestOptions): Promise<EntityReferencesResult> {
    return this.http.get<EntityReferencesResult>(`/v1/records/${recordId}/references`, undefined, options);
  }

  /** Add external references to an agent. Append-only. */
  addAgentReferences(agentId: string, references: EntityReferenceInput[], options?: RequestOptions): Promise<EntityReferencesResult> {
    return this.http.post<EntityReferencesResult>(`/v1/agents/${agentId}/references`, { references }, options);
  }

  /** Get an agent's external references. */
  getAgentReferences(agentId: string, options?: RequestOptions): Promise<EntityReferencesResult> {
    return this.http.get<EntityReferencesResult>(`/v1/agents/${agentId}/references`, undefined, options);
  }
}
