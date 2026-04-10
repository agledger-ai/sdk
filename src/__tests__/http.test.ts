import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HttpClient } from '../http.js';
import {
  AuthenticationError,
  ValidationError,
  NotFoundError,
  PermissionError,
  UnprocessableError,
  RateLimitError,
  ConnectionError,
  TimeoutError,
} from '../errors.js';

function mockFetch(response: {
  ok?: boolean;
  status?: number;
  statusText?: string;
  json?: unknown;
  headers?: Record<string, string>;
}) {
  return vi.fn().mockResolvedValue({
    ok: response.ok ?? true,
    status: response.status ?? 200,
    statusText: response.statusText ?? 'OK',
    json: vi.fn().mockResolvedValue(response.json ?? {}),
    headers: new Headers(response.headers ?? {}),
  });
}

function createClient(fetchFn: ReturnType<typeof mockFetch>, opts?: Record<string, unknown>) {
  return new HttpClient({
    apiKey: 'test_key',
    fetch: fetchFn as unknown as typeof globalThis.fetch,
    maxRetries: 0,
    ...opts,
  });
}

describe('HttpClient', () => {
  it('sends Bearer auth header', async () => {
    const fetch = mockFetch({ json: { ok: true } });
    const client = createClient(fetch);
    await client.get('/test');

    expect(fetch).toHaveBeenCalledOnce();
    const [, init] = fetch.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer test_key');
  });

  it('builds URL with query params', async () => {
    const fetch = mockFetch({ json: {} });
    const client = createClient(fetch);
    await client.get('/test', { foo: 'bar', baz: 42, skip: undefined });

    const url = fetch.mock.calls[0][0];
    expect(url).toContain('foo=bar');
    expect(url).toContain('baz=42');
    expect(url).not.toContain('skip');
  });

  it('sends JSON body on POST', async () => {
    const fetch = mockFetch({ json: { id: '123' } });
    const client = createClient(fetch);
    await client.post('/test', { name: 'hello' });

    const [, init] = fetch.mock.calls[0];
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.body).toBe('{"name":"hello"}');
  });

  it('includes Idempotency-Key on POST', async () => {
    const fetch = mockFetch({ json: {} });
    const client = createClient(fetch);
    await client.post('/test', {});

    const [, init] = fetch.mock.calls[0];
    expect(init.headers['Idempotency-Key']).toBeDefined();
  });

  it('includes Idempotency-Key on PATCH', async () => {
    const fetch = mockFetch({ json: {} });
    const client = createClient(fetch);
    await client.patch('/test', {});

    const [, init] = fetch.mock.calls[0];
    expect(init.headers['Idempotency-Key']).toBeDefined();
  });

  it('sends JSON body on PUT and includes Idempotency-Key', async () => {
    const fetch = mockFetch({ json: { ok: true } });
    const client = createClient(fetch);
    await client.put('/test', { key: 'value' });

    const [, init] = fetch.mock.calls[0];
    expect(init.method).toBe('PUT');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.headers['Idempotency-Key']).toBeDefined();
    expect(init.body).toBe('{"key":"value"}');
  });

  it('includes Idempotency-Key on DELETE', async () => {
    const fetch = mockFetch({ status: 204, ok: true });
    const client = createClient(fetch);
    await client.delete('/test');

    const [, init] = fetch.mock.calls[0];
    expect(init.headers['Idempotency-Key']).toBeDefined();
  });

  it('does not include Idempotency-Key on GET', async () => {
    const fetch = mockFetch({ json: {} });
    const client = createClient(fetch);
    await client.get('/test');

    const [, init] = fetch.mock.calls[0];
    expect(init.headers['Idempotency-Key']).toBeUndefined();
  });

  it('allows custom idempotency key', async () => {
    const fetch = mockFetch({ json: {} });
    const client = createClient(fetch);
    await client.post('/test', {}, { idempotencyKey: 'my-key' });

    const [, init] = fetch.mock.calls[0];
    expect(init.headers['Idempotency-Key']).toBe('my-key');
  });

  it('returns undefined for 204', async () => {
    const fetch = mockFetch({ status: 204, ok: true });
    const client = createClient(fetch);
    const result = await client.delete('/test');
    expect(result).toBeUndefined();
  });

  it('uses custom base URL', async () => {
    const fetch = mockFetch({ json: {} });
    const client = createClient(fetch, { baseUrl: 'https://custom.api.com' });
    await client.get('/test');

    expect(fetch.mock.calls[0][0]).toContain('https://custom.api.com/test');
  });

  describe('error mapping', () => {
    it('throws AuthenticationError on 401', async () => {
      const fetch = mockFetch({
        ok: false,
        status: 401,
        json: { error: 'unauthorized', message: 'Invalid API key' },
      });
      const client = createClient(fetch);
      await expect(client.get('/test')).rejects.toThrow(AuthenticationError);
    });

    it('throws PermissionError on 403', async () => {
      const fetch = mockFetch({
        ok: false,
        status: 403,
        json: { error: 'forbidden', message: 'Insufficient permissions' },
      });
      const client = createClient(fetch);
      await expect(client.get('/test')).rejects.toThrow(PermissionError);
    });

    it('PermissionError exposes missingScopes and keyScopes from 403', async () => {
      const fetch = mockFetch({
        ok: false,
        status: 403,
        json: {
          error: 'INSUFFICIENT_SCOPE',
          message: "This endpoint requires scope 'agents:manage'.",
          details: {
            missingScopes: ['agents:manage'],
            keyScopes: ['mandates:read', 'mandates:write'],
          },
        },
      });
      const client = createClient(fetch);
      try {
        await client.get('/test');
      } catch (err) {
        expect(err).toBeInstanceOf(PermissionError);
        const pe = err as PermissionError;
        expect(pe.missingScopes).toEqual(['agents:manage']);
        expect(pe.keyScopes).toEqual(['mandates:read', 'mandates:write']);
      }
    });

    it('PermissionError has empty missingScopes when not a scope error', async () => {
      const fetch = mockFetch({
        ok: false,
        status: 403,
        json: { error: 'forbidden', message: 'Agent not approved' },
      });
      const client = createClient(fetch);
      try {
        await client.get('/test');
      } catch (err) {
        const pe = err as PermissionError;
        expect(pe.missingScopes).toEqual([]);
        expect(pe.keyScopes).toBeNull();
      }
    });

    it('throws NotFoundError on 404', async () => {
      const fetch = mockFetch({
        ok: false,
        status: 404,
        json: { error: 'not_found', message: 'Not found' },
      });
      const client = createClient(fetch);
      await expect(client.get('/test')).rejects.toThrow(NotFoundError);
    });

    it('throws ValidationError on 400 with field details', async () => {
      const fetch = mockFetch({
        ok: false,
        status: 400,
        json: { error: 'validation', message: 'Bad request', details: [{ field: 'name', message: 'required' }] },
      });
      const client = createClient(fetch);
      const err = await client.get('/test').catch((e) => e);
      expect(err).toBeInstanceOf(ValidationError);
      expect(err.validationErrors).toHaveLength(1);
      expect(err.validationErrors[0].field).toBe('name');
    });

    it('throws UnprocessableError on 422', async () => {
      const fetch = mockFetch({
        ok: false,
        status: 422,
        json: { error: 'unprocessable', message: 'Invalid transition' },
      });
      const client = createClient(fetch);
      await expect(client.get('/test')).rejects.toThrow(UnprocessableError);
    });

    it('throws RateLimitError on 429 with retryAfter', async () => {
      const fetch = mockFetch({
        ok: false,
        status: 429,
        json: { error: 'rate_limit', message: 'Too many requests' },
        headers: { 'Retry-After': '5' },
      });
      const client = createClient(fetch);
      const err = await client.get('/test').catch((e) => e);
      expect(err).toBeInstanceOf(RateLimitError);
      expect(err.retryAfter).toBe(5000);
    });

    it('exposes retryable flag from API response', async () => {
      const fetch = mockFetch({
        ok: false,
        status: 400,
        json: { error: 'validation', message: 'Bad', retryable: false },
      });
      const client = createClient(fetch);
      const err = await client.get('/test').catch((e) => e);
      expect(err.retryable).toBe(false);
    });

    it('defaults retryable based on status code', async () => {
      const fetch = mockFetch({
        ok: false,
        status: 500,
        json: { error: 'server', message: 'Internal error' },
      });
      const client = createClient(fetch);
      const err = await client.get('/test').catch((e) => e);
      expect(err.retryable).toBe(true);
    });

    it('exposes error code from API response', async () => {
      const fetch = mockFetch({
        ok: false,
        status: 422,
        json: { error: 'unprocessable', message: 'fail', code: 'MANDATE_NOT_ACTIVE' },
      });
      const client = createClient(fetch);
      const err = await client.get('/test').catch((e) => e);
      expect(err.code).toBe('MANDATE_NOT_ACTIVE');
    });
  });

  describe('retries', () => {
    it('retries on 5xx', async () => {
      const fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: vi.fn().mockResolvedValue({ error: 'server', message: 'fail' }),
          headers: new Headers(),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: vi.fn().mockResolvedValue({ success: true }),
          headers: new Headers(),
        });

      const client = new HttpClient({
        apiKey: 'test',
        fetch: fetch as unknown as typeof globalThis.fetch,
        maxRetries: 1,
      });

      const result = await client.get<{ success: boolean }>('/test');
      expect(result.success).toBe(true);
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('retries on 429', async () => {
      const fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          json: vi.fn().mockResolvedValue({ error: 'rate_limit', message: 'slow down' }),
          headers: new Headers({ 'Retry-After': '1' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: vi.fn().mockResolvedValue({ done: true }),
          headers: new Headers(),
        });

      const client = new HttpClient({
        apiKey: 'test',
        fetch: fetch as unknown as typeof globalThis.fetch,
        maxRetries: 1,
      });

      const result = await client.get<{ done: boolean }>('/test');
      expect(result.done).toBe(true);
    });

    it('does not retry 4xx errors', async () => {
      const fetch = mockFetch({
        ok: false,
        status: 400,
        json: { error: 'bad', message: 'nope' },
      });
      const client = new HttpClient({
        apiKey: 'test',
        fetch: fetch as unknown as typeof globalThis.fetch,
        maxRetries: 3,
      });

      await expect(client.get('/test')).rejects.toThrow(ValidationError);
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('getPage', () => {
    it('normalizes bare array to Page<T>', async () => {
      const fetch = mockFetch({ json: [{ id: '1' }, { id: '2' }] });
      const client = createClient(fetch);
      const page = await client.getPage('/test');
      expect(page.data).toHaveLength(2);
      expect(page.hasMore).toBe(false);
    });

    it('normalizes { data, hasMore, nextCursor } envelope', async () => {
      const fetch = mockFetch({
        json: { data: [{ id: '1' }], hasMore: true, nextCursor: 'abc', total: 50 },
      });
      const client = createClient(fetch);
      const page = await client.getPage('/test');
      expect(page.data).toHaveLength(1);
      expect(page.hasMore).toBe(true);
      expect(page.nextCursor).toBe('abc');
      expect(page.total).toBe(50);
    });

    it('normalizes offset-based { data, total, limit, offset }', async () => {
      const fetch = mockFetch({
        json: { data: [{ id: '1' }], total: 100, limit: 10, offset: 0 },
      });
      const client = createClient(fetch);
      const page = await client.getPage('/test');
      expect(page.hasMore).toBe(true);
      expect(page.total).toBe(100);
    });

    it('normalizes snake_case next_cursor', async () => {
      const fetch = mockFetch({
        json: { data: [{ id: '1' }], next_cursor: 'xyz' },
      });
      const client = createClient(fetch);
      const page = await client.getPage('/test');
      expect(page.hasMore).toBe(true);
      expect(page.nextCursor).toBe('xyz');
    });
  });

  describe('paginate', () => {
    it('iterates through multiple pages', async () => {
      const fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: vi.fn().mockResolvedValue({ data: [{ id: '1' }], hasMore: true, nextCursor: 'pg2' }),
          headers: new Headers(),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: vi.fn().mockResolvedValue({ data: [{ id: '2' }], hasMore: false }),
          headers: new Headers(),
        });

      const client = new HttpClient({
        apiKey: 'test',
        fetch: fetch as unknown as typeof globalThis.fetch,
        maxRetries: 0,
      });

      const items: Array<{ id: string }> = [];
      for await (const item of client.paginate<{ id: string }>('/test')) {
        items.push(item);
      }
      expect(items).toEqual([{ id: '1' }, { id: '2' }]);
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('respects maxPages ceiling', async () => {
      const fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ data: [{ id: '1' }], hasMore: true, nextCursor: 'next' }),
        headers: new Headers(),
      });

      const client = new HttpClient({
        apiKey: 'test',
        fetch: fetch as unknown as typeof globalThis.fetch,
        maxRetries: 0,
      });

      const items: Array<{ id: string }> = [];
      for await (const item of client.paginate<{ id: string }>('/test', undefined, { maxPages: 2 })) {
        items.push(item);
      }
      expect(items).toHaveLength(2);
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('respects maxItems ceiling', async () => {
      const fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ data: [{ id: '1' }, { id: '2' }, { id: '3' }], hasMore: true, nextCursor: 'next' }),
        headers: new Headers(),
      });

      const client = new HttpClient({
        apiKey: 'test',
        fetch: fetch as unknown as typeof globalThis.fetch,
        maxRetries: 0,
      });

      const items: Array<{ id: string }> = [];
      for await (const item of client.paginate<{ id: string }>('/test', undefined, { maxItems: 2 })) {
        items.push(item);
      }
      expect(items).toHaveLength(2);
    });
  });

  describe('rate limit headers', () => {
    it('parses rate limit info from headers', async () => {
      const fetch = mockFetch({
        json: {},
        headers: {
          'x-ratelimit-limit': '1000',
          'x-ratelimit-remaining': '997',
          'x-ratelimit-reset': '1709942400',
        },
      });
      const client = createClient(fetch);
      await client.get('/test');

      expect(client.rateLimitInfo).toEqual({
        limit: 1000,
        remaining: 997,
        reset: 1709942400,
      });
    });
  });
});
