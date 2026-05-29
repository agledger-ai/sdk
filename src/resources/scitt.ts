import type { HttpClient } from '../http.js';
import type { RequestOptions, ScittConfiguration, ScittCheckpoint } from '../types.js';

/**
 * SCITT Transparency Service surface (draft-ietf-scitt-scrapi-09).
 *
 * Customers register Signed Statements (COSE_Sign1) and receive Receipts
 * (COSE_Sign1 carrying RFC 9162 Merkle inclusion proofs per
 * draft-ietf-cose-merkle-tree-proofs-18). Reads return Transparent Statements
 * (Signed Statement + Receipt(s) composed at unprotected label 394). The
 * Transparency Service's COSE_KeySet is available at `/.well-known/scitt-keys`
 * for offline Receipt verification.
 *
 * Wire types are `application/cose` for entries and `application/cose-key-set`
 * for keys. 4xx / 5xx return `application/concise-problem-details+cbor`
 * (RFC 9290) — NOT JSON. The error body is captured on
 * `AgledgerApiError.rawBody` for the caller to decode.
 */
export class ScittResource {
  readonly entries: ScittEntriesResource;
  readonly keys: ScittKeysResource;

  constructor(private readonly http: HttpClient) {
    this.entries = new ScittEntriesResource(http);
    this.keys = new ScittKeysResource(http);
  }

  /**
   * Fetch the SCRAPI discovery document (`/.well-known/scitt-configuration`,
   * unauthenticated) — registration/resolution/checkpoint endpoints plus
   * supported signature algorithms and registration policies. Returns JSON.
   */
  getConfiguration(options?: RequestOptions): Promise<ScittConfiguration> {
    return this.http.get<ScittConfiguration>('/.well-known/scitt-configuration', undefined, {
      authOverride: 'none',
      ...options,
    });
  }

  /**
   * Fetch the org's signed SCITT log checkpoint (tree head). The signature
   * covers a canonical input prefixed by `logId`. Returns JSON.
   */
  getCheckpoint(options?: RequestOptions): Promise<ScittCheckpoint> {
    return this.http.get<ScittCheckpoint>('/v1/scitt/checkpoint', undefined, options);
  }
}

export class ScittEntriesResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Register a customer-prepared Signed Statement.
   *
   * @param signedStatement Tagged COSE_Sign1 bytes (the Signed Statement).
   * @returns The Receipt as tagged COSE_Sign1 bytes. Per SCITT spec, posting
   *   the same bytes twice creates two distinct entries.
   */
  register(signedStatement: Uint8Array, options?: RequestOptions): Promise<Uint8Array> {
    return this.http.requestBinary('POST', '/v1/scitt/entries', {
      ...options,
      body: signedStatement,
      contentType: 'application/cose',
      accept: 'application/cose',
    });
  }

  /**
   * Read a Transparent Statement (Signed Statement + Receipt(s)) by entry id.
   */
  get(entryId: string, options?: RequestOptions): Promise<Uint8Array> {
    return this.http.requestBinary('GET', `/v1/scitt/entries/${entryId}`, {
      ...options,
      accept: 'application/cose',
    });
  }
}

export class ScittKeysResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Fetch the Transparency Service's COSE_KeySet (unauthenticated).
   *
   * Returned as CBOR bytes — an array of COSE_Key maps. Each carries `kid`
   * (label 2), `kty` (label 1), and `crv`/`x` for EdDSA (Ed25519). Use the
   * resolved key to verify Receipts offline.
   */
  list(options?: RequestOptions): Promise<Uint8Array> {
    return this.http.requestBinary('GET', '/.well-known/scitt-keys', {
      ...options,
      accept: 'application/cose-key-set',
      authOverride: 'none',
    });
  }

  /** Fetch a single COSE_Key by kid (unauthenticated). */
  get(kid: string, options?: RequestOptions): Promise<Uint8Array> {
    return this.http.requestBinary('GET', `/.well-known/scitt-keys/${kid}`, {
      ...options,
      accept: 'application/cose-key',
      authOverride: 'none',
    });
  }
}
