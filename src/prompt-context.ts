import type { RecordRow, Receipt } from './types.js';
import { RateLimitError } from './errors.js';
import type { AgledgerApiError } from './errors.js';

/** Compact one-line summary of a Record for LLM context injection. */
export function recordToContext(r: RecordRow): string {
  const parts = [`Record ${r.id} [${r.type}] status=${r.status}`];
  if (r.agentId) parts.push(`agent=${r.agentId}`);
  if (r.deadline) parts.push(`deadline=${r.deadline}`);
  if (r.parentRecordId) parts.push(`parent=${r.parentRecordId}`);
  return parts.join(' ');
}

/** Compact one-line summary of a receipt for LLM context injection. */
export function receiptToContext(r: Receipt): string {
  const parts = [`Receipt ${r.id} for record ${r.recordId} validation=${r.structuralValidation}`];
  if (r.recordStatus) parts.push(`recordStatus=${r.recordStatus}`);
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

  if (e.isStateError()) {
    const hint = e.recoveryHint ? ` ${e.recoveryHint}` : '';
    return base + ' Do not retry.' + hint;
  }
  if (e.isAuthError()) return base + ' Check credentials/scopes.';
  if (e.isInputError()) return base + ' Fix the request and retry.';

  return base;
}
