/**
 * Regenerate the SDK↔API parity snapshots from an OpenAPI spec.
 *
 * Both snapshots used to be hand-maintained with no generator, which made the
 * parity tests unable to detect API drift: they compare the SDK against files
 * that only change when someone edits them, so an API release that adds a field
 * leaves the suite green. That is exactly what happened on the v1.4.0 → RC bump,
 * where two new RecordRow fields landed and all 530 tests still passed.
 *
 * Refreshing is now one command, and `--check` surfaces the drift without
 * writing anything (wire it into CI against a known-good spec).
 *
 *   node scripts/refresh-parity.mjs --url http://localhost:3001/openapi.json
 *   node scripts/refresh-parity.mjs --spec ../agledger-api/openapi.json
 *   node scripts/refresh-parity.mjs --spec <path> --check   # exit 1 on drift
 *
 * The snapshots stay committed: they record which API version the SDK was last
 * reconciled against, and the tests must run offline.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '../src/__tests__');
const ROUTES = resolve(OUT_DIR, 'routes.json');
const FIELDS = resolve(OUT_DIR, 'schema-fields.json');

const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];

function arg(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
}
const check = process.argv.includes('--check');

async function loadSpec() {
  const url = arg('--url');
  if (url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
    return { spec: await res.json(), source: url };
  }
  const path = arg('--spec');
  if (!path) throw new Error('Pass --url <openapi url> or --spec <path to openapi.json>');
  const abs = resolve(process.cwd(), path);
  return { spec: JSON.parse(readFileSync(abs, 'utf8')), source: abs };
}

/** Resolve a local $ref, guarding against cycles. */
function deref(node, spec, seen = new Set()) {
  if (!node || typeof node !== 'object') return node;
  const ref = node.$ref;
  if (typeof ref !== 'string' || !ref.startsWith('#/') || seen.has(ref)) return node;
  let cur = spec;
  for (const rawPart of ref.slice(2).split('/')) {
    const part = rawPart.replace(/~1/g, '/').replace(/~0/g, '~');
    if (!cur || typeof cur !== 'object' || !(part in cur)) return {};
    cur = cur[part];
  }
  return deref(cur, spec, new Set([...seen, ref]));
}

/**
 * Top-level property names of a schema, flattening the composition keywords.
 * `oneOf` matters here: the A2A endpoint declares its body as a union of
 * JSON-RPC method shapes with no top-level `properties`, so a generator that
 * only reads `properties` records it as having no body fields at all.
 */
function propNames(schema, spec, depth = 0) {
  const resolved = deref(schema, spec);
  if (!resolved || typeof resolved !== 'object' || depth > 6) return [];
  const names = new Set(Object.keys(resolved.properties ?? {}));
  for (const key of ['allOf', 'oneOf', 'anyOf']) {
    for (const sub of resolved[key] ?? []) {
      for (const name of propNames(sub, spec, depth + 1)) names.add(name);
    }
  }
  return [...names].sort();
}

function buildRoutes(spec, source) {
  const routes = [];
  for (const [path, item] of Object.entries(spec.paths ?? {})) {
    for (const method of METHODS) {
      const op = item?.[method];
      if (!op) continue;
      const body = deref(op.requestBody ?? {}, spec);
      const jsonSchema = deref(body.content?.['application/json']?.schema ?? {}, spec);
      const params = (op.parameters ?? []).map((p) => deref(p, spec));
      routes.push({
        method: method.toUpperCase(),
        path,
        operationId: op.operationId ?? null,
        tag: op.tags?.[0] ?? null,
        requiredFields: [...(jsonSchema.required ?? [])].sort(),
        bodyFields: propNames(jsonSchema, spec),
        queryFields: params.filter((p) => p.in === 'query').map((p) => p.name).sort(),
        pathParams: params.filter((p) => p.in === 'path').map((p) => p.name).sort(),
        responseCodes: Object.keys(op.responses ?? {})
          .map(Number)
          .filter(Number.isFinite)
          .sort((a, b) => a - b),
      });
    }
  }
  routes.sort((a, b) => `${a.method} ${a.path}`.localeCompare(`${b.method} ${b.path}`));
  return {
    generatedAt: new Date().toISOString(),
    sourceUrl: `${source} (AGLedger API v${spec.info?.version ?? '?'})`,
    count: routes.length,
    routes,
  };
}

function buildFields(spec) {
  const schemas = {};
  for (const [name, schema] of Object.entries(spec.components?.schemas ?? {})) {
    schemas[name] = propNames(schema, spec);
  }
  return {
    generatedFrom: 'components.schemas',
    apiVersion: spec.info?.version ?? null,
    schemaCount: Object.keys(schemas).length,
    schemas: Object.fromEntries(Object.entries(schemas).sort(([a], [b]) => a.localeCompare(b))),
  };
}

/** Compare ignoring the fields that change on every run. */
function meaningful(obj) {
  const { generatedAt: _a, sourceUrl: _b, ...rest } = obj;
  return JSON.stringify(rest);
}

function reportRoutes(prev, next) {
  const before = new Map(prev.routes.map((r) => [`${r.method} ${r.path}`, r]));
  const after = new Map(next.routes.map((r) => [`${r.method} ${r.path}`, r]));
  let drifted = false;
  for (const key of after.keys()) {
    if (!before.has(key)) {
      console.log(`    + ${key}`);
      drifted = true;
    }
  }
  for (const key of before.keys()) {
    if (!after.has(key)) {
      console.log(`    - ${key}`);
      drifted = true;
    }
  }
  for (const [key, a] of before) {
    const b = after.get(key);
    if (!b) continue;
    for (const field of ['queryFields', 'bodyFields', 'requiredFields', 'pathParams']) {
      const added = b[field].filter((x) => !a[field].includes(x));
      const removed = a[field].filter((x) => !b[field].includes(x));
      if (added.length || removed.length) {
        drifted = true;
        const parts = [];
        if (added.length) parts.push(`+${added.join(',')}`);
        if (removed.length) parts.push(`-${removed.join(',')}`);
        console.log(`    ~ ${key} ${field}: ${parts.join(' ')}`);
      }
    }
  }
  return drifted;
}

function reportFields(prev, next) {
  let drifted = false;
  for (const [name, fields] of Object.entries(next.schemas)) {
    const before = prev.schemas?.[name] ?? [];
    const added = fields.filter((f) => !before.includes(f));
    const removed = before.filter((f) => !fields.includes(f));
    if (added.length || removed.length) {
      drifted = true;
      const parts = [];
      if (added.length) parts.push(`+${added.join(',')}`);
      if (removed.length) parts.push(`-${removed.join(',')}`);
      console.log(`    ~ ${name}: ${parts.join(' ')}`);
    }
  }
  for (const name of Object.keys(prev.schemas ?? {})) {
    if (!(name in next.schemas)) {
      drifted = true;
      console.log(`    - schema ${name}`);
    }
  }
  return drifted;
}

const { spec, source } = await loadSpec();
console.log(`Spec: ${spec.info?.title ?? 'unknown'} v${spec.info?.version ?? '?'}  (${source})`);

const nextRoutes = buildRoutes(spec, source);
const nextFields = buildFields(spec);
const prevRoutes = JSON.parse(readFileSync(ROUTES, 'utf8'));
const prevFields = JSON.parse(readFileSync(FIELDS, 'utf8'));

console.log(`\nroutes.json (${prevRoutes.count} -> ${nextRoutes.count}):`);
const routesDrift =
  meaningful(prevRoutes) !== meaningful(nextRoutes) ? reportRoutes(prevRoutes, nextRoutes) : false;
if (!routesDrift) console.log('    up to date');

console.log(`\nschema-fields.json (apiVersion ${prevFields.apiVersion} -> ${nextFields.apiVersion}):`);
const fieldsDrift = reportFields(prevFields, nextFields);
if (!fieldsDrift) console.log('    up to date');

if (check) {
  if (routesDrift || fieldsDrift) {
    console.error('\nSnapshots are stale. Run without --check to refresh.');
    process.exit(1);
  }
  console.log('\nSnapshots match the spec.');
  process.exit(0);
}

writeFileSync(ROUTES, `${JSON.stringify(nextRoutes, null, 2)}\n`);
writeFileSync(FIELDS, `${JSON.stringify(nextFields, null, 2)}\n`);
console.log('\nSnapshots written. Re-run the tests to reconcile the SDK against them.');
