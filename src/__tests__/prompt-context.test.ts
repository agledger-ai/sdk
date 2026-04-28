import { describe, it, expect } from 'vitest';
import { recordToContext, receiptToContext, errorToContext } from '../prompt-context.js';
import {
  AgledgerApiError,
  ValidationError,
  UnprocessableError,
  PermissionError,
  RateLimitError,
} from '../errors.js';
import type { RecordRow, Receipt } from '../types.js';

const baseRecord: RecordRow = {
  id: 'rec-abc',
  enterpriseId: 'ent-1',
  agentId: 'agt-123',
  principalAgentId: 'agt-123',
  createdByKeyId: 'key-1',
  type: 'ACH-PROC-v1',
  contractVersion: '1',
  platform: 'test',
  status: 'ACTIVE',
  criteria: {},
  deadline: '2026-04-01',
  submissionCount: 0,
  maxSubmissions: null,
  version: 1,
  createdAt: '2026-03-01T00:00:00Z',
  updatedAt: '2026-03-01T00:00:00Z',
};

const baseReceipt: Receipt = {
  id: 'rct-def',
  recordId: 'rec-abc',
  agentId: 'agt-123',
  structuralValidation: 'ACCEPTED',
  evidence: {},
  createdAt: '2026-03-02T00:00:00Z',
};

describe('recordToContext', () => {
  it('includes id, type, status, agent, deadline', () => {
    const ctx = recordToContext(baseRecord);
    expect(ctx).toBe('Record rec-abc [ACH-PROC-v1] status=ACTIVE agent=agt-123 deadline=2026-04-01');
  });

  it('omits agent when null', () => {
    const ctx = recordToContext({ ...baseRecord, agentId: null });
    expect(ctx).not.toContain('agent=');
  });

  it('omits deadline when absent', () => {
    const { deadline: _, ...noDeadline } = baseRecord;
    const ctx = recordToContext(noDeadline as RecordRow);
    expect(ctx).not.toContain('deadline=');
  });

  it('includes parent Record ID when present', () => {
    const ctx = recordToContext({ ...baseRecord, parentRecordId: 'rec-parent' });
    expect(ctx).toContain('parent=rec-parent');
  });
});

describe('receiptToContext', () => {
  it('includes id, record, validation', () => {
    const ctx = receiptToContext(baseReceipt);
    expect(ctx).toBe('Receipt rct-def for record rec-abc validation=ACCEPTED agent=agt-123');
  });

  it('includes record status when present', () => {
    const ctx = receiptToContext({ ...baseReceipt, recordStatus: 'FULFILLED' });
    expect(ctx).toContain('recordStatus=FULFILLED');
  });
});

describe('errorToContext', () => {
  it('formats 422 with do-not-retry guidance', () => {
    const err = new UnprocessableError({ error: 'RECORD_NOT_ACTIVE', message: 'Record is FULFILLED', code: 'RECORD_NOT_ACTIVE' });
    const ctx = errorToContext(err);
    expect(ctx).toContain('Error 422 [RECORD_NOT_ACTIVE]: Record is FULFILLED');
    expect(ctx).toContain('Do not retry.');
  });

  it('appends recoveryHint when 422 carries one', () => {
    const err = new UnprocessableError({
      error: 'INVALID_ACTION',
      message: 'Action not allowed',
      code: 'INVALID_ACTION',
      recoveryHint: 'GET /v1/records/{id} and read nextActions',
    });
    const ctx = errorToContext(err);
    expect(ctx).toContain('GET /v1/records/{id} and read nextActions');
  });

  it('formats 429 with retry-after', () => {
    const err = new RateLimitError({ error: 'RATE_LIMITED', message: 'Rate limited' }, 2);
    const ctx = errorToContext(err);
    expect(ctx).toContain('Retry after 2s.');
  });

  it('formats 400 with fix guidance', () => {
    const err = new ValidationError({ error: 'VALIDATION_ERROR', message: 'Missing field: criteria' });
    const ctx = errorToContext(err);
    expect(ctx).toContain('Fix the request and retry.');
  });

  it('formats 403 with auth guidance', () => {
    const err = new PermissionError({ error: 'FORBIDDEN', message: 'Missing scope' });
    const ctx = errorToContext(err);
    expect(ctx).toContain('Check credentials/scopes.');
  });

  it('formats 500 as retryable', () => {
    const err = new AgledgerApiError(500, { error: 'INTERNAL', message: 'Internal error' });
    const ctx = errorToContext(err);
    expect(ctx).toContain('Retryable.');
  });

  it('omits code when unknown', () => {
    const err = new AgledgerApiError(500, { error: '', message: 'Server error' });
    const ctx = errorToContext(err);
    expect(ctx).not.toContain('[unknown]');
  });
});
