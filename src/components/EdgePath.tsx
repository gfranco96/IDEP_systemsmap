import { memo } from 'react';
import type { RoutedEdge } from '../layout/routeEdges';
import type { Emph } from '../state/derived';

const MID_GLYPH: Record<string, string | null> = {
  forward: null,
  downward: '▼',
  upward: '▲',
  circular: '↻',
  dashed: null,
  bidirectional: null,
};

interface Props {
  e: RoutedEdge;
  emph: Emph;
  selected: boolean;
  onHover: (e: RoutedEdge | null, ev?: React.MouseEvent) => void;
  onClick: (e: RoutedEdge) => void;
}

function EdgePathInner({ e, emph, selected, onHover, onClick }: Props) {
  const a = e.agg;
  const colorKey = e.color ?? 'neutral';
  const stroke = e.color ? `var(--c-${e.color})` : 'var(--edge-neutral)';
  const glyph = MID_GLYPH[a.arrowType];
  const count = a.members.length;
  // offset badges perpendicular to the tangent so they don't sit on the glyph
  const nx = -Math.sin(e.angle);
  const ny = Math.cos(e.angle);
  const iPos = { x: e.mid.x + nx * 14 + (glyph ? Math.cos(e.angle) * 14 : 0), y: e.mid.y + ny * 14 + (glyph ? Math.sin(e.angle) * 14 : 0) };
  const cPos = { x: e.mid.x - nx * 15, y: e.mid.y - ny * 15 };
  return (
    <g
      className={`edge arrow-${a.arrowType} emph-${emph}${a.inferred ? ' inferred' : ''}${selected ? ' selected' : ''}`}
      aria-hidden="true"
      data-key={e.key}
      data-arrow={a.arrowType}
      data-provenance={a.inferred ? 'inferred' : a.anyInferred ? 'mixed' : 'explicit'}
    >
      <path
        className="edge-hit"
        d={e.d}
        onMouseEnter={(ev) => onHover(e, ev)}
        onMouseLeave={() => onHover(null)}
        onClick={(ev) => {
          ev.stopPropagation();
          onClick(e);
        }}
      />
      <path
        className="edge-line"
        d={e.d}
        style={{ stroke }}
        markerEnd={`url(#ah-${colorKey})`}
        markerStart={a.arrowType === 'bidirectional' ? `url(#ah-${colorKey})` : undefined}
      />
      {glyph && (
        <g className="mid-marker" transform={`translate(${e.mid.x},${e.mid.y})`}>
          <circle r={7.5} style={{ stroke }} />
          <text y={a.arrowType === 'circular' ? 3.6 : 3.2} textAnchor="middle" fontSize={a.arrowType === 'circular' ? 10.5 : 8}>
            {glyph}
          </text>
        </g>
      )}
      {a.anyInferred && (
        <g className="inferred-tick" transform={`translate(${iPos.x},${iPos.y})`}>
          <circle r={5.5} />
          <text y={3} textAnchor="middle" fontSize={8} fontStyle="italic" fontWeight={700}>
            i
          </text>
        </g>
      )}
      {count > 1 && (
        <g className="count-badge" transform={`translate(${cPos.x},${cPos.y})`}>
          <rect x={-11} y={-7} width={22} height={14} rx={7} />
          <text y={3.5} textAnchor="middle" fontSize={9} fontWeight={700}>
            ×{count}
          </text>
        </g>
      )}
    </g>
  );
}

export const EdgePath = memo(EdgePathInner);

export const MARKER_KEYS = ['education', 'family', 'market', 'platform', 'cultural', 'neutral'] as const;

export function EdgeMarkers() {
  return (
    <defs>
      {MARKER_KEYS.map((k) => (
        <marker
          key={k}
          id={`ah-${k}`}
          viewBox="0 0 10 10"
          refX={9}
          refY={5}
          markerWidth={7}
          markerHeight={7}
          markerUnits="userSpaceOnUse"
          orient="auto-start-reverse"
        >
          <path d="M0,0.5 L10,5 L0,9.5 z" style={{ fill: k === 'neutral' ? 'var(--edge-neutral)' : `var(--c-${k})` }} />
        </marker>
      ))}
      <pattern id="hatch-cultural" patternUnits="userSpaceOnUse" width={14} height={14} patternTransform="rotate(45)">
        <rect width={14} height={14} style={{ fill: 'var(--overlay-fill)' }} />
        <line x1={0} y1={0} x2={0} y2={14} style={{ stroke: 'var(--c-cultural)', strokeOpacity: 'var(--hatch-opacity)' as never }} strokeWidth={3} />
      </pattern>
    </defs>
  );
}
