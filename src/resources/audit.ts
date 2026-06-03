import type { HttpClient } from '../http.js';
import type {
  RequestOptions,
  OrgReadsCheckpoint,
  CosignCheckpointParams,
  OrgReadsInclusionProof,
  VaultCheckpoint,
  ListVaultCheckpointsParams,
  Page,
} from '../types.js';

/**
 * Org-admin reads checkpoint surface — SCITT-style signed tree heads
 * (`/v1/audit/org-reads/checkpoints/*`). Each cross-party admin read is
 * logged into a per-org Merkle log and periodically anchored.
 */
export class OrgReadsCheckpointsResource {
  constructor(private readonly http: HttpClient) {}

  /** List recent signed checkpoints for the calling org. */
  list(params?: { limit?: number }, options?: RequestOptions): Promise<{ data: OrgReadsCheckpoint[] }> {
    return this.http.get<{ data: OrgReadsCheckpoint[] }>(
      '/v1/audit/org-reads/checkpoints',
      params as Record<string, unknown>,
      options,
    );
  }

  /** Get a single checkpoint by ID. */
  get(id: string, options?: RequestOptions): Promise<OrgReadsCheckpoint> {
    return this.http.get<OrgReadsCheckpoint>(
      `/v1/audit/org-reads/checkpoints/${id}`,
      undefined,
      options,
    );
  }

  /**
   * Attach a witness cosignature to a checkpoint. The witness's signature
   * format/algorithm is the customer's choice — the API stores the bytes verbatim.
   */
  cosign(id: string, params: CosignCheckpointParams, options?: RequestOptions): Promise<OrgReadsCheckpoint> {
    return this.http.post<OrgReadsCheckpoint>(
      `/v1/audit/org-reads/checkpoints/${id}/cosign`,
      params,
      options,
    );
  }

  /** Get the inclusion proof for a leaf (specified via `leaf` query) within this checkpoint. */
  proof(id: string, leaf: string, options?: RequestOptions): Promise<OrgReadsInclusionProof> {
    return this.http.get<OrgReadsInclusionProof>(
      `/v1/audit/org-reads/checkpoints/${id}/proof`,
      { leaf },
      options,
    );
  }
}

/**
 * Vault checkpoint surface — per-record 6h signed Merkle anchors that survive
 * audit_vault TRUNCATE/DELETE. Pair with `records.getAuditExport()` to
 * cross-check the live chain against checkpoint anchors offline.
 */
export class VaultCheckpointsResource {
  constructor(private readonly http: HttpClient) {}

  /** List vault checkpoints (optionally filtered to one record). */
  list(params?: ListVaultCheckpointsParams, options?: RequestOptions): Promise<Page<VaultCheckpoint>> {
    return this.http.getPage<VaultCheckpoint>(
      '/v1/audit-vault/checkpoints',
      params as Record<string, unknown>,
      options,
    );
  }
}

/**
 * Audit resource — verifiable read-trail + vault-checkpoint surface.
 *
 * - `orgReadsCheckpoints` — SCITT-style cross-party read proofs (one per
 *   org-admin cross-party read).
 * - `vaultCheckpoints` — per-record 6h signed Merkle anchors used to detect
 *   audit_vault truncation / out-of-band tampering offline.
 */
export class AuditResource {
  readonly orgReadsCheckpoints: OrgReadsCheckpointsResource;
  readonly vaultCheckpoints: VaultCheckpointsResource;

  constructor(http: HttpClient) {
    this.orgReadsCheckpoints = new OrgReadsCheckpointsResource(http);
    this.vaultCheckpoints = new VaultCheckpointsResource(http);
  }
}
