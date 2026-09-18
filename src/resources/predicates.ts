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
  data: Array<{
    /** Predicate kind, e.g. `record-state`. */
    kind: string;
    /** The in-toto `predicateType` URI this kind is published under. */
    predicateType: string;
    /** Where to fetch the JSON Schema for this kind. */
    schemaUrl: string;
  }>;
}

/**
 * A predicate's JSON Schema (draft 2019-09), returned as the document itself:
 * `$schema`, `$id`, `title`, `properties` and the rest sit at the top level.
 */
export type PredicateSchema = Record<string, unknown>;

export class PredicatesResource {
  constructor(private readonly http: HttpClient) {}

  /** List available predicate kinds. */
  list(options?: RequestOptions): Promise<PredicateListing> {
    return this.http.get<PredicateListing>('/predicates', undefined, options);
  }

  /**
   * Fetch the JSON Schema for a predicate kind. `v1` is the only version the
   * Server publishes; the path segment is literal, so any other value 404s.
   *
   * @example
   * ```ts
   * const schema = await client.predicates.get('record-state');
   * ```
   */
  get(kind: string, _version: 'v1' = 'v1', options?: RequestOptions): Promise<PredicateSchema> {
    return this.http.get<PredicateSchema>(`/predicates/${kind}/v1`, undefined, options);
  }
}
