import type { HttpClient } from '../http.js';
import type { VerificationKeysResponse, RequestOptions } from '../types.js';

export class VerificationKeysResource {
  constructor(private readonly http: HttpClient) {}

  /** List all vault signing public keys (GET /v1/verification-keys). No auth required. */
  list(options?: RequestOptions): Promise<VerificationKeysResponse> {
    return this.http.get<VerificationKeysResponse>('/v1/verification-keys', undefined, { ...options, authOverride: 'none' });
  }
}
