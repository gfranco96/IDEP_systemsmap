export type CurrentId = 'education' | 'family' | 'market' | 'platform' | 'cultural';
export type NodeType =
  | 'stage'
  | 'substage'
  | 'outcome'
  | 'system'
  | 'factor'
  | 'loop_step'
  | 'loop'
  | 'reference'
  | 'intervention';
export type ArrowType = 'forward' | 'downward' | 'upward' | 'circular' | 'dashed' | 'bidirectional';
export type Valence = 'protective' | 'constraining' | 'ambivalent' | 'reinforcing' | 'neutral';
export type Provenance = 'explicit' | 'inferred';

export const CURRENT_IDS: CurrentId[] = ['education', 'family', 'market', 'platform', 'cultural'];
export const NODE_TYPES: NodeType[] = [
  'stage',
  'substage',
  'outcome',
  'system',
  'factor',
  'loop_step',
  'loop',
  'reference',
  'intervention',
];
export const ARROW_TYPES: ArrowType[] = ['forward', 'downward', 'upward', 'circular', 'dashed', 'bidirectional'];
export const VALENCES: Valence[] = ['protective', 'constraining', 'ambivalent', 'reinforcing', 'neutral'];
export const PROVENANCES: Provenance[] = ['explicit', 'inferred'];

export type StageKey = 'childhood' | 'adolescence' | 'adulthood';
export const STAGE_KEYS: StageKey[] = ['childhood', 'adolescence', 'adulthood'];

export interface MapNode {
  id: string;
  type: NodeType;
  label: string;
  description?: string;
  stage?: 'childhood' | 'adolescence' | 'adulthood' | 'cross' | 'outcome' | 'reference' | 'intervention';
  current?: CurrentId | null;
  secondaryCurrents?: CurrentId[];
  parent?: string;
  chainId?: string;
  loopId?: string;
  layout?: { col?: number; row?: number; order?: number };
  order?: number;
  sourceSection: string;
  tagline?: string;
  ageRangeLabel?: string;
  mainTransition?: string;
  ageStart?: number;
  ageEnd?: number | null;
  centralJoyMode?: string;
  rewardSystemShift?: string;
  leadsTo?: string[];
  fedBy?: string[];
  polarity?: 'protective' | 'constraining';
  effect?: string;
  interventionType?: string;
  selected?: boolean;
  country?: string;
  role?: string;
  alsoLeadsTo?: string[];
  connectionTypes?: string[];
  caution?: string;
  datapoints?: { label: string; value: number; scale: string }[];
  evidenceIds?: string[];
  anchor?: { stage: string; currents: CurrentId[] };
}

export interface MapEdge {
  id: string;
  source: string;
  target: string;
  arrowType: ArrowType;
  valence: Valence;
  connectionTypes: string[];
  provenance: Provenance;
  chainId: string | null;
  loopId: string | null;
  relation?: 'interrupts' | 'reinforces' | 'redefines';
  loopClosure?: boolean;
  note?: string;
}

export interface Chain {
  id: string;
  title: string;
  scope: 'stage' | 'cross';
  stage: string | null;
  system: string | null;
  primaryCurrent: CurrentId;
  secondaryCurrents: CurrentId[];
  order: number;
  connectionTypes: string[];
  summary: string;
  defaultArrowType: ArrowType;
  defaultValence: Valence;
  stepNodeIds: string[];
  edgeIds: string[];
  outcomeEdgeIds: string[];
  sourceSection: string;
  framingNote?: string;
  designImplication?: string;
  evidenceIds?: string[];
}

export interface Loop {
  id: string;
  title: string;
  scope: 'stage' | 'main';
  stage: string | null;
  primaryCurrent: CurrentId | null;
  hubNodeId: string;
  loopType: string;
  valence: Valence;
  stepNodeIds: string[];
  edgeIds: string[];
  outcomeEdgeIds: string[];
  sourceSection: string;
  notes?: string[];
  interventionOpportunities?: string[];
  evidenceAnchor?: string;
  evidenceIds?: string[];
  designQuestion?: string;
}

export interface Reference {
  id: string;
  url: string;
  supports: string;
  usedBy: string[];
}

export interface Current {
  id: CurrentId;
  label: string;
  role: 'current' | 'overlay';
  order: number;
  color: string;
  systemNodeId: string;
  description?: string;
}

export interface Meta {
  title: string;
  subtitle: string;
  centralUser: string;
  centralUserNote: string;
  approach: string;
  thesis: string;
  centralVisualClaim: string;
  designFraming: string;
  designFramingNote: string;
  caveats: string[];
  currents: Current[];
  stages: string[];
  arrowTypes: { id: ArrowType; meaning: string }[];
  valences: { id: Valence; meaning: string }[];
  provenanceTypes: { id: Provenance; meaning: string }[];
  arrowAssignmentRule: string;
  counts: {
    nodes: number;
    edges: number;
    chains: number;
    loops: number;
    references: number;
    nodesByType: Record<string, number>;
    edgesByArrowType: Record<string, number>;
    edgesByProvenance: Record<string, number>;
    stageChains: number;
    crossChains: number;
  };
}

export interface MapData {
  meta: Meta;
  nodes: MapNode[];
  edges: MapEdge[];
  chains: Chain[];
  loops: Loop[];
  references: Reference[];
}
