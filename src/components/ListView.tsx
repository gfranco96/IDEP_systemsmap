import type { ReactNode } from 'react';
import { graph as g } from '../data/loadData';
import { STAGE_KEYS } from '../model/types';
import { useStore } from '../state/store';

/** §10 Outline view: the same data as a nested, keyboard-navigable outline (screen-reader path). */
function Item({ id, label, children, extra }: { id: string; label: string; children?: ReactNode; extra?: ReactNode }) {
  const { state, dispatch } = useStore();
  const sel = state.selected === id;
  return (
    <li>
      <button
        type="button"
        className={`ol-item${sel ? ' selected' : ''}`}
        aria-pressed={sel}
        onClick={() => dispatch({ type: 'select', id })}
        data-id={id}
      >
        {label}
      </button>
      {extra}
      {children && <ul>{children}</ul>}
    </li>
  );
}

const stepsOf = (ids: string[]) =>
  ids.map((id) => {
    const n = g.nodeById.get(id)!;
    return <Item key={id} id={id} label={n.label} />;
  });

function Outcomes({ edgeIds }: { edgeIds: string[] }) {
  if (!edgeIds.length) return null;
  return (
    <li className="ol-note">
      Leads to outcomes:{' '}
      {edgeIds.map((eid, i) => {
        const e = g.edgeById.get(eid)!;
        return (
          <span key={eid}>
            {i > 0 && '; '}
            {g.nodeById.get(e.target)!.label} ({e.arrowType}, {e.provenance})
          </span>
        );
      })}
    </li>
  );
}

export function ListView() {
  const { state } = useStore();
  const L = state.layers;
  return (
    <nav className="outline" aria-label="Outline view of the map" data-testid="outline">
      <h2>Outline view</h2>
      <p className="fine">The same content as the map. Select any item to open its details.</p>
      <h3>Life-course timeline</h3>
      <ul>
        {g.stages.map((s) => (
          <Item key={s.id} id={s.id} label={`${s.label} — ${s.tagline}`}>
            {g.substagesByStage.get(s.stage as never)!.map((ss) => (
              <Item key={ss.id} id={ss.id} label={`${ss.label} (${ss.ageRangeLabel})`} />
            ))}
          </Item>
        ))}
      </ul>
      <h3>Lanes</h3>
      <ul>
        {[...g.lanes, ...(L.cultural ? [g.overlay] : [])].map((lane) => {
          const chains = g.stageChains.filter((c) => c.primaryCurrent === lane.id);
          const loops = L.loops ? g.stageLoops.filter((l) => l.primaryCurrent === lane.id) : [];
          const sys = g.nodeById.get(lane.systemNodeId)!;
          const xl = g.crossChainsBySystem.get(sys.id) ?? [];
          return (
            <li key={lane.id}>
              <span className="ol-heading">
                <span className="swatch" style={{ background: lane.color }} /> {lane.label}
                {lane.role === 'overlay' && ' (overlay)'}
              </span>
              <ul>
                {STAGE_KEYS.map((st) => {
                  const cs = chains.filter((c) => c.stage === st);
                  const ls = loops.filter((l) => l.stage === st);
                  if (!cs.length && !ls.length) return null;
                  return (
                    <li key={st}>
                      <span className="ol-heading">{g.stages.find((s) => s.stage === st)!.label}</span>
                      <ul>
                        {cs.map((c) => (
                          <Item key={c.id} id={c.id} label={c.title} extra={c.defaultValence === 'ambivalent' ? <span className="badge-inline">double-edged</span> : null}>
                            {stepsOf(c.stepNodeIds)}
                            <Outcomes edgeIds={c.outcomeEdgeIds} />
                          </Item>
                        ))}
                        {ls.map((l) => (
                          <Item key={l.id} id={l.id} label={`Feedback loop: ${l.title}`}>
                            {stepsOf(l.stepNodeIds)}
                            <Outcomes edgeIds={l.outcomeEdgeIds} />
                          </Item>
                        ))}
                      </ul>
                    </li>
                  );
                })}
                {L.crossLife && (
                  <Item id={sys.id} label={`Cross-life: ${sys.label}`}>
                    {xl.map((c) => (
                      <Item key={c.id} id={c.id} label={c.title} extra={c.defaultValence === 'ambivalent' ? <span className="badge-inline">double-edged</span> : null}>
                        {stepsOf(c.stepNodeIds)}
                      </Item>
                    ))}
                  </Item>
                )}
              </ul>
            </li>
          );
        })}
      </ul>
      {L.loops && (
        <>
          <h3>Main feedback loops</h3>
          <ul>
            {g.mainLoops.map((l) => (
              <Item key={l.id} id={l.id} label={l.title}>
                {stepsOf(l.stepNodeIds)}
                <Outcomes edgeIds={l.outcomeEdgeIds} />
              </Item>
            ))}
          </ul>
        </>
      )}
      <h3>Outcomes</h3>
      <ul>
        {g.outcomes.map((o) => (
          <Item key={o.id} id={o.id} label={`${o.polarity === 'protective' ? '▲' : '▼'} ${o.label}`} />
        ))}
      </ul>
      {L.references && (
        <>
          <h3>Comparative references</h3>
          <ul>
            {g.references.map((r) => (
              <Item key={r.id} id={r.id} label={`${r.country}: ${r.label}`} extra={<div className="fine">Caution: {r.caution}</div>} />
            ))}
          </ul>
        </>
      )}
      <h3>Possible interventions, none selected</h3>
      {L.interventions ? (
        <>
          <p className="fine">{g.data.meta.designFramingNote}</p>
          <ul>
            {g.interventions.map((n) => (
              <Item key={n.id} id={n.id} label={n.label} />
            ))}
          </ul>
        </>
      ) : (
        <p className="fine">The intervention layer is off. Turn it on under “Layers & filters”.</p>
      )}
    </nav>
  );
}
