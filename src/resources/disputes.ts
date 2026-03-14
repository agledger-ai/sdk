/**
 * AGLedger™ SDK — Disputes Resource
 * Patent Pending. Copyright 2026 AGLedger LLC. All rights reserved.
 */

import type { HttpClient } from '../http.js';
import type {
  Dispute,
  CreateDisputeParams,
  ResolveDisputeParams,
  RequestOptions,
} from '../types.js';

export class DisputesResource {
  constructor(private readonly http: HttpClient) {}

  /** Create a dispute on a mandate. */
  async create(mandateId: string, params: CreateDisputeParams, options?: RequestOptions): Promise<Dispute> {
    return this.http.post<Dispute>(`/v1/mandates/${mandateId}/dispute`, params, options);
  }

  /** Get the dispute for a mandate. */
  async get(mandateId: string, options?: RequestOptions): Promise<Dispute> {
    return this.http.get<Dispute>(`/v1/mandates/${mandateId}/dispute`, undefined, options);
  }

  /** Escalate a dispute to the next review tier. */
  async escalate(mandateId: string, reason: string, options?: RequestOptions): Promise<Dispute> {
    return this.http.post<Dispute>(`/v1/mandates/${mandateId}/dispute/escalate`, { reason }, options);
  }

  /** Submit additional evidence for a dispute. */
  async submitEvidence(mandateId: string, evidence: Record<string, unknown>, options?: RequestOptions): Promise<Dispute> {
    return this.http.post<Dispute>(`/v1/mandates/${mandateId}/dispute/evidence`, evidence, options);
  }

  /** Resolve a dispute with a resolution and optional amount. */
  async resolve(mandateId: string, params: ResolveDisputeParams, options?: RequestOptions): Promise<Dispute> {
    return this.http.post<Dispute>(`/v1/mandates/${mandateId}/dispute/resolve`, params, options);
  }
}
