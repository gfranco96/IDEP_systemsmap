import { useEffect } from 'react';
import { graph as g } from '../data/loadData';
import { useStore, type Action, type State } from '../state/store';
import { goTo } from '../state/actions';

/** §6.7 Tour steps: titles are short UI labels; bodies come only from data. */
interface Step {
  title: string;
  body: string[];
  run?: (s: State, d: React.Dispatch<Action>) => void;
}

export function tourSteps(): Step[] {
  const m = g.data.meta;
  const steps: Step[] = [{ title: 'Central visual claim', body: [m.centralVisualClaim], run: (_s, d) => d({ type: 'select', id: null }) }];
  for (const s of g.stages)
    steps.push({ title: `Stage: ${s.label}`, body: [s.tagline ?? '', s.mainTransition ?? ''], run: (st, d) => goTo(s.id, st, d, 0.6) });
  for (const id of ['loop_childhood', 'loop_adolescence', 'loop_adulthood']) {
    const l = g.loopById.get(id)!;
    steps.push({ title: `Stage loop: ${l.title}`, body: [l.loopType], run: (st, d) => goTo(id, st, d, 0.9) });
  }
  for (const l of g.mainLoops)
    steps.push({ title: `Main loop: ${l.title}`, body: [l.loopType, ...(l.notes ?? [])], run: (st, d) => goTo(l.id, st, d, 0.9) });
  for (const o of g.outcomes)
    steps.push({ title: `Outcome: ${o.label}`, body: [o.description ?? ''], run: (st, d) => goTo(o.id, st, d, 0.9) });
  steps.push({
    title: 'Possible interventions, none selected',
    body: [m.designFramingNote],
    run: (st, d) => {
      if (!st.layers.interventions) d({ type: 'setLayer', layer: 'interventions', value: true });
      d({ type: 'select', id: null });
      setTimeout(() => d({ type: 'focus', id: g.interventions[0].id, zoom: 0.5 }), 0);
    },
  });
  steps.push({ title: 'Design framing', body: [m.designFraming], run: (_s, d) => d({ type: 'select', id: null }) });
  return steps;
}

const STEPS = tourSteps();

export function Tour() {
  const { state, dispatch } = useStore();
  const i = state.tourStep;
  useEffect(() => {
    if (i == null) return;
    STEPS[i]?.run?.(state, dispatch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);
  if (i == null) return null;
  const s = STEPS[i];
  return (
    <section className="tour" aria-live="polite" aria-label="Guided walk-through" data-testid="tour">
      <div className="tour-head">
        <span className="fine">
          Step {i + 1} of {STEPS.length}
        </span>
        <button type="button" className="icon-btn" aria-label="Exit walk-through" onClick={() => dispatch({ type: 'tour', step: null })}>
          ×
        </button>
      </div>
      <h2>{s.title}</h2>
      {s.body.filter(Boolean).map((b, k) => (
        <p key={k}>{b}</p>
      ))}
      <div className="tour-actions">
        <button type="button" className="btn" disabled={i === 0} onClick={() => dispatch({ type: 'tour', step: i - 1 })}>
          Previous
        </button>
        {i < STEPS.length - 1 ? (
          <button type="button" className="btn primary" onClick={() => dispatch({ type: 'tour', step: i + 1 })}>
            Next
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
