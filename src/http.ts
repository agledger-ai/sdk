/**
 * AGLedger™ SDK — HTTP Client
 * Patent Pending. Copyright 2026 AGLedger LLC. All rights reserved.
 *
 * Zero runtime dependencies. Uses native fetch + crypto.
 */

import type {
  AgledgerClientOptions,
  RequestOptions,
  RateLimitInfo,
  Page,
  ListParams,
  AutoPaginateOptions,
} from './types.js';
import {
  AgledgerApiError,
  AuthenticationError,
  PermissionError,
  NotFoundError,
  ValidationError,
  UnprocessableError,
  RateLimitError,
  ConnectionError,
  TimeoutError,
} from './errors.js';

const BASE_URLS: Record<string, string> = {
  production: 'https://api.agledger.ai',
  sandbox: 'https://sandbox.api.agledger.ai',
};
const DEFAULT_BASE_URL = BASE_URLS.production;
const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_MAX_RETRIES = 3;
const MAX_BACKOFF = 30_000;

export class HttpClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly maxRetries: number;
  private readonly timeout: number;
  private readonly fetchFn: typeof globalThis.fetch;
  private readonly idempotencyKeyPrefix: string;
  private _rateLimitInfo: RateLimitInfo | null = null;

  /** Rate limit info from the most recent response. Null if headers not present. */
  get rateLimitInfo(): RateLimitInfo | null {
    return this._rateLimitInfo;
  }

  constructor(options: AgledgerClientOptions) {
    this.apiKey = options.apiKey;
    const envUrl = options.environment ? BASE_URLS[options.environment] : undefined;
    this.baseUrl = (options.baseUrl || envUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
    this.fetchFn = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.idempotencyKeyPrefix = options.idempotencyKeyPrefix ?? '';
  }

  async get<T>(
    path: string,
    params?: Record<string, unknown>,
    options?: RequestOptions,
  ): Promise<T> {
    const url = this.buildUrl(path, params);
    return this.request<T>('GET', url, undefined, options);
  }

  async post<T>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
    params?: Record<string, unknown>,
  ): Promise<T> {
    const url = this.buildUrl(path, params);
    return this.request<T>('POST', url, body, options);
  }

  async put<T>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    const url = this.buildUrl(path);
    return this.request<T>('PUT', url, body, options);
  }

  async patch<T>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    const url = this.buildUrl(path);
    return this.request<T>('PATCH', url, body, options);
  }

  async delete<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const url = this.buildUrl(path);
    return this.request<T>('DELETE', url, body, options);
  }

  /**
   * Fetch a list endpoint and normalize the response into Page<T>.
   * Handles both current inconsistent responses (bare arrays, various envelope shapes)
   * and the target format ({ data, hasMore, nextCursor, total }).
   */
  async getPage<T>(
    path: string,
    params?: Record<string, unknown>,
    options?: RequestOptions,
  ): Promise<Page<T>> {
    const raw = await this.get<unknown>(path, params, options);
    return this.normalizePage<T>(raw);
  }

  /**
   * Async iterator for auto-paginating through all pages.
   * Yields individual items. Stops after maxPages (default: 100) as a safety ceiling.
   */
  async *paginate<T>(
    path: string,
    params?: Record<string, unknown>,
    options?: RequestOptions & AutoPaginateOptions,
  ): AsyncGenerator<T, void, undefined> {
    const maxPages = options?.maxPages ?? 100;
    const maxItems = options?.maxItems;
    let cursor: string | undefined;
    let pagesRead = 0;
    let itemsYielded = 0;

    while (pagesRead < maxPages) {
      const pageParams = { ...params, ...(cursor ? { cursor } : {}) };
      const page = await this.getPage<T>(path, pageParams, options);
      pagesRead++;

      for (const item of page.data) {
        yield item;
        itemsYielded++;
        if (maxItems && itemsYielded >= maxItems) return;
      }

      if (!page.hasMore || !page.nextCursor) return;
      cursor = page.nextCursor;
    }
  }

  /**
   * Fetch an NDJSON endpoint. Returns parsed lines and the cursor from
   * the X-AGLedger-Stream-Cursor response header.
   */
  async getNdjson<T = Record<string, unknown>>(
    path: string,
    params?: Record<string, unknown>,
    options?: RequestOptions,
  ): Promise<{ data: T[]; cursor: string | null }> {
    const url = this.buildUrl(path, params);
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) {
        await this.sleep(this.backoff(attempt, lastError));
      }

      const timeout = options?.timeout ?? this.timeout;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      if (options?.signal) {
        if (options.signal.aborted) {
          clearTimeout(timer);
          throw new ConnectionError('Request aborted', new Error('AbortError'));
        }
        options.signal.addEventListener('abort', () => controller.abort(), { once: true });
      }

      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: 'application/x-ndjson',
      };

      try {
        const response = await this.fetchFn(url, {
          method: 'GET',
          headers,
          signal: controller.signal,
        });

        clearTimeout(timer);
        this.parseRateLimitHeaders(response.headers);

        if (!response.ok) {
          let errorBody: Record<string, unknown>;
          try {
            errorBody = (await response.json()) as Record<string, unknown>;
          } catch {
            errorBody = { error: 'unknown', message: response.statusText || `HTTP ${response.status}` };
          }

          const error = this.mapError(response.status, errorBody, response.headers);
          if (response.status === 429 || response.status >= 500) {
            lastError = error;
            continue;
          }
          throw error;
        }

        const text = await response.text();
        const lines = text.split('\n').filter((l) => l.trim().length > 0);
        const data = lines.map((line) => JSON.parse(line) as T);
        const cursor = response.headers.get('X-AGLedger-Stream-Cursor') ?? null;

        return { data, cursor };
      } catch (err) {
        clearTimeout(timer);
        if (err instanceof AgledgerApiError) throw err;

        const cause = err as Error;
        if (cause.name === 'AbortError') {
          lastError = new TimeoutError('GET', url, timeout, cause);
        } else {
          lastError = new ConnectionError(`Network error: ${cause.message}`, cause);
        }
        continue;
      }
    }

    throw lastError!;
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  private buildUrl(path: string, params?: Record<string, unknown>): string {
    const raw = path.startsWith('/') ? `${this.baseUrl}${path}` : `${this.baseUrl}/${path}`;
    const url = new URL(raw);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url.toString();
  }

  private async request<T>(
    method: string,
    url: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    // Idempotency keys for all mutating methods
    const needsIdempotencyKey = method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';
    const idempotencyKey =
      options?.idempotencyKey ??
      (needsIdempotencyKey
        ? `${this.idempotencyKeyPrefix}${crypto.randomUUID()}`
        : undefined);

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) {
        await this.sleep(this.backoff(attempt, lastError));
      }

      const timeout = options?.timeout ?? this.timeout;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      if (options?.signal) {
        if (options.signal.aborted) {
          clearTimeout(timer);
          throw new ConnectionError('Request aborted', new Error('AbortError'));
        }
        options.signal.addEventListener('abort', () => controller.abort(), { once: true });
      }

      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: 'application/json',
      };

      if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
      }
      if (idempotencyKey) {
        headers['Idempotency-Key'] = idempotencyKey;
      }

      try {
        const response = await this.fetchFn(url, {
          method,
          headers,
          body: body !== undefined ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (response.status === 204) {
          return undefined as T;
        }

        this.parseRateLimitHeaders(response.headers);

        if (response.ok) {
          return (await response.json()) as T;
        }

        // Parse error body
        let errorBody: Record<string, unknown>;
        try {
          errorBody = (await response.json()) as Record<string, unknown>;
        } catch {
          errorBody = {
            error: 'unknown',
            message: response.statusText || `HTTP ${response.status}`,
          };
        }

        const error = this.mapError(response.status, errorBody, response.headers);

        // Retry on 429 and 5xx
        if (response.status === 429 || response.status >= 500) {
          lastError = error;
          continue;
        }

        throw error;
      } catch (err) {
        clearTimeout(timer);

        if (err instanceof AgledgerApiError) {
          throw err;
        }

        const cause = err as Error;
        if (cause.name === 'AbortError') {
          lastError = new TimeoutError(method, url, timeout, cause);
        } else {
          lastError = new ConnectionError(
            `Network error: ${cause.message}`,
            cause,
          );
        }

        // Retry network errors
        continue;
      }
    }

    throw lastError!;
  }

  private mapError(
    status: number,
    body: Record<string, unknown>,
    headers: Headers,
  ): AgledgerApiError {
    const errorBody = {
      error: (body.error as string) || 'unknown',
      message: (body.message as string) || `HTTP ${status}`,
      requestId: body.requestId as string | undefined,
      code: body.code as string | undefined,
      retryable: body.retryable as boolean | undefined,
      details: body.details as Record<string, unknown> | undefined,
    };

    switch (status) {
      case 400:
        return new ValidationError(errorBody);
      case 401:
        return new AuthenticationError(errorBody);
      case 403:
        return new PermissionError(errorBody);
      case 404:
        return new NotFoundError(errorBody);
      case 422:
        return new UnprocessableError(errorBody);
      case 429: {
        const retryAfterHeader = headers.get('Retry-After');
        const retryAfter = retryAfterHeader
          ? parseInt(retryAfterHeader, 10) * 1000
          : null;
        return new RateLimitError(errorBody, retryAfter);
      }
      default:
        return new AgledgerApiError(status, errorBody);
    }
  }

  private backoff(attempt: number, lastError?: Error): number {
    let delay = Math.min(1000 * Math.pow(2, attempt - 1), MAX_BACKOFF);

    // Honor Retry-After from rate limit errors
    if (lastError instanceof RateLimitError && lastError.retryAfter) {
      delay = Math.max(delay, lastError.retryAfter);
    }

    // Add 0–25% jitter
    const jitter = delay * Math.random() * 0.25;
    return delay + jitter;
  }

  private parseRateLimitHeaders(headers: Headers): void {
    const limit = headers.get('x-ratelimit-limit');
    const remaining = headers.get('x-ratelimit-remaining');
    const reset = headers.get('x-ratelimit-reset');
    if (limit !== null && remaining !== null && reset !== null) {
      this._rateLimitInfo = {
        limit: parseInt(limit, 10),
        remaining: parseInt(remaining, 10),
        reset: parseInt(reset, 10),
      };
    }
  }

  /**
   * Normalize any list response shape into Page<T>.
   * Handles: bare array, { data }, { data, hasMore, nextCursor, total },
   * { data, total, limit, offset }, { data, next_cursor }.
   */
  private normalizePage<T>(raw: unknown): Page<T> {
    // Bare array
    if (Array.isArray(raw)) {
      return { data: raw as T[], hasMore: false };
    }

    const obj = raw as Record<string, unknown>;
    const data = (Array.isArray(obj.data) ? obj.data : []) as T[];
    const nextCursor = (obj.nextCursor || obj.next_cursor || null) as string | null;

    // Explicit hasMore from API
    if (typeof obj.hasMore === 'boolean') {
      return { data, hasMore: obj.hasMore, nextCursor, total: obj.total as number | undefined };
    }

    // Offset-based: infer hasMore from total/limit/offset
    if (typeof obj.total === 'number' && typeof obj.limit === 'number' && typeof obj.offset === 'number') {
      return {
        data,
        hasMore: obj.offset + obj.limit < obj.total,
        nextCursor,
        total: obj.total as number,
      };
    }

    // Cursor-based: hasMore if cursor present
    return { data, hasMore: !!nextCursor, nextCursor, total: obj.total as number | undefined };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
