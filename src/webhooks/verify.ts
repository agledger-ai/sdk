/**
 * AGLedger™ SDK — Webhook Signature Verification
 * Patent Pending. Copyright 2026 AGLedger LLC. All rights reserved.
 *
 * Separate export to avoid pulling node:crypto into browser bundles.
 * Import via: import { verifySignature } from '@agledger/sdk/webhooks'
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

const MAX_TOLERANCE_SECONDS = 300;

export interface SignResult {
  header: string;
  timestamp: number;
  signature: string;
}

/**
 * Sign a payload (for testing purposes).
 * Returns the header string, timestamp, and hex signature.
 */
export function signPayload(
  rawBody: string,
  secret: string,
  timestamp?: number,
): SignResult {
  const ts = timestamp ?? Math.floor(Date.now() / 1000);
  const signedPayload = `${ts}.${rawBody}`;
  const signature = createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  return {
    header: `t=${ts},v1=${signature}`,
    timestamp: ts,
    signature,
  };
}

/**
 * Parse a webhook signature header into timestamp and signature(s).
 * Format: t=<unix_ts>,v1=<hex>[,v1=<hex2>]
 * Supports multiple v1 signatures for key rotation.
 */
export function parseSignatureHeader(
  header: string,
): { timestamp: number; signatures: string[] } | null {
  const parts = header.split(',');
  let timestamp: number | undefined;
  const signatures: string[] = [];

  for (const part of parts) {
    const [key, value] = part.split('=', 2);
    if (!key || !value) return null;

    if (key.trim() === 't') {
      timestamp = parseInt(value.trim(), 10);
      if (isNaN(timestamp)) return null;
    } else if (key.trim() === 'v1') {
      signatures.push(value.trim());
    }
  }

  if (timestamp === undefined || signatures.length === 0) return null;
  return { timestamp, signatures };
}

/**
 * Verify a webhook signature.
 *
 * @param rawBody - The raw request body string
 * @param header - The x-agledger-signature header value
 * @param secrets - One or more webhook secrets (array for key rotation)
 * @param toleranceSeconds - Max age in seconds (default/max: 300)
 * @returns true if signature is valid and within tolerance
 */
export function verifySignature(
  rawBody: string,
  header: string,
  secrets: string | string[],
  toleranceSeconds?: number,
): boolean {
  const parsed = parseSignatureHeader(header);
  if (!parsed) return false;

  const tolerance = Math.min(
    toleranceSeconds ?? MAX_TOLERANCE_SECONDS,
    MAX_TOLERANCE_SECONDS,
  );

  // Check timestamp freshness
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parsed.timestamp) > tolerance) return false;

  const secretList = Array.isArray(secrets) ? secrets : [secrets];
  const signedPayload = `${parsed.timestamp}.${rawBody}`;

  for (const secret of secretList) {
    const expected = createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');

    for (const sig of parsed.signatures) {
      const sigBuf = Buffer.from(sig, 'hex');
      const expectedBuf = Buffer.from(expected, 'hex');

      if (sigBuf.length === expectedBuf.length && timingSafeEqual(sigBuf, expectedBuf)) {
        return true;
      }
    }
  }

  return false;
}
