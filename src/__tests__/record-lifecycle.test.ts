import { describe, it, expect } from 'vitest';
import {
  RECORD_TRANSITIONS,
  TERMINAL_STATUSES,
  canTransitionTo,
  getValidTransitions,
  isTerminalStatus,
} from '../record-lifecycle.js';

describe('RECORD_TRANSITIONS', () => {
  it('contains all expected display statuses', () => {
    const statuses = Object.keys(RECORD_TRANSITIONS);
    expect(statuses).toContain('CREATED');
    expect(statuses).toContain('ACTIVE');
    expect(statuses).toContain('PROCESSING');
    expect(statuses).toContain('FULFILLED');
    expect(statuses).toContain('FAILED');
    expect(statuses).toContain('REJECTED');
    expect(statuses).toContain('REVISION_REQUESTED');
    expect(statuses).toContain('RECORDED');
    expect(statuses).toContain('DISPUTED');
    expect(statuses).toContain('PENDING_ARBITRATION');
    expect(statuses.length).toBeGreaterThanOrEqual(13);
  });
});

describe('TERMINAL_STATUSES', () => {
  it('includes all terminal statuses', () => {
    expect(TERMINAL_STATUSES).toContain('FULFILLED');
    expect(TERMINAL_STATUSES).toContain('REMEDIATED');
    expect(TERMINAL_STATUSES).toContain('EXPIRED');
    expect(TERMINAL_STATUSES).toContain('CANCELLED');
    expect(TERMINAL_STATUSES).toContain('REJECTED');
    expect(TERMINAL_STATUSES).toContain('RECORDED');
    expect(TERMINAL_STATUSES).toContain('PENDING_ARBITRATION');
  });

  it('does not include non-terminal statuses', () => {
    expect(TERMINAL_STATUSES).not.toContain('CREATED');
    expect(TERMINAL_STATUSES).not.toContain('ACTIVE');
    expect(TERMINAL_STATUSES).not.toContain('PROCESSING');
  });
});

describe('canTransitionTo', () => {
  it('allows CREATED → ACTIVE', () => {
    expect(canTransitionTo('CREATED', 'ACTIVE')).toBe(true);
  });

  it('allows CREATED → PROPOSED', () => {
    expect(canTransitionTo('CREATED', 'PROPOSED')).toBe(true);
  });

  it('allows ACTIVE → PROCESSING', () => {
    expect(canTransitionTo('ACTIVE', 'PROCESSING')).toBe(true);
  });

  it('allows FAILED → REMEDIATED', () => {
    expect(canTransitionTo('FAILED', 'REMEDIATED')).toBe(true);
  });

  it('allows FAILED → REVISION_REQUESTED (rework loop)', () => {
    expect(canTransitionTo('FAILED', 'REVISION_REQUESTED')).toBe(true);
  });

  it('allows REVISION_REQUESTED → PROCESSING (resubmission)', () => {
    expect(canTransitionTo('REVISION_REQUESTED', 'PROCESSING')).toBe(true);
  });

  it('allows REVISION_REQUESTED → EXPIRED', () => {
    expect(canTransitionTo('REVISION_REQUESTED', 'EXPIRED')).toBe(true);
  });

  it('rejects invalid transitions', () => {
    expect(canTransitionTo('CREATED', 'PROCESSING')).toBe(false);
    expect(canTransitionTo('FULFILLED', 'ACTIVE')).toBe(false);
    expect(canTransitionTo('ACTIVE', 'CREATED')).toBe(false);
  });

  it('returns false for unknown statuses (forward compat)', () => {
    expect(canTransitionTo('FUTURE_STATUS', 'ACTIVE')).toBe(false);
  });
});

describe('getValidTransitions', () => {
  it('returns transitions for CREATED', () => {
    expect(getValidTransitions('CREATED')).toEqual(['ACTIVE', 'PROPOSED', 'CANCELLED']);
  });

  it('returns empty array for terminal statuses', () => {
    expect(getValidTransitions('FULFILLED')).toEqual([]);
    expect(getValidTransitions('REJECTED')).toEqual([]);
    expect(getValidTransitions('RECORDED')).toEqual([]);
  });

  it('returns empty array for unknown statuses (forward compat)', () => {
    expect(getValidTransitions('UNKNOWN_STATUS')).toEqual([]);
  });
});

describe('isTerminalStatus', () => {
  it('returns true for terminal statuses', () => {
    expect(isTerminalStatus('FULFILLED')).toBe(true);
    expect(isTerminalStatus('EXPIRED')).toBe(true);
    expect(isTerminalStatus('CANCELLED')).toBe(true);
    expect(isTerminalStatus('RECORDED')).toBe(true);
  });

  it('returns false for non-terminal statuses', () => {
    expect(isTerminalStatus('CREATED')).toBe(false);
    expect(isTerminalStatus('ACTIVE')).toBe(false);
    expect(isTerminalStatus('PROCESSING')).toBe(false);
  });

  it('returns false for unknown statuses (forward compat)', () => {
    expect(isTerminalStatus('FUTURE_STATUS')).toBe(false);
  });
});
