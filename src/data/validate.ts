import {
  ARROW_TYPES,
  CURRENT_IDS,
  NODE_TYPES,
  PROVENANCES,
  VALENCES,
  type MapData,
} from '../model/types';

/** Expected counts from the build prompt (§2). The build fails if the data drifts from these. */
export const EXPECTED = {
  nodes: 178,
  edges: 162,
  chains: 30,
  stageChains: 13,
  crossChains: 17,
  loops: 7,
  stageLoops: 3,
  mainLoops: 4,
  references: 5,
  nodesByType: {
    stage: 3,
    substage: 12,
    outcome: 5,
    system: 5,
    factor: 95,
    loop_step: 39,
    loop: 7,
    reference: 2,
    intervention: 10,
  } as Record<string, number>,
  edgesByArrowType: { forward: 15, upward: 25, downward: 62, circular: 40, dashed: 20, bidirectional: 0 } as Record<
    string,
    number
  >,
  edgesByProvenance: { explicit: 115, inferred: 47 } as Record<string, number>,
};

function countBy<T>(items: T[], key: (t: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const it of items) out[key(it)] = (out[key(it)] ?? 0) + 1;
  return out;
}

function sameCounts(a: Record<string, number>, b: Record<string, number>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) if ((a[k] ?? 0) !== (b[k] ?? 0)) return false;
  return true;
}

/** Returns a list of human-readable errors. Empty list = valid. */
export function validateData(d: MapData): string[] {
  const errors: string[] = [];
  const err = (m: string) => errors.push(m);

  // Unique ids
  const nodeIds = new Set<string>();
  for (const n of d.nodes) {
    if (nodeIds.has(n.id)) err(`Duplicate node id: ${n.id}`);
    nodeIds.add(n.id);
    if (!NODE_TYPES.includes(n.type)) err(`Node ${n.id} has unknown type ${n.type}`);
    if (n.current != null && !CURRENT_IDS.includes(n.current)) err(`Node ${n.id} has unknown current ${n.current}`);
    for (const c of n.secondaryCurrents ?? [])
      if (!CURRENT_IDS.includes(c)) err(`Node ${n.id} has unknown secondary current ${c}`);
    if (n.parent && !nodeIds.has(n.parent) && !d.nodes.some((m) => m.id === n.parent))
      err(`Node ${n.id} parent ${n.parent} does not exist`);
  }
  const edgeIds = new Set<string>();
  for (const e of d.edges) {
    if (edgeIds.has(e.id)) err(`Duplicate edge id: ${e.id}`);
    edgeIds.add(e.id);
    if (!nodeIds.has(e.source)) err(`Edge ${e.id} source ${e.source} does not exist`);
    if (!nodeIds.has(e.target)) err(`Edge ${e.id} target ${e.target} does not exist`);
    if (!ARROW_TYPES.includes(e.arrowType)) err(`Edge ${e.id} has unknown arrowType ${e.arrowType}`);
    if (!VALENCES.includes(e.valence)) err(`Edge ${e.id} has unknown valence ${e.valence}`);
    if (!PROVENANCES.includes(e.provenance)) err(`Edge ${e.id} has unknown provenance ${e.provenance}`);
  }
  const chainIds = new Set(d.chains.map((c) => c.id));
  const loopIds = new Set(d.loops.map((l) => l.id));
  for (const e of d.edges) {
    if (e.chainId && !chainIds.has(e.chainId)) err(`Edge ${e.id} chainId ${e.chainId} does not exist`);
    if (e.loopId && !loopIds.has(e.loopId)) err(`Edge ${e.id} loopId ${e.loopId} does not exist`);
  }
  for (const c of d.meta.currents) if (!CURRENT_IDS.includes(c.id)) err(`meta.currents has unknown id ${c.id}`);

  const nodeById = new Map(d.nodes.map((n) => [n.id, n]));
  const edgeById = new Map(d.edges.map((e) => [e.id, e]));
  const isOutcomeEdge = (id: string) => nodeById.get(edgeById.get(id)?.target ?? '')?.type === 'outcome';

  for (const c of d.chains) {
    if (!CURRENT_IDS.includes(c.primaryCurrent)) err(`Chain ${c.id} has unknown primaryCurrent`);
    for (const s of c.secondaryCurrents) if (!CURRENT_IDS.includes(s)) err(`Chain ${c.id} unknown secondary ${s}`);
    if (!ARROW_TYPES.includes(c.defaultArrowType)) err(`Chain ${c.id} unknown defaultArrowType`);
    if (!VALENCES.includes(c.defaultValence)) err(`Chain ${c.id} unknown defaultValence`);
    for (const id of c.stepNodeIds) if (!nodeIds.has(id)) err(`Chain ${c.id} step ${id} does not exist`);
    for (const id of [...c.edgeIds, ...c.outcomeEdgeIds]) if (!edgeIds.has(id)) err(`Chain ${c.id} edge ${id} missing`);
    if (c.system && !nodeIds.has(c.system)) err(`Chain ${c.id} system ${c.system} does not exist`);
    if (c.scope === 'stage') {
      if (!c.outcomeEdgeIds.some(isOutcomeEdge)) err(`Stage chain ${c.id} has no edge into an outcome node`);
    }
    for (const id of c.stepNodeIds) {
      const n = nodeById.get(id);
      if (n && n.chainId !== c.id) err(`Step ${id} chainId (${n.chainId}) does not match chain ${c.id}`);
    }
  }
  for (const l of d.loops) {
    if (l.primaryCurrent != null && !CURRENT_IDS.includes(l.primaryCurrent)) err(`Loop ${l.id} unknown current`);
    if (!nodeIds.has(l.hubNodeId)) err(`Loop ${l.id} hub ${l.hubNodeId} does not exist`);
    for (const id of l.stepNodeIds) if (!nodeIds.has(id)) err(`Loop ${l.id} step ${id} does not exist`);
    for (const id of [...l.edgeIds, ...l.outcomeEdgeIds]) if (!edgeIds.has(id)) err(`Loop ${l.id} edge ${id} missing`);
    if (!l.outcomeEdgeIds.some(isOutcomeEdge)) err(`Loop ${l.id} has no edge into an outcome node`);
    if (!l.edgeIds.some((id) => edgeById.get(id)?.loopClosure)) err(`Loop ${l.id} has no loopClosure edge`);
  }
  for (const n of d.nodes.filter((n) => n.type === 'intervention')) {
    if (!d.edges.some((e) => e.source === n.id)) err(`Intervention ${n.id} has no outgoing edge`);
  }
  const refIds = new Set(d.references.map((r) => r.id));
  for (const holder of [...d.nodes, ...d.chains, ...d.loops] as { id: string; evidenceIds?: string[] }[])
    for (const r of holder.evidenceIds ?? []) if (!refIds.has(r)) err(`${holder.id} cites missing reference ${r}`);

  // Counts (§2)
  const nodesByType = countBy(d.nodes, (n) => n.type);
  const edgesByArrow = countBy(d.edges, (e) => e.arrowType);
  const edgesByProv = countBy(d.edges, (e) => e.provenance);
  const chk = (label: string, got: number, want: number) => {
    if (got !== want) err(`Count mismatch for ${label}: got ${got}, expected ${want}`);
  };
  chk('nodes', d.nodes.length, EXPECTED.nodes);
  chk('edges', d.edges.length, EXPECTED.edges);
  chk('chains', d.chains.length, EXPECTED.chains);
  chk('stage chains', d.chains.filter((c) => c.scope === 'stage').length, EXPECTED.stageChains);
  chk('cross chains', d.chains.filter((c) => c.scope === 'cross').length, EXPECTED.crossChains);
  chk('loops', d.loops.length, EXPECTED.loops);
  chk('stage loops', d.loops.filter((l) => l.scope === 'stage').length, EXPECTED.stageLoops);
  chk('main loops', d.loops.filter((l) => l.scope === 'main').length, EXPECTED.mainLoops);
  chk('references', d.references.length, EXPECTED.references);
  if (!sameCounts(nodesByType, EXPECTED.nodesByType))
    err(`nodesByType mismatch: got ${JSON.stringify(nodesByType)}`);
  if (!sameCounts(edgesByArrow, EXPECTED.edgesByArrowType))
    err(`edgesByArrowType mismatch: got ${JSON.stringify(edgesByArrow)}`);
  if (!sameCounts(edgesByProv, EXPECTED.edgesByProvenance))
    err(`edgesByProvenance mismatch: got ${JSON.stringify(edgesByProv)}`);

  // meta.counts must equal the computed counts
  const mc = d.meta.counts;
  chk('meta.counts.nodes', d.nodes.length, mc.nodes);
  chk('meta.counts.edges', d.edges.length, mc.edges);
  chk('meta.counts.chains', d.chains.length, mc.chains);
  chk('meta.counts.loops', d.loops.length, mc.loops);
  chk('meta.counts.references', d.references.length, mc.references);
  chk('meta.counts.stageChains', d.chains.filter((c) => c.scope === 'stage').length, mc.stageChains);
  chk('meta.counts.crossChains', d.chains.filter((c) => c.scope === 'cross').length, mc.crossChains);
  if (!sameCounts(nodesByType, mc.nodesByType)) err('meta.counts.nodesByType differs from computed counts');
  if (!sameCounts(edgesByArrow, mc.edgesByArrowType)) err('meta.counts.edgesByArrowType differs from computed counts');
  if (!sameCounts(edgesByProv, mc.edgesByProvenance)) err('meta.counts.edgesByProvenance differs from computed counts');

  return errors;
}
