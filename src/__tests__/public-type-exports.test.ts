import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Every type a resource method names has to be reachable from the package
 * entry point.
 *
 * `types.ts` is not re-exported wholesale: `index.ts` carries a hand-written
 * name list, so adding a method that returns a new interface leaves that
 * interface unreachable unless someone remembers the second edit. Nothing
 * caught it, because the SDK's own code imports from `../types.js` directly
 * and typechecks fine either way. It only breaks for a consumer, who cannot
 * name the return type of a method they are calling.
 *
 * That is how `SchemaDeleteResult`, `SchemaScopeOptions`, `SchemaManifestExport`,
 * `VaultCheckpointPage` and `VaultCheckpointingSchedule` all reached a release
 * candidate unexported.
 *
 * Reachability is transitive. A resource module importing `SystemHealth` gives a
 * consumer no way to name `QueueCounts` if `SystemHealth.queues` is typed with
 * it and `index.ts` never forwards it, and the module's own import list does not
 * mention it. `QueueCounts` reached a release candidate that way, so the closure
 * below follows type references out of `types.ts` declarations rather than
 * stopping at what the resources name directly.
 */

function read(rel: string): string {
  return readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
}

/** Names in `index.ts`'s `export type { ... } from './types.js'` block. */
function exportedFromIndex(): Set<string> {
  const block = /export type \{(.*?)\n\} from '\.\/types\.js';/s.exec(read('../index.ts'));
  if (!block) throw new Error('index.ts type re-export block not found; update this test');
  return new Set(
    block[1]
      .split('\n')
      .map((line) => /^\s*([A-Za-z_][A-Za-z0-9_]*),?\s*$/.exec(line)?.[1])
      .filter((name): name is string => Boolean(name)),
  );
}

/** Interfaces and type aliases declared in `types.ts`. */
function declaredInTypes(): Set<string> {
  return new Set(
    [...read('../types.ts').matchAll(/^export (?:interface|type) ([A-Za-z0-9_]+)/gm)].map(
      (m) => m[1],
    ),
  );
}

/** Type names the resource modules pull in from `types.ts`. */
function usedByResources(): Set<string> {
  const names = new Set<string>();
  const modules = [
    'records', 'completions', 'schemas', 'agents', 'audit', 'webhooks',
    'disputes', 'admin', 'reputation', 'federation',
  ];
  for (const mod of modules) {
    let src: string;
    try {
      src = read(`../resources/${mod}.ts`);
    } catch {
      continue;
    }
    for (const m of src.matchAll(/import type \{(.*?)\} from '\.\.\/types\.js';/gs)) {
      for (const n of m[1].matchAll(/[A-Za-z_][A-Za-z0-9_]*/g)) names.add(n[0]);
    }
  }
  return names;
}

/**
 * Split `types.ts` into `name -> declaration body`, so a declaration can be
 * scanned for the other declared names it references.
 */
function declarationBodies(): Map<string, string> {
  const src = read('../types.ts');
  const bodies = new Map<string, string>();
  const starts = [...src.matchAll(/^export (?:interface|type) ([A-Za-z0-9_]+)/gm)];
  for (let i = 0; i < starts.length; i++) {
    const from = starts[i].index ?? 0;
    const to = i + 1 < starts.length ? (starts[i + 1].index ?? src.length) : src.length;
    bodies.set(starts[i][1], src.slice(from, to));
  }
  return bodies;
}

/**
 * Everything a consumer can reach by starting at a type the resources name and
 * following references through `types.ts`.
 */
function reachableFromResources(): Set<string> {
  const bodies = declarationBodies();
  const seen = new Set<string>();
  const queue = [...usedByResources()].filter((n) => bodies.has(n));
  while (queue.length > 0) {
    const name = queue.pop() as string;
    if (seen.has(name)) continue;
    seen.add(name);
    const body = bodies.get(name) as string;
    for (const m of body.matchAll(/[A-Za-z_][A-Za-z0-9_]*/g)) {
      const ref = m[0];
      if (ref !== name && bodies.has(ref) && !seen.has(ref)) queue.push(ref);
    }
  }
  return seen;
}

describe('public type exports', () => {
  it('re-exports every types.ts name a resource method references', () => {
    const declared = declaredInTypes();
    const exported = exportedFromIndex();
    const used = usedByResources();

    expect(used.size).toBeGreaterThan(20);

    const unreachable = [...used]
      .filter((name) => declared.has(name) && !exported.has(name))
      .sort();

    expect(unreachable).toEqual([]);
  });

  it('re-exports every types.ts name reachable from one a resource references', () => {
    const exported = exportedFromIndex();
    const reachable = reachableFromResources();

    expect(reachable.size).toBeGreaterThan(usedByResources().size);

    const unreachable = [...reachable].filter((name) => !exported.has(name)).sort();

    expect(unreachable).toEqual([]);
  });

  it('re-exports no name types.ts does not declare', () => {
    const declared = declaredInTypes();
    // Names types.ts forwards on from another module rather than declaring.
    const forwarded = new Set(
      [...read('../types.ts').matchAll(/^export type \{ ([A-Za-z0-9_, ]+) \} from/gm)].flatMap(
        (m) => m[1].split(',').map((s) => s.trim()),
      ),
    );
    const stale = [...exportedFromIndex()]
      .filter((name) => !declared.has(name) && !forwarded.has(name))
      .sort();

    expect(stale).toEqual([]);
  });
});
