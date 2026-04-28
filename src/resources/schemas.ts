import type { HttpClient } from '../http.js';
import type {
  RecordType,
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
  SchemaImportPayload,
  SchemaImportResult,
  SchemaImportDryRunResult,
  RegisterSchemaParams,
  SchemaVersionDetail,
  UpdateSchemaVersionParams,
  SchemaCompatibilityResult,
  ExportSchemaOptions,
  ImportSchemaOptions,
} from '../types.js';

export class SchemasResource {
  constructor(private readonly http: HttpClient) {}

  /** List available Type schemas. */
  list(params?: { enterpriseId?: string }, options?: RequestOptions): Promise<Page<RecordType>> {
    return this.http.getPage<RecordType>('/v1/schemas', params as Record<string, unknown>, options);
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

  /** Dry-run receipt validation against a Type's schema. */
  validateReceipt(type: RecordType, evidence: Record<string, unknown>, options?: RequestOptions): Promise<SchemaValidationResult> {
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

  /** Check compatibility of new record/receipt schemas against an existing Type. */
  checkCompatibility(type: RecordType, schemas: { recordSchema: Record<string, unknown>; receiptSchema?: Record<string, unknown> }, options?: RequestOptions): Promise<SchemaCompatibilityResult> {
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
    if (opts?.enterpriseId) params.enterpriseId = opts.enterpriseId;
    return this.http.post<SchemaExportResult>(`/v1/schemas/${type}/export`, undefined, options, params);
  }

  /** Import a schema bundle. */
  import_(payload: SchemaImportPayload, opts?: Omit<ImportSchemaOptions, 'dryRun'>, options?: RequestOptions): Promise<SchemaImportResult> {
    const params: Record<string, unknown> = {};
    if (opts?.enterpriseId) params.enterpriseId = opts.enterpriseId;
    return this.http.post<SchemaImportResult>('/v1/schemas/import', payload, options, params);
  }

  /** Dry-run import to preview what would be created without persisting. */
  previewImport(payload: SchemaImportPayload, opts?: Omit<ImportSchemaOptions, 'dryRun'>, options?: RequestOptions): Promise<SchemaImportDryRunResult> {
    const params: Record<string, unknown> = { dryRun: true };
    if (opts?.enterpriseId) params.enterpriseId = opts.enterpriseId;
    return this.http.post<SchemaImportDryRunResult>('/v1/schemas/import', payload, options, params);
  }
}
