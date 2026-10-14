import { L, type Layout } from '../layout/computeLayout';
import type { CurrentId } from '../model/types';
import { Texts } from './NodeShape';

/** Background structure: stage columns, lanes, bottom bands, outcomes column. */
export function Backdrop({ layout, laneFocus }: { layout: Layout; laneFocus: CurrentId | null }) {
  const laneBands = layout.bands.filter((b) => b.kind === 'laneStage' || b.kind === 'laneCross');
  const lanesBottom = Math.max(...laneBands.map((b) => b.y + b.h), L.lanesTop);
  return (
    <g className="backdrop">
      {/* lane backgrounds */}
      {laneBands.map((b) => (
        <rect
          key={b.id}
          className={`lane-bg ${b.kind}${laneFocus && laneFocus !== b.current ? ' lane-dim' : ''}`}
          x={b.x}
          y={b.y}
          width={b.w}
          height={b.h}
          style={{ fill: `var(--t-${b.current})` }}
        />
      ))}
      {/* stage column dividers */}
      {layout.stageBands.slice(1).map((sb) => (
        <line key={sb.stage} className="stage-divider" x1={sb.x} x2={sb.x} y1={L.stageRowY} y2={lanesBottom} />
      ))}
      {/* other bands */}
      {layout.bands
        .filter((b) => b.kind === 'mainLoops' || b.kind === 'interventions' || b.kind === 'outcomes')
        .map((b) => (
          <g key={b.id} className={`band band-${b.kind}`} data-testid={`band-${b.kind}`}>
            {b.w > 0 && <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={10} />}
            {b.label && (
              <g transform={`translate(${b.x},${b.y})`}>
                <Texts blocks={[b.label, ...(b.sublabel ? [b.sublabel] : [])]} />
              </g>
            )}
          </g>
        ))}
    </g>
  );
}

/** The cultural moral system: a translucent hatched overlay above lane backgrounds, below content. */
export function CulturalOverlay({ layout }: { layout: Layout }) {
  const b = layout.bands.find((x) => x.kind === 'overlay');
  if (!b) return null;
  return (
    <rect
      className="cultural-overlay"
      x={b.x}
      y={b.y}
      width={b.w}
      height={b.h}
      fill="url(#hatch-cultural)"
      aria-hidden
      data-testid="cultural-overlay"
    />
  );
}

export function LaneLabels({
  layout,
  laneFocus,
  onLane,
}: {
  layout: Layout;
  laneFocus: CurrentId | null;
  onLane: (c: CurrentId) => void;
}) {
  return (
    <g className="lane-labels">
      {layout.laneLabels.map((l) => (
        <g
          key={l.current}
          className={`lane-label${laneFocus === l.current ? ' active' : ''}${l.current === 'cultural' ? ' overlay' : ''}`}
          transform={`translate(${l.x},${l.y})`}
          role="button"
          tabIndex={0}
          aria-pressed={laneFocus === l.current}
          aria-label={`Focus lane: ${l.block.lines.map((x) => x.text).join(' ')}`}
          onClick={(e) => {
            e.stopPropagation();
            onLane(l.current);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onLane(l.current);
            }
          }}
        >
          <rect className="lane-label-bg" width={l.w} height={l.h} rx={8} />
          <rect className="lane-swatch" x={4} y={8} width={6} height={l.h - 16} rx={3} style={{ fill: `var(--c-${l.current})` }} />
          <rect className="focus-ring" x={-3} y={-3} width={l.w + 6} height={l.h + 6} rx={10} />
          <Texts blocks={[l.block, ...(l.sub ? [l.sub] : [])]} />
          <text className="t-sec t-marker lane-hint" x={16} y={l.h - 12} fontSize={9.5}>
            {laneFocus === l.current ? 'click to clear focus' : 'click to focus lane'}
          </text>
        </g>
      ))}
    </g>
  );
}
