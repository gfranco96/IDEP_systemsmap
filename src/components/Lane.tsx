import { L, type Layout } from '../layout/computeLayout';
import type { CurrentId } from '../model/types';
import { Texts } from './NodeShape';

/** Background structure: stage columns, lanes, bottom bands, outcomes column. */
export function Backdrop({ layout, laneFocus }: { layout: Layout; laneFocus: CurrentId | null }) {
  const laneBands = layout.bands.filter((b) => b.kind === 'laneStage' || b.kind === 'laneCross');
  const lanesBottom = Math.max(...laneBands.map((b) => b.y + b.h), layout.lanesTop);
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
        <line
          key={sb.stage}
          className="stage-divider"
          x1={sb.x}
          x2={sb.x}
          y1={L.stageRowY}
          y2={lanesBottom}
          vectorEffect="non-scaling-stroke"
          data-testid="stage-divider"
        />
      ))}
      {/* expanded cross-life systems: a box spanning every stage, covering the stage dividers */}
      {layout.houses.map((h) => (
        <rect
          key={h.id}
          className="system-house"
          data-testid={`house-${h.id}`}
          x={h.x}
          y={h.y}
          width={h.w}
          height={h.h}
          rx={10}
          style={{ stroke: `var(--c-${h.current})`, fill: `color-mix(in srgb, var(--c-${h.current}) 9%, var(--surface))` }}
        />
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
      {layout.laneLabels.map((l) => {
        const text = l.block.lines.map((x) => x.text).join(' ');
        const interactive = !!l.current;
        const activate = () => l.current && onLane(l.current);
        return (
          <g
            key={l.id}
            data-current={l.current}
            className={`lane-label${laneFocus && laneFocus === l.current ? ' active' : ''}${l.current === 'cultural' ? ' overlay' : ''}${interactive ? '' : ' static'}`}
            transform={`translate(${l.x},${l.y})`}
            role={interactive ? 'button' : undefined}
            tabIndex={interactive ? 0 : undefined}
            aria-pressed={interactive ? laneFocus === l.current : undefined}
            aria-label={interactive ? `Focus lane: ${text}` : text}
            onClick={(e) => {
              if (!interactive) return;
              e.stopPropagation();
              activate();
            }}
            onKeyDown={(e) => {
              if (interactive && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                activate();
              }
            }}
          >
            {interactive && <title>{`${text} — click to ${laneFocus === l.current ? 'clear focus' : 'focus this lane'}`}</title>}
            <rect className="lane-label-bg" width={l.w} height={l.h} rx={6} />
            {l.current && <rect className="lane-swatch" x={3} y={6} width={4} height={l.h - 12} rx={2} style={{ fill: `var(--c-${l.current})` }} />}
            <rect className="focus-ring" x={-3} y={-3} width={l.w + 6} height={l.h + 6} rx={8} />
            <g transform={`translate(${l.w / 2 + 2},${l.h / 2}) rotate(-90)`}>
              <Texts blocks={[l.block]} />
            </g>
          </g>
        );
      })}
    </g>
  );
}
