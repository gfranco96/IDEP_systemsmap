import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildGraph, DEFAULT_LAYERS, type Layers, type ViewState } from '../../src/model/graph';
import type { MapData } from '../../src/model/types';

const dir = join(__dirname, '..', '..', 'data');
const load = (f: string) => JSON.parse(readFileSync(join(dir, f), 'utf8'));

export function loadData(): MapData {
  return {
    meta: load('meta.json'),
    nodes: load('nodes.json'),
    edges: load('edges.json'),
    chains: load('chains.json'),
    loops: load('loops.json'),
    references: load('references.json'),
  };
}

export const data = loadData();
export const g = buildGraph(data);

export const ALL_CONTAINERS = [
  ...g.stageChains.map((c) => c.id),
  ...g.data.loops.map((l) => l.id),
  ...g.systems.map((s) => s.id),
];

export function view(expanded: string[] = [], layers: Partial<Layers> = {}): ViewState {
  return { expanded: new Set(expanded), layers: { ...DEFAULT_LAYERS, ...layers } };
}
