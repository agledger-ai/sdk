import { describe, it, expect } from 'vitest';
import {
  AgledgerApiError,
  AuthenticationError,
  PermissionError,
  ValidationError,
  UnprocessableError,
  RateLimitError,
} from '../errors.js';

describe('AgledgerApiError classifier methods', () => {
  describe('isRetryable()', () => {
    it('returns true for 429', () => {
      const err = new AgledgerApiError(429, { message: 'Rate limited' });
      expect(err.isRetryable()).toBe(true);
    });

    it('returns true for 500', () => {
      const err = new AgledgerApiError(500, { message: 'Internal error' });
      expect(err.isRetryable()).toBe(true);
    });

    it('returns false for 400', () => {
      const err = new AgledgerApiError(400, { message: 'Bad request' });
      expect(err.isRetryable()).toBe(false);
    });

    it('respects API retryable override', () => {
      const err = new AgledgerApiError(400, { message: 'Transient', retryable: true });
      expect(err.isRetryable()).toBe(true);
    });
  });

  describe('isInputError()', () => {
    it('returns true for 400', () => {
      const err = new ValidationError({ message: 'Invalid field' });
      expect(err.isInputError()).toBe(true);
    });

    it('returns false for 422', () => {
      const err = new UnprocessableError({ message: 'Wrong state' });
      expect(err.isInputError()).toBe(false);
    });
  });

  describe('isStateError()', () => {
    it('returns true for 422', () => {
      const err = new UnprocessableError({ message: 'Mandate is FULFILLED' });
      expect(err.isStateError()).toBe(true);
    });

    it('returns false for 400', () => {
      const err = new ValidationError({ message: 'Missing field' });
      expect(err.isStateError()).toBe(false);
    });
  });

  describe('isAuthError()', () => {
    it('returns true for 401', () => {
      const err = new AuthenticationError({ message: 'Invalid key' });
      expect(err.isAuthError()).toBe(true);
    });

    it('returns true for 403', () => {
      const err = new PermissionError({ message: 'Missing scope' });
      expect(err.isAuthError()).toBe(true);
    });

    it('returns false for 400', () => {
      const err = new ValidationError({ message: 'Bad input' });
      expect(err.isAuthError()).toBe(false);
    });

    it('returns false for 429', () => {
      const err = new RateLimitError({ message: 'Rate limited' }, 2);
      expect(err.isAuthError()).toBe(false);
    });
  });

  describe('docUrl', () => {
    it('generates doc URL from error code', () => {
      const err = new AgledgerApiError(422, { message: 'Wrong state', code: 'MANDATE_NOT_ACTIVE' });
      expect(err.docUrl).toBe('https://docs.agledger.ai/errors/MANDATE_NOT_ACTIVE');
    });

    it('uses error field as fallback code', () => {
      const err = new AgledgerApiError(400, { message: 'Bad', error: 'validation_error' });
      expect(err.docUrl).toBe('https://docs.agledger.ai/errors/validation_error');
    });

    it('uses "unknown" when no code provided', () => {
      const err = new AgledgerApiError(500, { message: 'Boom' });
      expect(err.docUrl).toBe('https://docs.agledger.ai/errors/unknown');
    });
  });

  describe('suggestion', () => {
    it('uses API-provided suggestion when present', () => {
      const err = new AgledgerApiError(400, { message: 'Bad', suggestion: 'Try passing contractType' });
      expect(err.suggestion).toBe('Try passing contractType');
    });

    it('generates default suggestion for 404', () => {
      const err = new AgledgerApiError(404, { message: 'Not found' });
      expect(err.suggestion).toContain('not found');
    });

    it('generates default suggestion for 401', () => {
      const err = new AgledgerApiError(401, { message: 'Unauthorized' });
      expect(err.suggestion).toContain('API key');
    });

    it('generates default suggestion for 403', () => {
      const err = new AgledgerApiError(403, { message: 'Forbidden' });
      expect(err.suggestion).toContain('scopes');
    });

    it('generates default suggestion for 422', () => {
      const err = new AgledgerApiError(422, { message: 'Wrong state' });
      expect(err.suggestion).toContain('wrong state');
    });

    it('returns undefined for unknown status codes', () => {
      const err = new AgledgerApiError(502, { message: 'Bad gateway' });
      expect(err.suggestion).toBeUndefined();
    });
  });
});
