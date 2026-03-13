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

  // --- Principal: create a notarized mandate ---

  async createMandate(
    params: NotarizeMandateParams,
    options?: RequestOptions,
  ): Promise<NotarizeMandateResult> {
    return this.http.post<NotarizeMandateResult>('/v1/notarize/mandates', params, options);
  }

  // --- Either party: get mandate metadata ---

  async getMandate(id: string, options?: RequestOptions): Promise<NotarizedMandate> {
    return this.http.get<NotarizedMandate>(`/v1/notarize/mandates/${id}`, undefined, options);
  }

  // --- Either party: get transition history ---

  async getHistory(id: string, options?: RequestOptions): Promise<NotarizeHistory> {
    return this.http.get<NotarizeHistory>(`/v1/notarize/mandates/${id}/history`, undefined, options);
  }

  // --- Performer: accept mandate ---

  async acceptMandate(id: string, options?: RequestOptions): Promise<NotarizedMandate> {
    return this.http.post<NotarizedMandate>(`/v1/notarize/mandates/${id}/accept`, undefined, options);
  }

  // --- Performer: counter-propose ---

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

  // --- Performer: submit receipt ---

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

  // --- Principal: render verdict ---

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

  // --- Any party: verify a local copy matches the notarized hash ---

  async verify(
    params: NotarizeVerifyParams,
    options?: RequestOptions,
  ): Promise<NotarizeVerifyResult> {
    return this.http.post<NotarizeVerifyResult>('/v1/notarize/verify', params, options);
  }
}
