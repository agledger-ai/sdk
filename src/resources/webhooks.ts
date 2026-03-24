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
  Page,
  ListParams,
  RequestOptions,
} from '../types.js';

export class WebhooksResource {
  constructor(private readonly http: HttpClient) {}

  /** Register a new webhook subscription. */
  async create(params: CreateWebhookParams, options?: RequestOptions): Promise<Webhook> {
    return this.http.post<Webhook>('/v1/webhooks', params, options);
  }

  /** List all webhooks. */
  async list(params?: ListParams, options?: RequestOptions): Promise<Page<Webhook>> {
    return this.http.getPage<Webhook>('/v1/webhooks', params as Record<string, unknown>, options);
  }

  /** Deactivate a webhook subscription. */
  async delete(webhookId: string, options?: RequestOptions): Promise<void> {
    return this.http.delete(`/v1/webhooks/${webhookId}`, undefined, options);
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
    params?: ListParams & { status?: string },
    options?: RequestOptions,
  ): Promise<Page<WebhookDelivery>> {
    return this.http.getPage<WebhookDelivery>(
      `/v1/webhooks/${webhookId}/deliveries`,
      params as Record<string, unknown>,
      options,
    );
  }
}
