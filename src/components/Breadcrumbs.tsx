import { graph as g } from '../data/loadData';
import { useStore } from '../state/store';
import { goTo } from '../state/actions';
import { nameOf } from './DetailPanel';

/** Where the selected item sits: stage/lane › chain/loop › step. */
export function trail(id: string): string[] {
  if (id.startsWith('edge:')) return [];
  const n = g.nodeById.get(id);
  const ch = g.chainById.get(id) ?? (n?.chainId ? g.chainById.get(n.chainId) : undefined);
  const out: string[] = [];
  if (ch) {
    if (ch.scope === 'stage') out.push('stage_' + ch.stage);
    else out.push(ch.system!);
    out.push(ch.id);
  } else if (n?.type === 'loop_step' || n?.type === 'loop') {
    const lp = g.loopById.get(n.loopId ?? n.id)!;
    if (lp.stage) out.push('stage_' + lp.stage);
    out.push(lp.id);
  } else if (n?.type === 'substage') out.push(n.parent!);
  if (out[out.length - 1] !== id) out.push(id);
  return out;
}

export function Breadcrumbs() {
  const { state, dispatch } = useStore();
  if (!state.selected) return null;
  const t = trail(state.selected);
  if (t.length < 2) return null;
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumbs">
      <ol>
        {t.map((id, i) => (
          <li key={id}>
            {i < t.length - 1 ? (
              <button type="button" className="linklike" title={nameOf(id)} onClick={() => goTo(id, state, dispatch)}>
                <span className="crumb">{nameOf(id)}</span>
              </button>
            ) : (
              <span className="crumb" aria-current="true" title={nameOf(id)}>
                {nameOf(id)}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
