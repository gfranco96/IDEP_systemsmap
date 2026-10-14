import type { Layout } from '../layout/computeLayout';
import type { CurrentId } from '../model/types';
import { Texts } from './NodeShape';

/** Background structure: banner, stage columns, lanes, cultural overlay, bottom bands. */
export function Backdrop({ layout, laneFocus }: { layout: Layout; laneFocus: CurrentId | null }) {
  const lanesTop = 350;
  const laneBands = layout.bands.filter((b) => b.kind === 'laneStage' || b.kind === 'laneCross');
  const lanesBottom = Math.max(...laneBands.map((b) => b.y + b.h), lanesTop);
  return (
    <g className="backdrop">
      {/* banner */}
      <g className="banner">
        {[
          ['claim-box', layout.banner.claimBox],
          ['framing-box', layout.banner.framingBox],
        ].map(([cls, b]) => {
          const r = b as { x: number; y: number; w: number; h: number };
          return <rect key={cls as string} className={cls as string} x={r.x} y={r.y} width={r.w} height={r.h} rx={8} />;
        })}
        <Texts blocks={layout.banner.blocks} />
      </g>
      {/* lane backgrounds */}
      {layout.bands
        .filter((b) => b.kind === 'laneStage' || b.kind === 'laneCross')
        .map((b) => (
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
        <line key={sb.stage} className="stage-divider" x1={sb.x} x2={sb.x} y1={140} y2={lanesBottom} />
      ))}
      {/* other bands */}
      {layout.bands
        .filter((b) => b.kind === 'mainLoops' || b.kind === 'references' || b.kind === 'interventions')
        .map((b) => (
          <g key={b.id} className={`band band-${b.kind}`}>
            {b.w > 0 && <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={10} />}
            {b.label && (
              <g transform={`translate(${b.x},${b.y})`}>
                <Texts blocks={[b.label]} />
              </g>
            )}
          </g>
        ))}
      {/* leader lines for comparative references (not graph edges) */}
      {layout.leaders.map((l) => (
        <line key={l.id} className="leader" x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} aria-hidden />
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
