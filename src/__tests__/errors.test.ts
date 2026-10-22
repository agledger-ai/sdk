import { describe, it, expect } from 'vitest';
import {
  AgledgerApiError,
  AuthenticationError,
  ConflictError,
  PermissionError,
  ValidationError,
  UnprocessableError,
  RateLimitError,
} from '../errors.js';

describe('AgledgerApiError classifier methods', () => {
  describe('isRetryable()', () => {
    it('returns true for 429', () => {
      const err = new AgledgerApiError(429, { detail: 'Rate limited' });
      expect(err.isRetryable()).toBe(true);
    });

    it('returns true for 500', () => {
      const err = new AgledgerApiError(500, { detail: 'Internal error' });
      expect(err.isRetryable()).toBe(true);
    });

    it('returns false for 400', () => {
      const err = new AgledgerApiError(400, { detail: 'Bad request' });
      expect(err.isRetryable()).toBe(false);
    });

    it('respects API retryable override', () => {
      const err = new AgledgerApiError(400, { detail: 'Transient', retryable: true });
      expect(err.isRetryable()).toBe(true);
    });
  });

  describe('isInputError()', () => {
    it('returns true for 400', () => {
      const err = new ValidationError({ detail: 'Invalid field' });
      expect(err.isInputError()).toBe(true);
    });

    it('returns false for 422', () => {
      const err = new UnprocessableError({ detail: 'Wrong state' });
      expect(err.isInputError()).toBe(false);
    });
  });

  describe('isStateError()', () => {
    it('returns true for 422', () => {
      const err = new UnprocessableError({ detail: 'Record is FULFILLED' });
      expect(err.isStateError()).toBe(true);
    });

    it('returns false for 400', () => {
      const err = new ValidationError({ detail: 'Missing field' });
      expect(err.isStateError()).toBe(false);
    });
  });

  describe('recoveryHint and refreshUrl', () => {
    it('forwards recoveryHint and refreshUrl on 422 INVALID_ACTION', () => {
      const err = new UnprocessableError({
        detail: 'Action not allowed',
        error: 'INVALID_ACTION',
        recoveryHint: 'GET /v1/records/{id} and read nextActions',
        refreshUrl: '/v1/records/rec-123',
        currentState: 'CREATED',
        allowedActions: ['register', 'cancel'],
      });
      expect(err.recoveryHint).toBe('GET /v1/records/{id} and read nextActions');
      expect(err.refreshUrl).toBe('/v1/records/rec-123');
    });

    it('leaves recoveryHint undefined when API omits it', () => {
      const err = new ValidationError({ detail: 'Bad input' });
      expect(err.recoveryHint).toBeUndefined();
      expect(err.refreshUrl).toBeUndefined();
    });
  });

  describe('refusal fields forwarded verbatim', () => {
    it('forwards reason, currentState, allowedActions and existingId', () => {
      const err = new UnprocessableError({
        detail: 'The scopes this token asks for are admin-only',
        currentState: 'scope_claim_admin_only',
        allowedActions: ['fix_the_idp_claim_mapping'],
      });
      expect(err.currentState).toBe('scope_claim_admin_only');
      expect(err.allowedActions).toEqual(['fix_the_idp_claim_mapping']);

      const conflict = new ConflictError({
        detail: 'A trusted issuer with this URL already exists',
        reason: 'TRUSTED_ISSUER_EXISTS',
        existingId: '0199a8f0-0000-7000-8000-000000000001',
      });
      expect(conflict.reason).toBe('TRUSTED_ISSUER_EXISTS');
      expect(conflict.existingId).toBe('0199a8f0-0000-7000-8000-000000000001');

      const refused = new UnprocessableError({
        detail: 'A verdict is refused on a FAILED record',
        currentState: 'FAILED',
        allowedActions: [],
        validTransitions: ['DISPUTED'],
      });
      expect(refused.validTransitions).toEqual(['DISPUTED']);
    });

    it('leaves them undefined when the body omits them', () => {
      const err = new ValidationError({ detail: 'Bad input' });
      expect(err.reason).toBeUndefined();
      expect(err.currentState).toBeUndefined();
      expect(err.allowedActions).toBeUndefined();
      expect(err.existingId).toBeUndefined();
      expect(err.validTransitions).toBeUndefined();
    });
  });

  describe('the whole body is kept', () => {
    // A raw POST /v1/records with criteria: 5 answers a 400 whose keys are
    // detail, details, error, errors, examplePayload, instance, recoveryHint,
    // requestId, requiredFields, retryable, schemaUrl, status, title, type,
    // validationErrors. The SDK copied a fixed list and dropped the rebuild
    // kit, title and instance, so a strict caller could not rebuild the body
    // the recoveryHint told it to.
    it('surfaces the 400 rebuild kit, title and instance, and keeps the parsed body', () => {
      const body = {
        type: '/problems/validation',
        title: 'Validation failed',
        status: 400,
        detail: 'criteria must be an object',
        instance: '/v1/records',
        error: 'VALIDATION_ERROR',
        errors: [{ instancePath: '/criteria', message: 'must be object' }],
        details: [{ field: 'criteria', message: 'must be object' }],
        retryable: false,
        requestId: 'req-1',
        recoveryHint: 'Fetch schemaUrl and rebuild criteria from examplePayload.',
        requiredFields: ['criteria'],
        optionalFields: ['deadline'],
        examplePayload: { type: 'notarize-generic-v1', criteria: { summary: 'x' } },
        schemaUrl: '/v1/schemas/notarize-generic-v1',
        recordType: 'notarize-generic-v1',
        validationErrors: [{ field: 'criteria', message: 'must be object', keyword: 'type' }],
        unknownFutureField: { any: 'thing' },
      };
      const err = new ValidationError(body);
      expect(err.title).toBe('Validation failed');
      expect(err.instance).toBe('/v1/records');
      expect(err.detail).toBe('criteria must be an object');
      expect(err.requiredFields).toEqual(['criteria']);
      expect(err.optionalFields).toEqual(['deadline']);
      expect(err.examplePayload).toEqual({ type: 'notarize-generic-v1', criteria: { summary: 'x' } });
      expect(err.schemaUrl).toBe('/v1/schemas/notarize-generic-v1');
      expect(err.recordType).toBe('notarize-generic-v1');
      expect(err.errors).toEqual([{ instancePath: '/criteria', message: 'must be object' }]);
      // The top-level validationErrors array wins over details, and keeps its extras.
      expect(err.validationErrors).toEqual([{ field: 'criteria', message: 'must be object', keyword: 'type' }]);
      // A field this class does not name is still readable off the body.
      expect(err.body).toBe(body);
      expect((err.body as Record<string, unknown>).unknownFutureField).toEqual({ any: 'thing' });
    });

    it('surfaces the 404 hint and the 422 attemptedAction', () => {
      const missing = new (class extends AgledgerApiError {})(404, {
        error: 'NOT_FOUND',
        detail: 'No record with that id',
        hint: 'List records with GET /v1/records, or create one with POST /v1/records.',
      });
      expect(missing.hint).toBe('List records with GET /v1/records, or create one with POST /v1/records.');

      const refused = new UnprocessableError({
        error: 'INVALID_ACTION',
        detail: 'cancel is refused on a FULFILLED record',
        attemptedAction: 'cancel',
        attemptedTransition: 'CANCELLED',
        attemptedState: 'CANCELLED',
        currentState: 'FULFILLED',
        allowedActions: [],
      });
      expect(refused.attemptedAction).toBe('cancel');
      expect(refused.attemptedTransition).toBe('CANCELLED');
      expect(refused.attemptedState).toBe('CANCELLED');
    });

    it('carries retryAfter on every class, null when nothing asked for a wait', () => {
      expect(new ValidationError({ detail: 'x' }).retryAfter).toBeNull();
      expect(new AuthenticationError({ detail: 'x' }, 2000).retryAfter).toBe(2000);
      expect(new RateLimitError({ detail: 'x' }, 6000).retryAfter).toBe(6000);
      expect(new AgledgerApiError(503, { detail: 'x' }, 6000).retryAfter).toBe(6000);
    });
  });

  describe('PermissionError missingScopes', () => {
    it('reads missingScopes from RFC 9457 top-level field (v0.21+)', () => {
      const err = new PermissionError({
        detail: 'Missing scope',
        error: 'INSUFFICIENT_SCOPE',
        missingScopes: ['records:write'],
      });
      expect(err.missingScopes).toEqual(['records:write']);
    });

    it('falls back to details.missingScopes for older response shapes', () => {
      const err = new PermissionError({
        detail: 'Missing scope',
        error: 'INSUFFICIENT_SCOPE',
        details: { missingScopes: ['records:write'] },
      });
      expect(err.missingScopes).toEqual(['records:write']);
    });
  });

  describe('isAuthError()', () => {
    it('returns true for 401', () => {
      const err = new AuthenticationError({ detail: 'Invalid key' });
      expect(err.isAuthError()).toBe(true);
    });

    it('returns true for 403', () => {
      const err = new PermissionError({ detail: 'Missing scope' });
      expect(err.isAuthError()).toBe(true);
    });

    it('returns false for 400', () => {
      const err = new ValidationError({ detail: 'Bad input' });
      expect(err.isAuthError()).toBe(false);
    });

    it('returns false for 429', () => {
      const err = new RateLimitError({ detail: 'Rate limited' }, 2);
      expect(err.isAuthError()).toBe(false);
    });
  });

  describe('message and code', () => {
    it('reads message from detail and code from error', () => {
      const err = new AgledgerApiError(422, {
        title: 'Unprocessable Entity',
        detail: 'Record is FULFILLED',
        error: 'RECORD_NOT_ACTIVE',
      });
      expect(err.message).toBe('Record is FULFILLED');
      expect(err.code).toBe('RECORD_NOT_ACTIVE');
    });

    it('falls back to title when detail is absent', () => {
      const err = new AgledgerApiError(502, { title: 'Bad Gateway' });
      expect(err.message).toBe('Bad Gateway');
      expect(err.code).toBe('unknown');
    });
  });

  describe('suggestion', () => {
    it('forwards suggestion from API body when present', () => {
      const err = new AgledgerApiError(400, { detail: 'Bad', suggestion: "Did you mean 'type'?" });
      expect(err.suggestion).toBe("Did you mean 'type'?");
    });

    it('is undefined when API does not return suggestion', () => {
      const err = new AgledgerApiError(404, { detail: 'Not found' });
      expect(err.suggestion).toBeUndefined();
    });
  });
});
