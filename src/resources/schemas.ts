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
  ExportSchemaOptions,
} from '../types.js';

export class SchemasResource {
  constructor(private readonly http: HttpClient) {}

  /** List available Type schemas, one catalog row per (publisher, type). */
  list(params?: { orgId?: string }, options?: RequestOptions): Promise<Page<SchemaListItem>> {
    return this.http.getPage<SchemaListItem>('/v1/schemas', params as Record<string, unknown>, options);
  }

  /** Delete a custom Type schema. */
  delete(type: RecordType, options?: RequestOptions): Promise<void> {
    return this.http.delete(`/v1/schemas/${type}`, undefined, options);
  }

  /** Get the full JSON Schema for a Type. */
  get(type: RecordType, options?: RequestOptions): Promise<TypeSchema> {
    return this.http.get<TypeSchema>(`/v1/schemas/${type}`, undefined, options);
  }

  /** Get the verification rules for a Type. */
  getRules(type: RecordType, options?: RequestOptions): Promise<{ type: RecordType; syncRuleIds: string[]; asyncRuleIds: string[] }> {
    return this.http.get(`/v1/schemas/${type}/rules`, undefined, options);
  }

  /** Dry-run completion validation against a Type's schema. */
  validateCompletion(type: RecordType, evidence: Record<string, unknown>, options?: RequestOptions): Promise<SchemaValidationResult> {
    return this.http.post<SchemaValidationResult>(`/v1/schemas/${type}/validate`, { evidence }, options);
  }

  /** Get the meta-schema describing constraints and limits for custom schema authoring. */
  metaSchema(options?: RequestOptions): Promise<MetaSchema> {
    return this.http.get<MetaSchema>('/v1/schemas/meta-schema', undefined, options);
  }

  /** Get a template for creating a new schema based on an existing Type. */
  getTemplate(type: RecordType, options?: RequestOptions): Promise<SchemaTemplate> {
    return this.http.get<SchemaTemplate>(`/v1/schemas/${type}/template`, undefined, options);
  }

  /** Get a blank template for creating a custom Type from scratch. */
  blank(options?: RequestOptions): Promise<SchemaTemplate> {
    return this.http.get<SchemaTemplate>('/v1/schemas/_blank', undefined, options);
  }

  /** List all versions of a Type schema. */
  getVersions(type: RecordType, options?: RequestOptions): Promise<Page<SchemaVersionDetail>> {
    return this.http.getPage<SchemaVersionDetail>(`/v1/schemas/${type}/versions`, undefined, options);
  }

  /** Get a specific version of a Type schema. */
  getVersion(type: RecordType, version: number, options?: RequestOptions): Promise<SchemaVersionDetail> {
    return this.http.get<SchemaVersionDetail>(`/v1/schemas/${type}/versions/${version}`, undefined, options);
  }

  /** Diff two versions of a Type schema. */
  diff(type: RecordType, from: number, to: number, options?: RequestOptions): Promise<SchemaDiffResult> {
    return this.http.get<SchemaDiffResult>(`/v1/schemas/${type}/diff`, { from, to }, options);
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

  /** Update a schema version (e.g., deprecate or change compatibility mode). */
  updateVersion(type: RecordType, version: number, params: UpdateSchemaVersionParams, options?: RequestOptions): Promise<SchemaVersionDetail> {
    return this.http.patch<SchemaVersionDetail>(`/v1/schemas/${type}/versions/${version}`, params, options);
  }

  /** Disable a Type — Records of this Type can no longer be created. Existing Records are unaffected. */
  disable(type: RecordType, options?: RequestOptions): Promise<{ type: RecordType; status: 'DISABLED' }> {
    return this.http.patch(`/v1/schemas/${type}/disable`, {}, options);
  }

  /** Re-enable a previously disabled Type. */
  enable(type: RecordType, options?: RequestOptions): Promise<{ type: RecordType; status: 'ACTIVE' }> {
    return this.http.patch(`/v1/schemas/${type}/enable`, {}, options);
  }

  /** Export a Type schema bundle for transfer between environments. */
  exportSchema(type: RecordType, opts?: ExportSchemaOptions, options?: RequestOptions): Promise<SchemaExportResult> {
    const params: Record<string, unknown> = {};
    if (opts?.versions) params.versions = opts.versions;
    if (opts?.orgId) params.orgId = opts.orgId;
    return this.http.post<SchemaExportResult>(`/v1/schemas/${type}/export`, undefined, options, params);
  }

  /**
   * Import a third-party schema manifest (DESIGN-SCHEMA-CATALOG.md §4).
   * Idempotent on full-tuple match (publisher, type, version, org, digest) —
   * re-posting the same manifest returns the existing row (HTTP 200 instead
   * of 201). Posting the same publisher/type/version with different bytes is
   * a 409. Requires the `schemas:admin` scope.
   */
  import_(manifest: SchemaManifest, params?: SchemaImportParams, options?: RequestOptions): Promise<SchemaVersionDetail> {
    return this.http.post<SchemaVersionDetail>('/v1/schemas/import', { manifest, ...params }, options);
  }
}
