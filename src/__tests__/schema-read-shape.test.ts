import { describe, it, expect, vi } from 'vitest';
import { AgledgerClient } from '../client.js';
import type { TypeSchema, RecordRow, SchemaRulesResult, SchemaLifecycleResult } from '../types.js';

/**
 * The publisher label on the schema-read path, and the one Record field that
 * stops carrying a value when a schema is not ours to serve.
 *
 * The theme of this release is that a Record names the registration it was
 * judged against. `schemas.get()` is the detailed read on that path, and until
 * now it was the one hop where the type dropped the label: `SchemaListItem`
 * declared `publisher` while `TypeSchema` did not, so a caller could see the
 * publisher triaging the catalog and lose it on the full read. That matters
 * because `schemas.get()` takes a publisher pin and refuses an ambiguous type
 * with a 422, so confirming which registration answered is exactly what a
 * caller wants to assert on.
 *
 * None of this could fail at runtime: the values were always on the wire and
 * the SDK passes bodies through unchanged, so an undeclared field is just
 * untyped, and a mock authored from the type can only ever agree with it.
 * These tests are therefore written against bodies copied from a live engine.
 */

function mockClient(body: unknown) {
  const fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue(body),
    headers: new Headers(),
  });
  const client = new AgledgerClient({
    apiKey: 'test_key',
    baseUrl: 'https://api.test',
    fetch: fetch as unknown as typeof globalThis.fetch,
  });
  return { client, fetch };
}

function queryOf(fetch: ReturnType<typeof vi.fn>): URLSearchParams {
  return new URL(String(fetch.mock.calls[0][0])).searchParams;
}

describe('schemas.get()', () => {
  it('types the publisher and row metadata the engine sends', async () => {
    const { client, fetch } = mockClient({
      type: 'notarize-generic-v1',
      version: 1,
      latestVersion: 1,
      status: 'ACTIVE',
      publisher: 'local',
      manifestDigest: 'sha256:0f2c',
      trustClass: 'local',
      federatable: true,
      defaultShare: null,
      defaultGateMode: null,
      coSignRequired: null,
      flipRecordStatusOnDispute: true,
      federateDisputes: true,
      recordSchema: {},
      completionSchema: {},
      quickStart: { criteria: { a: 1 }, evidence: null, tolerance: null },
    });

    const schema: TypeSchema = await client.schemas.get('notarize-generic-v1', {
      publisher: 'local',
    });

    // The pin goes out on the query, and the answer names what came back.
    expect(queryOf(fetch).get('publisher')).toBe('local');
    expect(schema.publisher).toBe('local');
    expect(schema.trustClass).toBe('local');
    expect(schema.manifestDigest).toBe('sha256:0f2c');
    expect(schema.federatable).toBe(true);
    expect(schema.flipRecordStatusOnDispute).toBe(true);
    expect(schema.federateDisputes).toBe(true);
    // Tri-state row metadata: null means inherit, not false.
    expect(schema.defaultShare).toBeNull();
    expect(schema.coSignRequired).toBeNull();
  });

  it('types a notarize-only quickStart, whose evidence is null', async () => {
    const { client } = mockClient({
      type: 'notarize-generic-v1',
      recordSchema: {},
      completionSchema: {},
      quickStart: { criteria: { orderId: 'PO-1' }, evidence: null, tolerance: null },
    });

    const schema = await client.schemas.get('notarize-generic-v1');

    // There is no completion phase on a notarize-only Type, so there is no
    // example to copy and no /completions call to make.
    expect(schema.quickStart?.evidence).toBeNull();
    expect(schema.quickStart?.criteria).toEqual({ orderId: 'PO-1' });
  });
});

describe('publisher on the rest of the schema-read surface', () => {
  it('names which registration getRules() read', async () => {
    const { client, fetch } = mockClient({
      type: 'ruleskew-v1',
      publisher: 'peerco',
      syncRuleIds: [],
      asyncRuleIds: ['number:max-inclusive'],
      fieldMappings: [{ ruleId: 'number:max-inclusive', criteriaPath: 'cap', evidencePath: 'spend' }],
    });

    const rules: SchemaRulesResult = await client.schemas.getRules('ruleskew-v1', {
      publisher: 'peerco',
    });

    expect(queryOf(fetch).get('publisher')).toBe('peerco');
    // Two publishers of one type carry different rules, so reading the rules
    // without knowing whose they are is not actionable.
    expect(rules.publisher).toBe('peerco');
    expect(rules.asyncRuleIds).toEqual(['number:max-inclusive']);
    expect(rules.fieldMappings?.[0]?.ruleId).toBe('number:max-inclusive');
  });

  it('names the scope disable() and enable() acted on', async () => {
    const disabled = mockClient({
      type: 'ruleskew-v1',
      publisher: 'peerco',
      status: 'DISABLED',
      versionsDisabled: 2,
    });
    const off: SchemaLifecycleResult = await disabled.client.schemas.disable('ruleskew-v1', {
      publisher: 'peerco',
    });
    expect(off.publisher).toBe('peerco');
    expect(off.versionsDisabled).toBe(2);

    const enabled = mockClient({
      type: 'ruleskew-v1',
      publisher: 'peerco',
      status: 'ACTIVE',
      versionsEnabled: 2,
    });
    const on = await enabled.client.schemas.enable('ruleskew-v1', { publisher: 'peerco' });
    expect(on.publisher).toBe('peerco');
    expect(on.versionsEnabled).toBe(2);
  });

  it('scopes an export, which otherwise emits both registrations', async () => {
    const { client, fetch } = mockClient({
      exportVersion: 1,
      exportedAt: '2026-08-08T00:00:00.000Z',
      type: 'ruleskew-v1',
      publisher: 'peerco',
      displayName: null,
      description: null,
      category: null,
      compatibilityMode: 'BACKWARD',
      versions: [],
      sharedSchemas: {},
    });

    const bundle = await client.schemas.exportSchema('ruleskew-v1', { publisher: 'peerco' });

    expect(queryOf(fetch).get('publisher')).toBe('peerco');
    expect(bundle.publisher).toBe('peerco');
    // The engine sends null rather than omitting these on an unlabelled type.
    expect(bundle.displayName).toBeNull();
  });
});

describe('Record.schemaUrl', () => {
  it('is null on a federation-received Record whose schema this Server lacks', async () => {
    const { client } = mockClient({
      id: '019fe300-0000-7000-8000-000000000001',
      type: 'peer-only-v1',
      status: 'FULFILLED',
      publisher: null,
      schemaUrl: null,
      completionHint: null,
    });

    const record: RecordRow = await client.records.get('019fe300-0000-7000-8000-000000000001');

    // Not a missing link: the originator's registration governs, and no path
    // on THIS Server resolves to it. A bare /v1/schemas/{type} would 404, or
    // worse answer with this Server's own same-named registration.
    expect(record.schemaUrl).toBeNull();
    expect(record.publisher).toBeNull();
    expect(record.completionHint).toBeNull();
  });

  it('is publisher-scoped on a locally judged Record', async () => {
    const { client } = mockClient({
      id: '019fe300-0000-7000-8000-000000000002',
      type: 'ruleskew-v1',
      status: 'CREATED',
      publisher: 'peerco',
      schemaUrl: '/v1/schemas/ruleskew-v1?publisher=peerco',
    });

    const record = await client.records.get('019fe300-0000-7000-8000-000000000002');

    // Follow it verbatim. Rebuilding it from `type` drops the pin and lands on
    // the 422 an ambiguous bare read gives.
    expect(record.schemaUrl).toBe('/v1/schemas/ruleskew-v1?publisher=peerco');
  });
});
