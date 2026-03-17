import { describe, it, expect } from 'vitest';
import {
  MANDATE_TRANSITIONS,
  TERMINAL_STATUSES,
  canTransitionTo,
  getValidTransitions,
  isTerminalStatus,
} from '../mandate-lifecycle.js';

describe('MANDATE_TRANSITIONS', () => {
  it('contains all expected statuses', () => {
    const statuses = Object.keys(MANDATE_TRANSITIONS);
    expect(statuses).toContain('DRAFT');
    expect(statuses).toContain('ACTIVE');
    expect(statuses).toContain('FULFILLED');
    expect(statuses).toContain('VERIFYING');
    expect(statuses).toContain('REJECTED');
    expect(statuses).toContain('REVISION_REQUESTED');
    expect(statuses.length).toBe(17);
  });
});

describe('TERMINAL_STATUSES', () => {
  it('includes all terminal statuses', () => {
    expect(TERMINAL_STATUSES).toContain('FULFILLED');
    expect(TERMINAL_STATUSES).toContain('REMEDIATED');
    expect(TERMINAL_STATUSES).toContain('EXPIRED');
    expect(TERMINAL_STATUSES).toContain('CANCELLED_DRAFT');
    expect(TERMINAL_STATUSES).toContain('CANCELLED_PRE_WORK');
    expect(TERMINAL_STATUSES).toContain('CANCELLED_IN_PROGRESS');
    expect(TERMINAL_STATUSES).toContain('REJECTED');
  });

  it('does not include non-terminal statuses', () => {
    expect(TERMINAL_STATUSES).not.toContain('DRAFT');
    expect(TERMINAL_STATUSES).not.toContain('ACTIVE');
    expect(TERMINAL_STATUSES).not.toContain('VERIFYING');
  });
});

describe('canTransitionTo', () => {
  it('allows DRAFT → REGISTERED', () => {
    expect(canTransitionTo('DRAFT', 'REGISTERED')).toBe(true);
  });

  it('allows DRAFT → PROPOSED', () => {
    expect(canTransitionTo('DRAFT', 'PROPOSED')).toBe(true);
  });

  it('allows ACTIVE → RECEIPT_ACCEPTED', () => {
    expect(canTransitionTo('ACTIVE', 'RECEIPT_ACCEPTED')).toBe(true);
  });

  it('allows VERIFIED_FAIL → REMEDIATED', () => {
    expect(canTransitionTo('VERIFIED_FAIL', 'REMEDIATED')).toBe(true);
  });

  it('allows VERIFIED_FAIL → VERIFIED_PASS (re-verification)', () => {
    expect(canTransitionTo('VERIFIED_FAIL', 'VERIFIED_PASS')).toBe(true);
  });

  it('allows VERIFIED_FAIL → REVISION_REQUESTED (rework loop)', () => {
    expect(canTransitionTo('VERIFIED_FAIL', 'REVISION_REQUESTED')).toBe(true);
  });

  it('allows REVISION_REQUESTED → RECEIPT_ACCEPTED (resubmission)', () => {
    expect(canTransitionTo('REVISION_REQUESTED', 'RECEIPT_ACCEPTED')).toBe(true);
  });

  it('allows REVISION_REQUESTED → EXPIRED', () => {
    expect(canTransitionTo('REVISION_REQUESTED', 'EXPIRED')).toBe(true);
  });

  it('rejects invalid transitions', () => {
    expect(canTransitionTo('DRAFT', 'ACTIVE')).toBe(false);
    expect(canTransitionTo('FULFILLED', 'ACTIVE')).toBe(false);
    expect(canTransitionTo('ACTIVE', 'DRAFT')).toBe(false);
  });

  it('returns false for unknown statuses (forward compat)', () => {
    expect(canTransitionTo('FUTURE_STATUS', 'ACTIVE')).toBe(false);
  });
});

describe('getValidTransitions', () => {
  it('returns transitions for DRAFT', () => {
    expect(getValidTransitions('DRAFT')).toEqual(['REGISTERED', 'PROPOSED', 'CANCELLED_DRAFT']);
  });

  it('returns empty array for terminal statuses', () => {
    expect(getValidTransitions('FULFILLED')).toEqual([]);
    expect(getValidTransitions('REJECTED')).toEqual([]);
  });

  it('returns empty array for unknown statuses (forward compat)', () => {
    expect(getValidTransitions('UNKNOWN_STATUS')).toEqual([]);
  });
});

describe('isTerminalStatus', () => {
  it('returns true for terminal statuses', () => {
    expect(isTerminalStatus('FULFILLED')).toBe(true);
    expect(isTerminalStatus('EXPIRED')).toBe(true);
    expect(isTerminalStatus('CANCELLED_IN_PROGRESS')).toBe(true);
  });

  it('returns false for non-terminal statuses', () => {
    expect(isTerminalStatus('DRAFT')).toBe(false);
    expect(isTerminalStatus('ACTIVE')).toBe(false);
    expect(isTerminalStatus('VERIFYING')).toBe(false);
  });

  it('returns false for unknown statuses (forward compat)', () => {
    expect(isTerminalStatus('FUTURE_STATUS')).toBe(false);
  });
});
