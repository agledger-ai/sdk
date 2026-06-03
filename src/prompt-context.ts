import type { RecordRow, Completion } from './types.js';
import { RateLimitError } from './errors.js';
import type { AgledgerApiError } from './errors.js';

/** Compact one-line summary of a Record for LLM context injection. */
export function recordToContext(r: RecordRow): string {
  const parts = [`Record ${r.id} [${r.type}] status=${r.status}`];
  if (r.performerAgentId) parts.push(`performer=${r.performerAgentId}`);
  if (r.deadline) parts.push(`deadline=${r.deadline}`);
  if (r.parentRecordId) parts.push(`parent=${r.parentRecordId}`);
  return parts.join(' ');
}

/** Compact one-line summary of a completion for LLM context injection. */
export function completionToContext(c: Completion): string {
  const parts = [`Completion ${c.id} for record ${c.recordId} validation=${c.structuralValidation}`];
  if (c.recordStatus) parts.push(`recordStatus=${c.recordStatus}`);
  if (c.agentId) parts.push(`agent=${c.agentId}`);
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
