/**
 * AGLedger™ SDK — Mandate State Machine
 * Patent Pending. Copyright 2026 AGLedger LLC. All rights reserved.
 *
 * Pure logic, zero dependencies. Mirrors the API's state machine.
 */

import type { MandateStatus } from './types.js';

/**
 * Valid state transitions for mandates. Each key is a status, and its value
 * is the list of statuses it can transition to.
 *
 * Unknown statuses return empty arrays for forward compatibility.
 */
export const MANDATE_TRANSITIONS: Record<string, readonly string[]> = {
  DRAFT: ['REGISTERED', 'PROPOSED', 'CANCELLED_DRAFT'],
  PROPOSED: ['REGISTERED', 'REJECTED', 'CANCELLED_DRAFT', 'PROPOSED'],
  REGISTERED: ['ACTIVE', 'CANCELLED_PRE_WORK'],
  ACTIVE: ['RECEIPT_ACCEPTED', 'RECEIPT_INVALID', 'EXPIRED', 'CANCELLED_PRE_WORK', 'CANCELLED_IN_PROGRESS'],
  RECEIPT_INVALID: ['RECEIPT_ACCEPTED', 'RECEIPT_INVALID', 'EXPIRED', 'CANCELLED_IN_PROGRESS'],
  RECEIPT_ACCEPTED: ['VERIFYING'],
  VERIFYING: ['VERIFIED_PASS', 'VERIFIED_FAIL'],
  VERIFIED_PASS: ['FULFILLED', 'VERIFIED_FAIL'],
  VERIFIED_FAIL: ['REMEDIATED', 'VERIFIED_PASS'],
  FULFILLED: [],
  REMEDIATED: [],
  EXPIRED: [],
  CANCELLED_DRAFT: [],
  CANCELLED_PRE_WORK: [],
  CANCELLED_IN_PROGRESS: [],
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
