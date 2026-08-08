import { describe, it, expect, vi } from 'vitest';
import { AgledgerClient } from '../client.js';
import { UnprocessableError } from '../errors.js';
import type { RecordRow, BulkCreateResult, VaultCheckpointPage } from '../types.js';

/**
 * Multi-publisher record creation.
 *
 * Two publishers offering the same `record_type` in one org is a supported
 * state, and once it happens a bare `type` no longer names a schema. The
 * engine refuses rather than picking (422 `/problems/ambiguous-publisher`),
 * because the pick would change the moment the other publisher shipped a
 * higher version. Everything here is about the caller being able to see that
 * refusal and act on it without leaving the typed API.
 */

function mockClient(body: unknown, status = 200) {
  const fetch = vi.fn().mockResolvedValue({
    ok: status < 400,
    status,
    json: vi.fn().mockResolvedValue(body),
    headers: new Headers(),
  });
  const client = new AgledgerClient({
    apiKey: 'test_key',
    baseUrl: 'https://agledger.test',
    fetch: fetch as unknown as typeof globalThis.fetch,
    maxRetries: 0,
  });
  return { client, fetch };
}

describe('pinning a publisher on record creation', () => {
  it('sends publisher alongside type in the create body', async () => {
    const { client, fetch } = mockClient({ id: 'rec-1', publisher: 'acme-corp' });

    await client.records.create({
      type: 'acme-po-v1',
      publisher: 'acme-corp',
      criteria: { poNumber: 'PO-1' },
    });

    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.type).toBe('acme-po-v1');
    expect(body.publisher).toBe('acme-corp');
  });

  it('carries publisher on each item of a bulk create', async () => {
    const { client, fetch } = mockClient({ results: [], summary: {} });

    await client.records.bulkCreate([
      { type: 'acme-po-v1', publisher: 'acme-corp', criteria: {} },
      { type: 'acme-po-v1', publisher: 'local', criteria: {} },
    ]);

    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.records.map((r: { publisher: string }) => r.publisher)).toEqual([
      'acme-corp',
      'local',
    ]);
  });
});

describe('the ambiguous-publisher 422', () => {
  it('surfaces the candidate labels and the problem URI, not just prose', async () => {
    const { client } = mockClient(
      {
        type: '/problems/ambiguous-publisher',
        title: 'Ambiguous publisher',
        error: 'AMBIGUOUS_PUBLISHER',
        message: 'Type acme-po-v1 is offered by more than one publisher',
        publishers: ['acme-corp', 'local'],
        recordType: 'acme-po-v1',
        recoveryHint: 'Re-send with a publisher field naming one of `publishers`.',
      },
      422,
    );

    // The whole point: recover programmatically, without parsing the message.
    const err = await client.records
      .create({ type: 'acme-po-v1', criteria: {} })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(UnprocessableError);
    const api = err as UnprocessableError;
    expect(api.type).toBe('/problems/ambiguous-publisher');
    expect(api.publishers).toEqual(['acme-corp', 'local']);
    expect(api.recoveryHint).toContain('publisher');
  });

  it('reports the same failure per item in a bulk response', () => {
    const result: BulkCreateResult = {
      results: [
        {
          index: 0,
          status: 'error',
          error: 'Ambiguous publisher',
          problemType: '/problems/ambiguous-publisher',
          context: { publishers: ['acme-corp', 'local'], recordType: 'acme-po-v1' },
        },
      ],
      summary: { total: 1, succeeded: 0, failed: 1 },
    };

    const failed = result.results.find(
      (r) => r.problemType === '/problems/ambiguous-publisher',
    );
    expect(failed?.context?.publishers).toEqual(['acme-corp', 'local']);
  });
});

describe('the publisher a record reports', () => {
  it('reads back the binding and a publisher-scoped schemaUrl', async () => {
    const { client } = mockClient({
      id: 'rec-1',
      type: 'acme-po-v1',
      publisher: 'acme-corp',
      schemaUrl: '/v1/schemas/acme-po-v1?publisher=acme-corp',
    });

    const record: RecordRow = await client.records.get('rec-1');
    expect(record.publisher).toBe('acme-corp');
    // Follow it verbatim; a bare path 422s in the ambiguous case.
    expect(record.schemaUrl).toContain('?publisher=');
  });

  it('accepts null for a record the engine never bound to a local registration', () => {
    // Federation-received and backfill-imported records. `null` means "ask the
    // originator", not "the schema is missing here", so the type must allow it.
    const federated: RecordRow['publisher'] = null;
    expect(federated).toBeNull();
  });
});

describe('scoping a schema read to one publisher', () => {
  it('sends ?publisher= and keeps request options out of the query', async () => {
    const { client, fetch } = mockClient({ type: 'acme-po-v1' });

    await client.schemas.get('acme-po-v1', {
      publisher: 'acme-corp',
      headers: { 'x-trace': '1' },
    });

    const [url, init] = fetch.mock.calls[0];
    expect(url).toContain('publisher=acme-corp');
    expect(init.headers['x-trace']).toBe('1');
  });

  it('scopes the write paths too, which carry the same 422', async () => {
    const { client, fetch } = mockClient({ type: 'acme-po-v1', status: 'DISABLED' });

    await client.schemas.disable('acme-po-v1', { publisher: 'acme-corp' });
    expect(fetch.mock.calls[0][0]).toContain('publisher=acme-corp');
  });

  it('omits the query entirely when no publisher is pinned', async () => {
    const { client, fetch } = mockClient({ type: 'acme-po-v1' });

    await client.schemas.get('acme-po-v1');
    expect(fetch.mock.calls[0][0]).not.toContain('publisher');
  });
});

describe('the checkpoint sweep schedule', () => {
  it('survives page normalization instead of being dropped', async () => {
    // An empty `data` with a null lastCheckpointAt is a fresh install whose
    // first sweep has not fired, not a missing anchor. Normalizing to Page<T>
    // used to discard the block that says which one it is.
    const { client } = mockClient({
      data: [],
      hasMore: false,
      checkpointing: {
        cron: '0 */6 * * *',
        intervalMinutes: 360,
        nextRunAt: '2026-08-08T06:00:00.000Z',
        lastCheckpointAt: null,
        source: 'worker',
        anchoringEnabled: true,
      },
    });

    const page: VaultCheckpointPage = await client.audit.vaultCheckpoints.list();
    expect(page.data).toEqual([]);
    expect(page.checkpointing?.lastCheckpointAt).toBeNull();
    expect(page.checkpointing?.anchoringEnabled).toBe(true);
  });
});
