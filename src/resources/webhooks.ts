/**
 * AGLedger™ SDK — Webhooks Resource
 * Patent Pending. Copyright 2026 AGLedger LLC. All rights reserved.
 */

import type { HttpClient } from '../http.js';
import type {
  Webhook,
  CreateWebhookParams,
  UpdateWebhookParams,
  WebhookDelivery,
  WebhookTestResult,
  Page,
  ListParams,
  RequestOptions,
} from '../types.js';

export class WebhooksResource {
  constructor(private readonly http: HttpClient) {}

  async create(params: CreateWebhookParams, options?: RequestOptions): Promise<Webhook> {
    return this.http.post<Webhook>('/v1/webhooks', params, options);
  }

  async get(webhookId: string, options?: RequestOptions): Promise<Webhook> {
    return this.http.get<Webhook>(`/v1/webhooks/${webhookId}`, undefined, options);
  }

  async list(options?: RequestOptions): Promise<Page<Webhook>> {
    return this.http.getPage<Webhook>('/v1/webhooks', undefined, options);
  }

  async update(webhookId: string, params: UpdateWebhookParams, options?: RequestOptions): Promise<Webhook> {
    return this.http.patch<Webhook>(`/v1/webhooks/${webhookId}`, params, options);
  }

  async delete(webhookId: string, options?: RequestOptions): Promise<void> {
    return this.http.delete(`/v1/webhooks/${webhookId}`, options);
  }

  /** Rotate webhook secret. Returns new secret. */
  async rotate(webhookId: string, options?: RequestOptions): Promise<{ secret: string }> {
    return this.http.post(`/v1/webhooks/${webhookId}/rotate`, undefined, options);
  }

  /** Send a test ping to the webhook URL. */
  async ping(webhookId: string, options?: RequestOptions): Promise<WebhookTestResult> {
    return this.http.post<WebhookTestResult>(`/v1/webhooks/${webhookId}/ping`, undefined, options);
  }

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
