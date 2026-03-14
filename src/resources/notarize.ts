/**
 * AGLedger™ SDK — Notarize Resource
 * Agent-to-agent agreement notarization (OpenClaw flow).
 * Patent Pending. Copyright 2026 AGLedger LLC. All rights reserved.
 */

import type { HttpClient } from '../http.js';
import type {
  NotarizedMandate,
  NotarizeMandateParams,
  NotarizeMandateResult,
  NotarizeCounterProposeParams,
  NotarizeReceiptParams,
  NotarizeReceiptResult,
  NotarizeVerdictParams,
  NotarizeVerifyParams,
  NotarizeVerifyResult,
  NotarizeHistory,
  RequestOptions,
} from '../types.js';

export class NotarizeResource {
  constructor(private readonly http: HttpClient) {}

  /** Create a notarized mandate (principal action). */
  async createMandate(
    params: NotarizeMandateParams,
    options?: RequestOptions,
  ): Promise<NotarizeMandateResult> {
    return this.http.post<NotarizeMandateResult>('/v1/notarize/mandates', params, options);
  }

  /** Get a notarized mandate by ID. */
  async getMandate(id: string, options?: RequestOptions): Promise<NotarizedMandate> {
    return this.http.get<NotarizedMandate>(`/v1/notarize/mandates/${id}`, undefined, options);
  }

  /** Get the transition history for a notarized mandate. */
  async getHistory(id: string, options?: RequestOptions): Promise<NotarizeHistory> {
    return this.http.get<NotarizeHistory>(`/v1/notarize/mandates/${id}/history`, undefined, options);
  }

  /** Accept a notarized mandate (performer action). */
  async acceptMandate(id: string, options?: RequestOptions): Promise<NotarizedMandate> {
    return this.http.post<NotarizedMandate>(`/v1/notarize/mandates/${id}/accept`, undefined, options);
  }

  /** Counter-propose new terms for a notarized mandate (performer action). */
  async counterPropose(
    id: string,
    params: NotarizeCounterProposeParams,
    options?: RequestOptions,
  ): Promise<NotarizeMandateResult> {
    return this.http.post<NotarizeMandateResult>(
      `/v1/notarize/mandates/${id}/counter-propose`,
      params,
      options,
    );
  }

  /** Submit a receipt against a notarized mandate (performer action). */
  async submitReceipt(
    id: string,
    params: NotarizeReceiptParams,
    options?: RequestOptions,
  ): Promise<NotarizeReceiptResult> {
    return this.http.post<NotarizeReceiptResult>(
      `/v1/notarize/mandates/${id}/receipts`,
      params,
      options,
    );
  }

  /** Render a verdict on a notarized mandate (principal action). */
  async renderVerdict(
    id: string,
    params: NotarizeVerdictParams,
    options?: RequestOptions,
  ): Promise<NotarizedMandate> {
    return this.http.post<NotarizedMandate>(
      `/v1/notarize/mandates/${id}/verdict`,
      params,
      options,
    );
  }

  /** Verify that a local copy matches the notarized hash. */
  async verify(
    params: NotarizeVerifyParams,
    options?: RequestOptions,
  ): Promise<NotarizeVerifyResult> {
    return this.http.post<NotarizeVerifyResult>('/v1/notarize/verify', params, options);
  }
}
