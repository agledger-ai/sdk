/**
 * AGLedger™ SDK — Health & Conformance Resource
 * Patent Pending. Copyright 2026 AGLedger LLC. All rights reserved.
 */

import type { HttpClient } from '../http.js';
import type { HealthResponse, StatusResponse, ConformanceResponse, RequestOptions } from '../types.js';

export class HealthResource {
  constructor(private readonly http: HttpClient) {}

  async check(options?: RequestOptions): Promise<HealthResponse> {
    return this.http.get<HealthResponse>('/health', undefined, options);
  }

  async status(options?: RequestOptions): Promise<StatusResponse> {
    return this.http.get<StatusResponse>('/status', undefined, options);
  }

  /** Get platform conformance info (protocol version, features, limits). */
  async conformance(options?: RequestOptions): Promise<ConformanceResponse> {
    return this.http.get<ConformanceResponse>('/v1/conformance', undefined, options);
  }
}
