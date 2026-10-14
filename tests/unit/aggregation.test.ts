import { describe, expect, it } from 'vitest';
import { aggregateEdges, representative, trace, membersOf } from '../../src/model/graph';
import { g, view } from './helpers';

const NO_INT = { interventionLinks: new Set<string>() };

describe('collapsed-edge aggregation (§6.3)', () => {
  it('lifts ch_c3_s4 → out_extrinsic_orientation to the chip when collapsed', () => {
    const aggs = aggregateEdges(g, view(), NO_INT);
    const e = aggs.find((a) => a.members.some((m) => m.id === 'e023'))!;
    expect(e.source).toBe('ch_c3');
    expect(e.target).toBe('out_extrinsic_orientation');
    expect(e.lifted).toBe(true);
  });

  it('draws it from the step when expanded', () => {
    const aggs = aggregateEdges(g, view(['ch_c3']), NO_INT);
    const e = aggs.find((a) => a.members.some((m) => m.id === 'e023'))!;
    expect(e.source).toBe('ch_c3_s4');
    expect(e.lifted).toBe(false);
  });

  it('hides edges internal to a collapsed container', () => {
    const aggs = aggregateEdges(g, view(), NO_INT);
    for (const id of ['e020', 'e021', 'e022', 'e096', 'e100', 'e075'])
      expect(aggs.some((a) => a.members.some((m) => m.id === id))).toBe(false);
  });

  it('merges identical (source, target, arrowType) and keeps mixed arrow types separate', () => {
    // ch_d2 has two downward links into outcomes from different steps; collapsed they go to two outcomes
    const aggs = aggregateEdges(g, view(), NO_INT);
    const d2 = aggs.filter((a) => a.source === 'ch_d2');
    expect(d2.map((a) => a.target).sort()).toEqual(['out_burnout', 'out_joy_deficit']);
    // ch_c4 has one downward and one upward outcome link: drawn once per distinct arrow type
    const c4 = aggs.filter((a) => a.source === 'ch_c4');
    expect(c4.map((a) => a.arrowType).sort()).toEqual(['downward', 'upward']);
  });

  it('aggregates intervention links into a collapsed system bar with a count', () => {
    const aggs = aggregateEdges(g, view([], { interventions: true }), { interventionLinks: 'all' });
    // int_accessible_play_kit → xl_cul2_s2 and int_intergenerational → xl_cul2_s2 lift to sys_cultural
    const toCul = aggs.filter((a) => a.target === 'sys_cultural');
    expect(toCul.map((a) => a.source).sort()).toEqual(['int_accessible_play_kit', 'int_intergenerational']);
    // loop step membership: loop hub is the representative
    expect(representative(g, 'loop_A_s3', view())).toBe('loop_A');
    expect(representative(g, 'loop_A_s3', view(['loop_A']))).toBe('loop_A_s3');
    expect(representative(g, 'xl_fam1_s2', view())).toBe('sys_family');
    expect(representative(g, 'xl_fam1_s2', view([], { crossLife: false }))).toBeNull();
  });

  it('shows intervention edges only for the active intervention unless "all"', () => {
    const v = view([], { interventions: true });
    expect(aggregateEdges(g, v, NO_INT).some((a) => a.arrowType === 'dashed')).toBe(false);
    const one = aggregateEdges(g, v, { interventionLinks: new Set(['int_protected_time']) }).filter((a) => a.arrowType === 'dashed');
    expect(new Set(one.map((a) => a.source))).toEqual(new Set(['int_protected_time']));
    expect(aggregateEdges(g, view(), { interventionLinks: 'all' }).some((a) => a.arrowType === 'dashed')).toBe(false);
  });

  it('hides inferred links when the toggle is off and flags inferred aggregates', () => {
    const on = aggregateEdges(g, view(), NO_INT);
    expect(on.find((a) => a.source === 'ch_c1')!.inferred).toBe(true); // e015 is inferred
    expect(on.find((a) => a.source === 'ch_c2')!.inferred).toBe(false); // e019 is explicit
    const off = aggregateEdges(g, view([], { inferred: false }), NO_INT);
    expect(off.some((a) => a.members.some((m) => m.provenance === 'inferred'))).toBe(false);
  });

  it('keeps ch_a3 loop closure as a circular edge when expanded', () => {
    const aggs = aggregateEdges(g, view(['ch_a3']), NO_INT);
    const closure = aggs.find((a) => a.source === 'ch_a3_s5' && a.target === 'ch_a3_s1')!;
    expect(closure.arrowType).toBe('circular');
    expect(closure.members[0].loopClosure).toBe(true);
  });
});

describe('tracing (§6.4)', () => {
  it('traces upstream of an outcome to every chain/loop feeding it, ignoring dashed links', () => {
    const t = trace(g, ['out_joy_deficit'], 'up', false);
    for (const id of ['ch_a2_s4', 'ch_d1_s5', 'ch_d2_s5', 'ch_d3_s4', 'loop_B', 'loop_C', 'loop_adolescence', 'loop_adulthood'])
      expect(t.nodes.has(id)).toBe(true);
    expect([...t.nodes].some((id) => id.startsWith('int_'))).toBe(false);
    expect(trace(g, ['out_intrinsic_joy'], 'up', true).nodes.has('int_open_ended_object')).toBe(true);
  });
  it('traces a container from all its members', () => {
    const t = trace(g, membersOf(g, 'ch_c3'), 'down', false);
    expect(t.nodes.has('out_extrinsic_orientation')).toBe(true);
  });
});
