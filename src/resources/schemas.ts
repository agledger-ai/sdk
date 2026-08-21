import type { HttpClient } from '../http.js';
import type {
  RecordType,
  SchemaListItem,
  TypeSchema,
  SchemaValidationResult,
  Page,
  RequestOptions,
  MetaSchema,
  SchemaTemplate,
  SchemaPreviewInput,
  SchemaPreviewResult,
  SchemaDiffResult,
  SchemaExportResult,
  SchemaManifest,
  SchemaImportParams,
  RegisterSchemaParams,
  SchemaVersionDetail,
  UpdateSchemaVersionParams,
  SchemaCompatibilityResult,
  SchemaManifestExport,
  SchemaScopeOptions,
  SchemaDeleteResult,
  SchemaRulesResult,
  SchemaLifecycleResult,
  ExportSchemaOptions,
  ListSchemasParams,
} from '../types.js';

/**
 * Split the publisher scope out of the options bag. It travels as a query
 * param on every `/v1/schemas/{type}` call; everything else is request-level.
 */
function scope(options?: SchemaScopeOptions): {
  request: RequestOptions | undefined;
  params: Record<string, unknown> | undefined;
} {
  if (!options) return { request: undefined, params: undefined };
  const { publisher, ...request } = options;
  return { request, params: publisher === undefined ? undefined : { publisher } };
}

export class SchemasResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * List available Type schemas, one catalog row per (publisher, type).
   *
   * Two rows sharing a `type` under different `publisher` labels is the state
   * that makes every other call on this resource ambiguous. Read `publisher`
   * off the row you want and pass it back as the `publisher` option.
   */
  list(params?: ListSchemasParams, options?: RequestOptions): Promise<Page<SchemaListItem>> {
    return this.http.getPage<SchemaListItem>('/v1/schemas', params as Record<string, unknown>, options);
  }

  /**
   * Delete a custom Type schema, scoped to the publisher the call resolves to.
   *
   * Read `publisher` off the result rather than inferring from the type's
   * absence: rows under any other publisher of the same type are untouched and
   * still in the catalog, so the type surviving a delete is expected.
   */
  delete(type: RecordType, options?: SchemaScopeOptions): Promise<SchemaDeleteResult> {
    const { request, params } = scope(options);
    return this.http.delete<SchemaDeleteResult>(`/v1/schemas/${type}`, undefined, request, params);
  }

  /** Get the full JSON Schema for a Type. */
  get(type: RecordType, options?: SchemaScopeOptions): Promise<TypeSchema> {
    const { request, params } = scope(options);
    return this.http.get<TypeSchema>(`/v1/schemas/${type}`, params, request);
  }

  /** Get the verification rules for a Type. */
  getRules(type: RecordType, options?: SchemaScopeOptions): Promise<SchemaRulesResult> {
    const { request, params } = scope(options);
    return this.http.get<SchemaRulesResult>(`/v1/schemas/${type}/rules`, params, request);
  }

  /** Dry-run completion validation against a Type's schema. */
  validateCompletion(type: RecordType, evidence: Record<string, unknown>, options?: SchemaScopeOptions): Promise<SchemaValidationResult> {
    const { request, params } = scope(options);
    return this.http.post<SchemaValidationResult>(`/v1/schemas/${type}/validate`, { evidence }, request, params);
  }

  /**
   * Get the publisher's signed manifest for a Type: the exact bytes a peer
   * imports, with the `manifestDigest` federation compares schemas by.
   */
  getManifest(type: RecordType, options?: SchemaScopeOptions): Promise<SchemaManifestExport> {
    const { request, params } = scope(options);
    return this.http.get<SchemaManifestExport>(`/v1/schemas/${type}/manifest`, params, request);
  }

  /** Get the meta-schema describing constraints and limits for custom schema authoring. */
  metaSchema(options?: RequestOptions): Promise<MetaSchema> {
    return this.http.get<MetaSchema>('/v1/schemas/meta-schema', undefined, options);
  }

  /** Get a template for creating a new schema based on an existing Type. */
  getTemplate(type: RecordType, options?: SchemaScopeOptions): Promise<SchemaTemplate> {
    const { request, params } = scope(options);
    return this.http.get<SchemaTemplate>(`/v1/schemas/${type}/template`, params, request);
  }

  /** Get a blank template for creating a custom Type from scratch. */
  blank(options?: RequestOptions): Promise<SchemaTemplate> {
    return this.http.get<SchemaTemplate>('/v1/schemas/_blank', undefined, options);
  }

  /** List all versions of a Type schema. */
  getVersions(type: RecordType, options?: SchemaScopeOptions): Promise<Page<SchemaVersionDetail>> {
    const { request, params } = scope(options);
    return this.http.getPage<SchemaVersionDetail>(`/v1/schemas/${type}/versions`, params, request);
  }

  /**
   * Get a specific version of a Type schema.
   *
   * The version counter is per (publisher, type) and shared across publishers,
   * so a second publisher's v2 reflects registration order rather than a newer
   * schema. Pin `publisher` before comparing versions across the two.
   */
  getVersion(type: RecordType, version: number, options?: SchemaScopeOptions): Promise<SchemaVersionDetail> {
    const { request, params } = scope(options);
    return this.http.get<SchemaVersionDetail>(`/v1/schemas/${type}/versions/${version}`, params, request);
  }

  /**
   * Diff two versions of a Type schema.
   *
   * Pin `publisher` on a type two publishers offer. Unscoped, the call answers
   * 422 rather than resolving each side independently, which could otherwise
   * compare two unrelated publishers' schemas and report the difference as a
   * breaking change.
   */
  diff(type: RecordType, from: number, to: number, options?: SchemaScopeOptions): Promise<SchemaDiffResult> {
    const { request, params } = scope(options);
    return this.http.get<SchemaDiffResult>(`/v1/schemas/${type}/diff`, { from, to, ...params }, request);
  }

  /** Preview a schema before registration. Returns validation results and compiled output. */
  preview(input: SchemaPreviewInput, options?: RequestOptions): Promise<SchemaPreviewResult> {
    return this.http.post<SchemaPreviewResult>('/v1/schemas/preview', input, options);
  }

  /** Check compatibility of new record/completion schemas against an existing Type. */
  checkCompatibility(type: RecordType, schemas: { recordSchema: Record<string, unknown>; completionSchema?: Record<string, unknown> }, options?: RequestOptions): Promise<SchemaCompatibilityResult> {
    return this.http.post<SchemaCompatibilityResult>(`/v1/schemas/${type}/check-compatibility`, schemas, options);
  }

  /** Register a new custom Type schema. */
  register(input: RegisterSchemaParams, options?: RequestOptions): Promise<SchemaVersionDetail> {
    return this.http.post<SchemaVersionDetail>('/v1/schemas', input, options);
  }

  /** Change a schema version's compatibility mode, which is all this route updates. */
  updateVersion(type: RecordType, version: number, body: UpdateSchemaVersionParams, options?: SchemaScopeOptions): Promise<SchemaVersionDetail> {
    const { request, params } = scope(options);
    return this.http.patch<SchemaVersionDetail>(`/v1/schemas/${type}/versions/${version}`, body, request, params);
  }

  /** Disable a Type. Records of this Type can no longer be created; existing Records are unaffected. */
  disable(type: RecordType, options?: SchemaScopeOptions): Promise<SchemaLifecycleResult> {
    const { request, params } = scope(options);
    return this.http.patch<SchemaLifecycleResult>(`/v1/schemas/${type}/disable`, {}, request, params);
  }

  /** Re-enable a previously disabled Type. */
  enable(type: RecordType, options?: SchemaScopeOptions): Promise<SchemaLifecycleResult> {
    const { request, params } = scope(options);
    return this.http.patch<SchemaLifecycleResult>(`/v1/schemas/${type}/enable`, {}, request, params);
  }

  /** Export a Type schema bundle for transfer between environments. */
  exportSchema(type: RecordType, opts?: ExportSchemaOptions, options?: RequestOptions): Promise<SchemaExportResult> {
    const params: Record<string, unknown> = {};
    if (opts?.versions) params.versions = opts.versions;
    if (opts?.orgId) params.orgId = opts.orgId;
    if (opts?.publisher) params.publisher = opts.publisher;
    return this.http.post<SchemaExportResult>(`/v1/schemas/${type}/export`, undefined, options, params);
  }

  /**
   * Import a third-party schema manifest (DESIGN-SCHEMA-CATALOG.md §4).
   * Idempotent on full-tuple match (publisher, type, version, org, digest):
   * re-posting the same manifest returns the existing row (HTTP 200 instead
   * of 201). Posting the same publisher/type/version with different bytes is
   * a 409. Requires the `schemas:admin` scope.
   */
  import_(manifest: SchemaManifest, params?: SchemaImportParams, options?: RequestOptions): Promise<SchemaVersionDetail> {
    return this.http.post<SchemaVersionDetail>('/v1/schemas/import', { manifest, ...params }, options);
  }
}
