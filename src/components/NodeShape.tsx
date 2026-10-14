import { memo } from 'react';
import type { LNode, TextBlock, Pill } from '../layout/computeLayout';
import type { Emph } from '../state/derived';
import { graph as g } from '../data/loadData';

export function Texts({ blocks }: { blocks: TextBlock[] }) {
  return (
    <>
      {blocks.map((b, bi) =>
        b.lines.map((l, li) => (
          <text
            key={`${bi}-${li}`}
            x={l.x}
            y={l.y}
            className={b.cls}
            fontSize={b.size}
            fontWeight={b.bold ? 700 : 400}
            fontStyle={b.italic ? 'italic' : undefined}
            textAnchor={b.anchor === 'middle' ? 'middle' : 'start'}
            data-maxw={b.maxWidth}
          >
            {l.text}
          </text>
        )),
      )}
    </>
  );
}

function Pills({ pills, cls }: { pills: Pill[]; cls: string }) {
  return (
    <>
      {pills.map((p, i) => (
        <g key={i} className={cls}>
          <rect x={p.x} y={p.y} width={p.w} height={p.h} rx={p.h / 2} />
          <text
            x={p.x + p.w / 2}
            y={p.y + p.h / 2 + (cls === 'badge' ? 3.2 : 3.8)}
            textAnchor="middle"
            fontSize={cls === 'badge' ? 9 : 9.5}
            fontWeight={cls === 'badge' ? 700 : 400}
            data-maxw={p.w}
          >
            {p.text}
          </text>
        </g>
      ))}
    </>
  );
}

const colorVar = (c: string | null) => (c ? `var(--c-${c})` : 'var(--neutral)');
const tintVar = (c: string | null) => (c ? `var(--t-${c})` : 'var(--surface)');

interface Props {
  n: LNode;
  emph: Emph;
  selected: boolean;
  onActivate: (n: LNode, ev: React.MouseEvent | React.KeyboardEvent) => void;
  onDouble: (n: LNode) => void;
  onHover: (n: LNode | null) => void;
  onFocusNode: (n: LNode) => void;
  onKey: (n: LNode, ev: React.KeyboardEvent) => void;
}

const TYPE_LABEL: Record<string, string> = {
  stage: 'stage',
  substage: 'substage',
  chip: 'causal chain (collapsed)',
  chainHeader: 'causal chain (expanded)',
  factor: 'chain step',
  loop: 'feedback loop',
  loop_step: 'loop step',
  system: 'cross-life system',
  outcome: 'outcome',
  reference: 'comparative reference',
  intervention: 'possible intervention',
};

export function ariaLabelFor(n: LNode): string {
  let s = `${n.full}, ${TYPE_LABEL[n.kind]}`;
  if (n.kind === 'chip' || n.kind === 'loop' || n.kind === 'system' || n.kind === 'chainHeader')
    s += n.expanded ? ', expanded' : ', collapsed';
  if (n.kind === 'outcome') s += `, ${g.nodeById.get(n.id)?.polarity ?? ''}`;
  return s;
}

function NodeShapeInner({ n, emph, selected, onActivate, onDouble, onHover, onFocusNode, onKey }: Props) {
  const stroke = colorVar(n.current);
  const fill = tintVar(n.current);
  const body = (() => {
    switch (n.kind) {
      case 'stage':
        return <rect className="shape" width={n.w} height={n.h} rx={12} />;
      case 'substage':
        return <rect className="shape" width={n.w} height={n.h} rx={10} />;
      case 'chip':
        return (
          <>
            <rect className="shape" width={n.w} height={n.h} rx={10} style={{ fill, stroke }} />
            <rect className="stripe" width={5} height={n.h - 12} x={0} y={6} rx={2.5} style={{ fill: stroke }} />
            {n.secondary.map((c, i) => (
              <circle
                key={c}
                className="sec-dot"
                cx={n.w - 14 - i * 12 - ((n.pills?.length ?? 0) ? (n.pills![0].w + 4) : 0)}
                cy={13}
                r={4.5}
                style={{ fill: colorVar(c) }}
              >
                <title>{`Also involves: ${g.currentById.get(c)?.label}`}</title>
              </circle>
            ))}
          </>
        );
      case 'chainHeader': {
        const isStage = g.chainById.get(n.id)?.scope === 'stage';
        return (
          <>
            <rect className="hit" x={0} y={-24} width={n.w} height={44} />
            <line className="header-rule" x1={0} x2={n.w} y1={n.h} y2={n.h} style={{ stroke }} />
            {isStage && (
              <g className="collapse-btn">
                <rect x={0} y={1} width={20} height={18} rx={4} style={{ stroke }} />
                <text x={10} y={14.5} textAnchor="middle" fontSize={14} fontWeight={700}>
                  −
                </text>
              </g>
            )}
            {n.secondary.map((c, i) => (
              <circle key={c} className="sec-dot" cx={n.w - 8 - i * 12 - ((n.pills?.length ?? 0) ? n.pills![0].w + 4 : 0)} cy={10} r={4.5} style={{ fill: colorVar(c) }} />
            ))}
          </>
        );
      }
      case 'factor':
        return <rect className="shape" width={n.w} height={n.h} rx={8} style={{ stroke }} />;
      case 'loop_step':
        return <rect className="shape" width={n.w} height={n.h} rx={18} style={{ stroke }} />;
      case 'loop':
        return (
          <>
            <rect className="hit" width={n.w} height={n.h} />
            <circle className="shape" cx={n.w / 2} cy={48} r={48} style={{ stroke, fill: n.current ? fill : undefined }} />
            <text className="loop-icon" x={n.w / 2} y={50} textAnchor="middle" fontSize={30} aria-hidden>
              ↻
            </text>
          </>
        );
      case 'system':
        return (
          <>
            <rect className="shape" width={n.w} height={n.h} rx={8} style={{ fill, stroke }} />
            <text className="chev" x={14} y={27} fontSize={13} aria-hidden>
              {n.expanded ? '▾' : '▸'}
            </text>
          </>
        );
      case 'outcome': {
        const i = 18;
        const pts = `${i},0 ${n.w - i},0 ${n.w},${n.h / 2} ${n.w - i},${n.h} ${i},${n.h} 0,${n.h / 2}`;
        const pol = g.nodeById.get(n.id)?.polarity;
        return <polygon className={`shape pol-${pol}`} points={pts} />;
      }
      case 'reference':
        return (
          <>
            <rect className="shape" width={n.w} height={n.h} rx={8} />
            <g className="globe" transform="translate(12,5)" aria-hidden>
              <circle cx={7} cy={7} r={6.5} />
              <ellipse cx={7} cy={7} rx={3} ry={6.5} />
              <line x1={0.5} x2={13.5} y1={7} y2={7} />
            </g>
          </>
        );
      case 'intervention':
        return <rect className="shape" width={n.w} height={n.h} rx={8} />;
    }
  })();

  return (
    <g
      className={`node kind-${n.kind} emph-${emph}${selected ? ' selected' : ''}`}
      transform={`translate(${n.x},${n.y})`}
      style={{ transform: `translate(${n.x}px, ${n.y}px)` }}
      role="button"
      tabIndex={0}
      aria-label={ariaLabelFor(n)}
      aria-expanded={n.expanded === undefined ? undefined : n.expanded}
      aria-pressed={selected}
      data-id={n.id}
      onClick={(e) => {
        e.stopPropagation();
        onActivate(n, e);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDouble(n);
      }}
      onMouseEnter={() => onHover(n)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onFocusNode(n)}
      onKeyDown={(e) => onKey(n, e)}
    >
      {/* invisible ≥44px hit area for small nodes */}
      {n.h < 44 && n.kind !== 'chainHeader' && <rect className="hit" x={0} y={(n.h - 44) / 2} width={n.w} height={44} />}
      {body}
      <rect className="focus-ring" x={-5} y={-5} width={n.w + 10} height={n.h + 10} rx={12} />
      <Texts blocks={n.blocks} />
      {n.pills && <Pills pills={n.pills} cls={n.kind === 'system' ? 'pill' : 'badge'} />}
    </g>
  );
}

export const NodeShape = memo(NodeShapeInner);
