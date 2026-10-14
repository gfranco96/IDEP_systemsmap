import { describe, expect, it } from 'vitest';
import { computeLayout, overlaps, type Layout } from '../../src/layout/computeLayout';
import { routeEdges } from '../../src/layout/routeEdges';
import { textWidth } from '../../src/layout/text';
import { aggregateEdges } from '../../src/model/graph';
import { ALL_CONTAINERS, g, view } from './helpers';

function overlapPairs(L: Layout) {
  const out: string[] = [];
  for (let i = 0; i < L.nodes.length; i++)
    for (let j = i + 1; j < L.nodes.length; j++) if (overlaps(L.nodes[i], L.nodes[j])) out.push(`${L.nodes[i].id} × ${L.nodes[j].id}`);
  return out;
}

const STATES: [string, ReturnType<typeof view>][] = [
  ['default', view()],
  ['fully expanded', view(ALL_CONTAINERS, { interventions: true })],
  ['all layers off', view([], { cultural: false, crossLife: false, loops: false, references: false })],
  ...g.data.loops.map((l) => [`loop ${l.id} expanded`, view([l.id])] as [string, ReturnType<typeof view>]),
];

describe('layout invariants (§5 hard requirements)', () => {
  for (const [name, v] of STATES) {
    describe(name, () => {
      const L = computeLayout(g, v);
      it('has no overlapping node boxes', () => {
        expect(overlapPairs(L)).toEqual([]);
      });
      it('keeps every node inside the world bounds', () => {
        for (const n of L.nodes) {
          expect(n.x).toBeGreaterThanOrEqual(0);
          expect(n.y).toBeGreaterThanOrEqual(0);
          expect(n.x + n.w).toBeLessThanOrEqual(L.width);
          expect(n.y + n.h).toBeLessThanOrEqual(L.height);
        }
      });
      it('never lets text overflow its box', () => {
        for (const n of L.nodes)
          for (const b of n.blocks)
            for (const line of b.lines) {
              const w = textWidth(line.text, b.size, b.bold);
              expect(w, `${n.id}: "${line.text}"`).toBeLessThanOrEqual(b.maxWidth + 0.01);
              const left = b.anchor === 'middle' ? line.x - w / 2 : line.x;
              expect(left).toBeGreaterThanOrEqual(-0.01);
              expect(left + w).toBeLessThanOrEqual(n.w + 0.01);
              expect(line.y).toBeLessThanOrEqual(n.h + 0.01);
            }
      });
      it('routes edges without crossing unrelated nodes', () => {
        const routed = routeEdges(g, L, aggregateEdges(g, v, { interventionLinks: 'all' }));
        expect(routed.filter((r) => r.collisions > 0).map((r) => r.key)).toEqual([]);
      });
    });
  }

  it('shows the banner claims verbatim (never truncated)', () => {
    const L = computeLayout(g, view());
    const texts = L.banner.blocks.map((b) => b.lines.map((l) => l.text).join(' '));
    expect(texts).toContain(g.data.meta.centralVisualClaim);
    expect(texts).toContain(g.data.meta.designFraming);
    for (const b of L.banner.blocks) for (const l of b.lines) expect(textWidth(l.text, b.size, b.bold)).toBeLessThanOrEqual(b.maxWidth);
  });

  it('is deterministic (same input → identical output)', () => {
    const a = computeLayout(g, view(['ch_c3', 'loop_B', 'sys_market']));
    const b = computeLayout(g, view(['ch_c3', 'loop_B', 'sys_market']));
    expect(JSON.stringify(a.nodes)).toEqual(JSON.stringify(b.nodes));
    const ra = routeEdges(g, a, aggregateEdges(g, view(['ch_c3', 'loop_B', 'sys_market']), { interventionLinks: 'all' }));
    const rb = routeEdges(g, b, aggregateEdges(g, view(['ch_c3', 'loop_B', 'sys_market']), { interventionLinks: 'all' }));
    expect(ra.map((r) => r.d)).toEqual(rb.map((r) => r.d));
  });

  it('places substages by order, never by age', () => {
    const L = computeLayout(g, view());
    for (const st of ['childhood', 'adolescence', 'adulthood'] as const) {
      const xs = g.substagesByStage.get(st)!.map((s) => L.byId.get(s.id)!.x);
      expect(xs).toEqual([...xs].sort((a, b) => a - b));
      const gaps = xs.slice(1).map((x, i) => x - xs[i]);
      expect(new Set(gaps).size).toBe(1); // equal pitch regardless of age span
    }
  });

  it('puts each stage chain chip in its primary lane and inside its stage band', () => {
    const L = computeLayout(g, view());
    const counts: Record<string, number> = {};
    for (const ch of g.stageChains) {
      const n = L.byId.get(ch.id)!;
      expect(n.kind).toBe('chip');
      const lane = L.bands.find((b) => b.id === `lane_${ch.primaryCurrent}_${ch.stage}`)!;
      expect(n.x).toBeGreaterThanOrEqual(lane.x);
      expect(n.x + n.w).toBeLessThanOrEqual(lane.x + lane.w);
      expect(n.y).toBeGreaterThanOrEqual(lane.y);
      expect(n.y + n.h).toBeLessThanOrEqual(lane.y + lane.h);
      counts[ch.stage!] = (counts[ch.stage!] ?? 0) + 1;
    }
    expect(counts).toEqual({ childhood: 4, adolescence: 4, adulthood: 5 });
  });

  it('applies §4.3 drift and keeps ch_d2 parallel steps in the same column', () => {
    const L = computeLayout(g, view(['ch_d2', 'ch_c1']));
    const a = L.byId.get('ch_d2_s2a')!;
    const b = L.byId.get('ch_d2_s2b')!;
    expect(a.x).toBe(b.x);
    expect(b.y).toBeGreaterThan(a.y);
    // downward chain drifts down, upward chain drifts up
    expect(L.byId.get('ch_d2_s3')!.y).toBeGreaterThan(L.byId.get('ch_d2_s1')!.y);
    expect(L.byId.get('ch_c1_s4')!.y).toBeLessThan(L.byId.get('ch_c1_s1')!.y);
  });

  it('lays loop steps clockwise from 12 o’clock by layout.order', () => {
    const L = computeLayout(g, view(['loop_B']));
    const ring = L.rings.find((r) => r.loopId === 'loop_B')!;
    const lp = g.loopById.get('loop_B')!;
    const first = L.byId.get(lp.stepNodeIds[0])!;
    expect(Math.abs(first.x + first.w / 2 - ring.cx)).toBeLessThan(0.5);
    expect(first.y + first.h / 2).toBeLessThan(ring.cy);
    const second = L.byId.get(lp.stepNodeIds[1])!;
    expect(second.x + second.w / 2).toBeGreaterThan(ring.cx); // clockwise = to the right
    expect(ring.r).toBeGreaterThanOrEqual(Math.max(110, lp.stepNodeIds.length * 22));
  });

  it('widens a stage band when a chain is expanded (reflow)', () => {
    const a = computeLayout(g, view());
    const b = computeLayout(g, view(['ch_d1']));
    const wa = a.stageBands.find((s) => s.stage === 'adulthood')!.w;
    const wb = b.stageBands.find((s) => s.stage === 'adulthood')!.w;
    expect(wb).toBeGreaterThan(wa);
    expect(b.outcomeX).toBeGreaterThan(a.outcomeX);
  });
});
