import { describe, it, expect } from 'vitest';
import { signPayload, parseSignatureHeader, verifySignature, constructEvent } from '../webhooks/verify.js';

describe('Webhook Verification', () => {
  const secret = 'whsec_test_secret_key';
  const body = '{"event":"record.fulfilled","data":{"id":"rec-123"}}';

  describe('signPayload', () => {
    it('produces valid header format', () => {
      const result = signPayload(body, secret, 1709913600);
      expect(result.header).toMatch(/^t=\d+,v1=[a-f0-9]+$/);
      expect(result.timestamp).toBe(1709913600);
      expect(result.signature).toMatch(/^[a-f0-9]{64}$/);
    });

    it('uses current time when no timestamp provided', () => {
      const result = signPayload(body, secret);
      const now = Math.floor(Date.now() / 1000);
      expect(Math.abs(result.timestamp - now)).toBeLessThan(2);
    });
  });

  describe('parseSignatureHeader', () => {
    it('parses valid header', () => {
      const parsed = parseSignatureHeader('t=1234567890,v1=abcdef0123456789');
      expect(parsed).not.toBeNull();
      expect(parsed!.timestamp).toBe(1234567890);
      expect(parsed!.signatures).toEqual(['abcdef0123456789']);
    });

    it('supports multiple v1 signatures (key rotation)', () => {
      const parsed = parseSignatureHeader('t=1234567890,v1=sig1,v1=sig2');
      expect(parsed!.signatures).toEqual(['sig1', 'sig2']);
    });

    it('returns null for invalid header', () => {
      expect(parseSignatureHeader('')).toBeNull();
      expect(parseSignatureHeader('invalid')).toBeNull();
      expect(parseSignatureHeader('t=abc')).toBeNull();
      expect(parseSignatureHeader('v1=sig')).toBeNull();
    });
  });

  describe('verifySignature', () => {
    it('verifies a valid signature', () => {
      const { header } = signPayload(body, secret);
      expect(verifySignature(body, header, secret)).toBe(true);
    });

    it('rejects wrong body', () => {
      const { header } = signPayload(body, secret);
      expect(verifySignature('wrong body', header, secret)).toBe(false);
    });

    it('rejects wrong secret', () => {
      const { header } = signPayload(body, secret);
      expect(verifySignature(body, header, 'wrong_secret')).toBe(false);
    });

    it('rejects expired signatures', () => {
      const oldTimestamp = Math.floor(Date.now() / 1000) - 600;
      const { header } = signPayload(body, secret, oldTimestamp);
      expect(verifySignature(body, header, secret)).toBe(false);
    });

    it('accepts within tolerance', () => {
      const recentTimestamp = Math.floor(Date.now() / 1000) - 100;
      const { header } = signPayload(body, secret, recentTimestamp);
      expect(verifySignature(body, header, secret, 300)).toBe(true);
    });

    it('caps tolerance at 300 seconds', () => {
      const oldTimestamp = Math.floor(Date.now() / 1000) - 400;
      const { header } = signPayload(body, secret, oldTimestamp);
      // Even with 600s tolerance, should be capped at 300
      expect(verifySignature(body, header, secret, 600)).toBe(false);
    });

    it('supports array of secrets (key rotation)', () => {
      const { header } = signPayload(body, secret);
      expect(verifySignature(body, header, ['old_secret', secret, 'new_secret'])).toBe(true);
    });

    it('rejects when no secret matches', () => {
      const { header } = signPayload(body, secret);
      expect(verifySignature(body, header, ['wrong1', 'wrong2'])).toBe(false);
    });
  });

  describe('constructEvent', () => {
    const eventBody = JSON.stringify({
      type: 'record.created',
      data: { id: 'rec-123', status: 'CREATED' },
      timestamp: '2026-03-16T12:00:00Z',
      id: 'evt-456',
    });

    it('verifies and parses in one step', () => {
      const { header } = signPayload(eventBody, secret);
      const event = constructEvent(eventBody, header, secret);
      expect(event.type).toBe('record.created');
      expect(event.data).toEqual({ id: 'rec-123', status: 'CREATED' });
      expect(event.timestamp).toBe('2026-03-16T12:00:00Z');
      expect(event.id).toBe('evt-456');
    });

    it('throws on invalid signature', () => {
      const { header } = signPayload(eventBody, 'wrong_secret');
      expect(() => constructEvent(eventBody, header, secret)).toThrow('Webhook signature verification failed');
    });

    it('throws on expired signature', () => {
      const oldTs = Math.floor(Date.now() / 1000) - 600;
      const { header } = signPayload(eventBody, secret, oldTs);
      expect(() => constructEvent(eventBody, header, secret)).toThrow('Webhook signature verification failed');
    });
  });
});
