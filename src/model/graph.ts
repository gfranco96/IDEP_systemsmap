import type { ArrowType, Chain, Current, CurrentId, Loop, MapData, MapEdge, MapNode, Reference, StageKey } from './types';
import { STAGE_KEYS } from './types';

export interface Graph {
  data: MapData;
  nodeById: Map<string, MapNode>;
  edgeById: Map<string, MapEdge>;
  chainById: Map<string, Chain>;
  loopById: Map<string, Loop>;
  refById: Map<string, Reference>;
  currentById: Map<CurrentId, Current>;
  out: Map<string, MapEdge[]>;
  in: Map<string, MapEdge[]>;
  /** lanes = the four role:"current" currents in order; overlay = cultural */
  lanes: Current[];
  overlay: Current;
  stages: MapNode[];
  substagesByStage: Map<StageKey, MapNode[]>;
  stageChains: Chain[];
  crossChainsBySystem: Map<string, Chain[]>;
  stageLoops: Loop[];
  mainLoops: Loop[];
  outcomes: MapNode[];
  systems: MapNode[];
  references: MapNode[];
  interventions: MapNode[];
}

const byOrder = <T extends { order?: number }>(a: T, b: T) => (a.order ?? 0) - (b.order ?? 0);

export function buildGraph(data: MapData): Graph {
  const nodeById = new Map(data.nodes.map((n) => [n.id, n]));
  const edgeById = new Map(data.edges.map((e) => [e.id, e]));
  const chainById = new Map(data.chains.map((c) => [c.id, c]));
  const loopById = new Map(data.loops.map((l) => [l.id, l]));
  const refById = new Map(data.references.map((r) => [r.id, r]));
  const currentById = new Map(data.meta.currents.map((c) => [c.id, c]));
  const out = new Map<string, MapEdge[]>();
  const inn = new Map<string, MapEdge[]>();
  for (const e of data.edges) {
    if (!out.has(e.source)) out.set(e.source, []);
    if (!inn.has(e.target)) inn.set(e.target, []);
    out.get(e.source)!.push(e);
    inn.get(e.target)!.push(e);
  }
  const lanes = data.meta.currents.filter((c) => c.role === 'current').sort(byOrder);
  const overlay = data.meta.currents.find((c) => c.role === 'overlay')!;
  const stages = data.meta.stages.map((id) => nodeById.get(id)!);
  const substagesByStage = new Map<StageKey, MapNode[]>();
  for (const s of STAGE_KEYS)
    substagesByStage.set(
      s,
      data.nodes.filter((n) => n.type === 'substage' && n.stage === s).sort(byOrder),
    );
  const crossChainsBySystem = new Map<string, Chain[]>();
  for (const c of data.chains.filter((c) => c.scope === 'cross').sort(byOrder)) {
    const sys = c.system!;
    if (!crossChainsBySystem.has(sys)) crossChainsBySystem.set(sys, []);
    crossChainsBySystem.get(sys)!.push(c);
  }
  const ofType = (t: MapNode['type']) => data.nodes.filter((n) => n.type === t);
  return {
    data,
    nodeById,
    edgeById,
    chainById,
    loopById,
    refById,
    currentById,
    out,
    in: inn,
    lanes,
    overlay,
    stages,
    substagesByStage,
    stageChains: data.chains.filter((c) => c.scope === 'stage').sort(byOrder),
    crossChainsBySystem,
    stageLoops: data.loops.filter((l) => l.scope === 'stage'),
    mainLoops: data.loops.filter((l) => l.scope === 'main'),
    outcomes: ofType('outcome').sort(byOrder),
    systems: lanes
      .concat([overlay])
      .map((c) => nodeById.get(c.systemNodeId)!)
      .filter(Boolean),
    references: ofType('reference'),
    interventions: ofType('intervention').sort(byOrder),
  };
}

// ---------------------------------------------------------------------------
// View-dependent visibility & containment
// ---------------------------------------------------------------------------

export interface Layers {
  cultural: boolean;
  crossLife: boolean;
  loops: boolean;
  references: boolean;
  interventions: boolean;
  inferred: boolean;
}

export const DEFAULT_LAYERS: Layers = {
  cultural: true,
  crossLife: true,
  loops: true,
  references: true,
  interventions: false,
  inferred: true,
};

export interface ViewState {
  expanded: ReadonlySet<string>;
  layers: Layers;
}

/** Container id for a node, i.e. the id that represents it when collapsed (chain chip / loop hub / system bar). */
export function containerOf(g: Graph, nodeId: string): string | null {
  const n = g.nodeById.get(nodeId);
  if (!n) return null;
  if (n.type === 'factor' && n.chainId) {
    const ch = g.chainById.get(n.chainId)!;
    return ch.scope === 'cross' ? ch.system! : ch.id;
  }
  if (n.type === 'loop_step' && n.loopId) return n.loopId;
  return null;
}

/** Every container that must be expanded to reveal `nodeId` (or chain id). */
export function containersToReveal(g: Graph, id: string): string[] {
  const c = containerOf(g, id);
  if (c) return [c];
  const ch = g.chainById.get(id);
  if (ch && ch.scope === 'cross') return [ch.system!];
  return [];
}

/** Which layer (if any) hides this node? */
function hiddenByLayer(g: Graph, n: MapNode, layers: Layers): boolean {
  if (n.type === 'intervention') return !layers.interventions;
  if (n.type === 'reference') return !layers.references;
  if (n.type === 'loop' || n.type === 'loop_step') return !layers.loops;
  if (n.type === 'system') {
    if (n.current === 'cultural' && !layers.cultural) return true;
    return !layers.crossLife;
  }
  if (n.type === 'factor' && n.chainId) {
    const ch = g.chainById.get(n.chainId)!;
    if (ch.scope === 'cross') {
      if (ch.primaryCurrent === 'cultural' && !layers.cultural) return true;
      return !layers.crossLife;
    }
  }
  return false;
}

/**
 * Visible representative for an original node id: the node itself, or the collapsed container
 * that holds it (§6.3). Returns null when the node is hidden by a layer toggle.
 */
export function representative(g: Graph, nodeId: string, view: ViewState): string | null {
  const n = g.nodeById.get(nodeId);
  if (!n) return null;
  if (hiddenByLayer(g, n, view.layers)) return null;
  const c = containerOf(g, nodeId);
  if (c && !view.expanded.has(c)) return c;
  return nodeId;
}

export interface AggEdge {
  /** stable key: source|target|arrowType */
  key: string;
  source: string;
  target: string;
  arrowType: ArrowType;
  members: MapEdge[];
  /** all members inferred */
  inferred: boolean;
  /** at least one member inferred */
  anyInferred: boolean;
  lifted: boolean;
}

export interface EdgeFilter {
  /** arrow types to show (empty = all) */
  arrowTypes?: ReadonlySet<ArrowType>;
  /** which intervention nodes' dashed edges to draw ('all' = all) */
  interventionLinks: ReadonlySet<string> | 'all';
}

/** §6.3 Lift edges to visible representatives and aggregate identical (source, target, arrowType). */
export function aggregateEdges(g: Graph, view: ViewState, filter: EdgeFilter): AggEdge[] {
  const byKey = new Map<string, AggEdge>();
  for (const e of g.data.edges) {
    if (!view.layers.inferred && e.provenance === 'inferred') continue;
    if (filter.arrowTypes && filter.arrowTypes.size && !filter.arrowTypes.has(e.arrowType)) continue;
    if (e.arrowType === 'dashed' || g.nodeById.get(e.source)?.type === 'intervention') {
      if (!view.layers.interventions) continue;
      if (filter.interventionLinks !== 'all' && !filter.interventionLinks.has(e.source)) continue;
    }
    const s = representative(g, e.source, view);
    const t = representative(g, e.target, view);
    if (!s || !t || s === t) continue;
    const key = `${s}|${t}|${e.arrowType}`;
    let a = byKey.get(key);
    if (!a) {
      a = {
        key,
        source: s,
        target: t,
        arrowType: e.arrowType,
        members: [],
        inferred: true,
        anyInferred: false,
        lifted: false,
      };
      byKey.set(key, a);
    }
    a.members.push(e);
    if (e.provenance !== 'inferred') a.inferred = false;
    else a.anyInferred = true;
    if (s !== e.source || t !== e.target) a.lifted = true;
  }
  return [...byKey.values()];
}

// ---------------------------------------------------------------------------
// Tracing
// ---------------------------------------------------------------------------

/** Original node ids that a visible id stands for (container → its members, plus itself if a node). */
export function membersOf(g: Graph, id: string): string[] {
  const ch = g.chainById.get(id);
  if (ch) return [...ch.stepNodeIds];
  const lp = g.loopById.get(id);
  if (lp) return [lp.hubNodeId, ...lp.stepNodeIds];
  const n = g.nodeById.get(id);
  if (n?.type === 'system') {
    const xs = g.crossChainsBySystem.get(id) ?? [];
    return [id, ...xs.flatMap((c) => c.stepNodeIds)];
  }
  return [id];
}

export interface Trace {
  nodes: Set<string>;
  edges: Set<string>;
}

export function trace(
  g: Graph,
  startIds: string[],
  dir: 'up' | 'down' | 'both',
  includeDashed: boolean,
): Trace {
  const nodes = new Set<string>(startIds);
  const edges = new Set<string>();
  const walk = (forward: boolean) => {
    const stack = [...startIds];
    const seen = new Set(startIds);
    while (stack.length) {
      const id = stack.pop()!;
      const list = (forward ? g.out.get(id) : g.in.get(id)) ?? [];
      for (const e of list) {
        if (e.arrowType === 'dashed' && !includeDashed) continue;
        edges.add(e.id);
        const next = forward ? e.target : e.source;
        nodes.add(next);
        if (!seen.has(next)) {
          seen.add(next);
          stack.push(next);
        }
      }
    }
  };
  if (dir !== 'up') walk(true);
  if (dir !== 'down') walk(false);
  return { nodes, edges };
}

/** Lane colour lookup with a neutral fallback. */
export function currentColor(g: Graph, c: CurrentId | null | undefined): string | null {
  if (!c) return null;
  return g.currentById.get(c)?.color ?? null;
}

/** The chain or loop an edge belongs to → its primaryCurrent colour (null = neutral gray). §4.2 */
export function edgeColorCurrent(g: Graph, e: MapEdge): CurrentId | null {
  const target = g.nodeById.get(e.target);
  if (target?.type === 'outcome') return null;
  if (e.chainId) return g.chainById.get(e.chainId)!.primaryCurrent;
  if (e.loopId) return g.loopById.get(e.loopId)!.primaryCurrent;
  return null;
}
