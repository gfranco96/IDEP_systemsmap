import { useEffect, useRef } from 'react';
import { graph as g } from '../data/loadData';
import { useStore, type Action, type State } from '../state/store';
import { goTo } from '../state/actions';

/**
 * §6.7 Tour. The order is explicit and grouped into seven parts that follow the map's own logic:
 * the claim → the life course in time order → the loop inside each stage → the loops spanning all stages →
 * the consequences they feed → possible responses → the design framing. Step bodies come only from data.
 */
const PARTS = [
  { title: 'Central claim', why: 'What the whole map argues.' },
  { title: 'Life stages', why: 'The timeline, in chronological order.' },
  { title: 'Stage loops', why: 'The feedback loop inside each stage, in the same order.' },
  { title: 'Main loops A–D', why: 'Loops that run across the whole life course.' },
  { title: 'Consequences', why: 'The outcomes every chain and loop feeds into, top to bottom.' },
  { title: 'Interventions', why: 'Possible responses — none selected.' },
  { title: 'Design framing', why: 'The framing for an eventual intervention.' },
] as const;

interface Step {
  part: number;
  title: string;
  body: string[];
  run?: (s: State, d: React.Dispatch<Action>) => void;
}

export function tourSteps(): Step[] {
  const m = g.data.meta;
  const steps: Step[] = [{ part: 0, title: 'Central visual claim', body: [m.centralVisualClaim], run: (_s, d) => d({ type: 'select', id: null }) }];
  for (const s of g.stages)
    steps.push({ part: 1, title: `Stage: ${s.label}`, body: [s.tagline ?? '', s.mainTransition ?? ''], run: (st, d) => goTo(s.id, st, d, 0.6) });
  for (const id of ['loop_childhood', 'loop_adolescence', 'loop_adulthood']) {
    const l = g.loopById.get(id)!;
    const stage = g.stages.find((s) => s.stage === l.stage)?.label ?? '';
    steps.push({ part: 2, title: `${stage} loop: ${l.title}`, body: [l.loopType], run: (st, d) => goTo(id, st, d, 0.9) });
  }
  for (const l of g.mainLoops)
    steps.push({ part: 3, title: `Main loop: ${l.title}`, body: [l.loopType, ...(l.notes ?? [])], run: (st, d) => goTo(l.id, st, d, 0.9) });
  for (const o of g.outcomes)
    steps.push({ part: 4, title: `Outcome: ${o.label}`, body: [o.description ?? ''], run: (st, d) => goTo(o.id, st, d, 0.9) });
  steps.push({
    part: 5,
    title: 'Possible interventions, none selected',
    body: [m.designFramingNote],
    run: (st, d) => {
      if (!st.layers.interventions) d({ type: 'setLayer', layer: 'interventions', value: true });
      d({ type: 'select', id: null });
      setTimeout(() => d({ type: 'focus', id: g.interventions[0].id, zoom: 0.5 }), 0);
    },
  });
  steps.push({ part: 6, title: 'Design framing', body: [m.designFraming], run: (_s, d) => d({ type: 'select', id: null }) });
  return steps;
}

const STEPS = tourSteps();
const firstStepOf = (part: number) => STEPS.findIndex((s) => s.part === part);

export function Tour() {
  const { state, dispatch } = useStore();
  const i = state.tourStep;
  const body = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (i == null) return;
    STEPS[i]?.run?.(state, dispatch);
    body.current?.scrollTo({ top: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);
  if (i == null) return null;
  const s = STEPS[i];
  const inPart = STEPS.filter((x) => x.part === s.part);
  const k = inPart.indexOf(s);
  return (
    <section className="tour" aria-live="polite" aria-label="Guided walk-through" data-testid="tour">
      <div className="tour-head">
        <span className="tour-pos">
          Part {s.part + 1}/{PARTS.length} · {PARTS[s.part].title}
          {inPart.length > 1 && ` · ${k + 1} of ${inPart.length}`}
        </span>
        <span className="fine">
          Step {i + 1}/{STEPS.length}
        </span>
        <button type="button" className="icon-btn" aria-label="Exit walk-through" onClick={() => dispatch({ type: 'tour', step: null })}>
          ×
        </button>
      </div>
      <ol className="tour-parts" aria-label="Order of the walk-through">
        {PARTS.map((p, n) => (
          <li key={p.title} className={n === s.part ? 'current' : n < s.part ? 'done' : ''}>
            <button type="button" title={p.why} aria-current={n === s.part ? 'step' : undefined} onClick={() => dispatch({ type: 'tour', step: firstStepOf(n) })}>
              {n + 1}. {p.title}
            </button>
          </li>
        ))}
      </ol>
      <div className="tour-body" ref={body} data-testid="tour-body">
        <p className="tour-why">{PARTS[s.part].why}</p>
        <h2>{s.title}</h2>
        {s.body.filter(Boolean).map((b, n) => (
          <p key={n}>{b}</p>
        ))}
      </div>
      <div className="tour-actions">
        <button type="button" className="btn" disabled={i === 0} onClick={() => dispatch({ type: 'tour', step: i - 1 })}>
          ‹ Previous
        </button>
        {i < STEPS.length - 1 ? (
          <button type="button" className="btn primary" onClick={() => dispatch({ type: 'tour', step: i + 1 })}>
            Next ›
          </button>
        ) : (
          <button type="button" className="btn primary" onClick={() => dispatch({ type: 'tour', step: null })}>
            Finish
          </button>
        )}
      </div>
    </section>
  );
}
