import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react';
import type { ArrowType, CurrentId } from '../model/types';
import { DEFAULT_LAYERS, type Layers } from '../model/graph';

export type StageFilterKey = 'childhood' | 'adolescence' | 'adulthood' | 'cross';

export interface ZoomT {
  x: number;
  y: number;
  k: number;
}

export interface State {
  expanded: Set<string>;
  layers: Layers;
  laneFilter: Set<CurrentId>; // empty = all
  stageFilter: Set<StageFilterKey>; // empty = all
  edgeFilter: Set<ArrowType>; // empty = all
  selected: string | null; // node id, chain id, or "edge:<key>"
  hovered: string | null;
  traceId: string | null;
  laneFocus: CurrentId | null;
  showAllInterventionLinks: boolean;
  outline: boolean;
  about: boolean;
  tourStep: number | null;
  theme: 'system' | 'light' | 'dark';
  /** transform restored from the URL (applied once by the canvas) */
  initialZoom: ZoomT | null;
  /** bump to request the canvas to focus a node: {id, nonce} */
  focusRequest: { id: string; nonce: number; zoom?: number } | null;
  fitRequest: number;
}

export const initialState: State = {
  expanded: new Set(),
  layers: { ...DEFAULT_LAYERS },
  laneFilter: new Set(),
  stageFilter: new Set(),
  edgeFilter: new Set(),
  selected: null,
  hovered: null,
  traceId: null,
  laneFocus: null,
  showAllInterventionLinks: false,
  outline: false,
  about: true,
  tourStep: null,
  theme: 'system',
  initialZoom: null,
  focusRequest: null,
  fitRequest: 0,
};

export type Action =
  | { type: 'toggleExpand'; id: string }
  | { type: 'setExpanded'; ids: string[] }
  | { type: 'expand'; ids: string[] }
  | { type: 'collapseAll' }
  | { type: 'setLayer'; layer: keyof Layers; value: boolean }
  | { type: 'toggleLaneFilter'; lane: CurrentId }
  | { type: 'toggleStageFilter'; stage: StageFilterKey }
  | { type: 'toggleEdgeFilter'; arrow: ArrowType }
  | { type: 'clearFilters' }
  | { type: 'select'; id: string | null }
  | { type: 'hover'; id: string | null }
  | { type: 'trace'; id: string | null }
  | { type: 'laneFocus'; lane: CurrentId | null }
  | { type: 'setShowAllInterventionLinks'; value: boolean }
  | { type: 'setOutline'; value: boolean }
  | { type: 'setAbout'; value: boolean }
  | { type: 'tour'; step: number | null }
  | { type: 'theme'; value: State['theme'] }
  | { type: 'focus'; id: string; zoom?: number }
  | { type: 'fit' }
  | { type: 'restore'; state: Partial<State> };

function toggle<T>(s: Set<T>, v: T): Set<T> {
  const n = new Set(s);
  if (n.has(v)) n.delete(v);
  else n.add(v);
  return n;
}

let nonce = 0;

export function reducer(state: State, a: Action): State {
  switch (a.type) {
    case 'toggleExpand':
      return { ...state, expanded: toggle(state.expanded, a.id) };
    case 'setExpanded':
      return { ...state, expanded: new Set(a.ids) };
    case 'expand':
      return { ...state, expanded: new Set([...state.expanded, ...a.ids]) };
    case 'collapseAll':
      return { ...state, expanded: new Set() };
    case 'setLayer': {
      const layers = { ...state.layers, [a.layer]: a.value };
      return { ...state, layers };
    }
    case 'toggleLaneFilter':
      return { ...state, laneFilter: toggle(state.laneFilter, a.lane) };
    case 'toggleStageFilter':
      return { ...state, stageFilter: toggle(state.stageFilter, a.stage) };
    case 'toggleEdgeFilter':
      return { ...state, edgeFilter: toggle(state.edgeFilter, a.arrow) };
    case 'clearFilters':
      return { ...state, laneFilter: new Set(), stageFilter: new Set(), edgeFilter: new Set(), laneFocus: null };
    case 'select':
      return { ...state, selected: a.id, traceId: a.id === state.traceId ? state.traceId : null };
    case 'hover':
      return state.hovered === a.id ? state : { ...state, hovered: a.id };
    case 'trace':
      return { ...state, traceId: a.id };
    case 'laneFocus':
      return { ...state, laneFocus: a.lane };
    case 'setShowAllInterventionLinks':
      return { ...state, showAllInterventionLinks: a.value };
    case 'setOutline':
      return { ...state, outline: a.value };
    case 'setAbout':
      return { ...state, about: a.value };
    case 'tour':
      // leaving the walk-through clears its selection so no details window pops up afterwards
      return { ...state, tourStep: a.step, selected: a.step == null ? null : state.selected };
    case 'theme':
      return { ...state, theme: a.value };
    case 'focus':
      return { ...state, focusRequest: { id: a.id, nonce: ++nonce, zoom: a.zoom } };
    case 'fit':
      return { ...state, fitRequest: state.fitRequest + 1 };
    case 'restore':
      return { ...state, ...a.state };
  }
}

const Ctx = createContext<{ state: State; dispatch: Dispatch<Action> } | null>(null);

export function StoreProvider({ children, init }: { children: ReactNode; init: State }) {
  const [state, dispatch] = useReducer(reducer, init);
  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore outside provider');
  return v;
}
