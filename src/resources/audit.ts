import type { HttpClient } from '../http.js';
import type {
  RequestOptions,
  OrgAdminRead,
  OrgReadsCheckpoint,
  OrgReadsCheckpointPage,
  ListOrgAdminReadsParams,
  ListOrgReadsCheckpointsParams,
  CosignCheckpointParams,
  OrgReadsInclusionProof,
  VaultCheckpoint,
  ListVaultCheckpointsParams,
  VaultCheckpointPage,
  VaultCheckpointingSchedule,
  Page,
} from '../types.js';

/**
 * Org-admin reads checkpoint surface: SCITT-style signed tree heads
 * (`/v1/audit/org-reads/checkpoints/*`). Each cross-party admin read is
 * logged into a per-org Merkle log and periodically anchored.
 */
export class OrgReadsCheckpointsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * List recent signed checkpoints for the calling org, newest first.
   *
   * The result carries `checkpointing`, the sweep schedule. The sweep is
   * time-driven, so an empty `data` with `lastCheckpointAt: null` is a log
   * whose first sweep has not fired, not a missing checkpoint. Compare against
   * {@link listReads}, which lists the leaves the checkpoints cover: nothing
   * there means nothing has been logged.
   */
  list(
    params?: ListOrgReadsCheckpointsParams,
    options?: RequestOptions,
  ): Promise<OrgReadsCheckpointPage> {
    return this.http.get<OrgReadsCheckpointPage>(
      '/v1/audit/org-reads/checkpoints',
      params as Record<string, unknown>,
      options,
    );
  }

  /**
   * List the read-transparency log entries the checkpoints cover, oldest first
   * in `leafIndex` order. One row per qualifying cross-party admin read.
   *
   * Read it alongside {@link list}: an empty listing here means no qualifying
   * read has been logged, while rows here with no checkpoint mean the sweep has
   * not run over them yet. Verify one row against a checkpoint with
   * {@link OrgReadsCheckpointsResource.proof}, passing its `leafIndex`.
   */
  listReads(
    params?: ListOrgAdminReadsParams,
    options?: RequestOptions,
  ): Promise<Page<OrgAdminRead>> {
    return this.http.getPage<OrgAdminRead>(
      '/v1/audit/org-reads',
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
   * format/algorithm is the customer's choice; the API stores the bytes verbatim.
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
 * Vault checkpoint surface: per-record 6h signed Merkle anchors that survive
 * audit_vault TRUNCATE/DELETE. Pair with `records.getAuditExport()` to
 * cross-check the live chain against checkpoint anchors offline.
 */
export class VaultCheckpointsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * List vault checkpoints (optionally filtered to one record).
   *
   * The result carries `checkpointing`, the sweep schedule. An empty `data`
   * with `lastCheckpointAt: null` means the first sweep has not fired yet,
   * which is the normal state of a fresh install and not a missing anchor.
   */
  async list(
    params?: ListVaultCheckpointsParams,
    options?: RequestOptions,
  ): Promise<VaultCheckpointPage> {
    const { page, envelope } = await this.http.getPageWithEnvelope<VaultCheckpoint>(
      '/v1/audit-vault/checkpoints',
      params as Record<string, unknown>,
      options,
    );
    return envelope.checkpointing
      ? { ...page, checkpointing: envelope.checkpointing as VaultCheckpointingSchedule }
      : page;
  }
}

/**
 * Audit resource: verifiable read-trail + vault-checkpoint surface.
 *
 * - `orgReadsCheckpoints`: SCITT-style cross-party read proofs (one per
 *   org-admin cross-party read).
 * - `vaultCheckpoints`: per-record 6h signed Merkle anchors used to detect
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
