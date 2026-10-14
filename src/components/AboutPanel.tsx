import { useEffect, useRef } from 'react';
import { graph as g, sources } from '../data/loadData';
import { useStore } from '../state/store';

const PROV_LABEL: Record<string, string> = { explicit: 'Explicit', inferred: 'Inferred' };

/** Renders *italic* spans in a citation; all other text is shown verbatim. */
function Citation({ text }: { text: string }) {
  const parts = text.split(/\*([^*]+)\*/g);
  return <>{parts.map((p, i) => (i % 2 ? <em key={i}>{p}</em> : <span key={i}>{p}</span>))}</>;
}

export function AboutPanel() {
  const { state, dispatch } = useStore();
  const ref = useRef<HTMLDivElement>(null);
  const m = g.data.meta;
  useEffect(() => {
    if (state.about) ref.current?.focus();
  }, [state.about]);
  if (!state.about) return null;
  const close = () => dispatch({ type: 'setAbout', value: false });
  return (
    <div className="modal-backdrop" onClick={close}>
      <div
        className="modal about"
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-title"
        tabIndex={-1}
        ref={ref}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === 'Escape' && close()}
        data-testid="about-panel"
      >
        <header>
          <h2 id="about-title">About this map</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={close}>
            ×
          </button>
        </header>
        <h3>{m.title}</h3>
        <p className="muted">{m.subtitle}</p>
        <h4>Framing of the map</h4>
        <p>{m.centralUserNote}</p>
        <h4>Approach</h4>
        <p>{m.approach}</p>
        <h4>Thesis</h4>
        <p>{m.thesis}</p>
        <h4>Relationship branch definition</h4>
        <dl className="kv">
          {m.provenanceTypes.map((p) => (
            <div key={p.id}>
              <dt>{PROV_LABEL[p.id] ?? p.id}</dt>
              <dd>{p.meaning}</dd>
            </div>
          ))}
        </dl>
        <h4>Sources</h4>
        <ol className="sources" data-testid="sources">
          {sources.map((s) => (
            <li key={s.n} value={s.n}>
              <Citation text={s.citation} />
              {s.url && (
                <>
                  {' '}
                  <a href={s.url} target="_blank" rel="noopener noreferrer">
                    {s.url}
                  </a>
                </>
              )}
            </li>
          ))}
        </ol>
        <div className="modal-actions">
          <button type="button" className="btn primary" onClick={close}>
            Explore the map
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              close();
              dispatch({ type: 'tour', step: 0 });
            }}
          >
            Walk through the map
          </button>
        </div>
      </div>
    </div>
  );
}
