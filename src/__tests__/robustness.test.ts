import { describe, it, expect, vi } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash, generateKeyPairSync, sign as nodeSign } from 'node:crypto';
import { HttpClient } from '../http.js';
import { AgledgerClient } from '../client.js';
import { ConfigurationError, ConnectionError, TimeoutError, RateLimitError, PaginationLimitError } from '../errors.js';
import {
  verifySignature,
  constructEvent,
  signPayload,
  parseSignatureHeader,
  verifyRfc9421,
} from '../webhooks/verify.js';

const BASE = 'https://agledger.test';

function ok(json: unknown = {}, headers: Record<string, string> = {}, status = 200) {
  return {
    ok: true,
    status,
    statusText: 'OK',
    json: vi.fn().mockResolvedValue(json),
    text: vi.fn().mockResolvedValue(JSON.stringify(json)),
    headers: new Headers(headers),
  };
}

function refused(status: number, headers: Record<string, string> = {}) {
  return { ...ok({ error: 'x' }, headers, status), ok: false, statusText: 'Refused' };
}

function client(fetchFn: unknown, opts: Record<string, unknown> = {}) {
  return new HttpClient({
    apiKey: 'k',
    baseUrl: BASE,
    fetch: fetchFn as typeof globalThis.fetch,
    maxRetries: 0,
    ...opts,
  });
}

function abortError() {
  return Object.assign(new Error('aborted'), { name: 'AbortError' });
}

describe('path parameters are encoded', () => {
  it('no resource file interpolates a value into a path string raw', () => {
    const dir = resolve(__dirname, '..', 'resources');
    const offenders: string[] = [];
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.ts'))) {
      const src = readFileSync(resolve(dir, file), 'utf8');
      // A template literal that starts like a route and interpolates, without the path tag.
      for (const m of src.matchAll(/(?<!path)`\/[^`\n]*\$\{[^`]*`/g)) offenders.push(`${file}: ${m[0]}`);
      // A route built by concatenation.
      for (const m of src.matchAll(/['"]\/(?:v1|federation|predicates|\.well-known)[^'"]*['"]\s*\+/g)) {
        offenders.push(`${file}: ${m[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('sends an id with path characters as one segment', async () => {
    const fetchFn = vi.fn().mockResolvedValue(ok({ id: 'x' }));
    const sdk = new AgledgerClient({ apiKey: 'k', baseUrl: BASE, fetch: fetchFn as never, maxRetries: 0 });
    await sdk.records.get('../admin/x?y=1#z');
    const url = new URL(fetchFn.mock.calls[0][0] as string);
    expect(url.pathname).toBe('/v1/records/..%2Fadmin%2Fx%3Fy%3D1%23z');
    expect(url.search).toBe('');
    expect(url.hash).toBe('');
  });

  it('refuses an id that is a dot segment', async () => {
    const fetchFn = vi.fn().mockResolvedValue(ok({}));
    const sdk = new AgledgerClient({ apiKey: 'k', baseUrl: BASE, fetch: fetchFn as never, maxRetries: 0 });
    await expect((async () => sdk.records.get('..'))()).rejects.toBeInstanceOf(RangeError);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe('webhook replay window', () => {
  const body = '{"type":"record.created","data":{}}';
  const old = signPayload(body, 'sec', Math.floor(Date.now() / 1000) - 30 * 86400);

  it.each([NaN, Infinity, -Infinity, -1])('toleranceSeconds %s throws instead of disabling the window', (t) => {
    expect(() => verifySignature(body, old.header, 'sec', t)).toThrow(RangeError);
    expect(() => constructEvent(body, old.header, 'sec', t)).toThrow(RangeError);
  });

  it('a 30-day-old signature still fails with a valid tolerance', () => {
    expect(verifySignature(body, old.header, 'sec', 300)).toBe(false);
  });

  it.each([[''], [' '], [['']], [[' ']], [[]], [['sec', '']]])('a blank secret %j throws ConfigurationError rather than verifying a forgery', (secrets) => {
    // An empty string is a valid HMAC key, so a receiver deployed with
    // WEBHOOK_SECRET= set but empty would accept anything signed with it.
    const forged = signPayload(body, '');
    expect(() => verifySignature(body, forged.header, secrets as string | string[])).toThrow(ConfigurationError);
    expect(() => constructEvent(body, forged.header, secrets as string | string[])).toThrow(ConfigurationError);
  });

  it('rejects a non-finite tolerance on the RFC 9421 path, not as a plain false', async () => {
    for (const t of [NaN, Infinity, -1]) {
      await expect(verifyRfc9421({}, body, 'x', { toleranceSeconds: t })).rejects.toBeInstanceOf(RangeError);
    }
  });
});

describe('signature header and event parsing', () => {
  it('requires the timestamp to be all digits', () => {
    expect(parseSignatureHeader('t=12abc,v1=aa')).toBeNull();
    expect(parseSignatureHeader('t=-5,v1=aa')).toBeNull();
    expect(parseSignatureHeader('t=12,v1=aa')).toEqual({ timestamp: 12, signatures: ['aa'] });
  });

  it('leaves timestamp undefined when the body has none', () => {
    const body = '{"type":"record.created","data":{}}';
    const { header } = signPayload(body, 'sec');
    expect(constructEvent(body, header, 'sec').timestamp).toBeUndefined();
  });
});

describe('RFC 9421: every label is tried', () => {
  it('a label naming an unusable key does not stop a later valid label', async () => {
    const body = '{"type":"signal.emitted","data":{}}';
    const digest = `sha-256=:${createHash('sha256').update(body, 'utf8').digest('base64')}:`;
    const idem = 'abc-1';
    const ed = generateKeyPairSync('ed25519');
    const spki = ed.publicKey.export({ format: 'der', type: 'spki' }).toString('base64');
    const created = Math.floor(Date.now() / 1000);
    const covered = '("content-digest" "x-agledger-idempotency-key")';
    const label = (name: string, keyid: string) => {
      const params = `${covered};created=${created};keyid="${keyid}";alg="ed25519"`;
      const base = [
        `"content-digest": ${digest}`,
        `"x-agledger-idempotency-key": ${idem}`,
        `"@signature-params": ${params}`,
      ].join('\n');
      return {
        input: `${name}=${params}`,
        sig: `${name}=:${nodeSign(null, Buffer.from(base), ed.privateKey).toString('base64')}:`,
      };
    };
    const bad = label('a', 'bad');
    const good = label('b', 'good');
    const headers = {
      'content-digest': digest,
      'x-agledger-idempotency-key': idem,
      'signature-input': `${bad.input}, ${good.input}`,
      signature: `${bad.sig}, ${good.sig}`,
    };
    const keys = [
      { keyId: 'bad', publicKey: 'AAAA', activatedAt: '2020-01-01T00:00:00Z', retiredAt: null },
      { keyId: 'good', publicKey: spki, activatedAt: '2020-01-01T00:00:00Z', retiredAt: null },
    ] as never;
    expect(await verifyRfc9421(headers, body, keys)).toBe(true);
  });
});

describe('request lifecycle', () => {
  const stalledBody = (field: 'json' | 'text') => (_url: string, init: RequestInit) =>
    Promise.resolve({
      ok: true,
      status: 200,
      headers: new Headers(),
      [field]: () =>
        new Promise((_res, rej) => {
          init.signal?.addEventListener('abort', () => rej(abortError()));
        }),
    });

  it('timeout covers reading the body', async () => {
    const c = client(vi.fn(stalledBody('json')));
    await expect(c.get('/x', undefined, { timeout: 20 })).rejects.toBeInstanceOf(TimeoutError);
  });

  it('timeout covers reading an NDJSON body', async () => {
    const c = client(vi.fn(stalledBody('text')));
    await expect(c.getNdjson('/x', undefined, { timeout: 20 })).rejects.toBeInstanceOf(TimeoutError);
  });

  it('a caller abort is not a timeout and is not retried', async () => {
    const ac = new AbortController();
    const fetchFn = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise((_res, rej) => {
          init.signal?.addEventListener('abort', () => rej(abortError()));
          setTimeout(() => ac.abort(), 5);
        }),
    );
    const started = Date.now();
    const err = await client(fetchFn, { maxRetries: 3 })
      .get('/x', undefined, { signal: ac.signal })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ConnectionError);
    expect(err).not.toBeInstanceOf(TimeoutError);
    expect(Date.now() - started).toBeLessThan(500);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('a caller abort interrupts the backoff sleep', async () => {
    const ac = new AbortController();
    const fetchFn = vi.fn().mockResolvedValue(refused(503));
    setTimeout(() => ac.abort(), 50);
    const started = Date.now();
    const err = await client(fetchFn, { maxRetries: 3 })
      .get('/x', undefined, { signal: ac.signal })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ConnectionError);
    expect((err as Error).message).toBe('Request aborted');
    expect(Date.now() - started).toBeLessThan(900);
  });

  it('removes its abort listener when the request finishes', async () => {
    const ac = new AbortController();
    const add = vi.spyOn(ac.signal, 'addEventListener');
    const remove = vi.spyOn(ac.signal, 'removeEventListener');
    await client(vi.fn().mockResolvedValue(ok({}))).get('/x', undefined, { signal: ac.signal });
    expect(add).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith('abort', add.mock.calls[0][1]);
  });

  it('throws the error instead of sleeping through a Retry-After over the cap', async () => {
    const fetchFn = vi.fn().mockResolvedValue(refused(503, { 'Retry-After': '86400' }));
    const started = Date.now();
    const err = (await client(fetchFn, { maxRetries: 3 })
      .get('/x')
      .catch((e: unknown) => e)) as { retryAfter: number; status: number };
    expect(err.status).toBe(503);
    expect(err.retryAfter).toBe(86_400_000);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(Date.now() - started).toBeLessThan(500);
  });

  it('a 204 still records the request id and rate limit headers', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      ok(
        {},
        { 'x-request-id': 'req-9', 'x-ratelimit-limit': '10', 'x-ratelimit-remaining': '9', 'x-ratelimit-reset': '5' },
        204,
      ),
    );
    const c = client(fetchFn);
    await c.delete('/x');
    expect(c.lastRequestId).toBe('req-9');
    expect(c.rateLimitInfo).toEqual({ limit: 10, remaining: 9, reset: 5 });
  });

  it('a small Retry-After is still honored as an error', async () => {
    const err = await client(vi.fn().mockResolvedValue(refused(429, { 'Retry-After': '2' })))
      .get('/x')
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(RateLimitError);
  });
});

describe('paginate', () => {
  it('throws when a page says more exist but gives no cursor', async () => {
    const fetchFn = vi.fn().mockResolvedValue(ok({ data: [{ id: 1 }], hasMore: true }));
    const seen: unknown[] = [];
    await expect(
      (async () => {
        for await (const row of client(fetchFn).paginate('/x')) seen.push(row);
      })(),
    ).rejects.toBeInstanceOf(PaginationLimitError);
    expect(seen).toHaveLength(1);
  });

  it('refuses maxItems of 0', async () => {
    const fetchFn = vi.fn().mockResolvedValue(ok({ data: [{ id: 1 }], hasMore: false }));
    await expect(
      (async () => {
        for await (const row of client(fetchFn).paginate('/x', undefined, { maxItems: 0 })) void row;
      })(),
    ).rejects.toBeInstanceOf(RangeError);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

// The same refusals as the Python SDK, input by input.
describe('inputs refused as the Python SDK refuses them', () => {
  it('an empty idempotencyKey is no key: a POST still carries a generated one', async () => {
    const fetchFn = vi.fn().mockResolvedValue(ok({}));
    await client(fetchFn, { idempotencyKeyPrefix: 'app-' }).post('/v1/records', { a: 1 }, { idempotencyKey: '' });
    const sent = (fetchFn.mock.calls[0]![1] as RequestInit).headers as Record<string, string>;
    expect(sent['Idempotency-Key']).toMatch(/^app-[0-9a-f-]{36}$/);
  });

  it('a caller key is sent as given, without the prefix', async () => {
    const fetchFn = vi.fn().mockResolvedValue(ok({}));
    await client(fetchFn, { idempotencyKeyPrefix: 'app-' }).post('/v1/records', { a: 1 }, { idempotencyKey: 'mine' });
    expect(((fetchFn.mock.calls[0]![1] as RequestInit).headers as Record<string, string>)['Idempotency-Key']).toBe('mine');
  });

  it.each([0, -1, NaN, Infinity, 2_147_483_648, '5'])('timeout %s is refused at construction and per request', async (t) => {
    expect(() => client(vi.fn(), { timeout: t })).toThrow(ConfigurationError);
    const fetchFn = vi.fn().mockResolvedValue(ok({}));
    await expect(client(fetchFn).get('/v1/records', undefined, { timeout: t as number })).rejects.toBeInstanceOf(ConfigurationError);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it.each([0, -1, NaN, 1.5])('maxPages %s is refused', async (n) => {
    const walk = client(vi.fn().mockResolvedValue(ok({ data: [] }))).paginate('/v1/records', undefined, { maxPages: n });
    await expect(walk.next()).rejects.toBeInstanceOf(RangeError);
  });

  it.each(['0x10', '', '1e3', '1_0'])('Retry-After %j is not a wait', async (value) => {
    const fetchFn = vi.fn().mockResolvedValue(refused(429, { 'Retry-After': value }));
    const err = await client(fetchFn).get('/v1/records').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(RateLimitError);
    expect((err as RateLimitError).retryAfter ?? null).toBeNull();
  });

  it('a request body holding NaN or Infinity is refused, not sent as null', async () => {
    const fetchFn = vi.fn().mockResolvedValue(ok({}));
    await expect(client(fetchFn).post('/v1/records', { n: NaN })).rejects.toBeInstanceOf(ConfigurationError);
    await expect(client(fetchFn).post('/v1/records', { a: [Infinity] })).rejects.toBeInstanceOf(ConfigurationError);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('a Set or Map query value is refused rather than sent as nothing', async () => {
    const fetchFn = vi.fn().mockResolvedValue(ok({}));
    await expect(client(fetchFn).get('/v1/records', { s: new Set(['a']) })).rejects.toBeInstanceOf(ConfigurationError);
    await expect(client(fetchFn).get('/v1/records', { m: new Map([['a', 1]]) })).rejects.toBeInstanceOf(ConfigurationError);
  });
});

describe('webhook header and key forms read as the Python SDK reads them', () => {
  const body = '{"type":"record.created","data":{}}';
  const signed = () => signPayload(body, 'sec');

  it('a signature with anything appended, or in upper case, does not verify', () => {
    const { timestamp, signature } = signed();
    expect(verifySignature(body, `t=${timestamp},v1=${signature}`, 'sec')).toBe(true);
    expect(verifySignature(body, `t=${timestamp},v1=${signature}zz`, 'sec')).toBe(false);
    expect(verifySignature(body, `t=${timestamp},v1=${signature.toUpperCase()}`, 'sec')).toBe(false);
  });

  it('a part splits at its first =, and an empty v1 slot is passed over', () => {
    const { timestamp, signature } = signed();
    expect(verifySignature(body, `t=${timestamp}=zz,v1=${signature}`, 'sec')).toBe(false);
    expect(verifySignature(body, `t=${timestamp},v1=,v1=${signature}`, 'sec')).toBe(true);
    expect(parseSignatureHeader(`t=+${timestamp},v1=${signature}`)).toBeNull();
  });

  it('an RFC 9421 key that is not standard padded base64 verifies nothing', async () => {
    const { publicKey } = generateKeyPairSync('ed25519');
    const spki = publicKey.export({ format: 'der', type: 'spki' }).toString('base64');
    for (const key of [spki.replace(/=+$/, ''), Buffer.from(spki, 'base64').toString('base64url')]) {
      expect(await verifyRfc9421({}, body, key)).toBe(false);
    }
  });
});

describe('oidcCertCredential inputs, as the Python SDK refuses them', () => {
  it('refuses a refreshFraction that is not a number', async () => {
    const { oidcCertCredential } = await import('../auth/oidc-cert.js');
    expect(() => oidcCertCredential({ getOidcToken: () => 'a.b.c', refreshFraction: '0.5' as unknown as number })).toThrow(ConfigurationError);
  });

  it.each(['h.p', 'h.p.s.x'])('a token with other than three segments (%s) is not a JWT', async (shape) => {
    const { oidcCertCredential } = await import('../auth/oidc-cert.js');
    const payload = Buffer.from(JSON.stringify({ sub: 'agent' })).toString('base64url');
    const token = shape.replace('p', payload);
    const credential = oidcCertCredential({ getOidcToken: () => token });
    await expect(credential.getToken({ baseUrl: BASE, fetch: vi.fn() } as never)).rejects.toBeInstanceOf(ConfigurationError);
  });
});
