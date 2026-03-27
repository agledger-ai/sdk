/**
 * AGLedger™ SDK — Webhooks Resource
 * Patent Pending. Copyright 2026 AGLedger LLC. All rights reserved.
 */

import type { HttpClient } from '../http.js';
import type {
  Webhook,
  CreateWebhookParams,
  WebhookDelivery,
  WebhookTestResult,
  WebhookDlqEntry,
  Page,
  ListParams,
  ListWebhooksParams,
  RequestOptions,
} from '../types.js';

export class WebhooksResource {
  constructor(private readonly http: HttpClient) {}

  /** Register a new webhook subscription. */
  async create(params: CreateWebhookParams, options?: RequestOptions): Promise<Webhook> {
    return this.http.post<Webhook>('/v1/webhooks', params, options);
  }

  /**
   * List all webhooks, optionally filtered by exact URL match.
   *
   * @example
   * ```ts
   * const all = await client.webhooks.list();
   * const filtered = await client.webhooks.list({ url: 'https://example.com/webhook' });
   * ```
   */
  async list(params?: ListWebhooksParams, options?: RequestOptions): Promise<Page<Webhook>> {
    return this.http.getPage<Webhook>('/v1/webhooks', params as Record<string, unknown>, options);
  }

  /** Get a single webhook by ID. */
  async get(webhookId: string, options?: RequestOptions): Promise<Webhook> {
    return this.http.get<Webhook>(`/v1/webhooks/${webhookId}`, undefined, options);
  }

  /**
   * Update a webhook subscription (URL, event types, etc.).
   *
   * @example
   * ```ts
   * await client.webhooks.update('wh-123', { url: 'https://new-url.com/hook' });
   * ```
   */
  async update(webhookId: string, params: Partial<CreateWebhookParams>, options?: RequestOptions): Promise<Webhook> {
    return this.http.patch<Webhook>(`/v1/webhooks/${webhookId}`, params, options);
  }

  /** Deactivate a webhook subscription. */
  async delete(webhookId: string, options?: RequestOptions): Promise<void> {
    return this.http.delete(`/v1/webhooks/${webhookId}`, undefined, options);
  }

  /** Pause webhook deliveries. The subscription remains active but deliveries are held. */
  async pause(webhookId: string, options?: RequestOptions): Promise<Webhook> {
    return this.http.post<Webhook>(`/v1/webhooks/${webhookId}/pause`, undefined, options);
  }

  /** Resume a paused webhook. Held deliveries are released. */
  async resume(webhookId: string, options?: RequestOptions): Promise<Webhook> {
    return this.http.post<Webhook>(`/v1/webhooks/${webhookId}/resume`, undefined, options);
  }

  /** Rotate webhook signing secret. Returns the updated webhook with new secret. */
  async rotate(webhookId: string, options?: RequestOptions): Promise<Webhook> {
    return this.http.post<Webhook>(`/v1/webhooks/${webhookId}/rotate`, undefined, options);
  }

  /** Send a test ping to the webhook URL. */
  async ping(webhookId: string, options?: RequestOptions): Promise<WebhookTestResult> {
    return this.http.post<WebhookTestResult>(`/v1/webhooks/${webhookId}/ping`, undefined, options);
  }

  /** List delivery attempts for a webhook, optionally filtered by status. */
  async listDeliveries(
    webhookId: string,
    params?: ListParams & { status?: 'PENDING' | 'DELIVERED' | 'FAILED' | 'DEAD_LETTER' },
    options?: RequestOptions,
  ): Promise<Page<WebhookDelivery>> {
    return this.http.getPage<WebhookDelivery>(
      `/v1/webhooks/${webhookId}/deliveries`,
      params as Record<string, unknown>,
      options,
    );
  }

  /** List dead-letter queue entries for a specific webhook. */
  async listDlq(
    webhookId: string,
    params?: ListParams,
    options?: RequestOptions,
  ): Promise<Page<WebhookDlqEntry>> {
    return this.http.getPage<WebhookDlqEntry>(
      `/v1/webhooks/${webhookId}/dlq`,
      params as Record<string, unknown>,
      options,
    );
  }

  /** Retry all dead-letter queue entries for a specific webhook. */
  async retryAllDlq(webhookId: string, options?: RequestOptions): Promise<{ retried: number }> {
    return this.http.post(`/v1/webhooks/${webhookId}/dlq/retry-all`, undefined, options);
  }

  /** Retry a single dead-letter queue entry for a specific webhook. */
  async retryDlq(webhookId: string, dlqId: string, options?: RequestOptions): Promise<Record<string, unknown>> {
    return this.http.post(`/v1/webhooks/${webhookId}/dlq/${dlqId}/retry`, undefined, options);
  }
}
