/**
 * AGLedger™ SDK — Schemas Resource
 * Patent Pending. Copyright 2026 AGLedger LLC. All rights reserved.
 */

import type { HttpClient } from '../http.js';
import type { ContractType, ContractSchema, SchemaValidationResult, Page, RequestOptions } from '../types.js';

export class SchemasResource {
  constructor(private readonly http: HttpClient) {}

  /** List available contract type schemas. */
  async list(options?: RequestOptions): Promise<Page<ContractType>> {
    
    return this.http.getPage<ContractType>('/v1/schemas', undefined, options);
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
}
