/**
 * API key scope constants and scope profiles.
 *
 * Mirrors the scope definitions the AGLedger API declares.
 * Keep this file in lockstep with the API; the SDK enum must be a strict
 * subset (or equal set) of the API's scope list.
 */

/** Role a key is bound to. Admin = org-wide governance, agent = operational. */
export type ApiKeyRole = 'admin' | 'agent' | 'platform';

/**
 * What a key is owned BY, which is not the same set as what it can DO.
 * An admin key is owned by an org, so `role: 'admin'` pairs with
 * `ownerType: 'org'`; there is no `'admin'` owner and no `'org'` role.
 * The two fields have different types so that the ordinary admin-key create
 * (`ownerType: 'org'`) compiles and `ownerType: 'admin'`, which the Server
 * rejects, does not.
 */
export type KeyOwnerType = 'org' | 'agent' | 'platform';

export const Scopes = {
  // Record lifecycle
  RECORDS_READ: 'records:read',
  RECORDS_WRITE: 'records:write',

  // Completions
  COMPLETIONS_READ: 'completions:read',
  COMPLETIONS_WRITE: 'completions:write',

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

  // Disputes. `disputes:read` views a dispute; `disputes:write` opens one,
  // adds evidence, withdraws and resolves.
  DISPUTES_READ: 'disputes:read',
  DISPUTES_WRITE: 'disputes:write',

  // Events & drift
  EVENTS_READ: 'events:read',
  DRIFT_READ: 'drift:read',

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

/** Scope profile definition (mirrors an entry of the Server's scope profiles). */
export interface ScopeProfile {
  name: string;
  description: string;
  /** Roles permitted to use this profile. */
  allowedRoles: readonly ApiKeyRole[];
  scopes: readonly Scope[];
}

/**
 * Pre-defined scope profiles: one-to-one with the Server's scope profiles (`GET /v1/scope-profiles`).
 *
 * Admin profiles require role='admin'; agent profiles require role='agent'.
 * Platform keys bypass scope profiles entirely.
 */
export const ScopeProfiles: Record<string, ScopeProfile> = {
  'admin-observer': {
    name: 'admin-observer',
    description: 'Read-only admin; audit, compliance, events, disputes, drift, schemas, webhooks, records, completions',
    allowedRoles: ['admin'],
    scopes: [
      Scopes.AUDIT_READ,
      Scopes.COMPLIANCE_READ,
      Scopes.EVENTS_READ,
      Scopes.DISPUTES_READ,
      Scopes.DRIFT_READ,
      Scopes.SCHEMAS_READ,
      Scopes.WEBHOOKS_READ,
      Scopes.RECORDS_READ,
      Scopes.COMPLETIONS_READ,
    ],
  },
  'admin-standard': {
    name: 'admin-standard',
    description:
      'Default admin for an org: manages agents, webhooks, API keys and the org\'s own Types, acts on any record in the org, ' +
      'and reads audit and compliance data. Cannot manage platform-level Types or other orgs; use admin-schema for ' +
      'platform-level Type authority.',
    allowedRoles: ['admin'],
    scopes: [
      Scopes.AUDIT_READ,
      Scopes.COMPLIANCE_READ,
      Scopes.COMPLIANCE_WRITE,
      Scopes.EVENTS_READ,
      Scopes.DISPUTES_READ,
      Scopes.DISPUTES_WRITE,
      Scopes.DRIFT_READ,
      Scopes.SCHEMAS_READ,
      Scopes.SCHEMAS_WRITE,
      Scopes.WEBHOOKS_READ,
      Scopes.WEBHOOKS_MANAGE,
      Scopes.AGENTS_READ,
      Scopes.AGENTS_MANAGE,
      Scopes.ADMIN_KEYS,
      Scopes.ADMIN_SYSTEM,
      Scopes.RECORDS_READ,
      Scopes.RECORDS_WRITE,
      Scopes.COMPLETIONS_READ,
      Scopes.COMPLETIONS_WRITE,
    ],
  },
  'admin-iac': {
    name: 'admin-iac',
    description:
      'Infrastructure provisioning for a pipeline: manages agents, webhooks and API keys, and registers and manages ' +
      'the org\'s own Types, including testing a payload against a Type. Cannot reach platform-level Types or other orgs.',
    allowedRoles: ['admin'],
    // A pipeline reconciles: it reads what exists before it writes, so each
    // manage scope travels with its read.
    scopes: [
      Scopes.ADMIN_KEYS,
      Scopes.AGENTS_READ,
      Scopes.AGENTS_MANAGE,
      Scopes.WEBHOOKS_READ,
      Scopes.WEBHOOKS_MANAGE,
      Scopes.SCHEMAS_READ,
      Scopes.SCHEMAS_WRITE,
    ],
  },
  'admin-schema': {
    name: 'admin-schema',
    description:
      'Type registry management: create, version, disable and enable Types, including platform-level Types. ' +
      'For operators who manage the Type catalogue and need nothing else.',
    allowedRoles: ['admin'],
    scopes: [Scopes.SCHEMAS_READ, Scopes.SCHEMAS_WRITE, Scopes.SCHEMAS_ADMIN],
  },
  'agent-full': {
    name: 'agent-full',
    description:
      'Full agent; record lifecycle, completions, disputes, events, schemas, self-audit of own records, ' +
      'and self-introspection of own drift',
    allowedRoles: ['agent'],
    scopes: [
      Scopes.RECORDS_READ,
      Scopes.RECORDS_WRITE,
      Scopes.COMPLETIONS_READ,
      Scopes.COMPLETIONS_WRITE,
      Scopes.AGENTS_READ,
      Scopes.DISPUTES_READ,
      Scopes.DISPUTES_WRITE,
      Scopes.EVENTS_READ,
      Scopes.SCHEMAS_READ,
      Scopes.AUDIT_READ,
      Scopes.COMPLIANCE_READ,
      Scopes.DRIFT_READ,
    ],
  },
  'agent-readonly': {
    name: 'agent-readonly',
    description: 'Read-only agent; view own records, completions, and audit trail',
    allowedRoles: ['agent'],
    scopes: [Scopes.RECORDS_READ, Scopes.COMPLETIONS_READ, Scopes.AUDIT_READ, Scopes.COMPLIANCE_READ],
  },
  'agent-performer-only': {
    name: 'agent-performer-only',
    description:
      'Performer agent; can deliver completions, read records, and self-audit, but cannot be principal of new records. ' +
      'It does not carry records:write, so it cannot accept or reject a proposal (POST /v1/records/{id}/accept or /reject): ' +
      'it performs records that reach it already ACTIVE (autoActivate, or activated by the principal). ' +
      'A performer that must consent to proposals needs agent-full, or custom scopes that add records:write.',
    allowedRoles: ['agent'],
    scopes: [
      Scopes.RECORDS_READ,
      Scopes.COMPLETIONS_READ,
      Scopes.COMPLETIONS_WRITE,
      Scopes.SCHEMAS_READ,
      Scopes.AUDIT_READ,
      Scopes.COMPLIANCE_READ,
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
