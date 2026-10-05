import type { RecordStatus } from './types.js';

/**
 * The display statuses each status can reach on some Record, as the Server's
 * `GET /lifecycle` serves them: the union over every Type, whatever its
 * `flipRecordStatusOnDispute`. A given Record can reach fewer (a spent revision
 * or dispute budget, a passed deadline, a Type that keeps the Record's status
 * while disputed); its own `validTransitions` is the answer for that Record.
 *
 * Unknown statuses return empty arrays for forward compatibility.
 */
export const RECORD_TRANSITIONS: Readonly<Record<string, readonly string[]>> = {
  CREATED: ['ACTIVE', 'CANCELLED', 'EXPIRED', 'PROPOSED'],
  PROPOSED: ['CANCELLED', 'CREATED', 'EXPIRED', 'REJECTED'],
  ACTIVE: ['CANCELLED', 'EXPIRED', 'PROCESSING'],
  PROCESSING: ['ACTIVE', 'CANCELLED', 'EXPIRED', 'FAILED', 'FULFILLED'],
  REVISION_REQUESTED: ['ACTIVE', 'CANCELLED', 'EXPIRED', 'PROCESSING'],
  DISPUTED: ['FAILED', 'FULFILLED', 'REMEDIATED'],
  FULFILLED: ['DISPUTED'],
  FAILED: ['DISPUTED', 'FULFILLED', 'REVISION_REQUESTED'],
  REMEDIATED: ['DISPUTED'],
  EXPIRED: [],
  CANCELLED: [],
  REJECTED: [],
  RECORDED: [],
};

/**
 * Terminal outcomes, as `GET /lifecycle` marks them. FULFILLED and REMEDIATED
 * are terminal although a dispute can still reopen them, so a terminal status
 * is not the same as one with no transitions.
 */
export const TERMINAL_STATUSES: readonly string[] = ['FULFILLED', 'REMEDIATED', 'EXPIRED', 'CANCELLED', 'REJECTED', 'RECORDED'];

/** Check whether a transition from `current` to `target` is valid. Unknown statuses return false. */
export function canTransitionTo(current: RecordStatus, target: RecordStatus): boolean {
  const targets = RECORD_TRANSITIONS[current];
  if (!targets) return false;
  return targets.includes(target);
}

/** The statuses some Record at `status` can reach next. Unknown statuses return []. */
export function getValidTransitions(status: RecordStatus): readonly string[] {
  return RECORD_TRANSITIONS[status] ?? [];
}

/** Check whether a status is a terminal outcome (see {@link TERMINAL_STATUSES}). Unknown statuses return false. */
export function isTerminalStatus(status: RecordStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}
