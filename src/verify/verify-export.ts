/**
 * Offline verification of an AGLedger record audit export.
 *
 * Thin adapter over `@agledger/verify-core`: the single shared verification
 * core (COSE_Sign1 / RFC 9052 hash-chain walk, Ed25519 or ES256, and the
 * signed key-statement walk) that the CLI, MCP server, and `@agledger/verify`
 * also build on. This module maps the SDK's `RecordAuditExport` response type
 * onto the core's structural input and re-exports the option and result types
 * so `@agledger/sdk/verify` keeps a stable surface.
 *
 * Format version 2.0: each entry carries a canonical COSE_Sign1 (RFC 9052 §4.4,
 * tag 18) envelope over an in-toto v1 Statement payload. The chain links via
 * sha256 of the envelope bytes; the per-entry signature is the COSE signature
 * itself.
 */
import { verifyAuditExport } from '@agledger/verify-core';
import type { VerifyExportOptions, VerifyExportResult } from '@agledger/verify-core';
import type { RecordAuditExport } from '../types.js';

export type {
  VerifyExportOptions,
  VerifyExportResult,
  EntryVerificationResult,
  SuppliedKeyEntry,
  FailureCode,
  AgentPublicKeyJwk,
  DistrustedKey,
  KeyTrustReport,
  KeyTrustNote,
  KeyTrustStatus,
  Verdict,
  KeyRegistryFinding,
  KeyRegistryFindingCode,
  OptionalCheck,
  CheckApplicability,
} from '@agledger/verify-core';

/**
 * Verify a record audit export offline.
 *
 * A key the Server publishes, embedded in the export or served by
 * `GET /v1/verification-keys`, comes from the Server's database, so on its own
 * it proves only that the chain is consistent with that database. To trust the
 * keys, pass `trustAnchors`: the SPKI digest (`sha256:<hex>`) of a vault key
 * you took out of band (the installer prints the first one). The signed key
 * statements the export carries are then walked from your pin; an entry
 * signed by a key the walk does not reach fails
 * `CHAIN_SIGNING_KEY_UNANCHORED`, and a statement that does not hold is
 * `KEY_STATEMENT_INVALID`, `KEY_CLOSURE_INVALID` or `CHAIN_KEY_WINDOW_DRIFT`,
 * listed in `result.keyTrust.findings`. Those fail the result at position 0
 * when the chain itself is intact; when it also breaks, `brokenAt` is the
 * chain failure.
 *
 * Without `trustAnchors`, `result.keyTrust.status` is `'no_anchor'` and
 * `result.optionalChecks.key_anchoring` is `'skipped_no_input'`. `valid` can
 * still be true, and it then means the chain verifies against keys nobody
 * pinned: a key written into the Server's database alone would pass. With
 * `trustAnchors`, a run in which no signature verified under an anchored key
 * (an export of unsigned history, say) is `'no_anchored_signature'`, and is no
 * more trusted. `result.verdict` says it in one word: `'trusted'` only when
 * `valid` is true and `keyTrust.status === 'walked'`, `'unanchored'` for a
 * valid result on `'no_anchor'` or `'no_anchored_signature'`, and `'failed'`
 * otherwise. Read `verdict`, not `valid` alone. `exportMetadata.anchoredFrom` is the export's own claim of the
 * Server's key; `keyTrust.anchoredFromPinned` says whether it matches one of
 * your anchors, and it never counts as an anchor itself.
 *
 * `distrustedKeys` mirrors the Server's `VAULT_DISTRUSTED_KEYS`
 * (`sha256:<hex>`, optionally `@<RFC 3339 instant>`): what such a key signed
 * from that instant counts for nothing in the walk. It is read only together
 * with `trustAnchors`, and passing it without them throws `TypeError`, as does
 * a pinned key distrusted with no instant (the Server refuses to start with
 * that pair). A pin beside a dated entry for the same key is taken: the pin
 * vouches for what the key signed before the instant. An export accounts for
 * nothing a distrusted key signed (`keyTrust.accounted` is always empty here):
 * such entries and statements fail, as the Server's export grades them; only
 * a full dump, through `@agledger/verify`, lists them as accounted for. Where
 * an export's `signingKeyWindows` lists a key retired at the instant the
 * Server distrusts it from (`distrustedFrom`), earlier than its signed
 * retirement, a pinned run not given the same entry fails on that window, and
 * the finding names the entry (`distrustedKeys sha256:<hex>@<distrustedFrom>`)
 * to confirm with the Server's operator. An option this function does
 * not read throws `TypeError` too, so a misspelt option, or 1.x's
 * `requireOutOfBandKeys` (now `requireSuppliedKeys`), cannot switch a check off.
 *
 * `options.publicKeys` accepts the result of `client.verificationKeys.list()`
 * or its `.data` array (whose `statements` are walked with the export's), or
 * a compact `Record<keyId, b64SPKI>` map. The wrong shape, or a
 * malformed anchor or distrusted key, throws `TypeError`. `result.keyProvenance`
 * counts signatures checked against `supplied` vs export-`embedded` keys: where
 * a key came from, not whether it is trusted. `requireSuppliedKeys` refuses
 * embedded keys.
 *
 * @example Verify against a key you pinned
 * ```ts
 * import { verifyExport } from '@agledger/sdk/verify';
 *
 * const exp = await client.records.getAuditExport(recordId);
 * const result = verifyExport(exp, { trustAnchors: [process.env.AGLEDGER_VAULT_KEY_PIN!] });
 * if (result.verdict === 'failed') {
 *   console.error(`Broken at position ${result.brokenAt?.position}: ${result.brokenAt?.code}`);
 * } else if (result.verdict === 'unanchored') {
 *   console.warn(result.keyTrust.detail);
 * }
 * ```
 *
 * Entries written under an OIDC cert carry the agent's own signature over the
 * request body. Pass the cert's public key as `agentKeys` to re-check those
 * too; `result.agentSignatures` counts how many were present and verified, and
 * one that does not verify breaks the chain with `CHAIN_AGENT_SIGNATURE_INVALID`.
 * Neither the export nor the Server hands out cert keys, so without `agentKeys`
 * the check reports `skipped_no_input`.
 *
 * @example Re-check the agent signatures an `oidcCertCredential` sealed
 * ```ts
 * const credential = oidcCertCredential({ getOidcToken });
 * // ... the agent writes Records through a client using `credential` ...
 * const result = verifyExport(exp, { agentKeys: [credential.publicKeyJwk] });
 * console.log(result.agentSignatures); // { present: 1, verified: 1 }
 * ```
 */
export function verifyExport(
  exportData: RecordAuditExport,
  options: VerifyExportOptions = {},
): VerifyExportResult {
  return verifyAuditExport(exportData, options);
}
