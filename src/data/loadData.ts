// The JSON in /data is the single source of truth. It is imported as-is and never modified.
import metaJson from '../../data/meta.json';
import nodesJson from '../../data/nodes.json';
import edgesJson from '../../data/edges.json';
import chainsJson from '../../data/chains.json';
import loopsJson from '../../data/loops.json';
import referencesJson from '../../data/references.json';
import sourcesJson from '../../data/sources.json';
import type { Chain, Loop, MapData, MapEdge, MapNode, Meta, Reference } from '../model/types';
import { buildGraph, type Graph } from '../model/graph';
import { validateData } from './validate';

export const rawData: MapData = {
  meta: metaJson as unknown as Meta,
  nodes: nodesJson as unknown as MapNode[],
  edges: edgesJson as unknown as MapEdge[],
  chains: chainsJson as unknown as Chain[],
  loops: loopsJson as unknown as Loop[],
  references: referencesJson as unknown as Reference[],
};

export const validationErrors = validateData(rawData);
if (validationErrors.length) {
  console.error('Data validation failed:\n' + validationErrors.join('\n'));
}

export const graph: Graph = buildGraph(rawData);

/** Sources listed in the About panel (data/sources.json), shown exactly as supplied by the map author. */
export interface Source {
  n: number;
  citation: string;
  url: string | null;
}
export const sources = sourcesJson as Source[];

/** Address of the deployed interactive map (used for the QR code on exported PNGs). */
export const LIVE_URL = 'https://gfranco96.github.io/IDEP_systemsmap/';
