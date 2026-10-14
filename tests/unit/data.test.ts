import { describe, expect, it } from 'vitest';
import { validateData, EXPECTED } from '../../src/data/validate';
import { data, g } from './helpers';

describe('data validation (§11.1)', () => {
  it('passes every structural check and count assertion', () => {
    expect(validateData(data)).toEqual([]);
  });

  it('has the expected node and edge counts', () => {
    const byType: Record<string, number> = {};
    for (const n of data.nodes) byType[n.type] = (byType[n.type] ?? 0) + 1;
    expect(byType).toEqual(EXPECTED.nodesByType);
    const byArrow: Record<string, number> = {};
    for (const e of data.edges) byArrow[e.arrowType] = (byArrow[e.arrowType] ?? 0) + 1;
    expect(byArrow).toEqual({ forward: 15, upward: 25, downward: 62, circular: 40, dashed: 20 });
    expect(data.edges.filter((e) => e.provenance === 'inferred')).toHaveLength(47);
    expect(data.edges.filter((e) => e.provenance === 'explicit')).toHaveLength(115);
  });

  it('detects a broken edge endpoint', () => {
    const broken = { ...data, edges: data.edges.map((e, i) => (i === 0 ? { ...e, target: 'nope' } : e)) };
    expect(validateData(broken).some((m) => m.includes('target nope does not exist'))).toBe(true);
  });

  it('detects a count drift', () => {
    const fewer = { ...data, nodes: data.nodes.filter((n) => n.id !== 'int_intergenerational') };
    expect(validateData(fewer).length).toBeGreaterThan(0);
  });

  it('indexes the timeline in data order (5 / 3 / 4 substages)', () => {
    expect(g.stages.map((s) => s.id)).toEqual(['stage_childhood', 'stage_adolescence', 'stage_adulthood']);
    expect(g.substagesByStage.get('childhood')!.length).toBe(5);
    expect(g.substagesByStage.get('adolescence')!.length).toBe(3);
    expect(g.substagesByStage.get('adulthood')!.length).toBe(4);
    const orders = [...g.substagesByStage.values()].flat().map((s) => s.order);
    expect(orders).toEqual([...orders].sort((a, b) => (a ?? 0) - (b ?? 0)));
  });

  it('keeps interventions in data order with none selected', () => {
    expect(g.interventions.map((n) => n.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(g.interventions.every((n) => !n.selected)).toBe(true);
  });
});
