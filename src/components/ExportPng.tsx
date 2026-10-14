import { useEffect, useMemo, useRef } from 'react';
import { graph as g } from '../data/loadData';
import { aggregateEdges } from '../model/graph';
import { computeLayout } from '../layout/computeLayout';
import { routeEdges } from '../layout/routeEdges';
import type { State } from '../state/store';
import { ALL_CONTAINERS } from '../state/actions';
import { NodeShape } from './NodeShape';
import { EdgePath, EdgeMarkers } from './EdgePath';
import { Backdrop, CulturalOverlay, LaneLabels } from './Lane';
import { APP_TITLE } from './Toolbar';

const TITLE_H = 70;
const noop = () => {};

// Presentation properties copied inline so the standalone SVG renders like the page (no stylesheet in an <img>).
const PROPS = [
  'fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-opacity', 'stroke-linecap',
  'opacity', 'display', 'visibility', 'font-family', 'font-size', 'font-weight', 'font-style', 'letter-spacing',
  'text-anchor', 'transform',
];

function inlineStyles(src: Element, dst: Element) {
  const cs = getComputedStyle(src);
  const style = PROPS.map((p) => {
    const v = cs.getPropertyValue(p);
    return v && !(p === 'transform' && v === 'none') ? `${p}:${v}` : '';
  })
    .filter(Boolean)
    .join(';');
  dst.setAttribute('style', style);
  for (let i = 0; i < src.children.length; i++) inlineStyles(src.children[i], dst.children[i]);
}

async function svgToPng(svg: SVGSVGElement, w: number, h: number, filename: string) {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  inlineStyles(svg, clone);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const xml = new XMLSerializer().serializeToString(clone);
  const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = new Image();
    img.decoding = 'sync';
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error('Could not rasterise the map'));
      img.src = url;
    });
    const scale = Math.min(2, 9000 / Math.max(w, h));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext('2d')!;
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
    if (!blob) throw new Error('PNG encoding failed');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Renders the whole map with every container expanded off-screen, then downloads it as a PNG. */
export function ExportPng({ state, onDone }: { state: State; onDone: (err?: Error) => void }) {
  const ref = useRef<SVGSVGElement>(null);
  const view = useMemo(() => ({ expanded: new Set(ALL_CONTAINERS), layers: state.layers }), [state.layers]);
  const layout = useMemo(() => computeLayout(g, view), [view]);
  const routed = useMemo(
    () => routeEdges(g, layout, aggregateEdges(g, view, { arrowTypes: state.edgeFilter, interventionLinks: 'all' })),
    [layout, view, state.edgeFilter],
  );
  const W = layout.width;
  const H = layout.height + TITLE_H;

  useEffect(() => {
    let cancelled = false;
    requestAnimationFrame(() =>
      requestAnimationFrame(async () => {
        if (cancelled || !ref.current) return;
        try {
          await svgToPng(ref.current, W, H, 'joy-deficit-systems-map.png');
          onDone();
        } catch (e) {
          onDone(e as Error);
        }
      }),
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="export-host" aria-hidden>
      <svg ref={ref} className="map-svg export-svg" width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <EdgeMarkers />
        <rect className="export-bg" x={0} y={0} width={W} height={H} />
        <text className="export-title" x={W / 2} y={44} textAnchor="middle" fontSize={26} fontWeight={700}>
          {APP_TITLE}
        </text>
        <g transform={`translate(0,${TITLE_H})`}>
          <Backdrop layout={layout} laneFocus={null} />
          {state.layers.cultural && <CulturalOverlay layout={layout} />}
          <LaneLabels layout={layout} laneFocus={null} onLane={noop} />
          <g className="edges">
            {routed.map((e) => (
              <EdgePath key={e.key} e={e} emph="normal" selected={false} onHover={noop} onClick={noop} />
            ))}
          </g>
          <g className="nodes">
            {layout.nodes.map((n) => (
              <NodeShape
                key={n.id}
                n={n}
                emph="normal"
                selected={false}
                onActivate={noop}
                onDouble={noop}
                onHover={noop}
                onFocusNode={noop}
                onKey={noop}
              />
            ))}
          </g>
        </g>
      </svg>
    </div>
  );
}
