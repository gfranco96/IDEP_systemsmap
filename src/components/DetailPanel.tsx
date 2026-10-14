import type { ReactNode } from 'react';
import { graph as g } from '../data/loadData';
import type { Chain, Loop, MapEdge, MapNode } from '../model/types';
import { useStore } from '../state/store';
import { containersInStage, goTo, isContainer } from '../state/actions';

export const AMBIVALENT_TEXT = 'The source names both enabling and extractive outcomes.';
export const INFERRED_TEXT = 'Inferred link: added to satisfy the map spec; not stated in the source';

export function domainOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function nameOf(id: string): string {
  return g.nodeById.get(id)?.label ?? g.chainById.get(id)?.title ?? id;
}

const meaning = (list: { id: string; meaning: string }[], id: string) => list.find((x) => x.id === id)?.meaning ?? '';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="dp-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function Prov({ e }: { e: MapEdge }) {
  return e.provenance === 'inferred' ? (
    <span className="prov prov-inferred" title={INFERRED_TEXT}>
      inferred
    </span>
  ) : (
    <span className="prov prov-explicit">explicit</span>
  );
}

function Link({ id }: { id: string }) {
  const { state, dispatch } = useStore();
  return (
    <button type="button" className="linklike" onClick={() => goTo(id, state, dispatch)}>
      {nameOf(id)}
    </button>
  );
}

function Evidence({ ids }: { ids?: string[] }) {
  if (!ids?.length) return null;
  return (
    <Section title="Evidence links">
      <ul className="evidence">
        {ids.map((id) => {
          const r = g.refById.get(id);
          if (!r) return null;
          return (
            <li key={id}>
              <a href={r.url} target="_blank" rel="noopener noreferrer">
                {domainOf(r.url)}
              </a>
              <div className="muted">{r.supports}</div>
            </li>
          );
        })}
      </ul>
      <p className="fine">Link text shows the domain only; bibliographic metadata has not been independently verified.</p>
    </Section>
  );
}

function List({ items }: { items?: string[] }) {
  if (!items?.length) return null;
  return (
    <ul className="plain">
      {items.map((t, i) => (
        <li key={i}>{t}</li>
      ))}
    </ul>
  );
}

function OutcomeLinks({ edges }: { edges: MapEdge[] }) {
  if (!edges.length) return null;
  return (
    <Section title="Outcome links">
      <ul className="plain">
        {edges.map((e) => (
          <li key={e.id}>
            <Link id={e.source} /> → <Link id={e.target} /> <span className="tag">{e.arrowType}</span> <Prov e={e} />
          </li>
        ))}
      </ul>
    </Section>
  );
}

function ChainNotes({ ch }: { ch: Chain }) {
  return (
    <>
      {ch.defaultValence === 'ambivalent' && (
        <p className="callout ambivalent">
          <span className="badge-inline">double-edged</span> {AMBIVALENT_TEXT}
        </p>
      )}
      {ch.framingNote && (
        <Section title="Framing note">
          <p className="callout">{ch.framingNote}</p>
        </Section>
      )}
      {ch.designImplication && (
        <Section title="Design implication">
          <p className="callout">{ch.designImplication}</p>
        </Section>
      )}
    </>
  );
}

function ChainBody({ ch, current }: { ch: Chain; current?: string }) {
  const outEdges = ch.outcomeEdgeIds.map((id) => g.edgeById.get(id)!);
  const lane = g.currentById.get(ch.primaryCurrent);
  return (
    <>
      <p>{ch.summary}</p>
      <dl className="kv">
        <dt>Lane</dt>
        <dd>
          <span className="swatch" style={{ background: `var(--c-${ch.primaryCurrent})` }} /> {lane?.label}
          {ch.secondaryCurrents.length > 0 && (
            <>
              {' '}
              · also{' '}
              {ch.secondaryCurrents.map((c) => (
                <span key={c}>
                  <span className="swatch" style={{ background: `var(--c-${c})` }} /> {g.currentById.get(c)?.label}
                </span>
              ))}
            </>
          )}
        </dd>
        <dt>Scope</dt>
        <dd>{ch.scope === 'stage' ? `stage (${nameOf('stage_' + ch.stage)})` : `cross-life (${nameOf(ch.system!)})`}</dd>
        <dt>Connection types</dt>
        <dd>{ch.connectionTypes.join(', ')}</dd>
        <dt>Default arrow</dt>
        <dd>
          {ch.defaultArrowType} · {ch.defaultValence}
        </dd>
      </dl>
      <ChainNotes ch={ch} />
      <Section title="Steps">
        <ol className="steps">
          {ch.stepNodeIds.map((id) => (
            <li key={id} className={id === current ? 'current' : ''}>
              {id === current ? <strong>{nameOf(id)}</strong> : <Link id={id} />}
            </li>
          ))}
        </ol>
      </Section>
      <OutcomeLinks edges={outEdges} />
      <Evidence ids={ch.evidenceIds} />
    </>
  );
}

function LoopBody({ lp, current }: { lp: Loop; current?: string }) {
  return (
    <>
      <dl className="kv">
        <dt>Loop type</dt>
        <dd>{lp.loopType}</dd>
        <dt>Valence</dt>
        <dd>
          {lp.valence} — {meaning(g.data.meta.valences, lp.valence)}
        </dd>
        <dt>Scope</dt>
        <dd>{lp.scope === 'main' ? 'main map loop (whole life course)' : `stage loop (${nameOf('stage_' + lp.stage)})`}</dd>
      </dl>
      <Section title="Steps (clockwise)">
        <ol className="steps">
          {lp.stepNodeIds.map((id) => (
            <li key={id} className={id === current ? 'current' : ''}>
              {id === current ? <strong>{nameOf(id)}</strong> : <Link id={id} />}
            </li>
          ))}
        </ol>
        <p className="fine">The last step feeds back into the first (loop closure).</p>
      </Section>
      {lp.notes?.length ? (
        <Section title="Notes">
          <List items={lp.notes} />
        </Section>
      ) : null}
      {lp.interventionOpportunities?.length ? (
        <Section title="Intervention opportunities (as listed in the source)">
          <List items={lp.interventionOpportunities} />
        </Section>
      ) : null}
      {lp.evidenceAnchor && (
        <Section title="Evidence anchor">
          <p>{lp.evidenceAnchor}</p>
        </Section>
      )}
      {lp.designQuestion && (
        <Section title="Design question">
          <p className="callout">{lp.designQuestion}</p>
        </Section>
      )}
      <OutcomeLinks edges={lp.outcomeEdgeIds.map((id) => g.edgeById.get(id)!)} />
      <Evidence ids={lp.evidenceIds} />
    </>
  );
}

function NodeBody({ n }: { n: MapNode }) {
  const { state, dispatch } = useStore();
  switch (n.type) {
    case 'stage': {
      const subs = g.substagesByStage.get(n.stage as never) ?? [];
      const chains = g.stageChains.filter((c) => c.stage === n.stage);
      const loops = g.stageLoops.filter((l) => l.stage === n.stage);
      return (
        <>
          <p className="tagline">{n.tagline}</p>
          <dl className="kv">
            <dt>Age range</dt>
            <dd>{n.ageRangeLabel}</dd>
            <dt>Main transition</dt>
            <dd>{n.mainTransition}</dd>
          </dl>
          <button type="button" className="btn" onClick={() => dispatch({ type: 'expand', ids: containersInStage(n.stage!) })}>
            Expand all in stage
          </button>
          <Section title="Substages">
            <ol className="steps">
              {subs.map((s) => (
                <li key={s.id}>
                  <Link id={s.id} /> <span className="muted">({s.ageRangeLabel})</span>
                </li>
              ))}
            </ol>
          </Section>
          <Section title="Chains in this stage">
            <ul className="plain">
              {chains.map((c) => (
                <li key={c.id}>
                  <span className="swatch" style={{ background: `var(--c-${c.primaryCurrent})` }} /> <Link id={c.id} />
                </li>
              ))}
            </ul>
          </Section>
          {loops.length > 0 && (
            <Section title="Stage feedback loop">
              <ul className="plain">
                {loops.map((l) => (
                  <li key={l.id}>
                    <Link id={l.id} />
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </>
      );
    }
    case 'substage':
      return (
        <>
          <dl className="kv">
            <dt>Age range</dt>
            <dd>
              {n.ageRangeLabel}
              <div className="fine">Age ranges overlap and are not to scale.</div>
            </dd>
            <dt>Central joy mode</dt>
            <dd>{n.centralJoyMode}</dd>
            <dt>Reward-system shift</dt>
            <dd>{n.rewardSystemShift}</dd>
          </dl>
          <Section title="Leads to">
            <List items={n.leadsTo} />
          </Section>
        </>
      );
    case 'system': {
      const cur = g.data.meta.currents.find((c) => c.systemNodeId === n.id);
      const chains = g.crossChainsBySystem.get(n.id) ?? [];
      return (
        <>
          {cur?.description && <p>{cur.description}</p>}
          {cur?.role === 'overlay' && <p className="fine">Rendered as an overlay across all lanes, not as a fifth equal lane.</p>}
          <Section title="Leads to">
            <List items={n.leadsTo} />
          </Section>
          <Section title="Cross-life chains">
            <ul className="plain">
              {chains.map((c) => (
                <li key={c.id}>
                  <Link id={c.id} />
                  {c.defaultValence === 'ambivalent' && <span className="badge-inline">double-edged</span>}
                </li>
              ))}
            </ul>
          </Section>
        </>
      );
    }
    case 'outcome': {
      const incoming = (g.in.get(n.id) ?? []).filter((e) => e.arrowType !== 'dashed');
      const ints = (g.in.get(n.id) ?? []).filter((e) => e.arrowType === 'dashed');
      return (
        <>
          <p>{n.description}</p>
          <dl className="kv">
            <dt>Polarity</dt>
            <dd>
              {n.polarity === 'protective' ? '▲' : '▼'} {n.polarity}
            </dd>
            <dt>Fed by</dt>
            <dd>{n.fedBy?.join(', ')}</dd>
          </dl>
          <Section title="Pathways into this outcome">
            <ul className="plain">
              {incoming.map((e) => {
                const owner = e.chainId ?? e.loopId;
                return (
                  <li key={e.id}>
                    {owner ? <Link id={owner} /> : <Link id={e.source} />}
                    <span className="muted"> via {nameOf(e.source)}</span> <span className="tag">{e.arrowType}</span> <Prov e={e} />
                    {e.provenance === 'inferred' && <div className="fine">{INFERRED_TEXT}.</div>}
                  </li>
                );
              })}
            </ul>
          </Section>
          {ints.length > 0 && (
            <Section title="Possible interventions linked here">
              <ul className="plain">
                {ints.map((e) => (
                  <li key={e.id}>
                    <Link id={e.source} /> <span className="tag">{e.relation}</span> <Prov e={e} />
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </>
      );
    }
    case 'factor': {
      const ch = g.chainById.get(n.chainId!)!;
      const inEdges = (g.in.get(n.id) ?? []).filter((e) => e.chainId === ch.id);
      const outEdges = (g.out.get(n.id) ?? []).filter((e) => e.chainId === ch.id && g.nodeById.get(e.target)?.type !== 'outcome');
      const outcomeEdges = (g.out.get(n.id) ?? []).filter((e) => g.nodeById.get(e.target)?.type === 'outcome');
      const col = n.layout?.col;
      const branches = ch.stepNodeIds.filter((id) => id !== n.id && g.nodeById.get(id)?.layout?.col === col);
      const ints = (g.in.get(n.id) ?? []).filter((e) => e.arrowType === 'dashed');
      return (
        <>
          {n.description && <p>{n.description}</p>}
          <Section title="Part of chain">
            <p>
              <Link id={ch.id} />
            </p>
            <p className="muted">{ch.summary}</p>
            <p className="fine">Connection types: {ch.connectionTypes.join(', ')}</p>
          </Section>
          <ChainNotes ch={ch} />
          {inEdges.length > 0 && (
            <Section title="Previous step">
              <ul className="plain">
                {inEdges.map((e) => (
                  <li key={e.id}>
                    <Link id={e.source} /> <span className="tag">{e.arrowType}</span>
                    {e.loopClosure && <span className="tag">loop closure</span>}
                  </li>
                ))}
              </ul>
            </Section>
          )}
          {outEdges.length > 0 && (
            <Section title="Next step">
              <ul className="plain">
                {outEdges.map((e) => (
                  <li key={e.id}>
                    <Link id={e.target} /> <span className="tag">{e.arrowType}</span>
                    {e.loopClosure && <span className="tag">loop closure</span>}
                  </li>
                ))}
              </ul>
            </Section>
          )}
          {branches.length > 0 && (
            <Section title="Branch alternatives (same step depth)">
              <ul className="plain">
                {branches.map((id) => (
                  <li key={id}>
                    <Link id={id} />
                  </li>
                ))}
              </ul>
            </Section>
          )}
          <OutcomeLinks edges={outcomeEdges} />
          {ints.length > 0 && state.layers.interventions && (
            <Section title="Possible interventions linked here">
              <ul className="plain">
                {ints.map((e) => (
                  <li key={e.id}>
                    <Link id={e.source} /> <span className="tag">{e.relation}</span> <Prov e={e} />
                  </li>
                ))}
              </ul>
            </Section>
          )}
          <Evidence ids={ch.evidenceIds} />
        </>
      );
    }
    case 'loop':
    case 'loop_step': {
      const lp = g.loopById.get(n.loopId ?? n.id)!;
      return (
        <>
          {n.type === 'loop_step' && (
            <p className="muted">
              Step {n.layout?.order} of <Link id={lp.id} />
            </p>
          )}
          <LoopBody lp={lp} current={n.type === 'loop_step' ? n.id : undefined} />
        </>
      );
    }
    case 'reference':
      return (
        <>
          <p className="callout caution">
            <strong>Caution:</strong> {n.caution}
          </p>
          <dl className="kv">
            <dt>Country</dt>
            <dd>{n.country}</dd>
            <dt>Role</dt>
            <dd>{n.role}</dd>
          </dl>
          <p>{n.description}</p>
          <Section title="Leads to">
            <List items={n.leadsTo} />
          </Section>
          {n.alsoLeadsTo?.length ? (
            <Section title="Also leads to">
              <List items={n.alsoLeadsTo} />
            </Section>
          ) : null}
          <Section title="Connection types">
            <List items={n.connectionTypes} />
          </Section>
          {n.datapoints?.length ? (
            <Section title="Datapoints — as cited in the source; not independently verified">
              <ul className="plain">
                {n.datapoints.map((d, i) => (
                  <li key={i}>
                    {d.label}: <strong>{d.value}</strong> ({d.scale})
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}
          <p className="fine">Comparative reference, not the map’s central scope.</p>
          <Evidence ids={n.evidenceIds} />
        </>
      );
    case 'intervention': {
      const outs = g.out.get(n.id) ?? [];
      return (
        <>
          <p className="callout neutral">No intervention is selected or recommended.</p>
          <dl className="kv">
            <dt>Effect</dt>
            <dd>{n.effect}</dd>
            <dt>Intervention type</dt>
            <dd>{n.interventionType}</dd>
          </dl>
          <Section title="Targets">
            <ul className="plain">
              {outs.map((e) => (
                <li key={e.id}>
                  <span className="tag">{e.relation}</span> <Link id={e.target} /> <Prov e={e} />
                  {e.note && <div className="fine">{e.note}</div>}
                </li>
              ))}
            </ul>
            <p className="fine">{INFERRED_TEXT}.</p>
          </Section>
          <p className="fine">{g.data.meta.designFramingNote}</p>
        </>
      );
    }
  }
}

function EdgeBody({ key_ }: { key_: string }) {
  const [s, t, arrow] = key_.split('|');
  const members = g.data.edges.filter((e) => edgeMatches(e, s, t, arrow));
  return (
    <>
      {members.length > 1 && <p className="muted">{members.length} links are aggregated here because a container is collapsed.</p>}
      {members.map((e) => (
        <div key={e.id} className="edge-detail">
          <p>
            <Link id={e.source} /> → <Link id={e.target} />
          </p>
          <dl className="kv">
            <dt>Arrow</dt>
            <dd>
              {e.arrowType} — {meaning(g.data.meta.arrowTypes, e.arrowType)}
            </dd>
            <dt>Valence</dt>
            <dd>
              {e.valence} — {meaning(g.data.meta.valences, e.valence)}
            </dd>
            <dt>Connection types</dt>
            <dd>{e.connectionTypes.join(', ')}</dd>
            <dt>Provenance</dt>
            <dd>
              <Prov e={e} /> {meaning(g.data.meta.provenanceTypes, e.provenance)}
              {e.provenance === 'inferred' && <div className="fine">{INFERRED_TEXT}.</div>}
            </dd>
            {e.relation && (
              <>
                <dt>Relation</dt>
                <dd>{e.relation}</dd>
              </>
            )}
            {e.note && (
              <>
                <dt>Note</dt>
                <dd>{e.note}</dd>
              </>
            )}
          </dl>
        </div>
      ))}
    </>
  );
}

function liftsTo(nodeId: string, rep: string): boolean {
  if (nodeId === rep) return true;
  const n = g.nodeById.get(nodeId);
  if (!n) return false;
  if (n.chainId) {
    const ch = g.chainById.get(n.chainId)!;
    if (ch.id === rep || ch.system === rep) return true;
  }
  if (n.loopId && n.loopId === rep) return true;
  return false;
}
function edgeMatches(e: MapEdge, s: string, t: string, arrow: string) {
  return e.arrowType === arrow && liftsTo(e.source, s) && liftsTo(e.target, t);
}

const TYPE_BADGE: Record<string, string> = {
  stage: 'Stage',
  substage: 'Substage',
  system: 'Cross-life system',
  factor: 'Chain step',
  loop: 'Feedback loop',
  loop_step: 'Loop step',
  outcome: 'Outcome',
  reference: 'Comparative reference',
  intervention: 'Possible intervention',
};

export function DetailPanel() {
  const { state, dispatch } = useStore();
  const id = state.selected;
  if (!id) return null;
  let title = '';
  let badge = '';
  let source = '';
  let body: ReactNode = null;
  const traceable = !id.startsWith('edge:');
  if (id.startsWith('edge:')) {
    const [s, t] = id.slice(5).split('|');
    title = `${nameOf(s)} → ${nameOf(t)}`;
    badge = 'Link';
    body = <EdgeBody key_={id.slice(5)} />;
  } else if (g.chainById.has(id)) {
    const ch = g.chainById.get(id)!;
    title = ch.title;
    badge = ch.scope === 'stage' ? 'Causal chain' : 'Cross-life chain';
    source = ch.sourceSection;
    body = <ChainBody ch={ch} />;
  } else {
    const n = g.nodeById.get(id);
    if (!n) return null;
    title = n.label;
    badge = TYPE_BADGE[n.type];
    source = n.sourceSection;
    body = <NodeBody n={n} />;
  }
  const tracing = state.traceId === id;
  const isOutcome = g.nodeById.get(id)?.type === 'outcome';
  return (
    <aside className="detail-panel" aria-label="Details" data-testid="detail-panel">
      <header>
        <div className="dp-badges">
          <span className="type-badge">{badge}</span>
          {isContainer(id) && (
            <button type="button" className="btn small" onClick={() => dispatch({ type: 'toggleExpand', id })}>
              {state.expanded.has(id) ? 'Collapse' : 'Expand'}
            </button>
          )}
        </div>
        <button type="button" className="icon-btn close" aria-label="Close details" onClick={() => dispatch({ type: 'select', id: null })}>
          ×
        </button>
      </header>
      <h2>{title}</h2>
      {source && <p className="fine">Source section: {source}</p>}
      {traceable && (
        <button
          type="button"
          className={`btn${tracing ? ' active' : ''}`}
          aria-pressed={tracing}
          onClick={() => dispatch({ type: 'trace', id: tracing ? null : id })}
        >
          {tracing ? 'Clear trace' : isOutcome ? 'Trace upstream pathways' : 'Trace pathways'}
        </button>
      )}
      {tracing && (
        <p className="fine">
          Highlighting everything upstream (what feeds it) and downstream (where it leads){state.layers.interventions ? ', including intervention links' : '; dashed intervention links are ignored while the intervention layer is off'}.
        </p>
      )}
      <div className="dp-body">{body}</div>
    </aside>
  );
}
