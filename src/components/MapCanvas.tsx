import { useCallback, useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import { select } from 'd3-selection';
import { zoom as d3zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from 'd3-zoom';
import 'd3-transition';
import { graph as g } from '../data/loadData';
import type { LNode } from '../layout/computeLayout';
import type { RoutedEdge } from '../layout/routeEdges';
import { useStore, type ZoomT } from '../state/store';
import type { MapModel } from '../state/derived';
import { containersInStage, isContainer } from '../state/actions';
import { NodeShape } from './NodeShape';
import { EdgePath } from './EdgePath';
import { Backdrop, CulturalOverlay, LaneLabels } from './Lane';

export interface CanvasHandle {
  zoomBy: (f: number) => void;
  reset: () => void;
  fit: () => void;
  getTransform: () => ZoomT;
}

const MIN_K = 0.03;

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

interface Tip {
  x: number;
  y: number;
  title: string;
  lines: string[];
}

export const MapCanvas = forwardRef<CanvasHandle, { model: MapModel; onTransform: (t: ZoomT) => void; announce: (s: string) => void }>(
  function MapCanvas({ model, onTransform, announce }, ref) {
    const { state, dispatch } = useStore();
    const { layout, routed } = model;
    const wrapRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const gRef = useRef<SVGGElement>(null);
    const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
    const tRef = useRef<ZoomTransform>(zoomIdentity);
    const [tip, setTip] = useState<Tip | null>(null);
    const layoutRef = useRef(layout);
    layoutRef.current = layout;
    const touring = useRef(false);
    touring.current = state.tourStep != null;
    useEffect(() => {
      if (state.tourStep != null) setTip(null);
    }, [state.tourStep]);

    const applyZoomClass = (k: number) => {
      // on the transform group: React never rewrites its className
      const grp = gRef.current;
      if (!grp) return;
      grp.classList.toggle('z-low', k < 0.6);
      grp.classList.toggle('z-high', k > 1.4);
    };

    const setTransform = useCallback((t: ZoomTransform, animate = true) => {
      const svg = svgRef.current;
      const z = zoomRef.current;
      if (!svg || !z) return;
      const sel = select(svg);
      if (animate && !reducedMotion()) sel.transition().duration(450).call(z.transform, t);
      else sel.call(z.transform, t);
    }, []);

    /** The part of the canvas not covered by the detail panel / bottom sheet. */
    const visibleArea = () => {
      const wrap = wrapRef.current!;
      const W = wrap.clientWidth;
      const H = wrap.clientHeight;
      // the walk-through window sits at the bottom: keep focused nodes above it
      const tour = wrap.parentElement?.querySelector<HTMLElement>('.tour');
      if (tour) {
        const top = tour.getBoundingClientRect().top - wrap.getBoundingClientRect().top;
        return { x: 0, y: 0, w: W, h: Math.max(120, top - 12) };
      }
      const panel = wrap.parentElement?.querySelector<HTMLElement>('.detail-panel');
      if (!panel) return { x: 0, y: 0, w: W, h: H };
      if (W <= 720) return { x: 0, y: 0, w: W, h: Math.max(160, H - panel.offsetHeight) };
      return { x: 0, y: 0, w: Math.max(240, W - panel.offsetWidth - 20), h: H };
    };

    const fitBox = useCallback(
      (box: { x: number; y: number; w: number; h: number }, maxK = 3, minK = 0.25, animate = true) => {
        const wrap = wrapRef.current;
        if (!wrap) return;
        const v = visibleArea();
        const k = Math.max(minK, Math.min(maxK, Math.min(v.w / box.w, v.h / box.h)));
        const t = zoomIdentity.translate(v.x + v.w / 2 - (box.x + box.w / 2) * k, v.y + v.h / 2 - (box.y + box.h / 2) * k).scale(k);
        setTransform(t, animate);
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [setTransform],
    );

    const defaultView = useCallback(
      (animate = false) => {
        const wrap = wrapRef.current;
        if (!wrap) return;
        const L = layoutRef.current;
        const W = wrap.clientWidth;
        // Overview: fit the full width (timeline → outcomes), anchored at the top-left; pan for the rest.
        const k = Math.max(0.25, Math.min(1, (W - 16) / L.width));
        setTransform(zoomIdentity.translate(Math.max(8, (W - L.width * k) / 2), 8).scale(k), animate);
      },
      [fitBox, setTransform],
    );

    /** Zoom out (or in) so the entire current map — including everything expanded — is visible. */
    const fitAll = () => {
      const L = layoutRef.current;
      const pad = 24;
      fitBox({ x: -pad, y: -pad, w: L.width + 2 * pad, h: L.height + 2 * pad }, 3, MIN_K);
    };

    /** If a node sits under the details window, pan (same zoom) so it lands in the free part of the canvas. */
    const ensureVisible = (id: string) => {
      const wrap = wrapRef.current;
      const panel = wrap?.parentElement?.querySelector<HTMLElement>('.detail-panel');
      const n = layoutRef.current.byId.get(id);
      if (!wrap || !panel || !n) return;
      const t = tRef.current;
      const wr = wrap.getBoundingClientRect();
      const pr = panel.getBoundingClientRect();
      const p = { x: pr.left - wr.left, y: pr.top - wr.top, w: pr.width, h: pr.height };
      const nx = t.x + n.x * t.k;
      const ny = t.y + n.y * t.k;
      const nw = n.w * t.k;
      const nh = n.h * t.k;
      const hit = nx < p.x + p.w && nx + nw > p.x && ny < p.y + p.h && ny + nh > p.y;
      if (!hit) return;
      const v = visibleArea();
      const dx = v.x + v.w / 2 - (nx + nw / 2);
      const dy = v.y + v.h / 2 - (ny + nh / 2);
      // desktop: the window is on the right → shift horizontally only; mobile sheet → shift vertically only
      const horizontal = p.x > 0;
      setTransform(zoomIdentity.translate(t.x + (horizontal ? dx : 0), t.y + (horizontal ? 0 : dy)).scale(t.k));
    };

    useImperativeHandle(ref, () => ({
      zoomBy: (f) => {
        const svg = svgRef.current;
        const z = zoomRef.current;
        if (!svg || !z) return;
        const sel = select(svg);
        if (reducedMotion()) sel.call(z.scaleBy, f);
        else sel.transition().duration(250).call(z.scaleBy, f);
      },
      reset: () => defaultView(true),
      fit: () => fitAll(),
      getTransform: () => ({ x: tRef.current.x, y: tRef.current.y, k: tRef.current.k }),
    }));

    // d3-zoom setup (once)
    useEffect(() => {
      const svg = svgRef.current!;
      const z = d3zoom<SVGSVGElement, unknown>()
        .scaleExtent([MIN_K, 3])
        .filter((ev: Event) => {
          if (ev.type === 'dblclick') return false; // double-click reserved for expand
          // trackpad: two-finger scroll pans (handled below); pinch arrives as ctrl+wheel and zooms
          if (ev.type === 'wheel') return (ev as WheelEvent).ctrlKey;
          const me = ev as MouseEvent;
          return !me.ctrlKey && !me.button;
        })
        .on('zoom', (ev: { transform: ZoomTransform }) => {
          tRef.current = ev.transform;
          gRef.current?.setAttribute('transform', ev.transform.toString());
          applyZoomClass(ev.transform.k);
          onTransform({ x: ev.transform.x, y: ev.transform.y, k: ev.transform.k });
          setTip(null);
        });
      zoomRef.current = z;
      select(svg).call(z).on('dblclick.zoom', null);
      // two-finger scroll / mouse wheel → pan
      const onWheel = (ev: WheelEvent) => {
        if (ev.ctrlKey) return;
        ev.preventDefault();
        const unit = ev.deltaMode === 1 ? 16 : ev.deltaMode === 2 ? svg.clientHeight : 1;
        const k = tRef.current.k;
        select(svg).call(z.translateBy, (-ev.deltaX * unit) / k, (-ev.deltaY * unit) / k);
      };
      svg.addEventListener('wheel', onWheel, { passive: false });
      // Safari reports trackpad pinch as gesture events rather than ctrl+wheel
      let gestureStartK = 1;
      const onGestureStart = (ev: Event) => {
        ev.preventDefault();
        gestureStartK = tRef.current.k;
      };
      const onGestureChange = (ev: Event) => {
        ev.preventDefault();
        const ge = ev as Event & { scale: number; clientX: number; clientY: number };
        const r = svg.getBoundingClientRect();
        select(svg).call(z.scaleTo, gestureStartK * ge.scale, [ge.clientX - r.left, ge.clientY - r.top]);
      };
      svg.addEventListener('gesturestart', onGestureStart);
      svg.addEventListener('gesturechange', onGestureChange);
      if (state.initialZoom) {
        const t = state.initialZoom;
        select(svg).call(z.transform, zoomIdentity.translate(t.x, t.y).scale(t.k));
      } else {
        defaultView(false);
        // a shared link with a selection but no transform: bring the selection into view
        if (state.selected && !state.selected.startsWith('edge:')) dispatch({ type: 'focus', id: state.selected, zoom: 1 });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // focus requests (search, tour, outline)
    useEffect(() => {
      const fr = state.focusRequest;
      if (!fr) return;
      const n = layout.byId.get(fr.id);
      if (!n) return;
      // include an expanded container's members in the focus box
      const members = layout.nodes.filter((m) => m.container === n.id);
      const xs = [n, ...members];
      const x0 = Math.min(...xs.map((m) => m.x));
      const y0 = Math.min(...xs.map((m) => m.y));
      const x1 = Math.max(...xs.map((m) => m.x + m.w));
      const y1 = Math.max(...xs.map((m) => m.y + m.h));
      fitBox({ x: x0 - 120, y: y0 - 120, w: x1 - x0 + 240, h: y1 - y0 + 240 }, fr.zoom ?? 1.2);
      const el = svgRef.current?.querySelector<SVGGElement>(`[data-id="${CSS.escape(fr.id)}"]`);
      el?.focus({ preventScroll: true });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.focusRequest, layout]);

    useEffect(() => {
      if (state.fitRequest) fitAll();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.fitRequest]);

    // ------------------------------------------------------------------ events
    const toScreen = (x: number, y: number) => {
      const t = tRef.current;
      return { x: t.x + x * t.k, y: t.y + y * t.k };
    };

    const tipFor = (n: LNode): Tip => {
      const lines: string[] = [];
      const ch = g.chainById.get(n.id);
      if (n.kind === 'chip') lines.push('Click to expand the chain into its steps.');
      if (n.kind === 'loop') lines.push(n.expanded ? 'Click to collapse the loop.' : 'Click to expand the loop ring.');
      if (n.kind === 'system') lines.push(n.expanded ? 'Click to collapse the cross-life chains.' : 'Click to expand the cross-life chains.');
      if (n.kind === 'stage') lines.push('Click to focus · double-click to expand everything in this stage.');
      if (ch?.defaultValence === 'ambivalent') lines.push('Double-edged: the source names both enabling and extractive outcomes.');
      if (ch?.framingNote) lines.push(`Framing note: ${ch.framingNote}`);
      const node = g.nodeById.get(n.id);
      if (node?.type === 'reference' && node.caution) lines.push(`Caution: ${node.caution}`);
      return { ...toScreen(n.x + n.w / 2, n.y), title: n.full, lines };
    };

    const onHover = useCallback(
      (n: LNode | null) => {
        dispatch({ type: 'hover', id: n?.id ?? null });
        setTip(n && !touring.current ? tipFor(n) : null);
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [dispatch],
    );

    const arrowMeaning = (t: string) => g.data.meta.arrowTypes.find((a) => a.id === t)?.meaning ?? '';
    const onEdgeHover = useCallback(
      (e: RoutedEdge | null) => {
        dispatch({ type: 'hover', id: e ? 'edge:' + e.key : null });
        if (!e || touring.current) return setTip(null);
        const a = e.agg;
        const s = layoutRef.current.byId.get(a.source)?.full ?? a.source;
        const t = layoutRef.current.byId.get(a.target)?.full ?? a.target;
        const lines = [`${a.arrowType}: ${arrowMeaning(a.arrowType)}`];
        const rel = [...new Set(a.members.map((m) => m.relation).filter(Boolean))];
        if (rel.length) lines.push(`Relation: ${rel.join(', ')}`);
        if (a.members.length > 1) lines.push(`${a.members.length} links aggregated (container collapsed).`);
        if (a.inferred) lines.push('Inferred link: added to satisfy the map spec; not stated in the source.');
        else if (a.anyInferred) lines.push('Some aggregated links are inferred (added to satisfy the map spec; not stated in the source).');
        setTip({ ...toScreen(e.mid.x, e.mid.y - 6), title: `${s} → ${t}`, lines });
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [dispatch],
    );

    const activate = useCallback(
      (n: LNode) => {
        // one or the other: opening a node's details ends the walk-through
        if (touring.current) dispatch({ type: 'tour', step: null });
        if (n.kind === 'stage') {
          dispatch({ type: 'select', id: n.id });
          const sb = layoutRef.current.stageBands.find((b) => b.stage === g.nodeById.get(n.id)?.stage);
          if (sb) {
            const L = layoutRef.current;
            fitBox({ x: sb.x - 20, y: 130, w: sb.w + 40, h: Math.min(L.height - 130, 1400) }, 1.4);
          }
          announce(`Selected stage ${n.full}`);
          return;
        }
        const afterRender = () => requestAnimationFrame(() => requestAnimationFrame(() => ensureVisible(n.id)));
        if (isContainer(n.id)) {
          dispatch({ type: 'toggleExpand', id: n.id });
          dispatch({ type: 'select', id: n.id });
          announce(`${n.full} ${n.expanded ? 'collapsed' : 'expanded'}`);
          afterRender();
          return;
        }
        dispatch({ type: 'select', id: n.id });
        announce(`Selected ${n.full}`);
        afterRender();
      },
      [dispatch, fitBox, announce],
    );

    const onDouble = useCallback(
      (n: LNode) => {
        if (n.kind !== 'stage') return;
        const st = g.nodeById.get(n.id)?.stage;
        if (!st) return;
        dispatch({ type: 'expand', ids: containersInStage(st) });
        announce(`Expanded everything in ${n.full}`);
      },
      [dispatch, announce],
    );

    const onFocusNode = useCallback(() => {}, []);

    // arrow-key navigation: nearest connected neighbour in that direction, else nearest spatially
    const onKey = useCallback(
      (n: LNode, ev: React.KeyboardEvent) => {
        const k = ev.key;
        if (k === 'Enter' || k === ' ') {
          ev.preventDefault();
          activate(n);
          return;
        }
        if (k === 'e' || k === 'E') {
          if (isContainer(n.id)) {
            ev.preventDefault();
            dispatch({ type: 'toggleExpand', id: n.id });
            announce(`${n.full} ${n.expanded ? 'collapsed' : 'expanded'}`);
          }
          return;
        }
        const dirs: Record<string, [number, number]> = {
          ArrowRight: [1, 0],
          ArrowLeft: [-1, 0],
          ArrowDown: [0, 1],
          ArrowUp: [0, -1],
        };
        const d = dirs[k];
        if (!d) return;
        ev.preventDefault();
        const L = layoutRef.current;
        const cx = n.x + n.w / 2;
        const cy = n.y + n.h / 2;
        const score = (m: LNode) => {
          const dx = m.x + m.w / 2 - cx;
          const dy = m.y + m.h / 2 - cy;
          const along = dx * d[0] + dy * d[1];
          if (along <= 0) return Infinity;
          const across = Math.abs(dx * d[1] - dy * d[0]);
          if (across > along * 1.8) return Infinity;
          return along + across * 2;
        };
        const neighbours = new Set<string>();
        for (const r of routed) {
          if (r.agg.source === n.id) neighbours.add(r.agg.target);
          if (r.agg.target === n.id) neighbours.add(r.agg.source);
        }
        let best: LNode | null = null;
        let bestS = Infinity;
        for (const id of neighbours) {
          const m = L.byId.get(id);
          if (!m) continue;
          const s = score(m);
          if (s < bestS) {
            bestS = s;
            best = m;
          }
        }
        if (!best)
          for (const m of L.nodes) {
            if (m.id === n.id) continue;
            const s = score(m);
            if (s < bestS) {
              bestS = s;
              best = m;
            }
          }
        if (best) {
          dispatch({ type: 'select', id: best.id });
          const el = svgRef.current?.querySelector<SVGGElement>(`[data-id="${CSS.escape(best.id)}"]`);
          el?.focus({ preventScroll: true });
          // keep it in view
          const t = tRef.current;
          const wrap = wrapRef.current!;
          const p = toScreen(best.x + best.w / 2, best.y + best.h / 2);
          if (p.x < 40 || p.y < 40 || p.x > wrap.clientWidth - 40 || p.y > wrap.clientHeight - 40)
            setTransform(zoomIdentity.translate(wrap.clientWidth / 2 - (best.x + best.w / 2) * t.k, wrap.clientHeight / 2 - (best.y + best.h / 2) * t.k).scale(t.k));
          announce(`Selected ${best.full}`);
        }
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [activate, dispatch, routed, announce, setTransform],
    );

    const onEdgeClick = useCallback(
      (e: RoutedEdge) => {
        if (touring.current) dispatch({ type: 'tour', step: null });
        dispatch({ type: 'select', id: 'edge:' + e.key });
      },
      [dispatch],
    );

    const onLane = useCallback(
      (c: (typeof state)['laneFocus']) => {
        dispatch({ type: 'laneFocus', lane: state.laneFocus === c ? null : c });
        announce(state.laneFocus === c ? 'Lane focus cleared' : `Focused lane ${g.currentById.get(c!)?.label}`);
      },
      [dispatch, state.laneFocus, announce],
    );

    const sel = state.selected;
    return (
      <div className="canvas-wrap" ref={wrapRef}>
        <svg
          ref={svgRef}
          className={`map-svg${model.focusing ? ' focusing' : ''}`}
          role="application"
          aria-label="Systems map canvas. Tab through nodes; Enter selects; E expands or collapses; arrow keys move to connected neighbours."
          onClick={() => {
            dispatch({ type: 'select', id: null });
            dispatch({ type: 'trace', id: null });
          }}
        >
          <g ref={gRef}>
            <Backdrop layout={layout} laneFocus={state.laneFocus} />
            {state.layers.cultural && <CulturalOverlay layout={layout} />}
            <LaneLabels layout={layout} laneFocus={state.laneFocus} onLane={onLane} />
            {/* cross-life system boxes sit beneath the lines so the links inside an expanded system stay visible */}
            <g className="nodes nodes-under">
              {layout.nodes
                .filter((n) => n.kind === 'system')
                .map((n) => (
                  <NodeShape
                    key={n.id}
                    n={n}
                    emph={model.nodeEmph(n)}
                    selected={sel === n.id}
                    onActivate={activate}
                    onDouble={onDouble}
                    onHover={onHover}
                    onFocusNode={onFocusNode}
                    onKey={onKey}
                  />
                ))}
            </g>
            <g className="edges">
              {routed.map((e) => (
                <EdgePath
                  key={e.key}
                  e={e}
                  emph={model.edgeEmph(e)}
                  selected={sel === 'edge:' + e.key}
                  onHover={onEdgeHover}
                  onClick={onEdgeClick}
                />
              ))}
            </g>
            <g className="nodes">
              {layout.nodes.filter((n) => n.kind !== 'system').map((n) => (
                <NodeShape
                  key={n.id}
                  n={n}
                  emph={model.nodeEmph(n)}
                  selected={sel === n.id}
                  onActivate={activate}
                  onDouble={onDouble}
                  onHover={onHover}
                  onFocusNode={onFocusNode}
                  onKey={onKey}
                />
              ))}
            </g>
          </g>
        </svg>
        {tip && (
          <div className="tooltip" style={{ left: tip.x, top: tip.y }} role="tooltip">
            <strong>{tip.title}</strong>
            {tip.lines.map((l, i) => (
              <div key={i}>{l}</div>
            ))}
          </div>
        )}
      </div>
    );
  },
);
