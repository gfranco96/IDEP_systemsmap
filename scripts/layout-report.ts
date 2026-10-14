// Dev helper: prints layout/routing diagnostics for the default and fully-expanded states.
import { readFileSync } from 'node:fs';
import { buildGraph, aggregateEdges, DEFAULT_LAYERS } from '../src/model/graph';
import { computeLayout, overlaps } from '../src/layout/computeLayout';
import { routeEdges } from '../src/layout/routeEdges';
const load = (f: string) => JSON.parse(readFileSync(new URL('../data/' + f, import.meta.url), 'utf8'));
const g = buildGraph({ meta: load('meta.json'), nodes: load('nodes.json'), edges: load('edges.json'), chains: load('chains.json'), loops: load('loops.json'), references: load('references.json') });
const allContainers = [...g.stageChains.map((c) => c.id), ...g.data.loops.map((l) => l.id), ...g.systems.map((s) => s.id)];
for (const [name, exp, inter] of [['default', [], false], ['expanded', allContainers, true]] as const) {
  const view = { expanded: new Set<string>(exp), layers: { ...DEFAULT_LAYERS, interventions: inter } };
  const t0 = performance.now();
  const lay = computeLayout(g, view);
  const t1 = performance.now();
  const aggs = aggregateEdges(g, view, { interventionLinks: 'all' });
  const routed = routeEdges(g, lay, aggs);
  const t2 = performance.now();
  let ov = 0;
  for (let i = 0; i < lay.nodes.length; i++) for (let j = i + 1; j < lay.nodes.length; j++) if (overlaps(lay.nodes[i], lay.nodes[j])) { ov++; console.log('OVERLAP', lay.nodes[i].id, lay.nodes[j].id); }
  const bad = routed.filter((r) => r.collisions > 0);
  console.log(name, `nodes=${lay.nodes.length} edges=${routed.length} world=${Math.round(lay.width)}x${Math.round(lay.height)} overlaps=${ov} colliding=${bad.length} layout=${(t1 - t0).toFixed(0)}ms route=${(t2 - t1).toFixed(0)}ms kinds=${JSON.stringify(routed.reduce((m, r) => ((m[r.kind] = (m[r.kind] ?? 0) + 1), m), {} as Record<string, number>))}`);
  for (const b of bad) console.log('  collides', b.key, b.collisions, b.kind);
  console.log('  truncated:', lay.nodes.filter((n) => n.truncated).length);
}
