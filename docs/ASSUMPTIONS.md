# Assumptions, deviations, data observations, verification

This file records every place where the build prompt was ambiguous or could not be followed exactly.
The data in `/data` was **not modified**; all text on screen is read from it verbatim (truncated visually only).

---

## Revision 2 — changes requested by the map author (supersede the original prompt where they conflict)

1. Zoom buttons and the Menu button are half their former size (22 px); there is no Legend toggle or search bar any more.
2. "Zoom to fit everything" (⤢ and in the Menu) fits the **current** layout, including everything expanded; the minimum
   zoom was lowered from 0.25 to 0.03 so the whole map can always be shown at once.
3. The detail panel is a compact picture-in-picture window at the top right (300 px wide, ≤ 62 % of the height, 11 px text).
   Clicking a node that sits underneath it pans the map (same zoom) so the node is visible beside the window.
   About / tour / outline text was reduced as well.
4. The five outcome nodes sit inside one full-height column labelled **"Consequences"** (sub-label "core outcome nodes",
   the source's own term). All five outcomes are inside it, including "Joy deficit".
5. The comparative-references row (Denmark, Japan) and its leader lines were removed from the map, the layer toggle and
   the outline view (`references` layer is now off). Their data is untouched. This overrides prompt §3.9 / §9.
6. Two-finger trackpad scrolling (and the mouse wheel) pans; pinch / spread (ctrl+wheel, or Safari gesture events) zooms.
7. The legend is a permanent left column (a bottom strip on screens ≤ 720 px).
8. All UI and map text uses a monospace system font stack (ui-monospace / SF Mono / Menlo / Consolas …); label sizes were
   reduced ~10 % and text measurement switched to monospace metrics, so long labels truncate earlier (full text in tooltips/panel).
9. The Menu button sits at the top-right corner and opens a narrow column beneath it with all actions
   (About, Walk through, Outline view, Expand/Collapse all, Reset view, Zoom to fit, Layers & filters, Export as PNG,
   Copy link, Theme).
10. The search bar (and the `/` shortcut) were removed.
11. Edge icons (▼ ▲ ↻ and the inferred "i") were kept, as confirmed.
12. The header shows only the centred title "Reward systems of intrinsic vs extrinsic joy: A chronological view"
    (also the browser-tab title). The in-map banner (data title, subtitle, central-visual-claim and design-framing
    callouts) was removed; the central visual claim and design framing remain in the About panel and the guided tour.
    This overrides prompt §3.1 / §9.
13. **Export as PNG** renders the entire map off-screen with every chain, loop and cross-life system expanded, using the
    current layers/filters and showing all intervention links if that layer is on, adds the title, and downloads
    `joy-deficit-systems-map.png` (≈ 6900 × 9000 px, scaled to ≤ 9000 px on the long side).

## Revision 3 — further changes requested by the map author

1. Stage dividers are thin (0.5 px) short-dashed (3 px / 3 px) lines drawn with `vector-effect: non-scaling-stroke`, so they
   keep the same on-screen thickness at every zoom level.
2. All pop-ups (details window, Legend, Menu, About, walk-through, tooltips, breadcrumbs) use ~8–9 px type
   (headings ~10 px); the details window is 260 px wide.
3. The left gutter is 56 px wide; row titles (the five lanes and "Main feedback loops") are rotated 90° counter-clockwise
   and wrapped to the row height. Lane titles remain clickable for lane focus.
4. The walk-through and node details are mutually exclusive: while the walk-through runs, no details window,
   breadcrumbs or hover tooltips are shown; clicking a node ends the walk-through and opens that node's details;
   leaving the walk-through clears its selection.
5. The Legend is again a toggle button, placed directly left of Menu; it opens a drop-down column under itself.
   Legend and Menu close each other.
6. Every walk-through step uses the same fixed-size window (440 × 210 px); longer text scrolls inside it.
7. The walk-through order is explicit: a strip of seven numbered parts (Central claim → Life stages → Stage loops →
   Main loops A–D → Consequences → Interventions → Design framing) with the current part highlighted and clickable,
   a "Part n/7 · name · k of m" header, an overall step counter, and a one-line italic note on why each part comes where
   it does. These part names and notes are UI text; step bodies remain data text.
8. During the walk-through, every focus/zoom treats only the area above the walk-through window as visible, so the
   highlighted node(s) are never covered by it.

## Revision 4 — further changes requested by the map author

1. **Cross-life chains** (no stage in the data) stay cross-life: expanding a system turns its bar into a box that spans
   every stage, covers the stage dividers, and houses the system's chains; each chain gets a full-width row with its
   steps spread across the box.
2. **No truncation anywhere:** every title, subtitle and label is shown in full. Boxes grow to fit (chips are 260 px
   wide and all share the height of the longest title; chain steps share the height of their chain's longest label;
   loop steps likewise per loop; interventions share one fitted size). Expanded chain headers widen their chain to fit
   on one line. A unit test asserts that no node text is cut off.
3. **No overlapping lines:** the router penalises running along an already-routed line, and a final pass spreads any
   remaining parallel segments 6 px apart (or the nearest free offset), never at the cost of crossing a node. Lines no
   longer run through the left gutter or under a loop hub's title. A unit test asserts zero overlapping segments in the
   default, fully expanded (with all intervention links) and each-loop-expanded states. The gap in front of the
   outcomes column was widened from 80 to 150 px to give converging lines room.
4. The outcomes column is titled **"Consequences/outcomes"**.
5. **Outcome nodes** are tall bars: bold name, then the outcome's full `description` (regular), then the ▲/▼ polarity
   marker. Each bar shows its own description from the data.
6. **Substages** split their stage bar into equal shares (order only, never age) and together span it exactly.
7. Legend and Menu buttons are half their previous size (12 px tall).

**Data edit requested by the author:** `xl_edu3` chain title and its first step (`xl_edu3_s1`) now read
"Academic admissions / employability discourse …" instead of "College admissions …" (changed in `data/` and in
`tools/build_data.py`). The late-adolescence substage's `rewardSystemShift` ("College admissions, employability, …")
was not changed.

## Revision 5 — further changes requested by the map author

1. Stage dividers: 0.25 px, dashes 1.5 px / gaps 1.5 px (still constant on-screen width).
2. Hover bubbles are half their previous size (≈4.25 px text, 130 px max width).
3. & 4. Expanding a cross-life system makes **the system box itself** grow downward; its chains sit **side by side**
   inside it (wrapping to a new row only if they cannot fit), each chain's steps spread across the width it is given.
   Lines that reach a step inside the box may enter it; all other lines treat the box as an obstacle.
5. All pop-up windows (details, Legend, Menu, About, walk-through, breadcrumbs) use 2/3 of their previous type size
   (≈6 px body). Window sizes are unchanged.
6. Bold section/subsection titles are one step larger, on the map (stage, substage, chain, loop, system, lane,
   outcome and intervention titles) and in the pop-ups (headings, badges, key terms).
7. Outcome boxes are exactly as tall as their text (name, description, polarity marker) — no added space.
   Every outcome link now has its own approach lane in front of the column; the gap before the column is sized to
   the number of outcome links in the data so these lanes never coincide.

## Interpretations

### Project & data
- The app is scaffolded in the package root (next to `/data` and `/tools`). The JSON is imported directly from
  `/data` by `src/data/loadData.ts` (no copy), so there is a single source of truth.
- No git repository exists in the package folder, so no per-phase commits were made (the prompt says "if git is present").
- `d3-shape` is not used: edges are built directly as SVG path strings (cubic Béziers, rounded orthogonal routes, and
  SVG arcs for loop rings). This keeps dependencies minimal; `d3-zoom`, `d3-selection`, `d3-transition` are used for pan/zoom.
- Fonts: system font stack beginning with Helvetica Neue / Helvetica / Arial. No web fonts, CDNs or network calls.

### Layout (§5)
- **Branch-row pitch is 88 px, not 56 px.** With 72 px-tall step nodes, `row × 56` makes a branch step overlap the
  main-line step in the same column (e.g. `ch_d2_s2a` / `ch_d2_s2b`), which breaks the hard "no overlap" rule.
  88 = step height + 16 px gap. Drift (§4.3) is applied exactly as specified (±20 px × col).
- **Loop-ring radius** starts at `max(110, n × 22)` as specified and grows in 6 px steps until no ring step overlaps
  another step or the hub (needed because ring steps are 160 × 72 to fit their text). The reserved box is `2r + 200`.
- **Loop hub footprint is 140 × 136**: the 96 px circle (as specified) plus the loop title underneath it, so the
  title is inside the node box (required for the "no text overflow" rule). Edges attach to the circle itself.
- **Substage nodes are 160 px wide inside their 200 px column** so the forward arrow and its "i" tick fit between them.
  Stage nodes are inset 20 px for the same reason.
- **Cultural row:** its stage-chain sub-row is empty in the data (no chain or loop has `primaryCurrent: "cultural"`),
  so it uses a 48 px minimum instead of the 150 px lane minimum.
- **Cultural overlay extent:** the hatched band spans the full width *of the lanes* (x = 0 → end of the last stage band)
  and the full vertical extent of the four lanes plus the cultural row. It does not continue under the outcome
  column, so outcome text stays readable.
- **Cross-life expansion:** expanding a system bar reveals all of that system's chains as mini-chains (there is no
  separate expand state per cross-life chain), matching "System bar → click expands its chains".
- **Outcome column vertical placement:** outcomes are spaced evenly over the vertical extent of the lanes, in `order`.
- **Reference nodes** are placed inside their `anchor.stage` x-range; their dotted leader lines run to the bottom of
  each anchor lane's stage sub-row. They are drawn as background decoration (not graph edges, not focusable).
- **Text** is wrapped with a deterministic width table (Helvetica metrics × 1.07 safety) so layout tests can assert
  "no text overflows its box". The browser-measured width is also checked in Playwright.
- Chip marker line (e.g. "Adulthood · chain · 5 steps") is UI text derived from data (stage label, step count).

### Edges (§4.2, §5 routing, §6.3)
- Routing order: a direct cubic Bézier between nearest side midpoints when it crosses no unrelated node; otherwise a
  rounded orthogonal route through free channels; otherwise an orthogonal A* route on a sparse visibility grid. Long
  outcome links always use the orthogonal style so they read as a bundle converging on the outcome's left side
  (entry points spaced 10–14 px apart, staggered approach lanes). Rounded corners are quadratic Béziers.
- In loop rings, circular edges are SVG arcs that follow the ring clockwise.
- **Aggregated (lifted) edges:** full "inferred" styling (60 % opacity) only when *all* aggregated members are inferred;
  if *any* member is inferred the "i" tick is shown. The stroke colour is the shared chain/loop lane colour, or neutral
  gray when members belong to different lanes.
- Outcome links are gray, as specified, even inside a coloured lane.
- **"Show inferred links" off hides every inferred edge**, including the timeline forward edges (e001–e011, which are all
  inferred in the data) and all intervention links. This is the most conservative reading of "show/hide".
- Intervention links are drawn for the hovered **or** selected intervention (so they stay visible while the detail
  panel is open), or for all interventions with "Show all intervention links".

### Navigation & UI (§6–§8)
- **Default view:** fit the full map width (timeline → outcomes), anchored top-left, minimum zoom 0.25; the user pans
  down for loops/references. "Fit to screen" fits the whole map within the 0.25–3 zoom extent.
- **Semantic zoom:** below 0.6, secondary text (taglines, substage age ranges, chip marker lines, "n steps", system
  "leads to" label) is hidden. Everything else is visible from 0.6 upward, so there is no additional text that only
  appears above 1.4; substage joy-mode / reward-shift text is shown in the detail panel (allowed by §4.1).
- Clicking a container (chain chip, loop hub, system bar) expands/collapses it **and** selects it. A collapsed or
  expanded chain can be selected; its panel shows the chain fields (title, summary, lane, connection types, steps,
  outcome links, framing note / design implication, evidence). Clicking an expanded chain header collapses it.
- Stage click selects and focus-zooms to the stage's x-range; double-click (or "Expand all in stage" in the panel)
  expands every chain and the stage loop in that stage.
- **Filters fade rather than remove** (lane and stage filters reduce non-matching nodes to 12 % opacity without
  reflowing); the arrow-type filter removes edges. The "Cross-life" stage filter covers system bars, cross-life
  chains and the main loops band (loops whose data `stage` is null / node `stage` is "cross").
- **Cultural overlay toggle off** removes the hatched band and the cultural row (its system bar and `xl_cul*` chains).
- The About panel opens on every load that has **no URL hash** (there is no persistent storage, by rule §0.7);
  shared links (with a hash) open directly on the map.
- The legend starts collapsed (it would otherwise cover the lane labels); it is always one click away via the
  "Legend" button in the toolbar and the canvas corner.
- Lane labels are focus buttons; in DOM/tab order they come before the nodes. Nodes follow the specified order
  (stages → substages → lane by lane → cultural → main loops → outcomes → references → interventions).
- Arrow keys move to the nearest *connected* neighbour in that direction; if none exists, to the nearest node in that
  direction (otherwise unconnected chips would be unreachable by arrow keys).
- Search also matches chain titles, summaries and connection types (chains are map items even though they are not
  nodes). Exact and prefix label matches rank first.
- Tour step titles are short UI labels ("Stage: Childhood", "Main loop: …"); bodies are data text only
  (stage tagline + `mainTransition`, loop `loopType` + `notes`, outcome `description`, `designFramingNote`, `designFraming`).
- URL hash keys: `sel`, `exp`, `layers`, `lanes`, `stages`, `edges`, `intlinks`, `focus` (lane focus), `trace`, `view`, `z`.
- Breakpoints: ≤ 1280 px the toolbar collapses into "Menu"; ≤ 720 px the detail panel becomes a bottom sheet and
  focus/zoom centres the selection in the area above the sheet.

## Deviations

- **Row pitch 88 px and loop-radius growth** (see above) — required to satisfy the hard no-overlap rule.
- **Hub node 140 × 136** instead of 96 × 96 (circle is 96 px; the extra space holds the title).
- **Minimap not implemented** (marked optional in §6.5).
- **Reflow animation covers nodes only.** Nodes glide to new positions (CSS transform transition, disabled under
  `prefers-reduced-motion`); edges are re-routed and redrawn immediately.
- **Fit to screen in the fully expanded state** cannot show the entire map at 1440 × 900: the world is ~3860 × 5400
  and the spec's minimum zoom is 0.25.
- **Touch targets:** all HTML controls are ≥ 44 × 44 px on narrow screens, and small SVG nodes have invisible ≥ 44-unit
  hit areas, but because the map is zoomable, an SVG node's on-screen size is only ≥ 44 px at zoom ≳ 0.7.
  The Outline view is the fully touch-/screen-reader-friendly path.
- The overview is necessarily small at fit-width (≈ 0.46 at 1440 px); labels are legible after zooming in, and full
  text is always available in tooltips, the detail panel and the Outline view.

## Data observations (not fixed)

- **No "creative professional" pathway exists.** `meta.centralUserNote` says the source recommends a highlighted pathway
  for people whose work, identity, leisure and self-promotion are entangled but does not define one. None was added.
- **Cross-life chains (all 17 `xl_*`) have no outcome edges** (`outcomeEdgeIds` empty). The spec only requires outcome
  links for stage chains and loops, so this passes validation, but these pathways do not "lead toward" an outcome on the map.
- **`ch_a4` (ambivalent) does not follow `arrowAssignmentRule`:** its trunk edges (e044, e045) are `upward`, not
  `forward`, and its `defaultArrowType` is `upward` (the other ambivalent stage chains, `ch_c4` and `ch_d4`, use a
  `forward` trunk). Its downward branch (e046) leaves from step 1 (col 0) to step 4 (col 2, row 1), skipping col 1.
  Rendered exactly as given.
- **`xl_lab3` is ambivalent but has a single `forward` edge** (e084, valence `ambivalent`), with no upward/downward split.
- **`ch_a3` is a chain with a `loopClosure` edge** (e043, `circular`, s5 → s1). Rendered as a closing circular edge.
- **`e042`** (ch_a3 outcome link) leaves from step 3, not the chain's last step.
- **Main-loop hub nodes** have `stage: "cross"` in `nodes.json`, while `loops.json` gives those loops `stage: null`.
- **`loop_D`** has valence `protective` (its ring edges too); the other six loops are `reinforcing`.
- **Age ranges:** substages overlap (10–13 vs 11–14; 17–24 vs 22–34) as noted in the caveats; the stage labels also
  leave the early 20s ambiguous ("12–18/early 20s" vs "25 onward" while `sub_early_working` is 22–34).
  `sub_elderhood.ageEnd` is null. Layout uses `order` only.
- **`meta.counts.edgesByArrowType` omits `bidirectional`**; validation treats a missing key as 0.
- `int_open_ended_object → out_intrinsic_joy` (e148) is an intervention link that targets an outcome directly.
- `ref_japan` has no `evidenceIds`; `ref_lifecourse` is cited only by `meta`.
- `ref_denmark.datapoints[1].scale` is "OECD average 6.7" (a comparison, not a scale); displayed as given.
- Intervention nodes carry a `selected: false` field not listed in the type spec; it is only used to confirm that none is selected.
- Many factor / loop-step labels exceed what fits in a node (longest: 147 characters, `ch_d4_s1`); they are visually
  truncated with an ellipsis and shown in full in the tooltip, detail panel and Outline view.
- Every timeline edge (stage→stage, substage→substage) is `inferred`, so the timeline arrows carry the "i" tick.

## Verified

Commands (all passing at hand-off):

| Check | Result |
|---|---|
| `npm run validate` | ✓ 178 nodes, 162 edges, 30 chains, 7 loops, 5 references; counts match §2 and `meta.counts` |
| `npm test` (Vitest) | ✓ 63 tests: data validation + mutation cases; layout invariants (no overlaps, inside bounds, no text overflow, no edge crossing an unrelated node) for default, fully expanded, all-layers-off and each of the 7 loops expanded; determinism; §6.3 aggregation (e.g. `ch_c3_s4 → out_extrinsic_orientation` drawn from the chip when collapsed, from the step when expanded); tracing |
| `npx playwright test` | ✓ 76 tests across desktop 1440×900 and mobile 390×844, light and dark: screenshots, browser-measured text overflow, no console errors/warnings, axe WCAG 2.1 A/AA scans (map, map + panel, outline, About), keyboard, search, URL restore, tour |
| `npm run build` / `npm run preview` | ✓ builds; preview serves with no console errors or warnings (asserted in e2e) |

§11.4 facts, checked in the running app (`tests/e2e/facts.spec.ts`) and by eye in `docs/screenshots/`:

- ✓ Timeline shows 3 stages with 5 / 3 / 4 substages in data order (Infancy … Early transition; Early … Late
  adolescence; Early working … Later life), evenly spaced (not by age).
- ✓ Childhood has 4 chain chips, adolescence 4, adulthood 5, each inside its `primaryCurrent` lane and its stage's
  x-range (`ch_c1`, `ch_c2`, `ch_a1`, `ch_a4`, `ch_d5` → family; `ch_c3`, `ch_a2` → education; `ch_c4`, `ch_d1`,
  `ch_d2`, `ch_d4` → market; `ch_a3`, `ch_d3` → platform).
- ✓ `ch_a3` expanded shows the closing circular edge s5 → s1 with the ↻ marker.
- ✓ `ch_d2` expanded shows `s2a` and `s2b` at the same x (column 1, rows 0 and 1), both with edges into `s3`.
- ✓ The 10 interventions render with identical geometry and computed style (dashed outline, no fill), in data
  `order`, none selected or highlighted, and no intervention links until one is hovered/selected.
- ✓ Legend shows `bidirectional` — "0, supported but not used in this dataset"; other counts are computed live
  (forward 15, downward 62, upward 25, circular 40, dashed 20; inferred 47).
- ✓ Required copy: central visual claim and design framing in the banner (never truncated — unit-tested); About panel
  shows `centralUserNote`, `approach`, `thesis`, all caveats as "Reading notes", `arrowAssignmentRule`, both provenance
  definitions and `designFramingNote`; Denmark / Japan cautions are drawn on the nodes; `ch_d3` framing note appears in
  its chip tooltip and panel; `ch_d4` design implication and `loop_C` design question appear in their panels;
  Denmark datapoints are labelled "as cited in the source; not independently verified"; evidence links use the domain
  as link text.
