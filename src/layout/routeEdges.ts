import type { AggEdge, Graph } from '../model/graph';
import { edgeColorCurrent } from '../model/graph';
import type { CurrentId } from '../model/types';
import type { Layout, LNode } from './computeLayout';

export interface Pt {
  x: number;
  y: number;
}
interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
type Side = 'left' | 'right' | 'top' | 'bottom';

export interface RoutedEdge {
  key: string;
  agg: AggEdge;
  d: string;
  mid: Pt;
  /** tangent angle at the midpoint, radians */
  angle: number;
  color: CurrentId | null;
  kind: 'bezier' | 'ortho' | 'arc';
  /** number of unrelated nodes crossed (0 expected) */
  collisions: number;
  pts: Pt[];
}

const NORMAL: Record<Side, Pt> = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  top: { x: 0, y: -1 },
  bottom: { x: 0, y: 1 },
};

function sidePoint(b: Box, s: Side, offset = 0): Pt {
  switch (s) {
    case 'left':
      return { x: b.x, y: b.y + b.h / 2 + offset };
    case 'right':
      return { x: b.x + b.w, y: b.y + b.h / 2 + offset };
    case 'top':
      return { x: b.x + b.w / 2 + offset, y: b.y };
    case 'bottom':
      return { x: b.x + b.w / 2 + offset, y: b.y + b.h };
  }
}

/** Liang–Barsky segment vs box (inflated) intersection. */
function segHitsBox(a: Pt, b: Pt, r: Box, pad: number): boolean {
  const x0 = r.x - pad;
  const y0 = r.y - pad;
  const x1 = r.x + r.w + pad;
  const y1 = r.y + r.h + pad;
  let t0 = 0;
  let t1 = 1;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const p = [-dx, dx, -dy, dy];
  const q = [a.x - x0, x1 - a.x, a.y - y0, y1 - a.y];
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return false;
    } else {
      const t = q[i] / p[i];
      if (p[i] < 0) {
        if (t > t1) return false;
        if (t > t0) t0 = t;
      } else {
        if (t < t0) return false;
        if (t < t1) t1 = t;
      }
    }
  }
  return true;
}

function polyCollisions(pts: Pt[], obstacles: Box[], pad = 4): number {
  let n = 0;
  for (const o of obstacles) {
    for (let i = 0; i < pts.length - 1; i++) {
      if (segHitsBox(pts[i], pts[i + 1], o, pad)) {
        n++;
        break;
      }
    }
  }
  return n;
}

function cubic(p0: Pt, c1: Pt, c2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p3.y,
  };
}

function polyLength(pts: Pt[]): number {
  let s = 0;
  for (let i = 0; i < pts.length - 1; i++) s += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
  return s;
}

/** Point and tangent angle at half the length of a polyline. */
function midOf(pts: Pt[]): { mid: Pt; angle: number } {
  const total = polyLength(pts);
  let acc = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const seg = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
    if (acc + seg >= total / 2 && seg > 0) {
      const t = (total / 2 - acc) / seg;
      return {
        mid: { x: pts[i].x + (pts[i + 1].x - pts[i].x) * t, y: pts[i].y + (pts[i + 1].y - pts[i].y) * t },
        angle: Math.atan2(pts[i + 1].y - pts[i].y, pts[i + 1].x - pts[i].x),
      };
    }
    acc += seg;
  }
  return { mid: pts[0], angle: 0 };
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Axis-aligned segments already used by routed edges, so later edges prefer free channels. */
class Occupancy {
  private h = new Map<number, [number, number][]>();
  private v = new Map<number, [number, number][]>();
  add(pts: Pt[]) {
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      if (Math.abs(a.y - b.y) < 0.5) this.put(this.h, a.y, a.x, b.x);
      else if (Math.abs(a.x - b.x) < 0.5) this.put(this.v, a.x, a.y, b.y);
    }
  }
  private put(m: Map<number, [number, number][]>, c: number, p: number, q: number) {
    const k = Math.round(c);
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push([Math.min(p, q), Math.max(p, q)]);
  }
  private hit(m: Map<number, [number, number][]>, c: number, p: number, q: number): boolean {
    const lo = Math.min(p, q);
    const hi = Math.max(p, q);
    const k = Math.round(c);
    for (let d = -4; d <= 4; d++) for (const [a, b] of m.get(k + d) ?? []) if (Math.min(hi, b) - Math.max(lo, a) > 2) return true;
    return false;
  }
  hitH(y: number, x1: number, x2: number) {
    return this.hit(this.h, y, x1, x2);
  }
  hitV(x: number, y1: number, y2: number) {
    return this.hit(this.v, x, y1, y2);
  }
  /** number of segments of `pts` that run along an existing route */
  count(pts: Pt[]): number {
    let n = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      if (Math.abs(a.y - b.y) < 0.5 ? this.hitH(a.y, a.x, b.x) : Math.abs(a.x - b.x) < 0.5 && this.hitV(a.x, a.y, b.y)) n++;
    }
    return n;
  }
}

/** Drop duplicate and collinear points so every segment is a single straight run. */
function simplify(pts: Pt[]): Pt[] {
  const q: Pt[] = [];
  for (const p of pts) {
    const last = q[q.length - 1];
    if (last && Math.abs(last.x - p.x) < 0.01 && Math.abs(last.y - p.y) < 0.01) continue;
    while (q.length >= 2) {
      const a = q[q.length - 2];
      const b = q[q.length - 1];
      const cross = (b.x - a.x) * (p.y - b.y) - (b.y - a.y) * (p.x - b.x);
      if (Math.abs(cross) < 0.01) q.pop();
      else break;
    }
    q.push(p);
  }
  return q;
}

/** Rounded orthogonal polyline → SVG path. */
function roundedPath(pts: Pt[], radius = 12): string {
  const clean: Pt[] = [];
  for (const p of pts) {
    const last = clean[clean.length - 1];
    if (last && Math.abs(last.x - p.x) < 0.01 && Math.abs(last.y - p.y) < 0.01) continue;
    clean.push(p);
  }
  // drop collinear points
  const q: Pt[] = [];
  for (const p of clean) {
    while (q.length >= 2) {
      const a = q[q.length - 2];
      const b = q[q.length - 1];
      const cross = (b.x - a.x) * (p.y - b.y) - (b.y - a.y) * (p.x - b.x);
      if (Math.abs(cross) < 0.01) q.pop();
      else break;
    }
    q.push(p);
  }
  let d = `M${r1(q[0].x)},${r1(q[0].y)}`;
  for (let i = 1; i < q.length - 1; i++) {
    const a = q[i - 1];
    const b = q[i];
    const c = q[i + 1];
    const l1 = Math.hypot(b.x - a.x, b.y - a.y);
    const l2 = Math.hypot(c.x - b.x, c.y - b.y);
    const r = Math.min(radius, l1 / 2, l2 / 2);
    const p1 = { x: b.x - ((b.x - a.x) / l1) * r, y: b.y - ((b.y - a.y) / l1) * r };
    const p2 = { x: b.x + ((c.x - b.x) / l2) * r, y: b.y + ((c.y - b.y) / l2) * r };
    d += ` L${r1(p1.x)},${r1(p1.y)} Q${r1(b.x)},${r1(b.y)} ${r1(p2.x)},${r1(p2.y)}`;
  }
  const z = q[q.length - 1];
  d += ` L${r1(z.x)},${r1(z.y)}`;
  return d;
}

/** Free coordinates along one axis: midpoints of gaps between obstacles that overlap a span. */
function freeCoords(
  axis: 'y' | 'x',
  lo: number,
  hi: number,
  spanLo: number,
  spanHi: number,
  obstacles: Box[],
  pad = 8,
): number[] {
  const ivs: [number, number][] = [];
  for (const o of obstacles) {
    const oLo = axis === 'y' ? o.x : o.y;
    const oHi = axis === 'y' ? o.x + o.w : o.y + o.h;
    if (oHi < spanLo - pad || oLo > spanHi + pad) continue;
    const a = (axis === 'y' ? o.y : o.x) - pad;
    const b = (axis === 'y' ? o.y + o.h : o.x + o.w) + pad;
    if (b < lo || a > hi) continue;
    ivs.push([a, b]);
  }
  ivs.sort((p, q) => p[0] - q[0]);
  const gaps: number[] = [];
  let cur = lo;
  for (const [a, b] of ivs) {
    if (a > cur + 4) gaps.push((cur + a) / 2);
    cur = Math.max(cur, b);
  }
  if (hi > cur + 4) gaps.push((cur + hi) / 2);
  return gaps;
}

interface Endpoint {
  box: Box;
  sides: Side[];
  /** fixed port coordinate offset along side */
  offset: number;
  /** stub length (distance the route leaves the box before turning) */
  stub: number;
  /** fixed absolute port point (outcome slots) */
  fixed?: { side: Side; p: Pt };
  /** loop hubs carry their title under the circle: never attach a line there */
  noBottom?: boolean;
}

interface Candidate {
  pts: Pt[];
  d: string;
  kind: 'bezier' | 'ortho';
  collisions: number;
  score: number;
}

function preferredSides(a: Box, b: Box): [Side[], Side[]] {
  const acx = a.x + a.w / 2;
  const acy = a.y + a.h / 2;
  const bcx = b.x + b.w / 2;
  const bcy = b.y + b.h / 2;
  const gapX = Math.abs(bcx - acx) - (a.w + b.w) / 2;
  const gapY = Math.abs(bcy - acy) - (a.h + b.h) / 2;
  const hx: [Side, Side] = bcx >= acx ? ['right', 'left'] : ['left', 'right'];
  const vy: [Side, Side] = bcy >= acy ? ['bottom', 'top'] : ['top', 'bottom'];
  if (gapX >= gapY) return [[hx[0], vy[0], vy[1]], [hx[1], vy[1], vy[0]]];
  return [[vy[0], hx[0], hx[1]], [vy[1], hx[1], hx[0]]];
}

function port(e: Endpoint, side: Side): Pt {
  if (e.fixed && e.fixed.side === side) return e.fixed.p;
  const along = side === 'left' || side === 'right' ? Math.min(Math.abs(e.offset), e.box.h / 2 - 6) * Math.sign(e.offset) : Math.min(Math.abs(e.offset), e.box.w / 2 - 6) * Math.sign(e.offset);
  return sidePoint(e.box, side, along);
}

/** Point where the route leaves the box: measured from the bounding-box side, not the port. */
function stubPoint(e: Endpoint, side: Side, p: Pt): Pt {
  const b = e.box;
  switch (side) {
    case 'left':
      return { x: b.x - e.stub, y: p.y };
    case 'right':
      return { x: b.x + b.w + e.stub, y: p.y };
    case 'top':
      return { x: p.x, y: b.y - e.stub };
    case 'bottom':
      return { x: p.x, y: b.y + b.h + e.stub };
  }
}

function bezierCandidate(p0: Pt, s0: Side, p3: Pt, s3: Side, shift: number): Pt[] {
  const n0 = NORMAL[s0];
  const n3 = NORMAL[s3];
  const dist = Math.hypot(p3.x - p0.x, p3.y - p0.y);
  const k = Math.max(30, Math.min(220, dist * 0.45));
  // perpendicular of the chord
  const len = dist || 1;
  const px = -(p3.y - p0.y) / len;
  const py = (p3.x - p0.x) / len;
  const c1 = { x: p0.x + n0.x * k + px * shift, y: p0.y + n0.y * k + py * shift };
  const c2 = { x: p3.x + n3.x * k + px * shift, y: p3.y + n3.y * k + py * shift };
  const pts: Pt[] = [];
  for (let i = 0; i <= 40; i++) pts.push(cubic(p0, c1, c2, p3, i / 40));
  (pts as Pt[] & { ctrl?: Pt[] }).ctrl = [c1, c2];
  return pts;
}

function bezierPath(p0: Pt, ctrl: Pt[], p3: Pt): string {
  return `M${r1(p0.x)},${r1(p0.y)} C${r1(ctrl[0].x)},${r1(ctrl[0].y)} ${r1(ctrl[1].x)},${r1(ctrl[1].y)} ${r1(p3.x)},${r1(p3.y)}`;
}

function route(
  src: Endpoint,
  dst: Endpoint,
  obstacles: Box[],
  world: { w: number; h: number },
  channelUse: Map<string, number>,
  occ: Occupancy,
): Candidate {
  const [ss, ds] = preferredSides(src.box, dst.box);
  const okSide = (e: Endpoint) => (sd: Side) => !(e.noBottom && sd === 'bottom');
  const srcSides = (src.fixed ? [src.fixed.side] : src.sides.length ? src.sides : ss).filter(okSide(src));
  const dstSides = (dst.fixed ? [dst.fixed.side] : dst.sides.length ? dst.sides : ds).filter(okSide(dst));
  if (!srcSides.length) srcSides.push(...(['right', 'left', 'top'] as Side[]));
  if (!dstSides.length) dstSides.push(...(['left', 'right', 'top'] as Side[]));
  const near = obstacles.filter((o) => {
    const minX = Math.min(src.box.x, dst.box.x) - 700;
    const maxX = Math.max(src.box.x + src.box.w, dst.box.x + dst.box.w) + 700;
    const minY = Math.min(src.box.y, dst.box.y) - 700;
    const maxY = Math.max(src.box.y + src.box.h, dst.box.y + dst.box.h) + 700;
    return o.x + o.w > minX && o.x < maxX && o.y + o.h > minY && o.y < maxY;
  });

  // 1) direct Bézier (preferred when clear; long outcome links use the bundled orthogonal style)
  const bz: Candidate[] = [];
  const longOutcome = !!dst.fixed && Math.abs(dst.box.x - (src.box.x + src.box.w)) > 260;
  if (!longOutcome)
  for (const s0 of srcSides.slice(0, 1))
    for (const s3 of dstSides.slice(0, 1))
      for (const shift of [0, -40, 40, -80, 80]) {
        const p0 = port(src, s0);
        const p3 = port(dst, s3);
        const pts = bezierCandidate(p0, s0, p3, s3, shift);
        const col = polyCollisions(pts, near);
        const ctrl = (pts as Pt[] & { ctrl?: Pt[] }).ctrl!;
        bz.push({ pts, d: bezierPath(p0, ctrl, p3), kind: 'bezier', collisions: col, score: col * 1e6 + polyLength(pts) + Math.abs(shift) });
        if (col === 0) return bz[bz.length - 1];
      }

  // 2) rounded orthogonal routes through free channels
  const all = [src.box, dst.box];
  const cands: Candidate[] = [...bz];
  const tryPts = (pts: Pt[], extraBends: number) => {
    // middle segments must also avoid the endpoint boxes themselves
    const inner = pts.slice(1, -1);
    let col = polyCollisions(pts, near);
    if (inner.length >= 2) col += polyCollisions(inner, all, 1);
    const shared = occ.count(simplify(pts));
    const score = col * 1e6 + shared * 4000 + polyLength(pts) + (pts.length + extraBends) * 25;
    cands.push({ pts: simplify(pts), d: roundedPath(pts), kind: 'ortho', collisions: col, score });
    return col === 0 && shared === 0;
  };
  let best: Candidate | null = null;
  const pick = () => {
    for (const c of cands) if (!best || c.score < best.score) best = c;
    return best!;
  };
  for (const s0 of srcSides) {
    for (const s3 of dstSides) {
      const p0 = port(src, s0);
      const p3 = port(dst, s3);
      const a = stubPoint(src, s0, p0);
      const b = stubPoint(dst, s3, p3);
      const loX = Math.min(a.x, b.x);
      const hiX = Math.max(a.x, b.x);
      // horizontal channel candidates (V-H-V)
      const ys = freeCoords('y', Math.max(0, Math.min(a.y, b.y) - 900), Math.min(world.h, Math.max(a.y, b.y) + 900), loX, hiX, near);
      ys.push(a.y, b.y);
      const target = (a.y + b.y) / 2;
      ys.sort((u, v) => Math.abs(u - target) - Math.abs(v - target));
      let found = false;
      for (const cy0 of ys.slice(0, 10)) {
        const ck = `h${Math.round(cy0)}`;
        const used = channelUse.get(ck) ?? 0;
        const cy = cy0 + (used % 2 ? 1 : -1) * Math.ceil(used / 2) * 6;
        const pts = [p0, a, { x: a.x, y: cy }, { x: b.x, y: cy }, b, p3];
        if (tryPts(pts, 0)) {
          channelUse.set(ck, used + 1);
          found = true;
          break;
        }
      }
      if (found) return pick();
      // vertical channel candidates (H-V-H)
      const loY = Math.min(a.y, b.y);
      const hiY = Math.max(a.y, b.y);
      const xs = freeCoords('x', Math.max(0, loX - 600), Math.min(world.w, hiX + 600), loY, hiY, near);
      xs.push(a.x, b.x);
      const tx = (a.x + b.x) / 2;
      xs.sort((u, v) => Math.abs(u - tx) - Math.abs(v - tx));
      for (const cx of xs.slice(0, 10)) {
        const pts = [p0, a, { x: cx, y: a.y }, { x: cx, y: b.y }, b, p3];
        if (tryPts(pts, 0)) return pick();
      }
    }
  }
  // 3) orthogonal A* on a sparse visibility grid (dense regions)
  const starts = srcSides.map((sd) => {
    const p = port(src, sd);
    return { p, stub: stubPoint(src, sd, p), side: sd };
  });
  const goals = dstSides.map((sd) => {
    const p = port(dst, sd);
    return { p, stub: stubPoint(dst, sd, p), side: sd };
  });
  const path = gridRoute(starts, goals, near, all, occ);
  if (path) tryPts(path, 0);
  return pick();
}

// ---------------------------------------------------------------------------
// Orthogonal A* over a sparse grid built from obstacle boundaries
// ---------------------------------------------------------------------------
const DIRS: Pt[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

class Heap {
  private k: number[] = [];
  private v: number[] = [];
  push(key: number, val: number) {
    const k = this.k;
    const v = this.v;
    k.push(key);
    v.push(val);
    let i = k.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (k[p] <= k[i]) break;
      [k[p], k[i]] = [k[i], k[p]];
      [v[p], v[i]] = [v[i], v[p]];
      i = p;
    }
  }
  pop(): number | undefined {
    const k = this.k;
    const v = this.v;
    if (!k.length) return undefined;
    const top = v[0];
    const lk = k.pop()!;
    const lv = v.pop()!;
    if (k.length) {
      k[0] = lk;
      v[0] = lv;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < k.length && k[l] < k[m]) m = l;
        if (r < k.length && k[r] < k[m]) m = r;
        if (m === i) break;
        [k[m], k[i]] = [k[i], k[m]];
        [v[m], v[i]] = [v[i], v[m]];
        i = m;
      }
    }
    return top;
  }
  get size() {
    return this.k.length;
  }
}

function gridRoute(
  starts: { p: Pt; stub: Pt; side: Side }[],
  goals: { p: Pt; stub: Pt; side: Side }[],
  obstacles: Box[],
  endpoints: Box[],
  occ?: Occupancy,
): Pt[] | null {
  const PAD = 8;
  const blocks = [...obstacles, ...endpoints].map((o) => ({ x0: o.x - PAD, x1: o.x + o.w + PAD, y0: o.y - PAD, y1: o.y + o.h + PAD }));
  const xsSet = new Set<number>();
  const ysSet = new Set<number>();
  for (const b of blocks) {
    xsSet.add(b.x0).add(b.x1).add(b.x0 - 8).add(b.x1 + 8);
    ysSet.add(b.y0).add(b.y1).add(b.y0 - 8).add(b.y1 + 8);
  }
  for (const s of [...starts, ...goals]) {
    xsSet.add(s.stub.x);
    ysSet.add(s.stub.y);
  }
  const addMid = (arr: number[]) => {
    const out = [...arr];
    for (let i = 0; i < arr.length - 1; i++) if (arr[i + 1] - arr[i] > 40) out.push((arr[i] + arr[i + 1]) / 2);
    return out.sort((a, b) => a - b);
  };
  const xs = addMid([...xsSet].map((v) => Math.round(v * 10) / 10).sort((a, b) => a - b).filter((v, i, a) => i === 0 || v !== a[i - 1]));
  const ys = addMid([...ysSet].map((v) => Math.round(v * 10) / 10).sort((a, b) => a - b).filter((v, i, a) => i === 0 || v !== a[i - 1]));
  const nx = xs.length;
  const ny = ys.length;
  const idx = (i: number, j: number) => j * nx + i;
  const blockedNode = new Uint8Array(nx * ny);
  const blockedH = new Uint8Array(nx * ny); // segment (i,j)-(i+1,j)
  const blockedV = new Uint8Array(nx * ny); // segment (i,j)-(i,j+1)
  const lb = (arr: number[], v: number) => {
    let lo = 0;
    let hi = arr.length;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (arr[m] < v) lo = m + 1;
      else hi = m;
    }
    return lo;
  };
  for (const b of blocks) {
    const i0 = lb(xs, b.x0);
    const i1 = lb(xs, b.x1 + 1e-6);
    const j0 = lb(ys, b.y0);
    const j1 = lb(ys, b.y1 + 1e-6);
    for (let j = j0; j < j1; j++)
      for (let i = i0; i < i1; i++) {
        const x = xs[i];
        const y = ys[j];
        const inX = x > b.x0 && x < b.x1;
        const inY = y > b.y0 && y < b.y1;
        if (inX && inY) blockedNode[idx(i, j)] = 1;
        if (inY && i + 1 < nx && (x + xs[i + 1]) / 2 > b.x0 && (x + xs[i + 1]) / 2 < b.x1) blockedH[idx(i, j)] = 1;
        if (inX && j + 1 < ny && (y + ys[j + 1]) / 2 > b.y0 && (y + ys[j + 1]) / 2 < b.y1) blockedV[idx(i, j)] = 1;
      }
    // segments that start just before the box
    if (i0 > 0)
      for (let j = j0; j < j1; j++) {
        const y = ys[j];
        const xm = (xs[i0 - 1] + xs[i0]) / 2;
        if (y > b.y0 && y < b.y1 && xm > b.x0 && xm < b.x1) blockedH[idx(i0 - 1, j)] = 1;
      }
    if (j0 > 0)
      for (let i = i0; i < i1; i++) {
        const x = xs[i];
        const ym = (ys[j0 - 1] + ys[j0]) / 2;
        if (x > b.x0 && x < b.x1 && ym > b.y0 && ym < b.y1) blockedV[idx(i, j0 - 1)] = 1;
      }
  }
  const goalIdx = new Map<number, number>();
  goals.forEach((gl, k) => goalIdx.set(idx(lb(xs, gl.stub.x - 1e-6), lb(ys, gl.stub.y - 1e-6)), k));
  const N = nx * ny * 4;
  const dist = new Float64Array(N).fill(Infinity);
  const prev = new Int32Array(N).fill(-1);
  const heap = new Heap();
  const h = (i: number, j: number) => {
    let best = Infinity;
    for (const gl of goals) best = Math.min(best, Math.abs(xs[i] - gl.stub.x) + Math.abs(ys[j] - gl.stub.y));
    return best;
  };
  const dirOfSide: Record<Side, number> = { right: 0, left: 1, bottom: 2, top: 3 };
  for (const s of starts) {
    const i = lb(xs, s.stub.x - 1e-6);
    const j = lb(ys, s.stub.y - 1e-6);
    const d = dirOfSide[s.side];
    const st = idx(i, j) * 4 + d;
    dist[st] = 0;
    heap.push(h(i, j), st);
  }
  const BEND = 40;
  let found = -1;
  let guard = 0;
  while (heap.size && guard++ < 400000) {
    const st = heap.pop()!;
    const cell = st >> 2;
    const d = st & 3;
    const i = cell % nx;
    const j = (cell - i) / nx;
    const gk = goalIdx.get(cell);
    if (gk !== undefined) {
      const need = { left: 0, right: 1, top: 2, bottom: 3 }[goals[gk].side];
      if (need === d) {
        found = st;
        break;
      }
    }
    const base = dist[st];
    for (let nd = 0; nd < 4; nd++) {
      const D = DIRS[nd];
      const ni = i + D.x;
      const nj = j + D.y;
      if (ni < 0 || nj < 0 || ni >= nx || nj >= ny) continue;
      if (D.x === 1 && blockedH[idx(i, j)]) continue;
      if (D.x === -1 && blockedH[idx(ni, nj)]) continue;
      if (D.y === 1 && blockedV[idx(i, j)]) continue;
      if (D.y === -1 && blockedV[idx(ni, nj)]) continue;
      const ncell = idx(ni, nj);
      if (blockedNode[ncell] && !goalIdx.has(ncell)) continue;
      if ((nd ^ d) === 1) continue; // no U-turns
      const len = Math.abs(xs[ni] - xs[i]) + Math.abs(ys[nj] - ys[j]);
      // running along another edge is allowed but expensive, so free channels win
      const shared = occ && (D.x !== 0 ? occ.hitH(ys[j], xs[i], xs[ni]) : occ.hitV(xs[i], ys[j], ys[nj])) ? 300 + len * 3 : 0;
      const cost = base + len + (nd === d ? 0 : BEND) + shared;
      const ns = ncell * 4 + nd;
      if (cost < dist[ns]) {
        dist[ns] = cost;
        prev[ns] = st;
        heap.push(cost + h(ni, nj), ns);
      }
    }
  }
  if (found < 0) return null;
  const cells: Pt[] = [];
  let cur = found;
  while (cur >= 0) {
    const c = cur >> 2;
    const i = c % nx;
    const j = (c - i) / nx;
    cells.push({ x: xs[i], y: ys[j] });
    cur = prev[cur];
  }
  cells.reverse();
  const first = cells[0];
  const last = cells[cells.length - 1];
  const s = starts.find((s) => Math.abs(s.stub.x - first.x) < 0.2 && Math.abs(s.stub.y - first.y) < 0.2) ?? starts[0];
  const gl = goals.find((g) => Math.abs(g.stub.x - last.x) < 0.2 && Math.abs(g.stub.y - last.y) < 0.2) ?? goals[0];
  return [s.p, ...cells, gl.p];
}

/** §4.2 / §5 edge routing for the currently visible (aggregated) edges. */
export function routeEdges(g: Graph, layout: Layout, aggs: AggEdge[]): RoutedEdge[] {
  // nodes, plus the left gutter that holds the rotated row titles (lines never run over it)
  const obstacleNodes: Box[] & { id?: string }[] = [...layout.nodes, gutterBox(layout)];
  const world = { w: layout.width, h: layout.height };
  const out: RoutedEdge[] = [];
  const channelUse = new Map<string, number>();
  const occ = new Occupancy();
  const ringByLoop = new Map(layout.rings.map((r) => [r.loopId, r]));

  // outcome slots: edges converge on the target's left side, ≥10px apart
  const outcomeSlots = new Map<string, Pt>();
  const outcomeStub = new Map<string, number>();
  const byOutcome = new Map<string, AggEdge[]>();
  for (const a of aggs) {
    const t = layout.byId.get(a.target);
    if (t?.kind === 'outcome') {
      if (!byOutcome.has(a.target)) byOutcome.set(a.target, []);
      byOutcome.get(a.target)!.push(a);
    }
  }
  for (const [oid, list] of byOutcome) {
    const o = layout.byId.get(oid)!;
    const cy = o.y + o.h / 2;
    list.sort((p, q) => {
      const a = layout.byId.get(p.source)!;
      const b = layout.byId.get(q.source)!;
      return a.y + a.h / 2 - (b.y + b.h / 2) || a.x - b.x || p.key.localeCompare(q.key);
    });
    const n = list.length;
    const spacing = n > 1 ? Math.max(10, Math.min(14, (o.h - 16) / (n - 1))) : 0;
    list.forEach((a, i) => {
      const y = cy + (i - (n - 1) / 2) * spacing;
      // outcomes are rounded rectangles: links enter the straight left side
      outcomeSlots.set(a.key, { x: o.x, y });
      outcomeStub.set(a.key, 14 + i * 7);
    });
  }

  // parallel edges between the same pair are offset 8px apart; multiple outgoing outcome links spread
  const pairCount = new Map<string, AggEdge[]>();
  for (const a of aggs) {
    const k = [a.source, a.target].sort().join('|');
    if (!pairCount.has(k)) pairCount.set(k, []);
    pairCount.get(k)!.push(a);
  }
  const srcOutcomeLinks = new Map<string, AggEdge[]>();
  for (const a of aggs)
    if (outcomeSlots.has(a.key)) {
      if (!srcOutcomeLinks.has(a.source)) srcOutcomeLinks.set(a.source, []);
      srcOutcomeLinks.get(a.source)!.push(a);
    }

  // deterministic processing order: short edges first, then by key
  const sorted = [...aggs].sort((p, q) => p.key.localeCompare(q.key));
  for (const a of sorted) {
    const s0 = layout.byId.get(a.source);
    const t0 = layout.byId.get(a.target);
    if (!s0 || !t0) continue;
    const s = anchorBox(s0);
    const t = anchorBox(t0);
    const color = colorFor(g, a);
    const ring = a.members[0].loopId ? ringByLoop.get(a.members[0].loopId) : undefined;
    if (ring && s.kind === 'loop_step' && t.kind === 'loop_step') {
      out.push(arcEdge(a, s, t, ring, color));
      continue;
    }
    const pair = pairCount.get([a.source, a.target].sort().join('|'))!;
    const pi = pair.indexOf(a);
    const pairOff = (pi - (pair.length - 1) / 2) * 8;
    const sl = srcOutcomeLinks.get(a.source);
    const srcOff = sl && sl.length > 1 ? (sl.indexOf(a) - (sl.length - 1) / 2) * 10 : pairOff;
    const slot = outcomeSlots.get(a.key);
    const src: Endpoint = { box: s, sides: slot ? ['right', 'bottom', 'top'] : [], offset: srcOff, stub: 14, noBottom: s0.kind === 'loop' };
    const dst: Endpoint = slot
      ? { box: t, sides: ['left'], offset: 0, stub: outcomeStub.get(a.key)!, fixed: { side: 'left', p: slot } }
      : { box: t, sides: [], offset: pairOff, stub: 14, noBottom: t0.kind === 'loop' };
    const obstacles = obstacleNodes.filter((n) => (n as { id?: string }).id !== s.id && (n as { id?: string }).id !== t.id);
    const c = route(src, dst, obstacles, world, channelUse, occ);
    if (c.kind === 'ortho') occ.add(c.pts);
    const { mid, angle } = midOf(c.pts);
    out.push({ key: a.key, agg: a, d: c.d, mid, angle, color, kind: c.kind, collisions: c.collisions, pts: c.pts });
  }
  separateOverlaps(out, layout);
  return out;
}

// ---------------------------------------------------------------------------
// Overlap separation: parallel segments of different edges that lie on top of each other are spread
// apart (6 px) so every line stays distinguishable without hovering. A shift is undone if it would make
// an edge cross a node.
// ---------------------------------------------------------------------------
const SEP = 6;

interface Seg {
  r: RoutedEdge;
  i: number;
  horiz: boolean;
  c: number;
  lo: number;
  hi: number;
}

function segmentsOf(routes: RoutedEdge[], interiorOnly: boolean): Seg[] {
  const segs: Seg[] = [];
  for (const r of routes) {
    if (r.kind !== 'ortho') continue;
    const p = r.pts;
    const from = interiorOnly ? 1 : 0;
    const to = interiorOnly ? p.length - 2 : p.length - 1;
    for (let i = from; i < to; i++) {
      const a = p[i];
      const b = p[i + 1];
      if (Math.abs(a.y - b.y) < 0.5 && Math.abs(a.x - b.x) > 0.5)
        segs.push({ r, i, horiz: true, c: a.y, lo: Math.min(a.x, b.x), hi: Math.max(a.x, b.x) });
      else if (Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) > 0.5)
        segs.push({ r, i, horiz: false, c: a.x, lo: Math.min(a.y, b.y), hi: Math.max(a.y, b.y) });
    }
  }
  return segs;
}

/** Pairs of segments from different edges that run along each other (closer than `tol`, overlapping > 2px). */
export function overlappingPairs(routes: RoutedEdge[], tol = 2): [Seg, Seg][] {
  const segs = segmentsOf(routes, false);
  const out: [Seg, Seg][] = [];
  for (let i = 0; i < segs.length; i++)
    for (let j = i + 1; j < segs.length; j++) {
      const a = segs[i];
      const b = segs[j];
      if (a.r === b.r || a.horiz !== b.horiz) continue;
      if (Math.abs(a.c - b.c) >= tol) continue;
      if (Math.min(a.hi, b.hi) - Math.max(a.lo, b.lo) > 2) out.push([a, b]);
    }
  return out;
}

/** End points must stay on their node's edge (≥ 4px from the corners) when a stub is slid sideways. */
function attached(p: Pt, b: Box): boolean {
  const onX = p.x >= b.x - 0.5 && p.x <= b.x + b.w + 0.5;
  const onY = p.y >= b.y - 0.5 && p.y <= b.y + b.h + 0.5;
  if (!onX || !onY) return false;
  const left = Math.abs(p.x - b.x) < 0.5 || Math.abs(p.x - (b.x + b.w)) < 0.5;
  if (left) return p.y >= b.y + 4 && p.y <= b.y + b.h - 4;
  return p.x >= b.x + 4 && p.x <= b.x + b.w - 4;
}

function edgeCollides(r: RoutedEdge, layout: Layout): number {
  const s = layout.byId.get(r.agg.source)!;
  const t = layout.byId.get(r.agg.target)!;
  if (!attached(r.pts[0], anchorBox(s)) || !attached(r.pts[r.pts.length - 1], anchorBox(t))) return 1;
  const obstacles: Box[] = [...layout.nodes.filter((n) => n.id !== s.id && n.id !== t.id), gutterBox(layout)];
  let col = polyCollisions(r.pts, obstacles);
  const inner = r.pts.slice(1, -1);
  if (inner.length >= 2) col += polyCollisions(inner, [anchorBox(s), anchorBox(t)], 1);
  return col;
}

function rebuild(r: RoutedEdge) {
  r.d = roundedPath(r.pts);
  const m = midOf(r.pts);
  r.mid = m.mid;
  r.angle = m.angle;
}

function separateOverlaps(routes: RoutedEdge[], layout: Layout) {
  for (let pass = 0; pass < 4; pass++) {
    const segs = segmentsOf(routes, false);
    // union-find clusters of near-collinear, overlapping segments from different edges
    const parent = segs.map((_, i) => i);
    const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
    let any = false;
    for (let i = 0; i < segs.length; i++)
      for (let j = i + 1; j < segs.length; j++) {
        const a = segs[i];
        const b = segs[j];
        if (a.r === b.r || a.horiz !== b.horiz) continue;
        if (Math.abs(a.c - b.c) >= SEP - 0.5) continue;
        if (Math.min(a.hi, b.hi) - Math.max(a.lo, b.lo) <= 2) continue;
        parent[find(i)] = find(j);
        any = true;
      }
    if (!any) return;
    const clusters = new Map<number, Seg[]>();
    segs.forEach((sg, i) => {
      const root = find(i);
      if (!clusters.has(root)) clusters.set(root, []);
      clusters.get(root)!.push(sg);
    });
    for (const members of clusters.values()) {
      if (members.length < 2) continue;
      members.sort((a, b) => a.c - b.c || a.r.key.localeCompare(b.r.key) || a.i - b.i);
      const n = members.length;
      const mean = members.reduce((acc, m) => acc + m.c, 0) / n;
      const saved = new Map<RoutedEdge, Pt[]>();
      for (const m of members) if (!saved.has(m.r)) saved.set(m.r, m.r.pts.map((p) => ({ ...p })));
      const touched = new Set(members.map((m) => m.r));
      // try: centred spread, then spread to one side or the other, with decreasing spacing
      const attempts: ((k: number, sep: number) => number)[] = [
        (k, sep) => mean + (k - (n - 1) / 2) * sep,
        (k, sep) => Math.min(...members.map((m) => m.c)) + k * sep,
        (k, sep) => Math.max(...members.map((m) => m.c)) - (n - 1 - k) * sep,
      ];
      let ok = false;
      for (const sep of [SEP, 4.5, 3.5]) {
        for (const at of attempts) {
          members.forEach((m, k) => {
            const v = at(k, sep);
            const p = m.r.pts;
            if (m.horiz) p[m.i].y = p[m.i + 1].y = v;
            else p[m.i].x = p[m.i + 1].x = v;
          });
          if (![...touched].some((r) => edgeCollides(r, layout) > 0)) {
            ok = true;
            break;
          }
          for (const [r, pts] of saved) r.pts = pts.map((p) => ({ ...p }));
        }
        if (ok) break;
      }
      if (!ok) {
        // greedy fallback: keep the first line, move each other one to the nearest free offset that is valid
        const placed: Seg[] = [members[0]];
        for (const m of members.slice(1)) {
          const p = m.r.pts;
          const orig = m.c;
          const clash = (v: number) =>
            placed.some(
              (o) => o.r !== m.r && Math.abs(o.c - v) < SEP - 0.5 && Math.min(o.hi, m.hi) - Math.max(o.lo, m.lo) > 2,
            );
          let done = false;
          for (const step of [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5]) {
            const v = orig + step * SEP;
            if (clash(v)) continue;
            const keep = p.map((q) => ({ ...q }));
            if (m.horiz) p[m.i].y = p[m.i + 1].y = v;
            else p[m.i].x = p[m.i + 1].x = v;
            if (edgeCollides(m.r, layout) === 0) {
              m.c = v;
              done = true;
              break;
            }
            m.r.pts = keep;
          }
          if (done) placed.push(m);
        }
      }
      for (const r of touched) rebuild(r);
    }
  }
}

function gutterBox(layout: Layout): Box & { id: string } {
  return { id: '__gutter', x: 0, y: 0, w: layout.contentX0 - 2, h: layout.height };
}

/** Loop hubs connect at their circle, not at the title block underneath. */
function anchorBox(n: LNode): LNode {
  if (n.kind !== 'loop') return n;
  return { ...n, x: n.x + n.w / 2 - 48, y: n.y, w: 96, h: 96 };
}

function colorFor(g: Graph, a: AggEdge): CurrentId | null {
  const cs = new Set(a.members.map((e) => edgeColorCurrent(g, e)));
  return cs.size === 1 ? [...cs][0] : null;
}

function arcEdge(a: AggEdge, s: LNode, t: LNode, ring: { cx: number; cy: number; r: number }, color: CurrentId | null): RoutedEdge {
  const ang = (n: LNode) => Math.atan2(n.y + n.h / 2 - ring.cy, n.x + n.w / 2 - ring.cx);
  const at = (th: number): Pt => ({ x: ring.cx + ring.r * Math.cos(th), y: ring.cy + ring.r * Math.sin(th) });
  const inside = (p: Pt, n: LNode, pad: number) =>
    p.x > n.x - pad && p.x < n.x + n.w + pad && p.y > n.y - pad && p.y < n.y + n.h + pad;
  let a0 = ang(s);
  let a1 = ang(t);
  while (a1 <= a0) a1 += 2 * Math.PI; // clockwise (screen coordinates)
  let start = a0;
  while (inside(at(start), s, 5) && start < a1) start += 0.005;
  let end = a1;
  while (inside(at(end), t, 9) && end > start) end -= 0.005;
  const p0 = at(start);
  const p1 = at(end);
  const large = end - start > Math.PI ? 1 : 0;
  const d = `M${r1(p0.x)},${r1(p0.y)} A${r1(ring.r)},${r1(ring.r)} 0 ${large} 1 ${r1(p1.x)},${r1(p1.y)}`;
  const m = (start + end) / 2;
  const pts: Pt[] = [];
  for (let i = 0; i <= 16; i++) pts.push(at(start + ((end - start) * i) / 16));
  return { key: a.key, agg: a, d, mid: at(m), angle: m + Math.PI / 2, color, kind: 'arc', collisions: 0, pts };
}
