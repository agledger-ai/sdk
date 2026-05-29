import type { HttpClient } from '../http.js';
import type { RequestOptions } from '../types.js';

/**
 * Predicate schema discovery.
 *
 * Each AGLedger chain entry is an in-toto v1 Statement; the `predicate` body
 * is shaped per `entryType`. These endpoints publish the canonical predicate
 * JSON Schemas so customers can validate the predicate they decode from a
 * COSE_Sign1 envelope.
 *
 * Known kinds: `record-state`, `settlement-signal`, `vault-checkpoint`,
 * `schema-event`, `org-read`, `counter-attestation`, `federation-projection`.
 */
export interface PredicateListing {
  kinds: Array<{
    kind: string;
    latestVersion: string;
    /** Optional human-readable description. */
    description?: string;
  }>;
}

export interface PredicateSchema {
  kind: string;
  version: string;
  schema: Record<string, unknown>;
}

export class PredicatesResource {
  constructor(private readonly http: HttpClient) {}

  /** List available predicate kinds. */
  list(options?: RequestOptions): Promise<PredicateListing> {
    return this.http.get<PredicateListing>('/predicates', undefined, options);
  }

  /**
   * Fetch the JSON Schema for a specific predicate kind + version.
   *
   * @example
   * ```ts
   * const schema = await client.predicates.get('record-state', 'v1');
   * ```
   */
  get(kind: string, version: string = 'v1', options?: RequestOptions): Promise<PredicateSchema> {
    return this.http.get<PredicateSchema>(`/predicates/${kind}/${version}`, undefined, options);
  }
}
