import { graph as g } from '../data/loadData';
import { ARROW_TYPES, type ArrowType } from '../model/types';

export function arrowCounts(): Record<ArrowType, number> {
  const c = Object.fromEntries(ARROW_TYPES.map((a) => [a, 0])) as Record<ArrowType, number>;
  for (const e of g.data.edges) c[e.arrowType]++;
  return c;
}

function ArrowSample({ t, inferred = false }: { t: ArrowType | 'inferred'; inferred?: boolean }) {
  const glyph = t === 'downward' ? '▼' : t === 'upward' ? '▲' : t === 'circular' ? '↻' : null;
  const d = t === 'circular' ? 'M6,18 Q34,-2 62,18' : 'M6,11 L62,11';
  return (
    <svg width={70} height={22} aria-hidden className={`legend-arrow arrow-${t}${inferred ? ' inferred' : ''}`}>
      <path
        className="edge-line"
        d={d}
        style={{ stroke: 'var(--edge-neutral)' }}
        markerEnd="url(#ah-neutral)"
        markerStart={t === 'bidirectional' ? 'url(#ah-neutral)' : undefined}
      />
      {glyph && (
        <g className="mid-marker" transform={`translate(34,${t === 'circular' ? 8 : 11})`}>
          <circle r={7} style={{ stroke: 'var(--edge-neutral)' }} />
          <text y={t === 'circular' ? 3.6 : 3} textAnchor="middle" fontSize={t === 'circular' ? 10 : 7.5}>
            {glyph}
          </text>
        </g>
      )}
      {inferred && (
        <g className="inferred-tick" transform="translate(34,11)">
          <circle r={5.5} />
          <text y={3} textAnchor="middle" fontSize={8} fontStyle="italic" fontWeight={700}>
            i
          </text>
        </g>
      )}
    </svg>
  );
}

export function Legend() {
  const counts = arrowCounts();
  return (
    <section className="legend" aria-label="Legend" data-testid="legend">
      <h3>Arrow types</h3>
      <ul className="legend-arrows">
        {g.data.meta.arrowTypes.map((a) => (
          <li key={a.id} data-arrow={a.id}>
            <ArrowSample t={a.id} />
            <div>
              <strong>{a.id}</strong>{' '}
              <span className="count" data-testid={`count-${a.id}`}>
                {counts[a.id] === 0 ? '0, supported but not used in this dataset' : `${counts[a.id]} links`}
              </span>
              <div className="muted">{a.meaning}</div>
            </div>
          </li>
        ))}
        <li>
          <ArrowSample t="forward" inferred />
          <div>
            <strong>inferred link</strong>{' '}
            <span className="count">{g.data.edges.filter((e) => e.provenance === 'inferred').length} links</span>
            <div className="muted">Reduced opacity + “i” tick: added to satisfy the map spec; not stated in the source.</div>
          </div>
        </li>
      </ul>
      <p className="fine">Edge colour = lane of the chain/loop; gray = outcome links, timeline and links without a lane. Colour never encodes valence (see ▲/▼ markers).</p>
      <h3>Lanes</h3>
      <ul className="legend-lanes">
        {g.data.meta.currents.map((c) => (
          <li key={c.id}>
            <span className={`swatch${c.role === 'overlay' ? ' hatch' : ''}`} style={{ background: c.role === 'overlay' ? undefined : c.color }} />
            {c.label}
            {c.role === 'overlay' && <span className="muted"> (overlay across all lanes)</span>}
          </li>
        ))}
      </ul>
      <h3>Shapes</h3>
      <ul className="legend-shapes">
        <li>
          <svg width={34} height={20} aria-hidden>
            <rect x={1} y={2} width={32} height={16} rx={5} className="lg-stage" />
          </svg>
          Stage / substage
        </li>
        <li>
          <svg width={34} height={20} aria-hidden>
            <rect x={1} y={2} width={32} height={16} rx={5} className="lg-chip" />
            <rect x={1} y={4} width={3} height={12} rx={1.5} className="lg-stripe" />
          </svg>
          Causal chain (click to expand into steps)
        </li>
        <li>
          <svg width={34} height={20} aria-hidden>
            <circle cx={17} cy={10} r={8.5} className="lg-loop" />
            <text x={17} y={14} textAnchor="middle" fontSize={11}>
              ↻
            </text>
          </svg>
          Feedback loop (click to open ring)
        </li>
        <li>
          <svg width={34} height={20} aria-hidden>
            <rect x={1} y={2} width={32} height={16} rx={5} className="lg-outcome" />
          </svg>
          Outcome · ▲ protective / ▼ constraining
        </li>
        <li>
          <svg width={34} height={20} aria-hidden>
            <rect x={1} y={2} width={32} height={16} rx={5} className="lg-int" />
          </svg>
          Possible intervention (none selected)
        </li>
        <li>
          <span className="badge-inline">double-edged</span> chain where the source names both outcomes
        </li>
        <li>
          <svg width={34} height={20} aria-hidden>
            <circle cx={10} cy={10} r={4.5} style={{ fill: 'var(--c-platform)' }} />
            <circle cx={22} cy={10} r={4.5} style={{ fill: 'var(--c-market)' }} />
          </svg>
          Secondary lanes of a chain
        </li>
      </ul>
    </section>
  );
}
