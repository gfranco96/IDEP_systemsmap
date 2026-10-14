import { forwardRef, useMemo, useState } from 'react';
import { graph as g } from '../data/loadData';
import { useStore } from '../state/store';
import { goTo } from '../state/actions';

interface Hit {
  id: string;
  label: string;
  kind: string;
  where: string;
}

const KIND: Record<string, string> = {
  stage: 'stage',
  substage: 'substage',
  outcome: 'outcome',
  system: 'system',
  factor: 'step',
  loop_step: 'loop step',
  loop: 'loop',
  reference: 'reference',
  intervention: 'intervention',
};

export function search(q: string): Hit[] {
  const s = q.trim().toLowerCase();
  if (s.length < 2) return [];
  const hits: Hit[] = [];
  const match = (...fields: (string | undefined | string[])[]) =>
    fields.some((f) => (Array.isArray(f) ? f.some((x) => x.toLowerCase().includes(s)) : f?.toLowerCase().includes(s)));
  for (const c of g.data.chains)
    if (match(c.title, c.summary, c.connectionTypes))
      hits.push({ id: c.id, label: c.title, kind: c.scope === 'stage' ? 'chain' : 'cross-life chain', where: '' });
  for (const n of g.data.nodes) {
    if (match(n.label, n.description, n.connectionTypes)) {
      const where = n.chainId ? g.chainById.get(n.chainId)!.title : n.loopId && n.type !== 'loop' ? g.loopById.get(n.loopId)!.title : '';
      hits.push({ id: n.id, label: n.label, kind: KIND[n.type], where });
    }
  }
  // rank: exact label, label prefix, label contains, then description/connection-type matches
  const rank = (h: Hit) => {
    const l = h.label.toLowerCase();
    return l === s ? 0 : l.startsWith(s) ? 1 : l.includes(s) ? 2 : 3;
  };
  return hits
    .map((h, i) => ({ h, i }))
    .sort((a, b) => rank(a.h) - rank(b.h) || a.i - b.i)
    .map((x) => x.h)
    .slice(0, 40);
}

export const SearchBox = forwardRef<HTMLInputElement, { onDone?: () => void }>(function SearchBox({ onDone }, ref) {
  const { state, dispatch } = useStore();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const hits = useMemo(() => search(q), [q]);
  const choose = (h: Hit) => {
    goTo(h.id, state, dispatch);
    setQ('');
    onDone?.();
  };
  return (
    <div className="search" role="search">
      <input
        ref={ref}
        type="search"
        placeholder="Search the map ( / )"
        aria-label="Search the map"
        aria-controls="search-results"
        aria-expanded={hits.length > 0}
        role="combobox"
        aria-activedescendant={hits[active] ? `hit-${hits[active].id}` : undefined}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setActive(0);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => Math.min(hits.length - 1, a + 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(0, a - 1));
          } else if (e.key === 'Enter' && hits[active]) {
            e.preventDefault();
            choose(hits[active]);
          } else if (e.key === 'Escape') {
            setQ('');
            (e.target as HTMLInputElement).blur();
          }
        }}
      />
      {hits.length > 0 && (
        <ul className="search-results" id="search-results" role="listbox">
          {hits.map((h, i) => (
            <li
              key={h.id}
              id={`hit-${h.id}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? 'active' : ''}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(h);
              }}
            >
              <span className="tag">{h.kind}</span> {h.label}
              {h.where && <div className="fine">in {h.where}</div>}
            </li>
          ))}
        </ul>
      )}
      {q.trim().length >= 2 && hits.length === 0 && <div className="search-results empty">No matches</div>}
    </div>
  );
});
