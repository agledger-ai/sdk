import { describe, it, expect } from 'vitest';
import { mandateToContext, receiptToContext, errorToContext } from '../prompt-context.js';
import {
  AgledgerApiError,
  ValidationError,
  UnprocessableError,
  PermissionError,
  RateLimitError,
} from '../errors.js';
import type { Mandate, Receipt } from '../types.js';

const baseMandate: Mandate = {
  id: 'mnd-abc',
  enterpriseId: 'ent-1',
  agentId: 'agt-123',
  contractType: 'ACH-PROC-v1',
  contractVersion: '1',
  platform: 'test',
  status: 'ACTIVE',
  criteria: {},
  deadline: '2026-04-01',
  version: 1,
  createdAt: '2026-03-01T00:00:00Z',
  updatedAt: '2026-03-01T00:00:00Z',
};

const baseReceipt: Receipt = {
  id: 'rct-def',
  mandateId: 'mnd-abc',
  agentId: 'agt-123',
  structuralValidation: 'ACCEPTED',
  evidence: {},
  createdAt: '2026-03-02T00:00:00Z',
};

describe('mandateToContext', () => {
  it('includes id, contract type, status, agent, deadline', () => {
    const ctx = mandateToContext(baseMandate);
    expect(ctx).toBe('Mandate mnd-abc [ACH-PROC-v1] status=ACTIVE agent=agt-123 deadline=2026-04-01');
  });

  it('omits agent when null', () => {
    const ctx = mandateToContext({ ...baseMandate, agentId: null });
    expect(ctx).not.toContain('agent=');
  });

  it('omits deadline when absent', () => {
    const { deadline: _, ...noDeadline } = baseMandate;
    const ctx = mandateToContext(noDeadline as Mandate);
    expect(ctx).not.toContain('deadline=');
  });

  it('includes parent mandate ID when present', () => {
    const ctx = mandateToContext({ ...baseMandate, parentMandateId: 'mnd-parent' });
    expect(ctx).toContain('parent=mnd-parent');
  });
});

describe('receiptToContext', () => {
  it('includes id, mandate, validation', () => {
    const ctx = receiptToContext(baseReceipt);
    expect(ctx).toBe('Receipt rct-def for mandate mnd-abc validation=ACCEPTED agent=agt-123');
  });

  it('includes mandate status when present', () => {
    const ctx = receiptToContext({ ...baseReceipt, mandateStatus: 'FULFILLED' });
    expect(ctx).toContain('mandateStatus=FULFILLED');
  });
});

describe('errorToContext', () => {
  it('formats 422 with do-not-retry guidance', () => {
    const err = new UnprocessableError({ message: 'Mandate is FULFILLED', code: 'MANDATE_NOT_ACTIVE' });
    const ctx = errorToContext(err);
    expect(ctx).toBe('Error 422 [MANDATE_NOT_ACTIVE]: Mandate is FULFILLED Do not retry.');
  });

  it('formats 429 with retry-after', () => {
    const err = new RateLimitError({ message: 'Rate limited' }, 2);
    const ctx = errorToContext(err);
    expect(ctx).toContain('Retry after 2s.');
  });

  it('formats 400 with fix guidance', () => {
    const err = new ValidationError({ message: 'Missing field: criteria' });
    const ctx = errorToContext(err);
    expect(ctx).toContain('Fix the request and retry.');
  });

  it('formats 403 with auth guidance', () => {
    const err = new PermissionError({ message: 'Missing scope' });
    const ctx = errorToContext(err);
    expect(ctx).toContain('Check credentials/scopes.');
  });

  it('formats 500 as retryable', () => {
    const err = new AgledgerApiError(500, { message: 'Internal error' });
    const ctx = errorToContext(err);
    expect(ctx).toContain('Retryable.');
  });

  it('omits code when unknown', () => {
    const err = new AgledgerApiError(500, { message: 'Server error' });
    const ctx = errorToContext(err);
    expect(ctx).not.toContain('[unknown]');
  });
});
