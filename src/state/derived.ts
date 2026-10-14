import { useMemo } from 'react';
import { graph } from '../data/loadData';
import { aggregateEdges, membersOf, representative, trace, type ViewState } from '../model/graph';
import { computeLayout, type Layout, type LNode } from '../layout/computeLayout';
import { routeEdges, type RoutedEdge } from '../layout/routeEdges';
import type { State } from './store';

export type Emph = 'normal' | 'hl' | 'soft' | 'faded' | 'filtered';

export interface MapModel {
  layout: Layout;
  routed: RoutedEdge[];
  nodeEmph: (n: LNode) => Emph;
  edgeEmph: (e: RoutedEdge) => Emph;
  /** a focus mode is active (hover / trace / lane focus) */
  focusing: boolean;
  activeInterventions: Set<string>;
}

const g = graph;

export function selectedNodeId(sel: string | null): string | null {
  return sel && !sel.startsWith('edge:') ? sel : null;
}

export function useMapModel(state: State): MapModel {
  const view: ViewState = useMemo(
    () => ({ expanded: state.expanded, layers: state.layers }),
    [state.expanded, state.layers],
  );
  const layout = useMemo(() => computeLayout(g, view), [view]);

  // intervention links: only the hovered/selected intervention unless "show all"
  const activeInterventions = useMemo(() => {
    const s = new Set<string>();
    for (const id of [state.hovered, selectedNodeId(state.selected)])
      if (id && g.nodeById.get(id)?.type === 'intervention') s.add(id);
    return s;
  }, [state.hovered, state.selected]);
  const intKey = state.showAllInterventionLinks ? 'all' : [...activeInterventions].sort().join(',');

  const aggs = useMemo(
    () =>
      aggregateEdges(g, view, {
        arrowTypes: state.edgeFilter,
        interventionLinks: state.showAllInterventionLinks ? 'all' : new Set(intKey ? intKey.split(',') : []),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [view, state.edgeFilter, intKey, state.showAllInterventionLinks],
  );
  const routed = useMemo(() => routeEdges(g, layout, aggs), [layout, aggs]);

  // ---- emphasis -----------------------------------------------------------
  const emph = useMemo(() => {
    const hlNodes = new Set<string>();
    const hlEdges = new Set<string>();
    let focusing = false;
    const traceId = state.traceId;
    if (traceId) {
      focusing = true;
      const start = membersOf(g, traceId);
      const t = trace(g, start, 'both', state.layers.interventions);
      for (const id of t.nodes) {
        const r = representative(g, id, view);
        if (r) hlNodes.add(r);
      }
      hlNodes.add(traceId);
      for (const re of routed) if (re.agg.members.some((m) => t.edges.has(m.id))) hlEdges.add(re.key);
    } else if (state.hovered) {
      focusing = true;
      const h = state.hovered;
      if (h.startsWith('edge:')) {
        const re = routed.find((r) => 'edge:' + r.key === h);
        if (re) {
          hlEdges.add(re.key);
          hlNodes.add(re.agg.source);
          hlNodes.add(re.agg.target);
        }
      } else {
        hlNodes.add(h);
        for (const re of routed)
          if (re.agg.source === h || re.agg.target === h) {
            hlEdges.add(re.key);
            hlNodes.add(re.agg.source);
            hlNodes.add(re.agg.target);
          }
        // highlighting a container header also highlights its members
        for (const n of layout.nodes) if (n.container === h) hlNodes.add(n.id);
      }
    }
    return { hlNodes, hlEdges, focusing };
  }, [state.traceId, state.hovered, state.layers.interventions, routed, layout, view]);

  const laneFocus = state.laneFocus;
  const laneF = state.laneFilter;
  const stageF = state.stageFilter;

  const nodeEmph = (n: LNode): Emph => {
    if (laneF.size && n.current && !laneF.has(n.current) && !n.secondary.some((c) => laneF.has(c))) return 'filtered';
    if (stageF.size && n.stage) {
      const st = n.stage === 'main' ? 'cross' : n.stage;
      if (['childhood', 'adolescence', 'adulthood', 'cross'].includes(st) && !stageF.has(st as never)) return 'filtered';
    }
    if (emph.focusing) return emph.hlNodes.has(n.id) ? 'hl' : 'faded';
    if (laneFocus) {
      if (n.current === laneFocus) return 'hl';
      if (n.secondary.includes(laneFocus)) return 'soft';
      return 'faded';
    }
    return 'normal';
  };
  const edgeEmph = (e: RoutedEdge): Emph => {
    if (emph.focusing) return emph.hlEdges.has(e.key) ? 'hl' : 'faded';
    if (laneFocus) return e.color === laneFocus ? 'hl' : 'faded';
    const s = layout.byId.get(e.agg.source);
    const t = layout.byId.get(e.agg.target);
    if (s && t && (nodeEmph(s) === 'filtered' || nodeEmph(t) === 'filtered')) return 'filtered';
    return 'normal';
  };

  return { layout, routed, nodeEmph, edgeEmph, focusing: emph.focusing || !!laneFocus, activeInterventions };
}
