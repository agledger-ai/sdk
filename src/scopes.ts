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
  REPUTATION_READ: 'reputation:read',

  // Schemas
  SCHEMAS_READ: 'schemas:read',
  SCHEMAS_WRITE: 'schemas:write',
  SCHEMAS_ADMIN: 'schemas:admin',

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
    scopes: [Scopes.MANDATES_READ, Scopes.MANDATES_WRITE, Scopes.RECEIPTS_WRITE, Scopes.WEBHOOKS_READ, Scopes.WEBHOOKS_MANAGE],
  },
  dashboard: {
    name: 'dashboard',
    description: 'Read-only monitoring, audit, and compliance',
    scopes: [Scopes.DASHBOARD_READ, Scopes.AUDIT_READ, Scopes.COMPLIANCE_READ, Scopes.EVENTS_READ, Scopes.DISPUTES_READ, Scopes.REPUTATION_READ, Scopes.SCHEMAS_READ, Scopes.WEBHOOKS_READ],
  },
  standard: {
    name: 'standard',
    description: 'Standard enterprise key — full operational access to mandates, receipts, agents, disputes, schemas, compliance, webhooks, and dashboard',
    scopes: [
      Scopes.MANDATES_READ, Scopes.MANDATES_WRITE, Scopes.RECEIPTS_READ, Scopes.RECEIPTS_WRITE,
      Scopes.AGENTS_READ, Scopes.AGENTS_MANAGE, Scopes.WEBHOOKS_READ, Scopes.WEBHOOKS_MANAGE,
      Scopes.DASHBOARD_READ, Scopes.AUDIT_READ, Scopes.COMPLIANCE_READ, Scopes.COMPLIANCE_WRITE,
      Scopes.EVENTS_READ, Scopes.DISPUTES_READ, Scopes.DISPUTES_MANAGE, Scopes.REPUTATION_READ,
      Scopes.SCHEMAS_READ, Scopes.SCHEMAS_WRITE, Scopes.SCHEMAS_ADMIN,
    ],
  },
  restrictive: {
    name: 'restrictive',
    description: 'Least-privilege enterprise key — mandate and receipt operations only, no agent management or schema writes',
    scopes: [Scopes.MANDATES_READ, Scopes.MANDATES_WRITE, Scopes.RECEIPTS_READ, Scopes.RECEIPTS_WRITE, Scopes.SCHEMAS_READ, Scopes.WEBHOOKS_READ],
  },
  'iac-pipeline': {
    name: 'iac-pipeline',
    description: 'Infrastructure provisioning — agents, webhooks, keys, schemas',
    scopes: [Scopes.AGENTS_MANAGE, Scopes.WEBHOOKS_READ, Scopes.WEBHOOKS_MANAGE, Scopes.ADMIN_KEYS, Scopes.SCHEMAS_WRITE, Scopes.SCHEMAS_ADMIN],
  },
  'schema-manager': {
    name: 'schema-manager',
    description: 'Schema registry management — create, version, deprecate custom types',
    scopes: [Scopes.SCHEMAS_READ, Scopes.SCHEMAS_WRITE, Scopes.SCHEMAS_ADMIN],
  },
  'agent-full': {
    name: 'agent-full',
    description: 'Full agent — mandate lifecycle, receipts, disputes, events, and schemas',
    scopes: [
      Scopes.MANDATES_READ, Scopes.MANDATES_WRITE, Scopes.RECEIPTS_READ, Scopes.RECEIPTS_WRITE,
      Scopes.AGENTS_READ, Scopes.DISPUTES_READ, Scopes.EVENTS_READ, Scopes.SCHEMAS_READ,
    ],
  },
  'agent-readonly': {
    name: 'agent-readonly',
    description: 'Read-only agent — view mandate history',
    scopes: [Scopes.MANDATES_READ, Scopes.RECEIPTS_READ],
  },
};

export type ScopeProfileName = 'sidecar' | 'dashboard' | 'standard' | 'restrictive' | 'iac-pipeline' | 'agent-full' | 'agent-readonly' | 'schema-manager' | (string & {});
