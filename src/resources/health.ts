import type { HttpClient } from '../http.js';
import type { HealthResponse, StatusResponse, ConformanceResponse, RequestOptions } from '../types.js';

export class HealthResource {
  constructor(private readonly http: HttpClient) {}

  /** Quick health check (GET /health). */
  check(options?: RequestOptions): Promise<HealthResponse> {
    return this.http.get<HealthResponse>('/health', undefined, options);
  }

  /** Get detailed system status with component health (GET /status). */
  status(options?: RequestOptions): Promise<StatusResponse> {
    return this.http.get<StatusResponse>('/status', undefined, options);
  }

  /** Get platform conformance info (protocol version, features, limits). */
  conformance(options?: RequestOptions): Promise<ConformanceResponse> {
    return this.http.get<ConformanceResponse>('/v1/conformance', undefined, options);
  }
}
