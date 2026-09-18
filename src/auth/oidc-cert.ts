import { createHash, generateKeyPairSync, sign, type KeyObject } from 'node:crypto';
import type { ApiErrorResponse, BearerCredential, BearerTokenContext, IssueEphemeralCertResult } from '../types.js';
import { AgledgerApiError, ConfigurationError, ConnectionError } from '../errors.js';

/** Domain-separation prefix the Server verifies a cert proof-of-possession under. */
const POP_CONTEXT = 'agledger.oidc.cert.v1\n';

/** Domain-separation prefix the Server verifies an agent body signature under. */
const AGENT_SIG_CONTEXT = 'agledger.agent.sig.v1\n';

const DEFAULT_REFRESH_FRACTION = 0.5;
const EXCHANGE_TIMEOUT_MS = 30_000;

/**
 * Longest wait before trying again after a refresh-point exchange failed while
 * the current cert still works.
 */
const RETRY_EXCHANGE_AFTER_MS = 30_000;

const REUSED_TOKEN_HINT =
  'getOidcToken returned a token that was already exchanged. The Server accepts each OIDC token id once, ' +
  'so getOidcToken must return a new token (a new jti) on every call.';

export interface OidcCertCredentialOptions {
  /**
   * Returns a new OIDC token (compact JWS) from your identity provider on
   * every call: a workload identity federation call, a token command, or a
   * projected Kubernetes service-account token read from disk. Called once
   * per exchange. The Server accepts each token id (`jti`) once, so a token
   * that was already exchanged is refused with 409.
   *
   * A source that cannot mint on demand, such as a token file the kubelet
   * rotates on its own schedule, can hand back the previous token at a
   * refresh. While the current cert is still valid the credential keeps using
   * it and asks again shortly; once the cert has expired, or after a request
   * made with it is refused, a reused token is an error.
   */
  getOidcToken: () => string | Promise<string>;
  /**
   * Agent to bind the cert to. Omit to let the Server resolve it from the
   * trusted issuer's claim mapping, an agent row carrying the token's
   * `(iss, sub)`, or auto-provisioning.
   */
  agentId?: string;
  /**
   * Fraction of the cert's lifetime after which the next request re-exchanges
   * ahead of expiry. Default 0.5. Must be greater than 0 and at most 1.
   */
  refreshFraction?: number;
}

/** The credential {@link oidcCertCredential} returns. */
export interface OidcCertCredential extends BearerCredential {
  /**
   * The public half of the key every cert from this credential is bound to,
   * as the Ed25519 JWK sent at exchange. It is what an offline verifier needs
   * to re-check the agent signatures this credential sealed into the chain.
   */
  readonly publicKeyJwk: { kty: 'OKP'; crv: 'Ed25519'; x: string };
}

/**
 * The Server refused the OIDC-token-for-cert exchange. Carries the Server's
 * status and error body (read `recoveryHint`), with the OIDC token scrubbed
 * from anything that echoed it back.
 */
export class OidcExchangeError extends AgledgerApiError {
  constructor(status: number, body: ApiErrorResponse) {
    super(status, body);
    this.name = 'OidcExchangeError';
    this.message = `OIDC cert exchange failed (HTTP ${status}): ${this.message}`;
  }
}

/**
 * A credential that exchanges your identity provider's OIDC token for a
 * short-lived AGLedger cert (`POST /v1/auth/oidc/cert`) and presents the cert
 * as the bearer. Pass it as `bearerToken`:
 *
 * ```ts
 * const client = new AgledgerClient({
 *   baseUrl: 'https://agledger.internal',
 *   bearerToken: oidcCertCredential({ getOidcToken: () => readFile(tokenPath, 'utf8') }),
 * });
 * ```
 *
 * It holds one Ed25519 key pair, generated in memory when the credential is
 * created and never written anywhere. Each exchange binds that key to a new
 * cert. The cert is re-exchanged once `refreshFraction` of its lifetime has
 * passed, and once more if a request made with it is refused with 401.
 * Concurrent requests share a single exchange.
 *
 * Because the credential holds the cert's key, it also signs every request
 * body: `X-Agent-Signature-Content-Hash` carries `sha256:<hex>` of the exact
 * bytes sent and `X-Agent-Signature` an Ed25519 signature over it. The Server
 * records the signature in the chain entry for record create, transition and
 * verdict, completion submit, and A2A.
 */
export function oidcCertCredential(options: OidcCertCredentialOptions): OidcCertCredential {
  if (typeof options?.getOidcToken !== 'function') {
    throw new ConfigurationError('oidcCertCredential needs getOidcToken, a function returning a fresh OIDC token.');
  }
  const refreshFraction = options.refreshFraction ?? DEFAULT_REFRESH_FRACTION;
  if (!(refreshFraction > 0 && refreshFraction <= 1)) {
    throw new ConfigurationError(
      `refreshFraction must be greater than 0 and at most 1; got ${String(options.refreshFraction)}.`,
    );
  }
  const { getOidcToken, agentId } = options;
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const publicKeyJwk = publicJwk(publicKey);

  let cached: { token: string; refreshAt: number; expiresAt: number } | undefined;
  let inflight: Promise<string> | undefined;

  async function exchange(ctx: BearerTokenContext): Promise<string> {
    const oidcToken = await getOidcToken();
    if (typeof oidcToken !== 'string' || oidcToken.trim() === '') {
      throw new ConfigurationError('getOidcToken returned no token.');
    }
    const token = oidcToken.trim();
    const sub = subjectOf(token);
    const proofOfPossession = sign(null, Buffer.from(`${POP_CONTEXT}${sub}`, 'utf8'), privateKey).toString('base64');
    const body = JSON.stringify({ oidcToken: token, publicKeyJwk, proofOfPossession, ...(agentId ? { agentId } : {}) });

    const url = `${ctx.baseUrl}/v1/auth/oidc/cert`;
    let response: Response;
    try {
      response = await ctx.fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body,
        signal: AbortSignal.timeout(EXCHANGE_TIMEOUT_MS),
      });
    } catch (err) {
      const cause = err as Error;
      throw new ConnectionError(`OIDC cert exchange failed: ${cause.message} (POST ${url})`, cause);
    }

    let parsed: unknown;
    try {
      parsed = await response.json();
    } catch {
      parsed = undefined;
    }
    if (!response.ok) {
      const errorBody = (scrub(parsed, token) ?? {
        error: 'unknown',
        message: response.statusText || `HTTP ${response.status}`,
      }) as ApiErrorResponse;
      if (!errorBody.requestId) errorBody.requestId = response.headers.get('x-request-id') ?? undefined;
      if (response.status === 409) {
        // The source handed back a token the Server already exchanged. At a
        // refresh point getToken keeps the current cert; this is the error
        // for when there is no cert left to keep.
        const error = new OidcExchangeError(409, errorBody);
        error.message = `${error.message}. ${REUSED_TOKEN_HINT}`;
        throw error;
      }
      throw new OidcExchangeError(response.status, errorBody);
    }

    const result = parsed as Partial<IssueEphemeralCertResult> | undefined;
    const certJws = result?.certJws;
    const issuedAt = Date.parse(result?.cert?.issuedAt ?? '');
    const expiresAt = Date.parse(result?.cert?.expiresAt ?? '');
    if (typeof certJws !== 'string' || !Number.isFinite(issuedAt) || !Number.isFinite(expiresAt)) {
      throw new OidcExchangeError(response.status, {
        error: 'invalid_exchange_response',
        message: 'the response carried no certJws or no cert validity window',
      });
    }
    // Measure the refresh point on this machine's clock from the cert's own
    // lifetime, so clock skew against the Server cannot make a fresh cert
    // look stale or an expired one look fresh.
    const lifetime = Math.max(0, expiresAt - issuedAt);
    const now = Date.now();
    cached = { token: certJws, refreshAt: now + refreshFraction * lifetime, expiresAt: now + lifetime };
    return certJws;
  }

  return {
    publicKeyJwk: Object.freeze({ ...publicKeyJwk }),

    async getToken(ctx: BearerTokenContext): Promise<string> {
      if (inflight) return inflight;
      const refused =
        !!cached && ctx.forceRefresh && (ctx.rejectedToken === undefined || ctx.rejectedToken === cached.token);
      const now = Date.now();
      if (cached && !refused && now < cached.refreshAt) return cached.token;
      // Only an ahead-of-expiry refresh has a cert to fall back on. A forced
      // exchange (the Server refused the cert) or one after expiry has none,
      // so its failure is the request's failure.
      const fallback = cached && !refused && now < cached.expiresAt ? cached : undefined;
      inflight = exchange(ctx)
        .catch((err: unknown) => {
          const t = Date.now();
          if (!fallback || cached !== fallback || t >= fallback.expiresAt) throw err;
          // The IdP or the Server is unavailable, or the source repeated a
          // token: keep the cert that still works and try again shortly.
          fallback.refreshAt = t + Math.max(1_000, Math.min(RETRY_EXCHANGE_AFTER_MS, (fallback.expiresAt - t) / 4));
          return fallback.token;
        })
        .finally(() => {
          inflight = undefined;
        });
      return inflight;
    },

    signBody(body: Uint8Array): Record<string, string> {
      const hex = createHash('sha256').update(body).digest('hex');
      const signature = sign(null, Buffer.from(`${AGENT_SIG_CONTEXT}${hex}`, 'utf8'), privateKey).toString('base64');
      return {
        'X-Agent-Signature-Content-Hash': `sha256:${hex}`,
        'X-Agent-Signature': signature,
      };
    },
  };
}

function publicJwk(publicKey: KeyObject): { kty: 'OKP'; crv: 'Ed25519'; x: string } {
  const jwk = publicKey.export({ format: 'jwk' });
  return { kty: 'OKP', crv: 'Ed25519', x: String(jwk.x) };
}

/** The token's `sub`, read without verifying: the Server verifies the token. */
function subjectOf(token: string): string {
  const payload = token.split('.')[1];
  let sub: unknown;
  try {
    sub = (JSON.parse(Buffer.from(payload ?? '', 'base64url').toString('utf8')) as { sub?: unknown }).sub;
  } catch {
    sub = undefined;
  }
  if (typeof sub !== 'string' || sub === '') {
    throw new ConfigurationError(
      'The token from getOidcToken is not a JWT with a `sub` claim; the exchange signs over the subject.',
    );
  }
  return sub;
}

/**
 * The Server's 400 names the offending input, and for this route the input is
 * the OIDC token. An error object gets logged; the token must not go with it.
 */
function scrub(value: unknown, secret: string): unknown {
  if (typeof value === 'string') {
    if (value.includes(secret)) return value.split(secret).join('[redacted]');
    // A truncated echo is still most of a bearer.
    return value.length >= 16 && secret.includes(value) ? '[redacted]' : value;
  }
  if (Array.isArray(value)) return value.map((v) => scrub(v, secret));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, scrub(v, secret)]));
  }
  return value;
}
