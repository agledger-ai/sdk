/**
 * API key scope constants and scope profiles.
 *
 * Mirrors the authoritative definitions in agledger-api/src/shared/scopes.ts.
 * Keep this file in lockstep with the API; the SDK enum must be a strict
 * subset (or equal set) of the API's scope list.
 */

/** Role a key is bound to. Admin = tenant-wide governance, agent = operational. */
export type ApiKeyRole = 'admin' | 'agent' | 'platform';

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
  COMPLIANCE_READ: 'compliance:read',
  COMPLIANCE_WRITE: 'compliance:write',

  // Agents
  AGENTS_READ: 'agents:read',
  AGENTS_MANAGE: 'agents:manage',

  // Disputes
  DISPUTES_READ: 'disputes:read',
  DISPUTES_MANAGE: 'disputes:manage',

  // Events & reputation
  EVENTS_READ: 'events:read',
  REPUTATION_READ: 'reputation:read',

  // Schemas
  SCHEMAS_READ: 'schemas:read',
  SCHEMAS_WRITE: 'schemas:write',
  SCHEMAS_ADMIN: 'schemas:admin',

  // Administration
  ADMIN_KEYS: 'admin:keys',
  ADMIN_SYSTEM: 'admin:system',
  ADMIN_BACKFILL: 'admin:backfill',
} as const;

export type Scope = (typeof Scopes)[keyof typeof Scopes];

/** Scope profile definition (mirrors the API's SCOPE_PROFILES entry). */
export interface ScopeProfile {
  name: string;
  description: string;
  /** Roles permitted to use this profile. */
  allowedRoles: readonly ApiKeyRole[];
  scopes: readonly Scope[];
}

/**
 * Pre-defined scope profiles — one-to-one with agledger-api's SCOPE_PROFILES.
 *
 * Admin profiles require role='admin'; agent profiles require role='agent'.
 * Platform keys bypass scope profiles entirely.
 */
export const ScopeProfiles: Record<string, ScopeProfile> = {
  'admin-observer': {
    name: 'admin-observer',
    description: 'Read-only admin — audit, compliance, events, disputes, reputation, schemas, webhooks, mandates, receipts',
    allowedRoles: ['admin'],
    scopes: [
      Scopes.AUDIT_READ,
      Scopes.COMPLIANCE_READ,
      Scopes.EVENTS_READ,
      Scopes.DISPUTES_READ,
      Scopes.REPUTATION_READ,
      Scopes.SCHEMAS_READ,
      Scopes.WEBHOOKS_READ,
      Scopes.MANDATES_READ,
      Scopes.RECEIPTS_READ,
    ],
  },
  'admin-standard': {
    name: 'admin-standard',
    description: 'Default admin — full tenant governance plus mandate/receipt action rights (admin actions signed as admin in vault)',
    allowedRoles: ['admin'],
    scopes: [
      Scopes.AUDIT_READ,
      Scopes.COMPLIANCE_READ,
      Scopes.COMPLIANCE_WRITE,
      Scopes.EVENTS_READ,
      Scopes.DISPUTES_READ,
      Scopes.DISPUTES_MANAGE,
      Scopes.REPUTATION_READ,
      Scopes.SCHEMAS_READ,
      Scopes.SCHEMAS_WRITE,
      Scopes.SCHEMAS_ADMIN,
      Scopes.WEBHOOKS_READ,
      Scopes.WEBHOOKS_MANAGE,
      Scopes.AGENTS_READ,
      Scopes.AGENTS_MANAGE,
      Scopes.ADMIN_KEYS,
      Scopes.ADMIN_SYSTEM,
      Scopes.ADMIN_BACKFILL,
      Scopes.MANDATES_READ,
      Scopes.MANDATES_WRITE,
      Scopes.RECEIPTS_READ,
      Scopes.RECEIPTS_WRITE,
    ],
  },
  'admin-iac': {
    name: 'admin-iac',
    description: 'Infrastructure provisioning — agents, webhooks, keys, schemas',
    allowedRoles: ['admin'],
    scopes: [
      Scopes.ADMIN_KEYS,
      Scopes.AGENTS_MANAGE,
      Scopes.WEBHOOKS_MANAGE,
      Scopes.SCHEMAS_ADMIN,
    ],
  },
  'admin-schema': {
    name: 'admin-schema',
    description: 'Schema registry management — create, version, disable/enable custom types',
    allowedRoles: ['admin'],
    scopes: [
      Scopes.SCHEMAS_READ,
      Scopes.SCHEMAS_WRITE,
      Scopes.SCHEMAS_ADMIN,
    ],
  },
  'agent-full': {
    name: 'agent-full',
    description: 'Full agent — mandate lifecycle, receipts, disputes, events, and schemas',
    allowedRoles: ['agent'],
    scopes: [
      Scopes.MANDATES_READ,
      Scopes.MANDATES_WRITE,
      Scopes.RECEIPTS_READ,
      Scopes.RECEIPTS_WRITE,
      Scopes.AGENTS_READ,
      Scopes.DISPUTES_READ,
      Scopes.EVENTS_READ,
      Scopes.SCHEMAS_READ,
    ],
  },
  'agent-readonly': {
    name: 'agent-readonly',
    description: 'Read-only agent — view mandate history',
    allowedRoles: ['agent'],
    scopes: [
      Scopes.MANDATES_READ,
      Scopes.RECEIPTS_READ,
    ],
  },
  'agent-performer-only': {
    name: 'agent-performer-only',
    description: 'Performer agent — can deliver receipts and read mandates, but cannot be principal of new mandates',
    allowedRoles: ['agent'],
    scopes: [
      Scopes.MANDATES_READ,
      Scopes.RECEIPTS_READ,
      Scopes.RECEIPTS_WRITE,
      Scopes.SCHEMAS_READ,
    ],
  },
};

/** Union of the 7 known profile names, open-ended for forward compatibility. */
export type ScopeProfileName =
  | 'admin-observer'
  | 'admin-standard'
  | 'admin-iac'
  | 'admin-schema'
  | 'agent-full'
  | 'agent-readonly'
  | 'agent-performer-only'
  | (string & {});
