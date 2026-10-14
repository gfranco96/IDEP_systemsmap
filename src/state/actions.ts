import type { Dispatch } from 'react';
import { graph as g } from '../data/loadData';
import { containersToReveal } from '../model/graph';
import type { Action, State } from './store';

/** All container ids (chains with chips, loops, cross-life systems). */
export const ALL_CONTAINERS: string[] = [
  ...g.stageChains.map((c) => c.id),
  ...g.data.loops.map((l) => l.id),
  ...g.systems.map((s) => s.id),
];

export function isContainer(id: string): boolean {
  const ch = g.chainById.get(id);
  if (ch) return ch.scope === 'stage';
  return g.loopById.has(id) || g.nodeById.get(id)?.type === 'system';
}

/** Containers that belong to a stage (chains + stage loop). */
export function containersInStage(stage: string): string[] {
  return [
    ...g.stageChains.filter((c) => c.stage === stage).map((c) => c.id),
    ...g.stageLoops.filter((l) => l.stage === stage).map((l) => l.id),
  ];
}

/** Make sure a node/chain is visible: expand containers and switch on the layer that holds it. */
export function reveal(id: string, state: State, dispatch: Dispatch<Action>) {
  const n = g.nodeById.get(id);
  const ch = g.chainById.get(id);
  const need = (layer: keyof State['layers']) => {
    if (!state.layers[layer]) dispatch({ type: 'setLayer', layer, value: true });
  };
  if (n?.type === 'intervention') need('interventions');
  if (n?.type === 'reference') need('references');
  if (n?.type === 'loop' || n?.type === 'loop_step') need('loops');
  if (n?.type === 'system' || (ch && ch.scope === 'cross') || (n?.chainId && g.chainById.get(n.chainId)?.scope === 'cross')) {
    need('crossLife');
    const cur = n?.current ?? ch?.primaryCurrent;
    if (cur === 'cultural') need('cultural');
  }
  const containers = containersToReveal(g, id);
  if (containers.length) dispatch({ type: 'expand', ids: containers });
}

/** Select + reveal + pan/zoom to an item (search results, outline, tour). */
export function goTo(id: string, state: State, dispatch: Dispatch<Action>, zoom?: number) {
  reveal(id, state, dispatch);
  dispatch({ type: 'select', id });
  dispatch({ type: 'focus', id, zoom });
}
