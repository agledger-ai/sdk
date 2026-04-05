/**
 * AGLedger™ SDK — Mandate State Machine
 * Patent Pending. Copyright 2026 AGLedger LLC. All rights reserved.
 *
 * Pure logic, zero dependencies. Mirrors the API's state machine.
 */

import type { MandateStatus } from './types.js';

/**
 * Valid state transitions for mandates using customer-facing display statuses.
 * The API maps internal states to these display statuses — this table reflects
 * what SDK consumers actually observe.
 *
 * Unknown statuses return empty arrays for forward compatibility.
 */
export const MANDATE_TRANSITIONS: Record<string, readonly string[]> = {
  CREATED: ['ACTIVE', 'PROPOSED', 'CANCELLED'],
  PROPOSED: ['CREATED', 'REJECTED', 'CANCELLED'],
  ACTIVE: ['PROCESSING', 'EXPIRED', 'CANCELLED'],
  PROCESSING: ['FULFILLED', 'FAILED', 'REVISION_REQUESTED'],
  REVISION_REQUESTED: ['PROCESSING', 'EXPIRED', 'CANCELLED'],
  FULFILLED: [],
  FAILED: ['REMEDIATED', 'REVISION_REQUESTED'],
  REMEDIATED: [],
  EXPIRED: [],
  CANCELLED: [],
  REJECTED: [],
};

/** Statuses with no outbound transitions. */
export const TERMINAL_STATUSES: readonly string[] = Object.entries(MANDATE_TRANSITIONS)
  .filter(([, targets]) => targets.length === 0)
  .map(([status]) => status);

/** Check whether a transition from `current` to `target` is valid. Unknown statuses return false. */
export function canTransitionTo(current: MandateStatus, target: MandateStatus): boolean {
  const targets = MANDATE_TRANSITIONS[current];
  if (!targets) return false;
  return targets.includes(target);
}

/** Get valid next statuses for a given status. Unknown statuses return []. */
export function getValidTransitions(status: MandateStatus): readonly string[] {
  return MANDATE_TRANSITIONS[status] ?? [];
}

/** Check whether a status is terminal (no outbound transitions). Unknown statuses return false. */
export function isTerminalStatus(status: MandateStatus): boolean {
  const targets = MANDATE_TRANSITIONS[status];
  if (!targets) return false;
  return targets.length === 0;
}
