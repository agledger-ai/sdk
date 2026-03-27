/**
 * AGLedger™ SDK — Schemas Resource
 * Patent Pending. Copyright 2026 AGLedger LLC. All rights reserved.
 */

import type { HttpClient } from '../http.js';
import type {
  ContractType,
  ContractSchema,
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

  /** List available contract type schemas. */
  async list(params?: { enterpriseId?: string }, options?: RequestOptions): Promise<Page<ContractType>> {
    return this.http.getPage<ContractType>('/v1/schemas', params as Record<string, unknown>, options);
  }

  /** Delete a custom contract type schema. */
  async delete(contractType: ContractType, options?: RequestOptions): Promise<void> {
    return this.http.delete(`/v1/schemas/${contractType}`, undefined, options);
  }

  /** Get the full JSON Schema for a contract type. */
  async get(contractType: ContractType, options?: RequestOptions): Promise<ContractSchema> {
    return this.http.get<ContractSchema>(`/v1/schemas/${contractType}`, undefined, options);
  }

  /** Get the verification rules for a contract type. */
  async getRules(contractType: ContractType, options?: RequestOptions): Promise<{ contractType: ContractType; syncRuleIds: string[]; asyncRuleIds: string[] }> {
    return this.http.get(`/v1/schemas/${contractType}/rules`, undefined, options);
  }

  /** Dry-run receipt validation against a contract type's schema. */
  async validateReceipt(contractType: ContractType, evidence: Record<string, unknown>, options?: RequestOptions): Promise<SchemaValidationResult> {
    return this.http.post<SchemaValidationResult>(`/v1/schemas/${contractType}/validate`, { evidence }, options);
  }

  /** Get the meta-schema describing constraints and limits for custom schema authoring. */
  async getMetaSchema(options?: RequestOptions): Promise<MetaSchema> {
    return this.http.get<MetaSchema>('/v1/schemas/meta-schema', undefined, options);
  }

  /** Get a template for creating a new schema based on an existing contract type. */
  async getTemplate(contractType: ContractType, options?: RequestOptions): Promise<SchemaTemplate> {
    return this.http.get<SchemaTemplate>(`/v1/schemas/${contractType}`, { format: 'template' }, options);
  }

  /** Get a blank template for creating a custom contract type from scratch. */
  async getBlankTemplate(options?: RequestOptions): Promise<SchemaTemplate> {
    return this.http.get<SchemaTemplate>('/v1/schemas/_blank', undefined, options);
  }

  /** List all versions of a contract type schema. */
  async getVersions(contractType: ContractType, options?: RequestOptions): Promise<SchemaVersionDetail[]> {
    return this.http.get<SchemaVersionDetail[]>(`/v1/schemas/${contractType}/versions`, undefined, options);
  }

  /** Get a specific version of a contract type schema. */
  async getVersion(contractType: ContractType, version: number, options?: RequestOptions): Promise<SchemaVersionDetail> {
    return this.http.get<SchemaVersionDetail>(`/v1/schemas/${contractType}/versions/${version}`, undefined, options);
  }

  /** Diff two versions of a contract type schema. */
  async diff(contractType: ContractType, from: number, to: number, options?: RequestOptions): Promise<SchemaDiffResult> {
    return this.http.get<SchemaDiffResult>(`/v1/schemas/${contractType}/diff`, { from, to }, options);
  }

  /** Preview a schema before registration. Returns validation results and compiled output. */
  async preview(input: SchemaPreviewInput, options?: RequestOptions): Promise<SchemaPreviewResult> {
    return this.http.post<SchemaPreviewResult>('/v1/schemas/preview', input, options);
  }

  /** Check compatibility of new mandate/receipt schemas against an existing contract type. */
  async checkCompatibility(contractType: ContractType, schemas: { mandateSchema: Record<string, unknown>; receiptSchema: Record<string, unknown> }, options?: RequestOptions): Promise<SchemaCompatibilityResult> {
    return this.http.post<SchemaCompatibilityResult>(`/v1/schemas/${contractType}/check-compatibility`, schemas, options);
  }

  /** Register a new custom contract type schema. */
  async register(input: RegisterSchemaParams, options?: RequestOptions): Promise<SchemaVersionDetail> {
    return this.http.post<SchemaVersionDetail>('/v1/schemas', input, options);
  }

  /** Update a schema version (e.g., deprecate or change compatibility mode). */
  async updateVersion(contractType: ContractType, version: number, params: UpdateSchemaVersionParams, options?: RequestOptions): Promise<SchemaVersionDetail> {
    return this.http.patch<SchemaVersionDetail>(`/v1/schemas/${contractType}/versions/${version}`, params, options);
  }

  /** Export a contract type schema bundle for transfer between environments. */
  async exportSchema(contractType: ContractType, opts?: ExportSchemaOptions, options?: RequestOptions): Promise<SchemaExportResult> {
    const params: Record<string, unknown> = {};
    if (opts?.versions) params.versions = opts.versions;
    if (opts?.enterpriseId) params.enterpriseId = opts.enterpriseId;
    return this.http.post<SchemaExportResult>(`/v1/schemas/${contractType}/export`, undefined, options, params);
  }

  /** Import a schema bundle. */
  async importSchema(payload: SchemaImportPayload, opts?: Omit<ImportSchemaOptions, 'dryRun'>, options?: RequestOptions): Promise<SchemaImportResult> {
    const params: Record<string, unknown> = {};
    if (opts?.enterpriseId) params.enterpriseId = opts.enterpriseId;
    return this.http.post<SchemaImportResult>('/v1/schemas/import', payload, options, params);
  }

  /** Dry-run import to preview what would be created without persisting. */
  async previewImport(payload: SchemaImportPayload, opts?: Omit<ImportSchemaOptions, 'dryRun'>, options?: RequestOptions): Promise<SchemaImportDryRunResult> {
    const params: Record<string, unknown> = { dryRun: true };
    if (opts?.enterpriseId) params.enterpriseId = opts.enterpriseId;
    return this.http.post<SchemaImportDryRunResult>('/v1/schemas/import', payload, options, params);
  }
}
