import { forwardRef, useState } from 'react';
import { graph as g } from '../data/loadData';
import { ARROW_TYPES } from '../model/types';
import type { Layers } from '../model/graph';
import { useStore, type StageFilterKey } from '../state/store';
import { ALL_CONTAINERS } from '../state/actions';
import { SearchBox } from './SearchBox';

const LAYER_LABELS: [keyof Layers, string][] = [
  ['cultural', 'Cultural overlay'],
  ['crossLife', 'Cross-life systems'],
  ['loops', 'Feedback loops'],
  ['references', 'International references'],
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
  onCopyLink: () => void;
  copied: boolean;
}

export const Toolbar = forwardRef<HTMLInputElement, Props>(function Toolbar({ onReset, onCopyLink, copied }, searchRef) {
  const { state, dispatch } = useStore();
  const [menu, setMenu] = useState(false);
  const [filters, setFilters] = useState(false);
  const themeNext = state.theme === 'system' ? 'light' : state.theme === 'light' ? 'dark' : 'system';
  const activeFilterCount = state.laneFilter.size + state.stageFilter.size + state.edgeFilter.size;

  const filterPanel = (
    <div className="filters" role="group" aria-label="Layers and filters" data-testid="filters">
      <fieldset>
        <legend>Layers</legend>
        {LAYER_LABELS.map(([k, label]) => (
          <label key={k} className="check">
            <input
              type="checkbox"
              checked={state.layers[k]}
              onChange={(e) => dispatch({ type: 'setLayer', layer: k, value: e.target.checked })}
            />
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

  const actions = (
    <div className="tb-actions">
      <button type="button" className="btn" onClick={() => dispatch({ type: 'setAbout', value: true })}>
        About
      </button>
      <button type="button" className="btn" onClick={() => dispatch({ type: 'tour', step: 0 })}>
        Walk through
      </button>
      <button
        type="button"
        className={`btn${state.outline ? ' active' : ''}`}
        aria-pressed={state.outline}
        onClick={() => dispatch({ type: 'setOutline', value: !state.outline })}
      >
        Outline view
      </button>
      <button type="button" className={`btn${state.legend ? ' active' : ''}`} aria-pressed={state.legend} onClick={() => dispatch({ type: 'setLegend', value: !state.legend })}>
        Legend
      </button>
      <span className="tb-sep" />
      <button type="button" className="btn" onClick={() => dispatch({ type: 'setExpanded', ids: ALL_CONTAINERS })}>
        Expand all
      </button>
      <button type="button" className="btn" onClick={() => dispatch({ type: 'collapseAll' })}>
        Collapse all
      </button>
      <button type="button" className="btn" onClick={onReset}>
        Reset view
      </button>
      <div className="filter-wrap">
        <button
          type="button"
          className={`btn${filters ? ' active' : ''}`}
          aria-expanded={filters}
          onClick={() => setFilters(!filters)}
        >
          Layers & filters{activeFilterCount ? ` (${activeFilterCount})` : ''}
        </button>
        {filters && filterPanel}
      </div>
      <button type="button" className="btn" onClick={onCopyLink} title="Copy link to this view">
        {copied ? 'Link copied' : 'Copy link'}
      </button>
      <button
        type="button"
        className="btn"
        aria-label={`Theme: ${state.theme}. Switch to ${themeNext}`}
        onClick={() => dispatch({ type: 'theme', value: themeNext })}
      >
        <span aria-hidden>{state.theme === 'dark' ? '☾' : state.theme === 'light' ? '☀' : '◐'}</span> Theme
      </button>
    </div>
  );

  return (
    <header className="toolbar">
      <div className="tb-title">
        <h1>{g.data.meta.title}</h1>
      </div>
      <SearchBox ref={searchRef} onDone={() => setMenu(false)} />
      <button type="button" className="btn menu-btn" aria-expanded={menu} aria-controls="tb-menu" onClick={() => setMenu(!menu)}>
        Menu
      </button>
      <div id="tb-menu" className={`tb-menu${menu ? ' open' : ''}`}>
        {actions}
      </div>
    </header>
  );
});
