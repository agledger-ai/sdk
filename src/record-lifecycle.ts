import type { RecordStatus } from './types.js';

/**
 * Valid state transitions for Records using customer-facing display statuses.
 * The API maps internal states to these display statuses — this table reflects
 * what SDK consumers actually observe.
 *
 * Unknown statuses return empty arrays for forward compatibility.
 */
export const RECORD_TRANSITIONS: Readonly<Record<string, readonly string[]>> = {
  CREATED: ['ACTIVE', 'PROPOSED', 'CANCELLED'],
  PROPOSED: ['CREATED', 'REJECTED', 'CANCELLED'],
  ACTIVE: ['PROCESSING', 'EXPIRED', 'CANCELLED'],
  PROCESSING: ['FULFILLED', 'FAILED', 'REVISION_REQUESTED', 'DISPUTED'],
  REVISION_REQUESTED: ['PROCESSING', 'EXPIRED', 'CANCELLED'],
  DISPUTED: ['FULFILLED', 'FAILED', 'PENDING_ARBITRATION'],
  FULFILLED: [],
  FAILED: ['REMEDIATED', 'REVISION_REQUESTED'],
  REMEDIATED: [],
  EXPIRED: [],
  PENDING_ARBITRATION: [],
  CANCELLED: [],
  REJECTED: [],
  RECORDED: [],
};

/** Statuses with no outbound transitions. */
export const TERMINAL_STATUSES: readonly string[] = Object.entries(RECORD_TRANSITIONS)
  .filter(([, targets]) => targets.length === 0)
  .map(([status]) => status);

/** Check whether a transition from `current` to `target` is valid. Unknown statuses return false. */
export function canTransitionTo(current: RecordStatus, target: RecordStatus): boolean {
  const targets = RECORD_TRANSITIONS[current];
  if (!targets) return false;
  return targets.includes(target);
}

/** Get valid next statuses for a given status. Unknown statuses return []. */
export function getValidTransitions(status: RecordStatus): readonly string[] {
  return RECORD_TRANSITIONS[status] ?? [];
}

/** Check whether a status is terminal (no outbound transitions). Unknown statuses return false. */
export function isTerminalStatus(status: RecordStatus): boolean {
  const targets = RECORD_TRANSITIONS[status];
  if (!targets) return false;
  return targets.length === 0;
}
