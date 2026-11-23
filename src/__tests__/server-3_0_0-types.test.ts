import { describe, it, expect, vi } from 'vitest';
import { AgledgerClient } from '../client.js';
import type {
  CreateRecordParams,
  RecordRow,
  Completion,
  SubmitCompletionParams,
  SubmitVerdictParams,
  VerdictResult,
  RecordCounts,
  SearchRecordsParams,
} from '../types.js';

function mockClient(body: unknown, extra: Record<string, unknown> = {}) {
  const fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue(body),
    headers: new Headers(),
    ...extra,
  });
  const client = new AgledgerClient({
    apiKey: 'test_key',
    baseUrl: 'https://api.test',
    fetch: fetch as unknown as typeof globalThis.fetch,
  });
  return { client, fetch };
}

/** The query as the Server receives it, brackets decoded. */
function queryString(fetch: ReturnType<typeof vi.fn>): string {
  return decodeURIComponent(new URL(String(fetch.mock.calls[0][0])).search).replace(/^\?/, '');
}

describe('record search filters', () => {
  it('sends the numeric bounds, producedBy, traceId and originRecordId as the Server reads them', async () => {
    const { client, fetch } = mockClient({ data: [], hasMore: false });
    const params: SearchRecordsParams = {
      traceId: '0af7651916cd43dd8448eb211c80319c',
      originRecordId: '019fe300-0000-7000-8000-000000000001',
      producedBy: { modelId: 'claude-opus-5-5', agentSoftware: 'invoice-agent' },
      criteriaGte: { amount: '500' },
      criteriaLt: { amount: '1500.75' },
      criteriaGt: { score: '-12' },
      criteriaLte: { tier: '3' },
      metadataGt: { a: '1' },
      metadataGte: { b: '2' },
      metadataLt: { c: '3' },
      metadataLte: { d: '4' },
    };
    await client.records.search(params);

    const q = queryString(fetch);
    expect(q).not.toContain('[object Object]');
    expect(q.split('&').sort()).toEqual(
      [
        'traceId=0af7651916cd43dd8448eb211c80319c',
        'originRecordId=019fe300-0000-7000-8000-000000000001',
        'producedBy[modelId]=claude-opus-5-5',
        'producedBy[agentSoftware]=invoice-agent',
        'criteriaGte[amount]=500',
        'criteriaLt[amount]=1500.75',
        'criteriaGt[score]=-12',
        'criteriaLte[tier]=3',
        'metadataGt[a]=1',
        'metadataGte[b]=2',
        'metadataLt[c]=3',
        'metadataLte[d]=4',
      ].sort(),
    );
  });
});

describe('records.counts()', () => {
  const body: RecordCounts = {
    data: [
      { type: 'a-v1', status: 'FULFILLED', count: 7 },
      { type: 'a-v1', status: 'CANCELLED', count: 1 },
    ],
    groupBy: ['type', 'status'],
    total: 8,
    groupCount: 2,
    truncated: false,
  };

  it('sends groupBy comma-joined next to the search filters', async () => {
    const { client, fetch } = mockClient(body);
    const result = await client.records.counts({
      groupBy: ['type', 'status'],
      from: '2026-10-01T00:00:00Z',
      criteriaGte: { amount: '500' },
      producedBy: { modelId: 'm' },
      limit: 50,
    });

    expect(new URL(String(fetch.mock.calls[0][0])).pathname).toBe('/v1/records/counts');
    expect(fetch.mock.calls[0][1].method).toBe('GET');
    expect(queryString(fetch).split('&').sort()).toEqual(
      [
        'groupBy=type,status',
        'from=2026-10-01T00:00:00Z',
        'criteriaGte[amount]=500',
        'producedBy[modelId]=m',
        'limit=50',
      ].sort(),
    );
    expect(result.total).toBe(8);
    expect(result.data[0]!.count).toBe(7);
  });

  it('takes a single dimension as a string, and none at all', async () => {
    const one = mockClient(body);
    await one.client.records.counts({ groupBy: 'createdDay' });
    expect(queryString(one.fetch)).toBe('groupBy=createdDay');

    const none = mockClient({ data: [{ count: 8 }], groupBy: [], total: 8, groupCount: 1, truncated: false });
    await none.client.records.counts();
    expect(new URL(String(none.fetch.mock.calls[0][0])).search).toBe('');
  });

  it('refuses a third dimension before sending anything', () => {
    const { client, fetch } = mockClient(body);
    expect(() => client.records.counts({ groupBy: ['type', 'status', 'category'] })).toThrow(RangeError);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('producedBy', () => {
  const producedBy = {
    modelProvider: 'anthropic',
    modelId: 'claude-opus-5-5',
    modelVersion: '2026-10',
    agentSoftware: 'invoice-agent',
    agentSoftwareVersion: '1.4.2',
    promptDigest: `sha256:${'a'.repeat(64)}`,
    configDigest: `sha512:${'b'.repeat(128)}`,
  };

  it('goes out on create, bulk items and completion submit unchanged', async () => {
    const create = mockClient({ id: 'r1' });
    const params: CreateRecordParams = { type: 'notarize-generic-v1', criteria: {}, producedBy };
    await create.client.records.create(params);
    expect(JSON.parse(create.fetch.mock.calls[0][1].body).producedBy).toEqual(producedBy);

    const bulk = mockClient({ results: [] });
    await bulk.client.records.bulkCreate([{ type: 'notarize-generic-v1', criteria: {}, producedBy }]);
    expect(JSON.parse(bulk.fetch.mock.calls[0][1].body).records[0].producedBy).toEqual(producedBy);

    const done = mockClient({ id: 'c1' });
    const submit: SubmitCompletionParams = { evidence: {}, producedBy };
    await done.client.completions.submit('r1', submit);
    expect(JSON.parse(done.fetch.mock.calls[0][1].body).producedBy).toEqual(producedBy);
  });

  it('is typed on the record and completion reads', () => {
    const record = { producedBy, traceId: null, federationOrigin: null, federationLegs: [] } as unknown as RecordRow;
    const completion = { producedBy: null } as unknown as Completion;
    expect(record.producedBy?.modelId).toBe('claude-opus-5-5');
    expect(completion.producedBy).toBeNull();
  });
});

describe('verdict signature', () => {
  it('sends signatureMeaning and reads the signature back', async () => {
    const signature = {
      meaning: 'approval',
      signerName: 'Dana Reyes',
      signerIss: 'https://idp.test',
      signerSub: 'dana',
      signedAt: '2026-11-20T00:00:00.000Z',
    };
    const { client, fetch } = mockClient({ recordId: 'r1', completionId: 'c1', verdict: 'accept', signature });
    const params: SubmitVerdictParams = { completionId: 'c1', verdict: 'accept', signatureMeaning: 'approval' };
    const result: VerdictResult = await client.records.submitVerdict('r1', params);

    expect(JSON.parse(fetch.mock.calls[0][1].body).signatureMeaning).toBe('approval');
    expect(result.signature?.signerName).toBe('Dana Reyes');
  });
});

describe('records.getAuditExportHtml()', () => {
  it('returns the page as a string, asking for format=html', async () => {
    const page = '<!doctype html><script type="application/json" id="agledger-audit-export">{}</script>';
    const bytes = new TextEncoder().encode(page);
    const { client, fetch } = mockClient(null, {
      arrayBuffer: vi.fn().mockResolvedValue(bytes.buffer),
      headers: new Headers({ 'content-type': 'text/html; charset=utf-8' }),
    });

    const html = await client.records.getAuditExportHtml('r1');

    expect(html).toBe(page);
    const [url, init] = fetch.mock.calls[0];
    expect(new URL(String(url)).pathname).toBe('/v1/records/r1/audit-export');
    expect(new URL(String(url)).searchParams.get('format')).toBe('html');
    expect(init.method).toBe('GET');
    expect(init.headers.Accept).toBe('text/html');
  });
});

describe('compliance.downloadExportText()', () => {
  it('returns a csv or html export as the text the Server sent', async () => {
    const csv = 'recordId,status\nrec-1,FULFILLED\n';
    const bytes = new TextEncoder().encode(csv);
    const { client, fetch } = mockClient(null, {
      arrayBuffer: vi.fn().mockResolvedValue(bytes.buffer),
      headers: new Headers({ 'content-type': 'text/csv' }),
    });

    const text = await client.compliance.downloadExportText('exp-1');

    expect(text).toBe(csv);
    const [url, init] = fetch.mock.calls[0];
    expect(new URL(String(url)).pathname).toBe('/v1/compliance/export/exp-1/download');
    expect(init.method).toBe('GET');
    expect(init.headers.Accept).toContain('text/csv');
    expect(init.headers.Accept).toContain('text/html');
  });
});
