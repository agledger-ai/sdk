import { describe, it, expect, vi, afterEach } from 'vitest';
import { createHash, createPublicKey, verify } from 'node:crypto';
import { AgledgerClient } from '../client.js';
import { oidcCertCredential, OidcExchangeError } from '../auth/oidc-cert.js';
import { AuthenticationError, ConfigurationError } from '../errors.js';
import type { AgledgerClientOptions } from '../types.js';

const BASE = 'https://agledger.test';

/** An unsigned JWT with the given claims: the SDK reads `sub`, the Server verifies. */
function jwt(claims: Record<string, unknown>): string {
  const enc = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${enc({ alg: 'RS256', typ: 'JWT' })}.${enc(claims)}.c2lnbmF0dXJl`;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

interface Exchange {
  body: { oidcToken: string; publicKeyJwk: { kty: string; crv: string; x: string }; proofOfPossession: string; agentId?: string };
}

/**
 * A fake Server: `POST /v1/auth/oidc/cert` mints `cert-<n>` with the given
 * lifetime; every other route answers with `respond`, which sees the bearer.
 */
function fakeServer(opts: {
  lifetimeMs?: number;
  respond?: (req: { url: string; init: RequestInit; bearer: string | undefined }) => Response;
  exchange?: (n: number) => Response | undefined;
} = {}) {
  const exchanges: Exchange[] = [];
  const requests: Array<{ url: string; init: RequestInit; bearer: string | undefined }> = [];
  const lifetime = opts.lifetimeMs ?? 120_000;
  const fetch = vi.fn(async (url: string, init: RequestInit) => {
    if (url.endsWith('/v1/auth/oidc/cert')) {
      exchanges.push({ body: JSON.parse(init.body as string) });
      const override = opts.exchange?.(exchanges.length);
      if (override) return override;
      const issuedAt = new Date(Date.now());
      return json(201, {
        cert: { id: `c${exchanges.length}`, issuedAt: issuedAt.toISOString(), expiresAt: new Date(issuedAt.getTime() + lifetime).toISOString() },
        certJws: `cert-${exchanges.length}`,
        nextSteps: [],
      });
    }
    const headers = init.headers as Record<string, string>;
    const bearer = headers.Authorization?.replace(/^Bearer /, '');
    const req = { url, init, bearer };
    requests.push(req);
    return opts.respond?.(req) ?? json(200, { ok: true });
  });
  return { fetch, exchanges, requests };
}

function tokenSource() {
  let n = 0;
  const getOidcToken = vi.fn(async () => jwt({ sub: 'workload-a', jti: `jti-${++n}`, aud: 'agledger' }));
  return getOidcToken;
}

function client(fetch: unknown, bearerToken: AgledgerClientOptions['bearerToken']) {
  return new AgledgerClient({ baseUrl: BASE, bearerToken, fetch: fetch as typeof globalThis.fetch, maxRetries: 0 });
}

afterEach(() => {
  vi.useRealTimers();
});

describe('client credential options', () => {
  it('refuses a client with neither apiKey nor bearerToken', () => {
    expect(() => new AgledgerClient({ baseUrl: BASE })).toThrow(ConfigurationError);
  });

  it('refuses a client with both', () => {
    expect(() => new AgledgerClient({ baseUrl: BASE, apiKey: 'agl_agt_x', bearerToken: 'tok' })).toThrow(
      /not both/,
    );
  });

  it('sends a string bearerToken as is', async () => {
    const server = fakeServer();
    await client(server.fetch, 'plain-token').auth.getMe();
    expect(server.requests[0].bearer).toBe('plain-token');
  });

  it('calls a function bearer on every request and every retry, caching nothing', async () => {
    let n = 0;
    const fn = vi.fn(() => `tok-${++n}`);
    const server = fakeServer({
      respond: ({ bearer }) => (bearer === 'tok-2' ? json(503, { error: 'unavailable' }) : json(200, {})),
    });
    const c = new AgledgerClient({ baseUrl: BASE, bearerToken: fn, fetch: server.fetch as never, maxRetries: 1 });
    vi.useFakeTimers({ toFake: ['setTimeout'] });
    await c.auth.getMe();
    const second = c.auth.getMe();
    await vi.runAllTimersAsync();
    await second;
    expect(server.requests.map((r) => r.bearer)).toEqual(['tok-1', 'tok-2', 'tok-3']);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('does not re-call a function bearer on a 401', async () => {
    const fn = vi.fn(() => 'admin-oidc');
    const server = fakeServer({ respond: () => json(401, { error: 'UNAUTHORIZED', message: 'jti already presented' }) });
    await expect(client(server.fetch, fn).auth.getMe()).rejects.toBeInstanceOf(AuthenticationError);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('sends onBehalfOf as the AGLedger-On-Behalf-Of header', async () => {
    const server = fakeServer();
    await client(server.fetch, 'tok').records.create(
      { type: 't', criteria: {} } as never,
      { onBehalfOf: 'delegation.jws' },
    );
    expect((server.requests[0].init.headers as Record<string, string>)['AGLedger-On-Behalf-Of']).toBe('delegation.jws');
  });
});

describe('oidcCertCredential', () => {
  it('exchanges with a proof of possession over the token subject, in standard base64', async () => {
    const server = fakeServer();
    const getOidcToken = tokenSource();
    await client(server.fetch, oidcCertCredential({ getOidcToken, agentId: '01a0b338-29a7-7fcf-b03d-ab26c1145356' })).auth.getMe();

    expect(server.exchanges).toHaveLength(1);
    const { body } = server.exchanges[0];
    expect(Object.keys(body).sort()).toEqual(['agentId', 'oidcToken', 'proofOfPossession', 'publicKeyJwk']);
    expect(body.agentId).toBe('01a0b338-29a7-7fcf-b03d-ab26c1145356');
    expect(body.publicKeyJwk).toEqual({ kty: 'OKP', crv: 'Ed25519', x: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/) });
    expect(body.proofOfPossession).toMatch(/^[A-Za-z0-9+/]{86}==$/);
    expect(body.proofOfPossession).toHaveLength(88);

    const key = createPublicKey({ key: body.publicKeyJwk, format: 'jwk' });
    const signed = Buffer.from('agledger.oidc.cert.v1\nworkload-a', 'utf8');
    expect(verify(null, signed, key, Buffer.from(body.proofOfPossession, 'base64'))).toBe(true);
  });

  it('omits agentId when none is given', async () => {
    const server = fakeServer();
    await client(server.fetch, oidcCertCredential({ getOidcToken: tokenSource() })).auth.getMe();
    expect(server.exchanges[0].body).not.toHaveProperty('agentId');
  });

  it('presents the cert as the bearer and reuses it until the refresh point', async () => {
    const server = fakeServer();
    const getOidcToken = tokenSource();
    const c = client(server.fetch, oidcCertCredential({ getOidcToken }));
    await c.auth.getMe();
    await c.auth.getMe();
    expect(server.requests.map((r) => r.bearer)).toEqual(['cert-1', 'cert-1']);
    expect(server.exchanges).toHaveLength(1);
  });

  it('re-exchanges with a fresh token once time passes the refresh point', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-18T00:00:00Z'));
    const server = fakeServer({ lifetimeMs: 120_000 });
    const getOidcToken = tokenSource();
    const c = client(server.fetch, oidcCertCredential({ getOidcToken }));
    await c.auth.getMe();
    vi.setSystemTime(new Date('2026-09-18T00:00:59Z'));
    await c.auth.getMe();
    expect(server.exchanges).toHaveLength(1);
    vi.setSystemTime(new Date('2026-09-18T00:01:00Z'));
    await c.auth.getMe();
    expect(server.exchanges).toHaveLength(2);
    expect(server.requests.map((r) => r.bearer)).toEqual(['cert-1', 'cert-1', 'cert-2']);
    // A new OIDC token per exchange: the Server accepts each token id once.
    expect(getOidcToken).toHaveBeenCalledTimes(2);
    expect(server.exchanges[0].body.oidcToken).not.toBe(server.exchanges[1].body.oidcToken);
    // The same key pair is bound to every cert the credential holds.
    expect(server.exchanges[0].body.publicKeyJwk).toEqual(server.exchanges[1].body.publicKeyJwk);
  });

  it('honours refreshFraction', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-18T00:00:00Z'));
    const server = fakeServer({ lifetimeMs: 100_000 });
    const c = client(server.fetch, oidcCertCredential({ getOidcToken: tokenSource(), refreshFraction: 0.9 }));
    await c.auth.getMe();
    vi.setSystemTime(new Date('2026-09-18T00:01:29Z'));
    await c.auth.getMe();
    expect(server.exchanges).toHaveLength(1);
    vi.setSystemTime(new Date('2026-09-18T00:01:30Z'));
    await c.auth.getMe();
    expect(server.exchanges).toHaveLength(2);
  });

  it('rejects a refreshFraction outside (0, 1]', () => {
    expect(() => oidcCertCredential({ getOidcToken: tokenSource(), refreshFraction: 0 })).toThrow(ConfigurationError);
    expect(() => oidcCertCredential({ getOidcToken: tokenSource(), refreshFraction: 1.5 })).toThrow(ConfigurationError);
  });

  it('re-exchanges once on a 401 and retries the request once', async () => {
    const server = fakeServer({
      respond: ({ bearer }) => (bearer === 'cert-1' ? json(401, { error: 'UNAUTHORIZED', message: 'cert expired' }) : json(200, { ok: true })),
    });
    const c = client(server.fetch, oidcCertCredential({ getOidcToken: tokenSource() }));
    await expect(c.auth.getMe()).resolves.toEqual({ ok: true });
    expect(server.exchanges).toHaveLength(2);
    expect(server.requests.map((r) => r.bearer)).toEqual(['cert-1', 'cert-2']);
  });

  it('surfaces a second 401 as the authentication error, after exactly one re-exchange', async () => {
    const server = fakeServer({ respond: () => json(401, { error: 'UNAUTHORIZED', message: 'scope revoked' }) });
    const c = client(server.fetch, oidcCertCredential({ getOidcToken: tokenSource() }));
    const err = await c.auth.getMe().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err).not.toBeInstanceOf(OidcExchangeError);
    expect(server.exchanges).toHaveLength(2);
    expect(server.requests).toHaveLength(2);
  });

  it('shares one exchange across concurrent requests', async () => {
    const server = fakeServer();
    const c = client(server.fetch, oidcCertCredential({ getOidcToken: tokenSource() }));
    await Promise.all(Array.from({ length: 10 }, () => c.auth.getMe()));
    expect(server.exchanges).toHaveLength(1);
    expect(new Set(server.requests.map((r) => r.bearer))).toEqual(new Set(['cert-1']));
  });

  it('shares one re-exchange when concurrent requests all meet a 401', async () => {
    const server = fakeServer({
      respond: ({ bearer }) => (bearer === 'cert-1' ? json(401, { error: 'UNAUTHORIZED' }) : json(200, {})),
    });
    const c = client(server.fetch, oidcCertCredential({ getOidcToken: tokenSource() }));
    await Promise.all(Array.from({ length: 5 }, () => c.auth.getMe()));
    expect(server.exchanges).toHaveLength(2);
  });

  it('signs a request body over the exact bytes sent', async () => {
    const server = fakeServer();
    const c = client(server.fetch, oidcCertCredential({ getOidcToken: tokenSource() }));
    await c.records.create({ type: 'notarize-generic-v1', criteria: { note: 'café' } } as never);

    const { init } = server.requests[0];
    const headers = init.headers as Record<string, string>;
    const sent = Buffer.from(init.body as string, 'utf8');
    const hex = createHash('sha256').update(sent).digest('hex');
    expect(headers['X-Agent-Signature-Content-Hash']).toBe(`sha256:${hex}`);
    expect(headers['X-Agent-Signature']).toMatch(/^[A-Za-z0-9+/]{86}==$/);

    const key = createPublicKey({ key: server.exchanges[0].body.publicKeyJwk, format: 'jwk' });
    const signed = Buffer.from(`agledger.agent.sig.v1\n${hex}`, 'utf8');
    expect(verify(null, signed, key, Buffer.from(headers['X-Agent-Signature'], 'base64'))).toBe(true);
  });

  it('keeps the same signed bytes on the retry after a 401', async () => {
    const server = fakeServer({
      respond: ({ bearer }) => (bearer === 'cert-1' ? json(401, { error: 'UNAUTHORIZED' }) : json(201, { id: 'r' })),
    });
    const c = client(server.fetch, oidcCertCredential({ getOidcToken: tokenSource() }));
    await c.records.create({ type: 't', criteria: {} } as never);
    const [first, second] = server.requests.map((r) => r.init);
    expect(second.body).toBe(first.body);
    expect((second.headers as Record<string, string>)['X-Agent-Signature']).toBe(
      (first.headers as Record<string, string>)['X-Agent-Signature'],
    );
  });

  it('sends no signature on a request without a body, or with an auth override', async () => {
    const server = fakeServer();
    const c = client(server.fetch, oidcCertCredential({ getOidcToken: tokenSource() }));
    await c.auth.getMe();
    await c.request('POST', '/v1/x', { a: 1 }, { authOverride: 'other' });
    for (const { init } of server.requests) {
      expect(init.headers).not.toHaveProperty('X-Agent-Signature');
    }
  });

  it('names a failed exchange, carries the recoveryHint, and scrubs the OIDC token', async () => {
    let token = '';
    const server = fakeServer({
      exchange: () =>
        json(400, {
          error: 'VALIDATION_ERROR',
          message: `body/oidcToken is not a trusted issuer token: ${token}`,
          recoveryHint: 'Register the issuer with POST /v1/admin/trusted-issuers.',
          details: [
            { instancePath: '/oidcToken', received: token },
            { instancePath: '/oidcToken', received: token.slice(0, 40) },
          ],
        }),
    });
    const getOidcToken = vi.fn(async () => {
      token = jwt({ sub: 'workload-a', jti: 'j1' });
      return token;
    });
    const err = (await client(server.fetch, oidcCertCredential({ getOidcToken })).auth.getMe().catch((e: unknown) => e)) as OidcExchangeError;

    expect(err).toBeInstanceOf(OidcExchangeError);
    expect(err.status).toBe(400);
    expect(err.message).toMatch(/^OIDC cert exchange failed \(HTTP 400\)/);
    expect(err.recoveryHint).toBe('Register the issuer with POST /v1/admin/trusted-issuers.');
    const everything = JSON.stringify({ message: err.message, details: err.details, stack: err.stack });
    expect(everything).not.toContain(token);
    expect(everything).not.toContain(token.slice(0, 40));
    expect(everything).toContain('[redacted]');
    // A refused exchange is not retried and never reaches the route.
    expect(server.requests).toHaveLength(0);
  });

  describe('a token source that repeats a token', () => {
    const alreadyExchanged = () =>
      json(409, { error: 'CONFLICT', message: 'This OIDC token id has already been exchanged' });

    it('keeps a still-valid cert when the refresh-point exchange is refused as a reuse', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-09-18T00:00:00Z'));
      let fileToken = jwt({ sub: 'workload-a', jti: 'kubelet-1' });
      const server = fakeServer({
        lifetimeMs: 120_000,
        exchange: (n) => (n === 2 ? alreadyExchanged() : undefined),
      });
      const c = client(server.fetch, oidcCertCredential({ getOidcToken: () => fileToken }));
      await c.auth.getMe();
      vi.setSystemTime(new Date('2026-09-18T00:01:10Z'));
      await expect(c.auth.getMe()).resolves.toBeDefined();
      expect(server.requests.map((r) => r.bearer)).toEqual(['cert-1', 'cert-1']);
      // The source is asked again soon rather than on every request.
      await c.auth.getMe();
      expect(server.exchanges).toHaveLength(2);
      // Once the kubelet rotates the file, the next check exchanges it.
      fileToken = jwt({ sub: 'workload-a', jti: 'kubelet-2' });
      vi.setSystemTime(new Date('2026-09-18T00:01:45Z'));
      await c.auth.getMe();
      expect(server.exchanges).toHaveLength(3);
      expect(server.requests.at(-1)!.bearer).toBe('cert-3');
    });

    it('fails once the cert has expired, naming the reused token', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-09-18T00:00:00Z'));
      const server = fakeServer({ lifetimeMs: 120_000, exchange: (n) => (n > 1 ? alreadyExchanged() : undefined) });
      const c = client(server.fetch, oidcCertCredential({ getOidcToken: () => jwt({ sub: 'workload-a', jti: 'same' }) }));
      await c.auth.getMe();
      vi.setSystemTime(new Date('2026-09-18T00:02:01Z'));
      const err = (await c.auth.getMe().catch((e: unknown) => e)) as OidcExchangeError;
      expect(err).toBeInstanceOf(OidcExchangeError);
      expect(err.status).toBe(409);
      expect(err.message).toMatch(/already exchanged/);
      expect(err.message).toMatch(/must return a new token/);
      expect(server.requests).toHaveLength(1);
    });

    it('fails when the forced re-exchange after a 401 is refused as a reuse', async () => {
      const server = fakeServer({
        exchange: (n) => (n > 1 ? alreadyExchanged() : undefined),
        respond: () => json(401, { error: 'UNAUTHORIZED', message: 'cert revoked' }),
      });
      const c = client(server.fetch, oidcCertCredential({ getOidcToken: () => jwt({ sub: 'workload-a', jti: 'same' }) }));
      const err = (await c.auth.getMe().catch((e: unknown) => e)) as OidcExchangeError;
      expect(err).toBeInstanceOf(OidcExchangeError);
      expect(err.message).toMatch(/must return a new token/);
      expect(server.exchanges).toHaveLength(2);
    });
  });

  describe('a 401 the cert did not cause', () => {
    // Bodies as a live 1.8.0 Server answers them.
    const delegation401 = () =>
      json(401, {
        type: '/problems/unauthorized', status: 401, error: 'UNAUTHORIZED',
        detail: 'agledger-on-behalf-of token did not validate against any trusted_issuers row (applies_to in principal, any)',
        message: 'agledger-on-behalf-of token did not validate against any trusted_issuers row (applies_to in principal, any)',
      });
    const delegationReason401 = () =>
      json(401, {
        type: '/problems/unauthorized', status: 401, error: 'UNAUTHORIZED', reason: 'token_expired',
        message: 'agledger-on-behalf-of: token expired. Register or fix the principal trusted issuer.',
      });
    const signature401 = () =>
      json(401, {
        type: '/problems/unauthorized', status: 401, error: 'UNAUTHORIZED',
        detail: 'X-Agent-Signature does not verify against the ephemeral cert public key over the request body hash',
        message: 'X-Agent-Signature does not verify against the ephemeral cert public key over the request body hash',
      });

    for (const [label, respond] of [
      ['an unvalidated delegation token', delegation401],
      ['a delegation token rejected with a reason', delegationReason401],
      ['an agent signature that does not verify', signature401],
    ] as const) {
      it(`surfaces ${label} as is, without re-exchanging`, async () => {
        const server = fakeServer({ respond });
        const getOidcToken = tokenSource();
        const c = client(server.fetch, oidcCertCredential({ getOidcToken }));
        const err = (await c.records
          .create({ type: 't', criteria: {} } as never, { onBehalfOf: 'delegation.jws' })
          .catch((e: unknown) => e)) as AuthenticationError;
        expect(err).toBeInstanceOf(AuthenticationError);
        expect(err.message).toMatch(/agledger-on-behalf-of|X-Agent-Signature/);
        expect(server.exchanges).toHaveLength(1);
        expect(server.requests).toHaveLength(1);
        expect(getOidcToken).toHaveBeenCalledTimes(1);
      });
    }

    it('still re-exchanges on a revoked cert', async () => {
      const server = fakeServer({
        respond: ({ bearer }) =>
          bearer === 'cert-1'
            ? json(401, { error: 'UNAUTHORIZED', message: 'Ephemeral cert has been revoked; mint a fresh one to continue' })
            : json(200, {}),
      });
      const c = client(server.fetch, oidcCertCredential({ getOidcToken: tokenSource() }));
      await c.auth.getMe();
      expect(server.exchanges).toHaveLength(2);
    });
  });

  describe('a failed exchange at the refresh point', () => {
    for (const [label, response] of [
      ['a 503', () => json(503, { error: 'SERVICE_UNAVAILABLE', message: 'down' })],
      ['a 429', () => json(429, { error: 'RATE_LIMITED', message: 'slow down' })],
      ['a 400', () => json(400, { error: 'VALIDATION_ERROR', message: 'bad' })],
    ] as const) {
      it(`keeps the still-valid cert on ${label}, and fails only once the cert has expired`, async () => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-09-18T00:00:00Z'));
        const server = fakeServer({ lifetimeMs: 120_000, exchange: (n) => (n > 1 ? response() : undefined) });
        const c = client(server.fetch, oidcCertCredential({ getOidcToken: tokenSource() }));
        await c.auth.getMe();
        vi.setSystemTime(new Date('2026-09-18T00:01:10Z'));
        await expect(c.auth.getMe()).resolves.toBeDefined();
        expect(server.requests.map((r) => r.bearer)).toEqual(['cert-1', 'cert-1']);
        vi.setSystemTime(new Date('2026-09-18T00:02:01Z'));
        await expect(c.auth.getMe()).rejects.toBeInstanceOf(OidcExchangeError);
      });
    }

    it('keeps the still-valid cert when the token source itself fails', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-09-18T00:00:00Z'));
      let idpUp = true;
      const server = fakeServer({ lifetimeMs: 120_000 });
      const c = client(
        server.fetch,
        oidcCertCredential({
          getOidcToken: async () => {
            if (!idpUp) throw new Error('IdP unreachable');
            return jwt({ sub: 'workload-a', jti: String(Math.random()) });
          },
        }),
      );
      await c.auth.getMe();
      idpUp = false;
      vi.setSystemTime(new Date('2026-09-18T00:01:10Z'));
      await expect(c.auth.getMe()).resolves.toBeDefined();
      expect(server.requests.at(-1)!.bearer).toBe('cert-1');
    });

    it('times the refresh point from local receipt, so a skewed Server clock cannot force an exchange per request', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-09-18T00:00:00Z'));
      // The Server's clock runs ten minutes behind: its window already ended by ours.
      const server = fakeServer({
        exchange: (n) =>
          json(201, {
            cert: { id: `c${n}`, issuedAt: '2026-09-17T23:50:00.000Z', expiresAt: '2026-09-17T23:52:00.000Z' },
            certJws: `cert-${n}`,
          }),
      });
      const c = client(server.fetch, oidcCertCredential({ getOidcToken: tokenSource() }));
      await c.auth.getMe();
      await c.auth.getMe();
      await c.auth.getMe();
      expect(server.exchanges).toHaveLength(1);
    });
  });

  it('refuses a token with no readable subject before calling the Server', async () => {
    const server = fakeServer();
    const c = client(server.fetch, oidcCertCredential({ getOidcToken: () => 'not-a-jwt' }));
    await expect(c.auth.getMe()).rejects.toBeInstanceOf(ConfigurationError);
    expect(server.exchanges).toHaveLength(0);
  });

  it('keeps the private key out of anything a caller can print', () => {
    const credential = oidcCertCredential({ getOidcToken: tokenSource() });
    expect(Object.keys(credential).sort()).toEqual(['getToken', 'publicKeyJwk', 'signBody']);
    expect(Object.keys(JSON.parse(JSON.stringify(credential)))).toEqual(['publicKeyJwk']);
    expect(Object.keys(credential.publicKeyJwk).sort()).toEqual(['crv', 'kty', 'x']);
  });

  it('exposes the public JWK it binds every cert to', async () => {
    const server = fakeServer();
    const credential = oidcCertCredential({ getOidcToken: tokenSource() });
    await client(server.fetch, credential).auth.getMe();
    expect(credential.publicKeyJwk).toEqual(server.exchanges[0].body.publicKeyJwk);
  });
});
