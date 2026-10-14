import { useEffect, useRef, useState } from 'react';
import { graph as g } from '../data/loadData';
import { ARROW_TYPES } from '../model/types';
import type { Layers } from '../model/graph';
import { useStore, type StageFilterKey } from '../state/store';
import { ALL_CONTAINERS } from '../state/actions';

export const APP_TITLE = 'Reward systems of intrinsic vs extrinsic joy: A chronological view';

const LAYER_LABELS: [keyof Layers, string][] = [
  ['cultural', 'Cultural overlay'],
  ['crossLife', 'Cross-life systems'],
  ['loops', 'Feedback loops'],
  ['interventions', 'Possible interventions'],
  ['inferred', 'Show inferred links'],
];

const STAGE_LABELS: [StageFilterKey, string][] = [
  ['childhood', 'Childhood'],
  ['adolescence', 'Adolescence'],
  ['adulthood', 'Adulthood'],
  ['cross', 'Cross-life'],
];

interface Props {
  onReset: () => void;
  onFit: () => void;
  onCopyLink: () => void;
  onExportPng: () => void;
  copied: boolean;
  exporting: boolean;
}

export function Toolbar({ onReset, onFit, onCopyLink, onExportPng, copied, exporting }: Props) {
  const { state, dispatch } = useStore();
  const [menu, setMenu] = useState(false);
  const [filters, setFilters] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const themeNext = state.theme === 'system' ? 'light' : state.theme === 'light' ? 'dark' : 'system';
  const activeFilterCount = state.laneFilter.size + state.stageFilter.size + state.edgeFilter.size;

  // close the menu on outside click / Escape
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: PointerEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setMenu(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false);
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [menu]);

  const run = (f: () => void) => () => {
    f();
    setMenu(false);
  };

  const filterPanel = (
    <div className="filters" role="group" aria-label="Layers and filters" data-testid="filters">
      <fieldset>
        <legend>Layers</legend>
        {LAYER_LABELS.map(([k, label]) => (
          <label key={k} className="check">
            <input type="checkbox" checked={state.layers[k]} onChange={(e) => dispatch({ type: 'setLayer', layer: k, value: e.target.checked })} />
            {label}
          </label>
        ))}
        <label className="check sub">
          <input
            type="checkbox"
            disabled={!state.layers.interventions}
            checked={state.showAllInterventionLinks}
            onChange={(e) => dispatch({ type: 'setShowAllInterventionLinks', value: e.target.checked })}
          />
          Show all intervention links
        </label>
      </fieldset>
      <fieldset>
        <legend>Lanes</legend>
        {g.data.meta.currents.map((c) => (
          <label key={c.id} className="check">
            <input type="checkbox" checked={state.laneFilter.has(c.id)} onChange={() => dispatch({ type: 'toggleLaneFilter', lane: c.id })} />
            <span className="swatch" style={{ background: c.color }} /> {c.label}
          </label>
        ))}
        <p className="fine">None checked = all lanes.</p>
      </fieldset>
      <fieldset>
        <legend>Stages</legend>
        {STAGE_LABELS.map(([k, label]) => (
          <label key={k} className="check">
            <input type="checkbox" checked={state.stageFilter.has(k)} onChange={() => dispatch({ type: 'toggleStageFilter', stage: k })} />
            {label}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>Arrow types</legend>
        {ARROW_TYPES.map((a) => (
          <label key={a} className="check">
            <input type="checkbox" checked={state.edgeFilter.has(a)} onChange={() => dispatch({ type: 'toggleEdgeFilter', arrow: a })} />
            {a}
          </label>
        ))}
      </fieldset>
      <button type="button" className="btn small" onClick={() => dispatch({ type: 'clearFilters' })}>
        Clear filters
      </button>
    </div>
  );

  return (
    <header className="toolbar">
      <h1 className="tb-title">{APP_TITLE}</h1>
      <div className="menu-wrap" ref={wrap}>
        <button type="button" className="btn menu-btn" aria-expanded={menu} aria-controls="tb-menu" onClick={() => setMenu(!menu)}>
          Menu
        </button>
        {menu && (
          <nav id="tb-menu" className="menu-col" aria-label="Menu" data-testid="menu">
            <button type="button" className="menu-item" onClick={run(() => dispatch({ type: 'setAbout', value: true }))}>
              About this map
            </button>
            <button type="button" className="menu-item" onClick={run(() => dispatch({ type: 'tour', step: 0 }))}>
              Walk through the map
            </button>
            <button
              type="button"
              className="menu-item"
              aria-pressed={state.outline}
              onClick={run(() => dispatch({ type: 'setOutline', value: !state.outline }))}
            >
              {state.outline ? 'Back to map view' : 'Outline view'}
            </button>
            <hr />
            <button type="button" className="menu-item" onClick={run(() => dispatch({ type: 'setExpanded', ids: ALL_CONTAINERS }))}>
              Expand all
            </button>
            <button type="button" className="menu-item" onClick={run(() => dispatch({ type: 'collapseAll' }))}>
              Collapse all
            </button>
            <button type="button" className="menu-item" onClick={run(onReset)}>
              Reset view
            </button>
            <button type="button" className="menu-item" onClick={run(onFit)}>
              Zoom to fit everything
            </button>
            <hr />
            <button type="button" className="menu-item" aria-expanded={filters} onClick={() => setFilters(!filters)}>
              Layers & filters{activeFilterCount ? ` (${activeFilterCount})` : ''} {filters ? '▴' : '▾'}
            </button>
            {filters && filterPanel}
            <hr />
            <button type="button" className="menu-item" onClick={onExportPng} disabled={exporting}>
              {exporting ? 'Exporting PNG…' : 'Export as PNG'}
            </button>
            <button type="button" className="menu-item" onClick={onCopyLink}>
              {copied ? 'Link copied' : 'Copy link to this view'}
            </button>
            <button type="button" className="menu-item" onClick={() => dispatch({ type: 'theme', value: themeNext })}>
              Theme: {state.theme} (switch to {themeNext})
            </button>
          </nav>
        )}
      </div>
    </header>
  );
}
