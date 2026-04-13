import type { Mandate, Receipt } from './types.js';
import { RateLimitError } from './errors.js';
import type { AgledgerApiError } from './errors.js';

/** Compact one-line summary of a mandate for LLM context injection. */
export function mandateToContext(m: Mandate): string {
  const parts = [`Mandate ${m.id} [${m.contractType}] status=${m.status}`];
  if (m.agentId) parts.push(`agent=${m.agentId}`);
  if (m.deadline) parts.push(`deadline=${m.deadline}`);
  if (m.parentMandateId) parts.push(`parent=${m.parentMandateId}`);
  return parts.join(' ');
}

/** Compact one-line summary of a receipt for LLM context injection. */
export function receiptToContext(r: Receipt): string {
  const parts = [`Receipt ${r.id} for mandate ${r.mandateId} validation=${r.structuralValidation}`];
  if (r.mandateStatus) parts.push(`mandateStatus=${r.mandateStatus}`);
  if (r.agentId) parts.push(`agent=${r.agentId}`);
  return parts.join(' ');
}

/** Compact error summary with actionable guidance for LLM agents. */
export function errorToContext(e: AgledgerApiError): string {
  const code = e.code !== 'unknown' ? ` [${e.code}]` : '';
  const base = `Error ${e.status}${code}: ${e.message}`;

  if (e.isRetryable()) {
    if (e instanceof RateLimitError && e.retryAfter != null) {
      return base + ` Retry after ${e.retryAfter}s.`;
    }
    return base + ' Retryable.';
  }

  if (e.isStateError()) return base + ' Do not retry.';
  if (e.isAuthError()) return base + ' Check credentials/scopes.';
  if (e.isInputError()) return base + ' Fix the request and retry.';

  return base;
}
