import { useCallback, useEffect, useRef, useState } from 'react';
import { graph, validationErrors } from './data/loadData';
import { useStore, type ZoomT } from './state/store';
import { useMapModel } from './state/derived';
import { decodeHash, encodeHash } from './state/urlState';
import { MapCanvas, type CanvasHandle } from './components/MapCanvas';
import { EdgeMarkers } from './components/EdgePath';
import { Toolbar } from './components/Toolbar';
import { DetailPanel } from './components/DetailPanel';
import { Legend } from './components/Legend';
import { AboutPanel } from './components/AboutPanel';
import { ListView } from './components/ListView';
import { Tour } from './components/Tour';
import { Breadcrumbs } from './components/Breadcrumbs';

export function App() {
  const { state, dispatch } = useStore();
  const model = useMapModel(state);
  const canvas = useRef<CanvasHandle>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const zoomRef = useRef<ZoomT | null>(state.initialZoom);
  const [announcement, setAnnouncement] = useState('');
  const [copied, setCopied] = useState(false);
  const lastHash = useRef<string>('');

  const announce = useCallback((s: string) => setAnnouncement(s), []);

  // theme
  useEffect(() => {
    const root = document.documentElement;
    if (state.theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', state.theme);
  }, [state.theme]);

  // URL hash sync (debounced)
  const writeHash = useCallback(() => {
    const h = encodeHash(state, zoomRef.current);
    if (h !== window.location.hash) {
      lastHash.current = h;
      history.replaceState(null, '', h);
    }
  }, [state]);
  useEffect(() => {
    const t = setTimeout(writeHash, 250);
    return () => clearTimeout(t);
  }, [writeHash]);
  const hashTimer = useRef<number>(0);
  const onTransform = useCallback(
    (t: ZoomT) => {
      zoomRef.current = t;
      window.clearTimeout(hashTimer.current);
      hashTimer.current = window.setTimeout(writeHash, 400);
    },
    [writeHash],
  );
  useEffect(() => {
    const onHash = () => {
      if (window.location.hash === lastHash.current) return;
      const s = decodeHash(window.location.hash, graph);
      if (s) dispatch({ type: 'restore', state: { ...s, theme: state.theme, about: false, focusRequest: null } });
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [dispatch, state.theme]);

  // global keys
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement;
      const typing = tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.isContentEditable;
      if (e.key === 'Escape') {
        if (state.about) return dispatch({ type: 'setAbout', value: false });
        if (state.tourStep != null) return dispatch({ type: 'tour', step: null });
        dispatch({ type: 'select', id: null });
        dispatch({ type: 'trace', id: null });
        dispatch({ type: 'laneFocus', lane: null });
        announce('Selection cleared');
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === '+' || e.key === '=') canvas.current?.zoomBy(1.3);
      else if (e.key === '-' || e.key === '_') canvas.current?.zoomBy(1 / 1.3);
      else if (e.key === '0') canvas.current?.reset();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dispatch, state.about, state.tourStep, announce]);

  const copyLink = async () => {
    writeHash();
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Copy this link:', url);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className={`app${state.selected ? ' has-panel' : ''}`}>
      <svg className="defs-host" width={0} height={0} aria-hidden focusable="false">
        <EdgeMarkers />
      </svg>
      <a className="skip-link" href="#outline-toggle" onClick={(e) => {
        e.preventDefault();
        dispatch({ type: 'setOutline', value: true });
      }}>
        Skip to outline view
      </a>
      <Toolbar
        ref={searchRef}
        onReset={() => canvas.current?.reset()}
        onCopyLink={copyLink}
        copied={copied}
      />
      {validationErrors.length > 0 && (
        <div className="data-error" role="alert">
          Data validation failed: {validationErrors.length} problem(s). See console.
        </div>
      )}
      <main className="main" id="outline-toggle">
        {state.outline ? (
          <ListView />
        ) : (
          <MapCanvas ref={canvas} model={model} onTransform={onTransform} announce={announce} />
        )}
        {!state.outline && (
          <div className="zoom-controls" role="group" aria-label="Zoom">
            <button type="button" className="btn icon" aria-label="Zoom in" onClick={() => canvas.current?.zoomBy(1.3)}>
              +
            </button>
            <button type="button" className="btn icon" aria-label="Zoom out" onClick={() => canvas.current?.zoomBy(1 / 1.3)}>
              −
            </button>
            <button type="button" className="btn icon" aria-label="Fit to screen" title="Fit to screen" onClick={() => canvas.current?.fit()}>
              ⤢
            </button>
          </div>
        )}
        {!state.outline && <Legend />}
        <Breadcrumbs />
        <DetailPanel />
        <Tour />
      </main>
      <AboutPanel />
      <div className="sr-only" aria-live="polite" role="status">
        {announcement}
      </div>
    </div>
  );
}
