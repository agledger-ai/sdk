/**
 * Paging-shape parity: does each list method offer the paging the route takes?
 *
 * `routes.json` has recorded `queryFields` per route since it was generated,
 * and nothing compared them to the parameter types the SDK declares. So when
 * API 1.7.0 dropped `offset` from `/v1/admin/agents`, `/v1/admin/orgs` and
 * `/v1/admin/webhook-dlq`, the refresh dutifully rewrote the snapshot, every
 * test stayed green, and three methods went on advertising a parameter that had
 * become a 400. The querystring refuses unknown properties, so this class of
 * drift is never a silent no-op.
 *
 * The narrow question here is the paging shape, because that is what the SDK
 * models as shared base interfaces (`LimitParams`, `CursorListParams`,
 * `OffsetListParams`, `ListParams`) and what a route changes when it migrates
 * off numeric offsets. Route-specific filters stay out of it: those are typed
 * one by one on each params interface.
 *
 * The check is source-level because the types are erased at runtime. It reads
 * each resource method's declared params type, resolves the paging members it
 * offers (inherited or spelled out inline), and compares them against the
 * route's recorded query fields.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const routes: { routes: Array<{ method: string; path: string; queryFields: string[] }> } =
  JSON.parse(readFileSync(resolve(here, 'routes.json'), 'utf8'));
const typesSrc = readFileSync(resolve(here, '../types.ts'), 'utf8');

const PAGING_KEYS = ['limit', 'offset', 'cursor'] as const;
type PagingKey = (typeof PAGING_KEYS)[number];

/**
 * Every interface in types.ts: which paging members it declares itself, and
 * which interface it extends. A params type reaches its paging surface either
 * way, so both are needed: `ListRecordsParams extends ListParams` inherits all
 * three, while `ListOrgAdminReadsParams` spells them out inline.
 */
interface Declared {
  own: Set<PagingKey>;
  base?: string;
}
function parseInterfaces(source: string): Record<string, Declared> {
  const out: Record<string, Declared> = {};
  for (const m of source.matchAll(
    /export interface (\w+)(?:\s+extends\s+([\w, ]+?))?\s*\{([\s\S]*?)\n\}/g,
  )) {
    const [, name, ext, body] = m;
    const own = new Set<PagingKey>(
      PAGING_KEYS.filter((k) => new RegExp(`^\\s{2}${k}\\??:`, 'm').test(body)),
    );
    out[name] = { own, base: ext?.split(',')[0].trim() };
  }
  return out;
}
const DECLARED = parseInterfaces(typesSrc);

/** The paging members a params type offers, inherited members included. */
function offeredPaging(name: string): Set<PagingKey> | undefined {
  const out = new Set<PagingKey>();
  const seen = new Set<string>();
  let cur: string | undefined = name;
  let found = false;
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    const decl: Declared | undefined = DECLARED[cur];
    if (!decl) break;
    found = true;
    for (const k of decl.own) out.add(k);
    cur = decl.base;
  }
  return found ? out : undefined;
}

/**
 * Every `getPage`/`paginate` call whose route path is a literal or a template
 * with only `${...}` segments, paired with the params type on the enclosing
 * method signature. A call passing `undefined` for params declares no paging
 * surface and is skipped.
 */
interface Call {
  file: string;
  method: string;
  path: string;
  paramsType: string;
}
function parseCalls(): Call[] {
  const dir = resolve(here, '../resources');
  const out: Call[] = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.ts'))) {
    const src = readFileSync(resolve(dir, file), 'utf8');
    // `name(...signature...): Promise<Page<T>> {` or `: AsyncGenerator<T>`, then
    // the first getPage/paginate call inside it.
    const sigRe =
      /(\w+)\(([^)]*)\)\s*:\s*(?:Promise<Page<[^>]+>>|AsyncGenerator<[^>]+>)\s*\{([\s\S]*?)\n {2}\}/g;
    for (const m of src.matchAll(sigRe)) {
      const [, method, signature, body] = m;
      const call = body.match(/this\.http\.(?:getPage|paginate)<[^>]+>\(\s*([^,]+),\s*([^,]+),/);
      if (!call) continue;
      if (call[2].trim().startsWith('undefined')) continue;
      const rawPath = call[1].trim().replace(/^[`']|[`']$/g, '');
      const path = rawPath.replace(/\$\{[^}]+\}/g, '{}');
      const params = signature.match(/params\??:\s*([\w]+)/);
      if (!params) continue;
      out.push({ file, method, path, paramsType: params[1] });
    }
  }
  return out;
}
const CALLS = parseCalls();

/** Route lookup, with `${id}` template segments matched against `{param}`. */
function routeFor(path: string): { queryFields: string[] } | undefined {
  const wanted = path.split('/');
  return routes.routes.find((r) => {
    if (r.method !== 'GET') return false;
    const got = r.path.split('/');
    if (got.length !== wanted.length) return false;
    return got.every((seg, i) => seg === wanted[i] || (wanted[i] === '{}' && seg.startsWith('{')));
  });
}

describe('paging-shape parity', () => {
  it('parses enough list methods that a parser slip cannot pass silently', () => {
    // A regex that stops matching turns this whole file into a no-op, which is
    // the same failure it exists to catch one level down.
    expect(CALLS.length).toBeGreaterThanOrEqual(20);
    expect(CALLS.map((c) => c.path)).toContain('/v1/admin/orgs');
    expect(Object.keys(DECLARED).length).toBeGreaterThan(20);
  });

  it('resolves every declared params type to a paging surface', () => {
    const unresolved = CALLS.filter((c) => !offeredPaging(c.paramsType)).map(
      (c) => `${c.file} ${c.method}(${c.paramsType})`,
    );
    expect(
      unresolved,
      'These list methods take a params type this file cannot find in types.ts, so the ' +
        `check below cannot see what paging they advertise:\n${unresolved.join('\n')}`,
    ).toEqual([]);
  });

  for (const call of CALLS) {
    it(`${call.file} ${call.method} offers the paging ${call.path} accepts`, () => {
      const route = routeFor(call.path);
      expect(route, `${call.path} is not in routes.json`).toBeDefined();
      const offered = offeredPaging(call.paramsType)!;
      const accepted = new Set(route!.queryFields);

      const phantom = PAGING_KEYS.filter((k) => offered.has(k) && !accepted.has(k));
      expect(
        phantom,
        `${call.method}() takes ${call.paramsType}, which offers ${phantom.join(', ')}. ` +
          `${call.path} does not accept ${phantom.length > 1 ? 'them' : 'it'}, and the ` +
          'querystring refuses unknown properties, so sending one is a 400 rather than ' +
          'a no-op. Narrow the params type to what the route takes.',
      ).toEqual([]);

      // The other direction: paging the route takes and the SDK hides. Not a
      // 400, but it is a page the caller cannot walk.
      //
      // `offset` is exempt: this SDK deprecates offset paging outright, because
      // it skips or repeats rows on a listing being written to while you walk
      // it. A route that offers both and a method that exposes only `cursor` is
      // that deprecation working, not drift.
      const hidden = PAGING_KEYS.filter(
        (k) => k !== 'offset' && accepted.has(k) && !offered.has(k),
      );
      expect(
        hidden,
        `${call.path} pages by ${hidden.join(', ')} and ${call.method}() takes ` +
          `${call.paramsType}, which does not offer ${hidden.length > 1 ? 'them' : 'it'}.`,
      ).toEqual([]);
    });
  }
});
