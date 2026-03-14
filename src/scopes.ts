/**
 * AGLedger™ SDK — API Key Scopes
 * Patent Pending. Copyright 2026 AGLedger LLC. All rights reserved.
 *
 * Scopes narrow what a key can do within its role's ceiling.
 * null scopes = full access for the role (backward compat).
 */

export const Scopes = {
  // Mandate lifecycle
  MANDATES_READ: 'mandates:read',
  MANDATES_WRITE: 'mandates:write',

  // Receipts
  RECEIPTS_READ: 'receipts:read',
  RECEIPTS_WRITE: 'receipts:write',

  // Webhooks
  WEBHOOKS_READ: 'webhooks:read',
  WEBHOOKS_MANAGE: 'webhooks:manage',

  // Audit & compliance
  AUDIT_READ: 'audit:read',
  AUDIT_ANALYZE: 'audit:analyze',
  COMPLIANCE_READ: 'compliance:read',
  COMPLIANCE_WRITE: 'compliance:write',

  // Agents
  AGENTS_READ: 'agents:read',
  AGENTS_MANAGE: 'agents:manage',

  // Disputes
  DISPUTES_READ: 'disputes:read',
  DISPUTES_MANAGE: 'disputes:manage',

  // Dashboard & events
  DASHBOARD_READ: 'dashboard:read',
  EVENTS_READ: 'events:read',
  SIGNALS_READ: 'signals:read',
  REPUTATION_READ: 'reputation:read',

  // Administration
  ADMIN_KEYS: 'admin:keys',
  ADMIN_SYSTEM: 'admin:system',
  ADMIN_TRUST: 'admin:trust',
} as const;

export type Scope = (typeof Scopes)[keyof typeof Scopes];

/** Scope profile definition. */
export interface ScopeProfile {
  name: string;
  description: string;
  scopes: readonly Scope[];
}

/** Pre-defined scope profiles matching the API. */
export const ScopeProfiles: Record<string, ScopeProfile> = {
  sidecar: {
    name: 'sidecar',
    description: 'Governance sidecar — mandate and receipt operations',
    scopes: [Scopes.MANDATES_READ, Scopes.MANDATES_WRITE, Scopes.RECEIPTS_WRITE, Scopes.WEBHOOKS_MANAGE],
  },
  dashboard: {
    name: 'dashboard',
    description: 'Read-only monitoring and audit',
    scopes: [Scopes.DASHBOARD_READ, Scopes.AUDIT_READ, Scopes.EVENTS_READ, Scopes.SIGNALS_READ, Scopes.DISPUTES_READ, Scopes.REPUTATION_READ],
  },
  'iac-pipeline': {
    name: 'iac-pipeline',
    description: 'Infrastructure provisioning — agents, webhooks, keys',
    scopes: [Scopes.AGENTS_MANAGE, Scopes.WEBHOOKS_MANAGE, Scopes.ADMIN_KEYS],
  },
  'agent-full': {
    name: 'agent-full',
    description: 'Standard agent — mandate and receipt operations',
    scopes: [Scopes.MANDATES_READ, Scopes.MANDATES_WRITE, Scopes.RECEIPTS_WRITE],
  },
  'agent-readonly': {
    name: 'agent-readonly',
    description: 'Read-only agent — view mandate history',
    scopes: [Scopes.MANDATES_READ, Scopes.RECEIPTS_READ],
  },
};

export type ScopeProfileName = 'sidecar' | 'dashboard' | 'iac-pipeline' | 'agent-full' | 'agent-readonly' | (string & {});
