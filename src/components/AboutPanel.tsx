import { useEffect, useRef } from 'react';
import { graph as g } from '../data/loadData';
import { useStore } from '../state/store';
import { domainOf } from './DetailPanel';

export function AboutPanel() {
  const { state, dispatch } = useStore();
  const ref = useRef<HTMLDivElement>(null);
  const m = g.data.meta;
  useEffect(() => {
    if (state.about) ref.current?.focus();
  }, [state.about]);
  if (!state.about) return null;
  const close = () => dispatch({ type: 'setAbout', value: false });
  const metaRefs = g.data.references.filter((r) => r.usedBy.includes('meta'));
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
        <h4>Design framing</h4>
        <p>{m.designFraming}</p>
        <p className="callout neutral">{m.designFramingNote}</p>
        <h4>Reading notes</h4>
        <ul>
          {m.caveats.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
        <h4>How arrows were assigned</h4>
        <p>{m.arrowAssignmentRule}</p>
        <h4>Link provenance</h4>
        <dl className="kv">
          {m.provenanceTypes.map((p) => (
            <div key={p.id}>
              <dt>{p.id}</dt>
              <dd>{p.meaning}</dd>
            </div>
          ))}
        </dl>
        {metaRefs.length > 0 && (
          <>
            <h4>Evidence links</h4>
            <ul className="evidence">
              {metaRefs.map((r) => (
                <li key={r.id}>
                  <a href={r.url} target="_blank" rel="noopener noreferrer">
                    {domainOf(r.url)}
                  </a>
                  <div className="muted">{r.supports}</div>
                </li>
              ))}
            </ul>
            <p className="fine">Link text shows the domain only; bibliographic metadata has not been independently verified.</p>
          </>
        )}
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
