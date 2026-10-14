// §6.8 URL-hash state. Everything lives in memory + the hash; nothing is persisted elsewhere.
import { ARROW_TYPES, CURRENT_IDS, type ArrowType, type CurrentId } from '../model/types';
import { DEFAULT_LAYERS, type Layers } from '../model/graph';
import type { Graph } from '../model/graph';
import { initialState, type StageFilterKey, type State, type ZoomT } from './store';

const LAYER_KEYS = Object.keys(DEFAULT_LAYERS) as (keyof Layers)[];
const STAGES: StageFilterKey[] = ['childhood', 'adolescence', 'adulthood', 'cross'];

export function encodeHash(s: State, zoom: ZoomT | null): string {
  const p = new URLSearchParams();
  if (s.selected) p.set('sel', s.selected);
  if (s.expanded.size) p.set('exp', [...s.expanded].sort().join(','));
  const layers = LAYER_KEYS.filter((k) => s.layers[k]).join(',');
  p.set('layers', layers || '-');
  if (s.laneFilter.size) p.set('lanes', [...s.laneFilter].join(','));
  if (s.stageFilter.size) p.set('stages', [...s.stageFilter].join(','));
  if (s.edgeFilter.size) p.set('edges', [...s.edgeFilter].join(','));
  if (s.showAllInterventionLinks) p.set('intlinks', 'all');
  if (s.laneFocus) p.set('focus', s.laneFocus);
  if (s.traceId) p.set('trace', s.traceId);
  if (s.outline) p.set('view', 'outline');
  if (zoom) p.set('z', [zoom.x, zoom.y, zoom.k].map((v) => Math.round(v * 1000) / 1000).join(','));
  return '#' + p.toString();
}

export function decodeHash(hash: string, g: Graph): State | null {
  const raw = hash.replace(/^#/, '');
  if (!raw) return null;
  const p = new URLSearchParams(raw);
  const s: State = { ...initialState, about: false };
  const validId = (id: string) =>
    g.nodeById.has(id) || g.chainById.has(id) || g.loopById.has(id) || id.startsWith('edge:');
  const sel = p.get('sel');
  if (sel && validId(sel)) s.selected = sel;
  const exp = p.get('exp');
  if (exp) s.expanded = new Set(exp.split(',').filter(validId));
  const layers = p.get('layers');
  if (layers) {
    const on = new Set(layers.split(','));
    s.layers = Object.fromEntries(LAYER_KEYS.map((k) => [k, on.has(k)])) as unknown as Layers;
  }
  const lanes = p.get('lanes');
  if (lanes) s.laneFilter = new Set(lanes.split(',').filter((l): l is CurrentId => CURRENT_IDS.includes(l as CurrentId)));
  const stages = p.get('stages');
  if (stages) s.stageFilter = new Set(stages.split(',').filter((x): x is StageFilterKey => STAGES.includes(x as StageFilterKey)));
  const edges = p.get('edges');
  if (edges) s.edgeFilter = new Set(edges.split(',').filter((x): x is ArrowType => ARROW_TYPES.includes(x as ArrowType)));
  s.showAllInterventionLinks = p.get('intlinks') === 'all';
  const focus = p.get('focus');
  if (focus && CURRENT_IDS.includes(focus as CurrentId)) s.laneFocus = focus as CurrentId;
  const trace = p.get('trace');
  if (trace && validId(trace)) s.traceId = trace;
  s.outline = p.get('view') === 'outline';
  const z = p.get('z');
  if (z) {
    const [x, y, k] = z.split(',').map(Number);
    if ([x, y, k].every(Number.isFinite) && k > 0) s.initialZoom = { x, y, k };
  }
  return s;
}
