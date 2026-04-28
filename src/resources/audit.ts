import type { HttpClient } from '../http.js';
import type {
  RequestOptions,
  TenantReadsCheckpoint,
  CosignCheckpointParams,
  TenantReadsInclusionProof,
} from '../types.js';

/**
 * Tenant-admin reads checkpoint surface — SCITT-style signed tree heads
 * (`/v1/audit/tenant-reads/checkpoints/*`). Each cross-party admin read is
 * logged into a per-tenant Merkle log and periodically anchored.
 */
export class TenantReadsCheckpointsResource {
  constructor(private readonly http: HttpClient) {}

  /** List recent signed checkpoints for the calling tenant. */
  list(params?: { limit?: number }, options?: RequestOptions): Promise<{ data: TenantReadsCheckpoint[] }> {
    return this.http.get<{ data: TenantReadsCheckpoint[] }>(
      '/v1/audit/tenant-reads/checkpoints',
      params as Record<string, unknown>,
      options,
    );
  }

  /** Get a single checkpoint by ID. */
  get(id: string, options?: RequestOptions): Promise<TenantReadsCheckpoint> {
    return this.http.get<TenantReadsCheckpoint>(
      `/v1/audit/tenant-reads/checkpoints/${id}`,
      undefined,
      options,
    );
  }

  /**
   * Attach a witness cosignature to a checkpoint. The witness's signature
   * format/algorithm is the customer's choice — the API stores the bytes verbatim.
   */
  cosign(id: string, params: CosignCheckpointParams, options?: RequestOptions): Promise<TenantReadsCheckpoint> {
    return this.http.post<TenantReadsCheckpoint>(
      `/v1/audit/tenant-reads/checkpoints/${id}/cosign`,
      params,
      options,
    );
  }

  /** Get the inclusion proof for a leaf (specified via `leaf` query) within this checkpoint. */
  proof(id: string, leaf: string, options?: RequestOptions): Promise<TenantReadsInclusionProof> {
    return this.http.get<TenantReadsInclusionProof>(
      `/v1/audit/tenant-reads/checkpoints/${id}/proof`,
      { leaf },
      options,
    );
  }
}

/**
 * Audit resource — verifiable read-trail surface. Holds the
 * `tenantReadsCheckpoints` sub-resource for SCITT-style cross-party read proofs.
 */
export class AuditResource {
  readonly tenantReadsCheckpoints: TenantReadsCheckpointsResource;

  constructor(http: HttpClient) {
    this.tenantReadsCheckpoints = new TenantReadsCheckpointsResource(http);
  }
}
