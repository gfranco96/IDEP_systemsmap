import type { Chain, CurrentId, Loop, MapNode, StageKey } from '../model/types';
import { STAGE_KEYS } from '../model/types';
import type { Graph, ViewState } from '../model/graph';
import { textWidth, wrapText } from './text';

// ---------------------------------------------------------------------------
// Constants (SVG user units at zoom 1) — §5
// ---------------------------------------------------------------------------
export const L = {
  gutter: 56,
  substageCol: 200,
  stagePad: 40,
  outcomeGap: 150,
  outcomeColW: 280,
  stageRowY: 64,
  stageRowH: 70,
  substageRowY: 134,
  substageRowH: 120,
  lanesTop: 274,
  laneGap: 10,
  laneMinH: 150,
  laneCellPad: 20,
  crossCollapsedH: 56,
  culturalStageRowH: 48,
  mainLoopsMinH: 220,
  interventionsH: 160,
  bandGap: 24,
  chipW: 260,
  chipH: 64, // minimum; grows to fit the full title
  itemGap: 20,
  hubW: 140,
  hubH: 148,
  hubR: 48,
  stepW: 200,
  stepH: 64, // minimum; grows to fit the longest label in the chain
  stepPitch: 240,
  drift: 20,
  rowPitch: 88,
  chainHeaderH: 26,
  loopStepW: 180,
  loopStepH: 60, // minimum; grows to fit the longest label in the loop
  outcomeW: 248,
  outcomeH: 120, // minimum; outcomes grow into tall bars
  refW: 330,
  refH: 100,
  intW: 200,
  intH: 64, // minimum; grows to fit label + type
  margin: 40,
};

export type LKind =
  | 'stage'
  | 'substage'
  | 'chip'
  | 'chainHeader'
  | 'factor'
  | 'loop'
  | 'loop_step'
  | 'system'
  | 'outcome'
  | 'reference'
  | 'intervention';

export interface TextBlock {
  lines: { text: string; x: number; y: number }[];
  size: number;
  bold: boolean;
  italic?: boolean;
  cls: string; // e.g. 't-label', 't-sec' (hidden at low zoom)
  anchor: 'start' | 'middle';
  maxWidth: number;
}

export interface Pill {
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LNode {
  id: string;
  kind: LKind;
  x: number;
  y: number;
  w: number;
  h: number;
  blocks: TextBlock[];
  pills?: Pill[];
  /** full label text (tooltips, aria) */
  full: string;
  truncated: boolean;
  current: CurrentId | null;
  secondary: CurrentId[];
  stage: StageKey | 'cross' | 'outcome' | 'reference' | 'intervention' | 'main' | null;
  expanded?: boolean;
  /** container that this node is shown inside (chain id / loop id / system id) */
  container?: string;
  /** keyboard tab order */
  order: number;
}

export interface Band {
  id: string;
  kind: 'stageBand' | 'laneStage' | 'laneCross' | 'overlay' | 'mainLoops' | 'interventions' | 'outcomes';
  x: number;
  y: number;
  w: number;
  h: number;
  current?: CurrentId;
  label?: TextBlock;
  sublabel?: TextBlock;
}

/** Row title in the left gutter, drawn rotated 90° counter-clockwise (reads bottom → top). */
export interface LaneLabel {
  id: string;
  /** set for the five current lanes (clickable lane focus); absent for other rows */
  current?: CurrentId;
  x: number;
  y: number;
  w: number;
  h: number;
  /** text block in the rotated frame: origin at the label centre, x along the reading direction */
  block: TextBlock;
}

export interface Ring {
  loopId: string;
  cx: number;
  cy: number;
  r: number;
}

export interface Layout {
  nodes: LNode[];
  byId: Map<string, LNode>;
  bands: Band[];
  laneLabels: LaneLabel[];
  stageBands: { stage: StageKey; x: number; w: number }[];
  rings: Ring[];
  /** top of the first lane (depends on the substage row height) */
  lanesTop: number;
  /** expanded cross-life systems: boxes that house their chains across the full width */
  houses: { id: string; current: CurrentId; x: number; y: number; w: number; h: number }[];
  contentX0: number;
  contentX1: number;
  outcomeX: number;
  width: number;
  height: number;
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function block(
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  size: number,
  maxLines: number,
  opts: { bold?: boolean; italic?: boolean; cls?: string; anchor?: 'start' | 'middle'; lh?: number } = {},
): { block: TextBlock; truncated: boolean; height: number } {
  const bold = !!opts.bold;
  const w = wrapText(text, maxWidth, size, maxLines, bold);
  const lh = opts.lh ?? Math.round(size * 1.28);
  return {
    block: {
      lines: w.lines.map((t, i) => ({ text: t, x, y: y + i * lh })),
      size,
      bold,
      italic: opts.italic,
      cls: opts.cls ?? 't-label',
      anchor: opts.anchor ?? 'start',
      maxWidth,
    },
    truncated: w.truncated,
    height: w.lines.length * lh,
  };
}

/** Wrap text vertically centred in a box of height h starting at padTop. */
function centredBlock(
  text: string,
  boxW: number,
  boxH: number,
  pad: number,
  size: number,
  maxLines: number,
  opts: { bold?: boolean; cls?: string; anchor?: 'start' | 'middle'; topReserve?: number } = {},
) {
  const lh = Math.round(size * 1.28);
  const w = wrapText(text, boxW - 2 * pad, size, maxLines, !!opts.bold);
  const top = opts.topReserve ?? 0;
  const avail = boxH - top;
  const textH = w.lines.length * lh;
  const y0 = top + (avail - textH) / 2 + size * 0.95;
  const anchor = opts.anchor ?? 'middle';
  const x = anchor === 'middle' ? boxW / 2 : pad;
  return {
    block: {
      lines: w.lines.map((t, i) => ({ text: t, x, y: y0 + i * lh })),
      size,
      bold: !!opts.bold,
      cls: opts.cls ?? 't-label',
      anchor,
      maxWidth: boxW - 2 * pad,
    } as TextBlock,
    truncated: w.truncated,
  };
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
export function overlaps(a: Box, b: Box, margin = 0): boolean {
  return (
    a.x < b.x + b.w + margin && b.x < a.x + a.w + margin && a.y < b.y + b.h + margin && b.y < a.y + a.h + margin
  );
}

// ---------------------------------------------------------------------------
// Container geometry (relative coordinates)
// ---------------------------------------------------------------------------

interface StepPos {
  id: string;
  rx: number;
  ry: number;
}

const STEP_FS = 10;
const STEP_LH = 13;
const LOOP_FS = 9.5;
const LOOP_LH = 12;
const HEADER_FS = 11;

/** Height a box needs to show `text` in full at the given width. */
function fitHeight(text: string, w: number, pad: number, size: number, lh: number, min: number) {
  const lines = wrapText(text, w - 2 * pad, size, 99).lines.length;
  return Math.max(min, lines * lh + 2 * pad + 4);
}

export function chainHeaderWidth(ch: Chain): number {
  const reserve = ch.scope === 'stage' ? 26 : 0;
  const badge = ch.defaultValence === 'ambivalent' ? textWidth('double-edged', 9, true) + 20 : 0;
  return reserve + 4 + textWidth(ch.title, HEADER_FS, true) + badge + ch.secondaryCurrents.length * 12 + 12;
}

/**
 * §4.3 drift + §5 expanded chain geometry. Every step is tall enough for the chain's longest label.
 * `spreadTo` spreads the columns across a given width (cross-life chains span their whole system box).
 */
export function chainGeometry(
  g: Graph,
  ch: Chain,
  spreadTo?: number,
): { steps: StepPos[]; w: number; h: number; stepH: number } {
  const drift = ch.defaultArrowType === 'downward' ? L.drift : ch.defaultArrowType === 'upward' ? -L.drift : 0;
  const stepH = Math.max(...ch.stepNodeIds.map((id) => fitHeight(g.nodeById.get(id)!.label, L.stepW, 8, STEP_FS, STEP_LH, L.stepH)));
  const rowPitch = stepH + 16;
  const maxCol = Math.max(...ch.stepNodeIds.map((id) => g.nodeById.get(id)!.layout?.col ?? 0));
  const naturalW = maxCol * L.stepPitch + L.stepW;
  const w0 = Math.max(naturalW, chainHeaderWidth(ch), spreadTo ?? 0);
  const pitch = maxCol > 0 ? Math.max(L.stepPitch, (spreadTo ? w0 - L.stepW : naturalW - L.stepW) / maxCol) : 0;
  const raw = ch.stepNodeIds.map((id) => {
    const n = g.nodeById.get(id)!;
    const c = n.layout?.col ?? 0;
    const r = n.layout?.row ?? 0;
    return { id, rx: c * pitch, ry: c * drift + r * rowPitch };
  });
  const minY = Math.min(...raw.map((s) => s.ry));
  const maxY = Math.max(...raw.map((s) => s.ry));
  const steps = raw.map((s) => ({ id: s.id, rx: s.rx, ry: s.ry - minY + L.chainHeaderH }));
  return { steps, w: w0, h: L.chainHeaderH + (maxY - minY) + stepH, stepH };
}

/** Height of a loop's ring steps (all equal, fitted to the longest label). */
export function loopStepHeight(g: Graph, lp: Loop): number {
  return Math.max(...lp.stepNodeIds.map((id) => fitHeight(g.nodeById.get(id)!.label, L.loopStepW, 8, LOOP_FS, LOOP_LH, L.loopStepH)));
}

/** §5 expanded loop: ring radius grown from max(110, n×22) until no step overlaps. */
export function loopGeometry(
  lp: Loop,
  stepH: number = L.loopStepH,
): { r: number; size: number; steps: { id: string; cx: number; cy: number }[] } {
  const n = lp.stepNodeIds.length;
  let r = Math.max(110, n * 22);
  const place = (rad: number) =>
    lp.stepNodeIds.map((id, k) => {
      const phi = (k * 2 * Math.PI) / n;
      return { id, cx: rad * Math.sin(phi), cy: -rad * Math.cos(phi) };
    });
  const hub: Box = { x: -L.hubW / 2, y: -L.hubH / 2, w: L.hubW, h: L.hubH };
  for (let guard = 0; guard < 300; guard++) {
    const pos = place(r);
    const boxes = pos.map((p) => ({ x: p.cx - L.loopStepW / 2, y: p.cy - stepH / 2, w: L.loopStepW, h: stepH }));
    let ok = true;
    for (let i = 0; i < boxes.length && ok; i++) {
      if (overlaps(boxes[i], hub, 14)) ok = false;
      for (let j = i + 1; j < boxes.length && ok; j++) if (overlaps(boxes[i], boxes[j], 14)) ok = false;
    }
    if (ok) break;
    r += 6;
  }
  return { r, size: 2 * r + Math.max(200, stepH + 60), steps: place(r).map((p, k) => ({ ...p, id: lp.stepNodeIds[k] })) };
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

interface CellItem {
  kind: 'chain' | 'loop';
  id: string;
  w: number;
  h: number;
}

function flow(items: CellItem[], width: number, gap: number) {
  const pos: { item: CellItem; x: number; y: number }[] = [];
  let x = 0;
  let y = 0;
  let rowH = 0;
  for (const it of items) {
    if (x > 0 && x + it.w > width) {
      x = 0;
      y += rowH + gap;
      rowH = 0;
    }
    pos.push({ item: it, x, y });
    x += it.w + gap;
    rowH = Math.max(rowH, it.h);
  }
  return { pos, h: items.length ? y + rowH : 0 };
}

export function computeLayout(g: Graph, view: ViewState): Layout {
  const { expanded, layers } = view;
  const nodes: LNode[] = [];
  const bands: Band[] = [];
  const laneLabels: LaneLabel[] = [];
  const rings: Ring[] = [];
  let order = 0;
  const push = (n: Omit<LNode, 'order'>) => {
    const ln = { ...n, order: order++ } as LNode;
    nodes.push(ln);
    return ln;
  };

  const stageLabel = new Map(g.stages.map((s) => [s.stage as StageKey, s.label]));
  const houses: Layout['houses'] = [];

  // every chip is tall enough for the longest chain title (titles are never cut off)
  const CHIP_FS = 10.5;
  const CHIP_LH = 13;
  const chipTitleLines = (ch: Chain) => wrapText(ch.title, L.chipW - 20, CHIP_FS, 99, true).lines.length;
  const chipH = Math.max(L.chipH, ...g.stageChains.map((c) => 26 + chipTitleLines(c) * CHIP_LH + 8));

  const itemFor = (kind: 'chain' | 'loop', id: string): CellItem => {
    if (kind === 'chain') {
      if (expanded.has(id)) {
        const geo = chainGeometry(g, g.chainById.get(id)!);
        return { kind, id, w: geo.w, h: geo.h };
      }
      return { kind, id, w: L.chipW, h: chipH };
    }
    if (expanded.has(id)) {
      const lp = g.loopById.get(id)!;
      const s = loopGeometry(lp, loopStepHeight(g, lp)).size;
      return { kind, id, w: s, h: s };
    }
    return { kind, id, w: L.hubW, h: L.hubH };
  };

  // ---- cell contents: lane × stage --------------------------------------
  const laneIds = g.lanes.map((l) => l.id);
  const cells = new Map<string, CellItem[]>(); // `${lane}|${stage}`
  for (const lane of [...laneIds, 'cultural' as CurrentId])
    for (const st of STAGE_KEYS) {
      const items: CellItem[] = g.stageChains
        .filter((c) => c.primaryCurrent === lane && c.stage === st)
        .sort((a, b) => a.order - b.order)
        .map((c) => itemFor('chain', c.id));
      if (layers.loops)
        for (const lp of g.stageLoops.filter((l) => l.primaryCurrent === lane && l.stage === st))
          items.push(itemFor('loop', lp.id));
      cells.set(`${lane}|${st}`, items);
    }

  // ---- stage band widths (§5 Columns) -------------------------------------
  const stageBands: Layout['stageBands'] = [];
  let x = L.gutter;
  for (const st of STAGE_KEYS) {
    const nSub = g.substagesByStage.get(st)!.length;
    let widest = 0;
    for (const lane of [...laneIds, 'cultural'])
      for (const it of cells.get(`${lane}|${st}`)!) widest = Math.max(widest, it.w);
    const w = Math.max(nSub * L.substageCol, widest) + L.stagePad;
    stageBands.push({ stage: st, x, w });
    x += w;
  }
  const contentX0 = L.gutter;
  const contentX1 = x;
  const contentW = contentX1 - contentX0;
  const bandOf = (st: StageKey) => stageBands.find((b) => b.stage === st)!;

  // ---- stages & substages ----------------------------------------------
  for (const st of STAGE_KEYS) {
    const b = bandOf(st);
    bands.push({ id: `band_${st}`, kind: 'stageBand', x: b.x, y: L.stageRowY, w: b.w, h: 0 });
  }
  for (const s of g.stages) {
    const b = bandOf(s.stage as StageKey);
    const w = b.w - 40;
    const lab = block(s.label, 14, 25, w - 28, 16, 1, { bold: true });
    const tag = block(s.tagline ?? '', 14, 45, w - 28, 11, 1, { cls: 't-sec', italic: true });
    push({
      id: s.id,
      kind: 'stage',
      x: b.x + 20,
      y: L.stageRowY + 6,
      w,
      h: 58,
      blocks: [lab.block, tag.block],
      full: s.label,
      truncated: lab.truncated || tag.truncated,
      current: null,
      secondary: [],
      stage: s.stage as StageKey,
    });
  }
  // substages share their stage bar equally (order only, never age) and together span it exactly
  const SUB_GAP = 24;
  const subGeom = STAGE_KEYS.map((st) => {
    const b = bandOf(st);
    const subs = g.substagesByStage.get(st)!;
    const barX = b.x + 20;
    const barW = b.w - 40;
    const w = (barW - (subs.length - 1) * SUB_GAP) / subs.length;
    return { st, subs, barX, w };
  });
  const subTextH = (n: MapNode, w: number) =>
    wrapText(n.label, w - 20, 11, 99, true).lines.length * 14 + 10 + wrapText(n.ageRangeLabel ?? '', w - 20, 10, 99).lines.length * 13;
  const subH = Math.max(104, ...subGeom.flatMap((sg) => sg.subs.map((n) => subTextH(n, sg.w) + 18)));
  for (const sg of subGeom) {
    sg.subs.forEach((s, i) => {
      const w = sg.w;
      const lab = block(s.label, 10, 20, w - 20, 11, 99, { bold: true, lh: 14 });
      const ageLines = wrapText(s.ageRangeLabel ?? '', w - 20, 10, 99).lines.length;
      const age = block(s.ageRangeLabel ?? '', 10, subH - 10 - (ageLines - 1) * 13, w - 20, 10, 99, { cls: 't-sec', lh: 13 });
      push({
        id: s.id,
        kind: 'substage',
        x: sg.barX + i * (w + SUB_GAP),
        y: L.substageRowY + 8,
        w,
        h: subH,
        blocks: [lab.block, age.block],
        full: s.label,
        truncated: lab.truncated || age.truncated,
        current: null,
        secondary: [],
        stage: sg.st,
      });
    });
  }
  const lanesTop = L.substageRowY + 8 + subH + 32;

  // ---- placing helpers --------------------------------------------------
  const placeChain = (ch: Chain, ox: number, oy: number, stage: LNode['stage'], spreadTo?: number) => {
    const color = ch.primaryCurrent;
    if (!expanded.has(ch.id) && ch.scope === 'stage') {
      // collapsed chip: full title, never truncated
      const n = ch.stepNodeIds.length;
      const ambivalent = ch.defaultValence === 'ambivalent';
      const badgeW = ambivalent ? textWidth('double-edged', 9, true) + 12 : 0;
      const dotsW = ch.secondaryCurrents.length * 12;
      const markerText = `${stageLabel.get(ch.stage as StageKey) ?? ''} · ${n} steps`;
      const marker = block(markerText, 10, 16, L.chipW - 20 - badgeW - dotsW - 8, 8.5, 1, { cls: 't-sec t-marker' });
      const title = block(ch.title, 10, 32, L.chipW - 20, CHIP_FS, 99, { bold: true, lh: CHIP_LH });
      const pills: Pill[] = [];
      if (ambivalent) pills.push({ text: 'double-edged', x: L.chipW - 8 - badgeW, y: 6, w: badgeW, h: 14 });
      push({
        id: ch.id,
        kind: 'chip',
        x: ox,
        y: oy,
        w: L.chipW,
        h: chipH,
        blocks: [marker.block, title.block],
        pills,
        full: ch.title,
        truncated: title.truncated || marker.truncated,
        current: color,
        secondary: ch.secondaryCurrents,
        stage,
        expanded: false,
      });
      return;
    }
    const geo = chainGeometry(g, ch, spreadTo);
    const ambivalent = ch.defaultValence === 'ambivalent';
    const badgeW = ambivalent ? textWidth('double-edged', 9, true) + 12 : 0;
    const headerReserve = ch.scope === 'stage' ? 26 : 0; // room for the collapse button
    const head = block(
      ch.title,
      headerReserve + 4,
      15,
      geo.w - headerReserve - 10 - (badgeW ? badgeW + 8 : 0) - ch.secondaryCurrents.length * 12,
      HEADER_FS,
      1,
      { bold: true },
    );
    push({
      id: ch.id,
      kind: 'chainHeader',
      x: ox,
      y: oy,
      w: geo.w,
      h: 20,
      blocks: [head.block],
      pills: ambivalent ? [{ text: 'double-edged', x: geo.w - badgeW, y: 3, w: badgeW, h: 14 }] : [],
      full: ch.title,
      truncated: head.truncated,
      current: color,
      secondary: ch.secondaryCurrents,
      stage,
      expanded: true,
    });
    for (const st of geo.steps) {
      const node = g.nodeById.get(st.id)!;
      const c = centredBlock(node.label, L.stepW, geo.stepH, 8, STEP_FS, 99);
      push({
        id: st.id,
        kind: 'factor',
        x: ox + st.rx,
        y: oy + st.ry,
        w: L.stepW,
        h: geo.stepH,
        blocks: [c.block],
        full: node.label,
        truncated: c.truncated,
        current: color,
        secondary: node.secondaryCurrents ?? [],
        stage,
        container: ch.scope === 'stage' ? ch.id : ch.system!,
      });
    }
  };

  const hubNode = (lp: Loop, x0: number, y0: number, stage: LNode['stage'], isExpanded: boolean) => {
    const t = block(lp.title, L.hubW / 2, L.hubR * 2 + 16, L.hubW - 4, 10, 3, { bold: true, anchor: 'middle', lh: 12 });
    const sub = block(`${lp.stepNodeIds.length} steps`, L.hubW / 2, L.hubR + 30, 80, 9, 1, {
      anchor: 'middle',
      cls: 't-sec',
    });
    push({
      id: lp.id,
      kind: 'loop',
      x: x0,
      y: y0,
      w: L.hubW,
      h: L.hubH,
      blocks: [t.block, sub.block],
      full: lp.title,
      truncated: t.truncated,
      current: lp.primaryCurrent,
      secondary: [],
      stage,
      expanded: isExpanded,
    });
  };

  const placeLoop = (lp: Loop, ox: number, oy: number, stage: LNode['stage']) => {
    if (!expanded.has(lp.id)) {
      hubNode(lp, ox, oy, stage, false);
      return;
    }
    const stepH = loopStepHeight(g, lp);
    const geo = loopGeometry(lp, stepH);
    const cx = ox + geo.size / 2;
    const cy = oy + geo.size / 2;
    rings.push({ loopId: lp.id, cx, cy, r: geo.r });
    hubNode(lp, cx - L.hubW / 2, cy - L.hubH / 2, stage, true);
    for (const s of geo.steps) {
      const node = g.nodeById.get(s.id)!;
      const c = centredBlock(node.label, L.loopStepW, stepH, 8, LOOP_FS, 99);
      push({
        id: s.id,
        kind: 'loop_step',
        x: cx + s.cx - L.loopStepW / 2,
        y: cy + s.cy - stepH / 2,
        w: L.loopStepW,
        h: stepH,
        blocks: [c.block],
        full: node.label,
        truncated: c.truncated,
        current: lp.primaryCurrent,
        secondary: [],
        stage,
        container: lp.id,
      });
    }
  };

  const placeSystem = (sysId: string, laneCurrent: CurrentId, y: number) => {
    const sys = g.nodeById.get(sysId)!;
    const isExp = expanded.has(sysId);
    const w = contentW - 20;
    const lab = block(sys.label, 34, 27, 330, 12, 1, { bold: true });
    const labW = Math.min(330, textWidth(lab.block.lines[0]?.text ?? '', 12, true));
    // leadsTo pills, laid left-to-right, never overflowing the bar
    const pills: Pill[] = [];
    let px = 34 + labW + 16;
    const kickW = textWidth('leads to:', 9.5) + 6;
    const kick = block('leads to:', px, 26, kickW, 9.5, 1, { cls: 't-sec t-marker' });
    px += kickW + 4;
    let truncated = lab.truncated;
    for (const t of sys.leadsTo ?? []) {
      const tw = textWidth(t, 9.5) + 14;
      if (px + tw > w - 10) {
        truncated = true;
        break;
      }
      pills.push({ text: t, x: px, y: 12, w: tw, h: 20 });
      px += tw + 6;
    }
    push({
      id: sysId,
      kind: 'system',
      x: contentX0 + 10,
      y,
      w,
      h: 44,
      blocks: [lab.block, kick.block],
      pills,
      full: sys.label,
      truncated,
      current: laneCurrent,
      secondary: [],
      stage: 'cross',
      expanded: isExp,
    });
  };

  /** Cross-life sub-row: returns its height. */
  const crossRow = (lane: CurrentId, y: number): number => {
    const cur = g.currentById.get(lane)!;
    const sysId = cur.systemNodeId;
    placeSystem(sysId, lane, y + 6);
    if (!expanded.has(sysId)) return L.crossCollapsedH;
    // expanded: the system box grows to house its chains; each chain spans the box's full width
    const chains = g.crossChainsBySystem.get(sysId) ?? [];
    const innerX = contentX0 + 30;
    const innerW = contentW - 60;
    let cy = y + 6 + 44 + 18;
    for (const c of chains) {
      const geo = chainGeometry(g, c, innerW);
      placeChain(c, innerX, cy, 'cross', innerW);
      cy += geo.h + 22;
    }
    const h = cy - y + 4;
    houses.push({ id: sysId, current: lane, x: contentX0 + 10, y: y + 6, w: contentW - 20, h: h - 12 });
    return h;
  };

  /** Rotated row title for the left gutter, wrapped to the row height (max 3 lines). */
  const gutterLabel = (id: string, text: string, top: number, h: number, current?: CurrentId): LaneLabel => {
    const size = 10.5;
    const lh = 13;
    const w = wrapText(text, h - 16, size, 3, true);
    const n = w.lines.length;
    return {
      id,
      current,
      x: 6,
      y: top,
      w: L.gutter - 12,
      h,
      block: {
        lines: w.lines.map((t, i) => ({ text: t, x: 0, y: (i - (n - 1) / 2) * lh + size * 0.35 })),
        size,
        bold: true,
        cls: 't-lane',
        anchor: 'middle',
        maxWidth: h - 16,
      },
    };
  };

  // ---- lanes ------------------------------------------------------------
  let y = lanesTop;
  const laneRows = new Map<CurrentId, { y: number; stageH: number; h: number }>();
  const laneList: CurrentId[] = [...laneIds];
  if (layers.cultural) laneList.push('cultural');
  for (const lane of laneList) {
    const isOverlay = lane === 'cultural';
    // stage sub-row height
    let maxCell = 0;
    const flows = new Map<StageKey, ReturnType<typeof flow>>();
    for (const st of STAGE_KEYS) {
      const f = flow(cells.get(`${lane}|${st}`)!, bandOf(st).w - L.stagePad, L.itemGap);
      flows.set(st, f);
      maxCell = Math.max(maxCell, f.h);
    }
    const stageH = isOverlay
      ? Math.max(L.culturalStageRowH, maxCell ? maxCell + 2 * L.laneCellPad : 0)
      : Math.max(L.laneMinH, maxCell + 2 * L.laneCellPad);
    for (const st of STAGE_KEYS) {
      const b = bandOf(st);
      bands.push({ id: `lane_${lane}_${st}`, kind: 'laneStage', x: b.x, y, w: b.w, h: stageH, current: lane });
      for (const p of flows.get(st)!.pos) {
        const ox = b.x + L.stagePad / 2 + p.x;
        const oy = y + L.laneCellPad + p.y;
        if (p.item.kind === 'chain') placeChain(g.chainById.get(p.item.id)!, ox, oy, st);
        else placeLoop(g.loopById.get(p.item.id)!, ox, oy, st);
      }
    }
    let crossH = 0;
    if (layers.crossLife) {
      crossH = crossRow(lane, y + stageH);
      bands.push({ id: `lanecross_${lane}`, kind: 'laneCross', x: contentX0, y: y + stageH, w: contentW, h: crossH, current: lane });
    }
    const h = stageH + crossH;
    laneRows.set(lane, { y, stageH, h });
    laneLabels.push(gutterLabel(`lane_${lane}`, g.currentById.get(lane)!.label, y, h, lane));
    y += h + L.laneGap;
  }
  const lanesBottom = y - L.laneGap;
  if (layers.cultural) {
    bands.push({
      id: 'overlay_cultural',
      kind: 'overlay',
      x: 0,
      y: lanesTop - 4,
      w: 0, // filled after width is known
      h: lanesBottom - lanesTop + 8,
      current: 'cultural',
    });
  }

  // ---- main loops band ----------------------------------------------------
  y = lanesBottom + L.bandGap;
  if (layers.loops) {
    const items = g.mainLoops.map((lp) => itemFor('loop', lp.id));
    const total = items.reduce((s, it) => s + it.w, 0);
    const maxH = Math.max(...items.map((i) => i.h));
    let bandH = Math.max(L.mainLoopsMinH, maxH + 60);
    const top = y + 44;
    if (total + (items.length + 1) * L.itemGap <= contentW) {
      const gap = (contentW - total) / (items.length + 1);
      let px = contentX0 + gap;
      for (const it of items) {
        placeLoop(g.loopById.get(it.id)!, Math.round(px), top + Math.round((maxH - it.h) / 2), 'main');
        px += it.w + gap;
      }
    } else {
      const f = flow(items, contentW - 40, 40);
      for (const p of f.pos) placeLoop(g.loopById.get(p.item.id)!, contentX0 + 20 + p.x, top + p.y, 'main');
      bandH = Math.max(L.mainLoopsMinH, f.h + 60);
    }
    bands.push({
      id: 'band_mainloops',
      kind: 'mainLoops',
      x: contentX0,
      y,
      w: contentW,
      h: bandH,
    });
    laneLabels.push(gutterLabel('mainloops', 'Main feedback loops', y, bandH));
    y += bandH + L.bandGap;
  }

  // ---- outcomes (far right) --------------------------------------------
  const outcomeX = contentX1 + L.outcomeGap;
  {
    // Tall bars: bold name, then the full description, then the polarity marker (▲/▼ + word).
    const W = L.outcomeW;
    const PAD = 12;
    const NAME_FS = 12;
    const NAME_LH = 15;
    const DESC_FS = 9.5;
    const DESC_LH = 12.5;
    const contentH = (o: MapNode) =>
      PAD + wrapText(o.label, W - 2 * PAD, NAME_FS, 99, true).lines.length * NAME_LH + 6 +
      wrapText(o.description ?? '', W - 2 * PAD, DESC_FS, 99).lines.length * DESC_LH + 10 + 14 + PAD;
    const needH = Math.max(L.outcomeH, ...g.outcomes.map(contentH));
    const top = Math.max(lanesTop, L.stageRowY + 70);
    const n = g.outcomes.length;
    const avail = Math.max(lanesBottom, top + n * (needH + 24)) - top;
    const pitch = avail / n;
    const h = Math.max(needH, Math.min(pitch - 24, 340));
    g.outcomes.forEach((o, i) => {
      const y0 = Math.round(top + pitch * i + (pitch - h) / 2);
      const sym = o.polarity === 'protective' ? '▲' : '▼';
      const name = block(o.label, PAD, PAD + NAME_FS, W - 2 * PAD, NAME_FS, 99, { bold: true, lh: NAME_LH });
      const descY = PAD + NAME_FS + name.block.lines.length * NAME_LH + 6;
      const desc = block(o.description ?? '', PAD, descY, W - 2 * PAD, DESC_FS, 99, { lh: DESC_LH, cls: 't-desc' });
      const pol = block(`${sym} ${o.polarity ?? ''}`, PAD, h - PAD, W - 2 * PAD, 9.5, 1, { cls: 't-polarity' });
      push({
        id: o.id,
        kind: 'outcome',
        x: outcomeX + (L.outcomeColW - W) / 2,
        y: y0,
        w: W,
        h,
        blocks: [name.block, desc.block, pol.block],
        full: o.label,
        truncated: name.truncated || desc.truncated,
        current: null,
        secondary: [],
        stage: 'outcome',
      });
    });
  }
  // reorder: spec tab order is stages → substages → lanes → loops → outcomes; outcomes were pushed
  // after the main loops band already, so order is correct.

  // ---- interventions ----------------------------------------------------
  if (layers.interventions) {
    const list = g.interventions;
    const top = y + 74;
    const gap = Math.max(L.itemGap, (contentW - list.length * L.intW) / (list.length + 1));
    const labLines = (n: MapNode) => wrapText(n.label, L.intW - 20, 11, 99, true).lines.length;
    const typLines = (n: MapNode) => wrapText(n.interventionType ?? '', L.intW - 20, 9.5, 99).lines.length;
    const intH = Math.max(L.intH, ...list.map((n) => 14 + labLines(n) * 14 + 6 + typLines(n) * 12 + 8));
    list.forEach((n, i) => {
      // identical box size for all ten (fitted to the longest text)
      const lab = block(n.label, L.intW / 2, 14 + 11, L.intW - 20, 11, 99, { bold: true, anchor: 'middle', lh: 14 });
      const typ = block(n.interventionType ?? '', L.intW / 2, 14 + 11 + labLines(n) * 14 + 4, L.intW - 20, 9.5, 99, {
        anchor: 'middle',
        cls: 't-sec',
        lh: 12,
      });
      push({
        id: n.id,
        kind: 'intervention',
        x: Math.round(contentX0 + gap + i * (L.intW + gap)),
        y: top,
        w: L.intW,
        h: intH,
        blocks: [lab.block, typ.block],
        full: n.label,
        truncated: lab.truncated || typ.truncated,
        current: null,
        secondary: [],
        stage: 'intervention',
      });
    });
    const h = Math.max(L.interventionsH, 74 + Math.max(...nodes.filter((x) => x.kind === 'intervention').map((x) => x.h)) + 22);
    bands.push({
      id: 'band_interventions',
      kind: 'interventions',
      x: contentX0,
      y,
      w: contentW,
      h,
      label: block('Possible interventions, none selected', 14, 22, contentW - 28, 12, 1, { bold: true, cls: 't-band' })
        .block,
    });
    // design framing note shown in the band header (§9)
    bands.push({
      id: 'band_interventions_note',
      kind: 'interventions',
      x: contentX0,
      y,
      w: 0,
      h: 0,
      label: block(g.data.meta.designFramingNote, 14, 42, Math.min(contentW - 28, 1500), 11, 2, {
        cls: 't-note',
        italic: true,
        lh: 14,
      }).block,
    });
    y += h + L.bandGap;
  }

  const width = outcomeX + L.outcomeColW + L.margin;
  const height = Math.max(y, ...nodes.map((n) => n.y + n.h + 24)) + L.margin;
  // the outcome nodes sit in one full-height column, labelled as a category
  bands.push({
    id: 'band_outcomes',
    kind: 'outcomes',
    x: outcomeX,
    y: L.stageRowY,
    w: L.outcomeColW,
    h: height - L.margin / 2 - L.stageRowY,
    label: block('Consequences/outcomes', L.outcomeColW / 2, 30, L.outcomeColW - 24, 14, 1, { bold: true, anchor: 'middle', cls: 't-band' }).block,
  });
  for (const b of bands) if (b.kind === 'overlay') b.w = contentX1 + 20;

  // tab order already follows push order; outcomes are pushed after lanes+main loops, before refs.
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return {
    nodes,
    byId,
    bands,
    laneLabels,
    stageBands,
    rings,
    lanesTop,
    houses,
    contentX0,
    contentX1,
    outcomeX,
    width,
    height,
  };
}
