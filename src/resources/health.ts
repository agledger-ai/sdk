import type { HttpClient } from '../http.js';
import type { HealthResponse, StatusResponse, RequestOptions } from '../types.js';

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
}
