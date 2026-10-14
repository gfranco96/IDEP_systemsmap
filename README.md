# Joy Deficit — Life-Course Systems Map

An interactive, navigable systems map rendered from `data/*.json` (the single source of truth; never edited by the app).
Static build: no backend, no runtime network calls, no storage. View state lives in memory and the URL hash.

## Run

```bash
npm install
npm run dev          # local dev server
npm run build        # validate data → typecheck → production build in dist/
npm run preview      # serve dist/ at http://localhost:4173
```

The `dist/` folder can be hosted on any static file server (it uses relative paths).

## Check

```bash
npm run validate     # data integrity + expected counts (fails on drift)
npm test             # validate + Vitest (data, layout invariants, edge aggregation, tracing)
npx playwright install chromium   # once
npm run test:e2e     # Playwright: screenshots → docs/screenshots/, DOM checks, axe a11y scans
npm run report       # layout/routing diagnostics for default and fully-expanded states
```

## Using the map

- **Click** a chain chip, loop hub or cross-life bar to expand it; click again (or its header) to collapse.
- **Click** any node or edge for details; **Trace pathways** highlights everything upstream and downstream.
- **Click a lane label** to focus a lane. **Double-click a stage** to expand everything in it.
- **Keyboard:** Tab through nodes · Enter/Space select · `E` expand/collapse · arrows move to a neighbour ·
  `Esc` clear · `/` search · `+` `-` `0` zoom.
- **Layers & filters:** cultural overlay, cross-life systems, feedback loops, international references,
  possible interventions (off by default, none selected), inferred links; lane, stage and arrow-type filters.
- **Outline view** shows the same content as a nested list (screen-reader friendly).
- **Copy link** shares the exact view (selection, expanded containers, layers, filters, zoom).

See `docs/ASSUMPTIONS.md` for interpretations, deviations, data observations and verification results.

## Layout

```
data/                   source JSON (do not edit)
src/data/               loader + validation
src/model/              types, graph indexes, containment, edge lifting, tracing
src/layout/             deterministic layout, text measurement, edge routing
src/components/         MapCanvas, NodeShape, EdgePath, Lane, Legend, DetailPanel, Toolbar,
                        SearchBox, Breadcrumbs, ListView (outline), AboutPanel, Tour
src/state/              store (useReducer), URL hash, derived model, actions
scripts/                validate-data.ts, layout-report.ts
tests/unit, tests/e2e   Vitest and Playwright
docs/                   ASSUMPTIONS.md, screenshots/
```
