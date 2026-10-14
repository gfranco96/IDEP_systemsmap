import { test, expect, type Page } from '@playwright/test';

// §11.4 specific facts, checked in the running app (desktop light only).
test.beforeEach(({}, info) => {
  test.skip(info.project.name !== 'desktop-light', 'facts checked once');
});

const BASE = '#layers=cultural,crossLife,loops,references,inferred';
async function open(page: Page, hash: string) {
  await page.goto('/' + hash);
  await page.waitForSelector('.map-svg .node');
  await page.waitForTimeout(400);
}
const box = (page: Page, id: string) =>
  page.locator(`[data-id="${id}"]`).evaluate((el) => {
    const m = (el as SVGGElement).getAttribute('transform')!.match(/translate\(([-\d.]+),([-\d.]+)\)/)!;
    return { x: Number(m[1]), y: Number(m[2]) };
  });

test('timeline: 3 stages with 5 / 3 / 4 substages in order', async ({ page }) => {
  await open(page, BASE);
  await expect(page.locator('.kind-stage')).toHaveCount(3);
  const subs = await page.locator('.kind-substage').evaluateAll((els) =>
    els.map((e) => ({ id: e.getAttribute('data-id')!, x: Number(e.getAttribute('transform')!.match(/translate\(([-\d.]+)/)![1]) })),
  );
  expect(subs.map((s) => s.id)).toEqual([
    'sub_infancy', 'sub_toddler', 'sub_early_childhood', 'sub_middle_childhood', 'sub_early_transition',
    'sub_early_adolescence', 'sub_middle_adolescence', 'sub_late_adolescence',
    'sub_early_working', 'sub_established', 'sub_later_adulthood', 'sub_elderhood',
  ]);
  const xs = subs.map((s) => s.x);
  expect(xs).toEqual([...xs].sort((a, b) => a - b));
  const stages = await page.locator('.kind-stage').evaluateAll((els) => els.map((e) => e.getAttribute('data-id')));
  expect(stages).toEqual(['stage_childhood', 'stage_adolescence', 'stage_adulthood']);
});

test('chain chips: 4 / 4 / 5 per stage, in their primaryCurrent lanes', async ({ page }) => {
  await open(page, BASE);
  const chips = await page.locator('.kind-chip').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')!));
  expect(chips.length).toBe(13);
  // the visible marker line names the stage
  const markers = await page.locator('.kind-chip text.t-marker').allTextContents();
  const count = (s: string) => markers.filter((m) => m.startsWith(s)).length;
  expect([count('Childhood'), count('Adolescence'), count('Adulthood')]).toEqual([4, 4, 5]);
  // lane: chip y must be inside the matching lane background
  const lanes: Record<string, string> = { ch_c1: 'family', ch_c2: 'family', ch_c3: 'education', ch_c4: 'market', ch_a1: 'family', ch_a2: 'education', ch_a3: 'platform', ch_a4: 'family', ch_d1: 'market', ch_d2: 'market', ch_d3: 'platform', ch_d4: 'market', ch_d5: 'family' };
  for (const [id, lane] of Object.entries(lanes)) {
    const p = await box(page, id);
    const inLane = await page.evaluate(
      ({ lane, p }) =>
        [...document.querySelectorAll<SVGRectElement>('rect.lane-bg.laneStage')].some((r) => {
          const fill = r.style.fill;
          const x = +r.getAttribute('x')!, y = +r.getAttribute('y')!, w = +r.getAttribute('width')!, h = +r.getAttribute('height')!;
          return fill.includes(lane) && p.x >= x && p.x < x + w && p.y >= y && p.y < y + h;
        }),
      { lane, p },
    );
    expect(inLane, `${id} in ${lane} lane`).toBe(true);
  }
});

test('ch_a3 shows a closing circular edge from its last step to its first when expanded', async ({ page }) => {
  await open(page, `${BASE}&exp=ch_a3`);
  await expect(page.locator('.edge[data-key="ch_a3_s5|ch_a3_s1|circular"]')).toHaveCount(1);
  await expect(page.locator('.edge[data-key="ch_a3_s5|ch_a3_s1|circular"] .mid-marker text')).toHaveText('↻');
});

test('ch_d2 shows two parallel steps at the same column, both feeding s3', async ({ page }) => {
  await open(page, `${BASE}&exp=ch_d2`);
  const a = await box(page, 'ch_d2_s2a');
  const b = await box(page, 'ch_d2_s2b');
  expect(a.x).toBe(b.x);
  await expect(page.locator('.edge[data-key="ch_d2_s2a|ch_d2_s3|downward"]')).toHaveCount(1);
  await expect(page.locator('.edge[data-key="ch_d2_s2b|ch_d2_s3|downward"]')).toHaveCount(1);
});

test('10 interventions are identical in style and none is selected by default', async ({ page }) => {
  await open(page, `${BASE},interventions`);
  const ints = page.locator('.kind-intervention');
  await expect(ints).toHaveCount(10);
  const styles = await ints.evaluateAll((els) =>
    els.map((e) => {
      const s = e.querySelector('.shape')!;
      const cs = getComputedStyle(s);
      return [s.getAttribute('width'), s.getAttribute('height'), s.getAttribute('rx'), cs.stroke, cs.strokeDasharray, cs.fill, cs.strokeWidth, getComputedStyle(e).opacity, e.classList.contains('selected')].join('|');
    }),
  );
  expect(new Set(styles).size).toBe(1);
  expect(styles[0].endsWith('false')).toBe(true);
  const order = await ints.evaluateAll((els) => els.map((e) => e.getAttribute('data-id')));
  expect(order).toEqual([
    'int_protected_time', 'int_nonevaluative_feedback', 'int_open_ended_object', 'int_antiextractive_digital',
    'int_adult_third_place', 'int_play_without_proof', 'int_workplace_recovery', 'int_alt_success_metric',
    'int_accessible_play_kit', 'int_intergenerational',
  ]);
  // no dashed edges until one is hovered/selected
  await expect(page.locator('.edge[data-arrow="dashed"]')).toHaveCount(0);
});

test('legend shows bidirectional with 0 instances and live counts', async ({ page }) => {
  await open(page, BASE);
  await page.getByRole('button', { name: 'Legend', exact: true }).first().click();
  await expect(page.getByTestId('count-bidirectional')).toHaveText('0, supported but not used in this dataset');
  await expect(page.getByTestId('count-downward')).toHaveText('62 links');
  await expect(page.getByTestId('count-dashed')).toHaveText('20 links');
});

test('required copy is visible: caveats, cautions, framing note, design question', async ({ page }) => {
  await open(page, BASE);
  // Denmark and Japan cautions are rendered with the node on the canvas
  const caution = await page.locator('.kind-reference text.t-caution').allTextContents();
  expect(caution.join(' ')).toContain('Caution:');
  expect(await page.locator('.kind-reference').count()).toBe(2);
  // banner claims
  const banner = (await page.locator('.banner text').allTextContents()).join(' ');
  expect(banner).toContain('Central visual claim');
  expect(banner).toContain('Design framing');
  // ch_d3 framing note in panel; loop_C design question
  await page.goto(`/${BASE}&sel=ch_d3`);
  await expect(page.getByTestId('detail-panel')).toContainText('Framing note');
  await page.goto(`/${BASE}&sel=loop_C`);
  await expect(page.getByTestId('detail-panel')).toContainText('How could an object preserve the boundary between play and proof?');
  await page.goto(`/${BASE}&sel=ch_d4`);
  await expect(page.getByTestId('detail-panel')).toContainText('Design implication');
  await page.goto(`/${BASE}&sel=ref_denmark`);
  await expect(page.getByTestId('detail-panel')).toContainText('as cited in the source; not independently verified');
  await expect(page.getByTestId('detail-panel').locator('a').first()).toHaveText('oecd-better-life-index.truth-and-beauty.net');
});

test('ch_d3 chip tooltip shows its framing note', async ({ page }) => {
  await open(page, BASE);
  await page.locator('[data-id="ch_d3"]').hover({ force: true });
  await expect(page.locator('.tooltip')).toContainText('Framing note:');
});

test('keyboard: tab to a node, Enter selects, E expands, Esc clears', async ({ page }) => {
  await open(page, BASE);
  await page.locator('[data-id="ch_c3"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-id="ch_c3_s1"]')).toHaveCount(1);
  await expect(page.getByTestId('detail-panel')).toBeVisible();
  await page.locator('[data-id="ch_c3"]').focus();
  await page.keyboard.press('e');
  await expect(page.locator('[data-id="ch_c3_s1"]')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('detail-panel')).toHaveCount(0);
  await page.keyboard.press('/');
  await expect(page.getByRole('combobox', { name: 'Search the map' })).toBeFocused();
});

test('search expands containers and selects the result', async ({ page }) => {
  await open(page, BASE);
  await page.getByRole('combobox', { name: 'Search the map' }).fill('Burnout risk');
  await page.getByRole('option').first().click();
  await expect(page.locator('[data-id="ch_d2_s4"]')).toHaveCount(1);
  await expect(page.getByTestId('detail-panel')).toContainText('Burnout risk');
});

test('URL hash restores state and inferred toggle hides inferred links', async ({ page }) => {
  await open(page, `#layers=cultural,crossLife,loops,references&exp=ch_c1`);
  await expect(page.locator('[data-id="ch_c1_s1"]')).toHaveCount(1);
  await expect(page.locator('.edge[data-provenance="inferred"]')).toHaveCount(0);
  await open(page, `${BASE}&exp=ch_c1`);
  expect(await page.locator('.edge[data-provenance="inferred"]').count()).toBeGreaterThan(0);
});

test('cultural overlay is a hatched overlay and can be toggled', async ({ page }) => {
  await open(page, BASE);
  await expect(page.getByTestId('cultural-overlay')).toHaveAttribute('fill', 'url(#hatch-cultural)');
  await open(page, '#layers=crossLife,loops,references,inferred');
  await expect(page.getByTestId('cultural-overlay')).toHaveCount(0);
});

test('guided tour walks through every data-driven step', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await open(page, BASE);
  await page.getByRole('button', { name: 'Walk through' }).click();
  const tour = page.getByTestId('tour');
  await expect(tour).toContainText('Central visual claim');
  const titles: string[] = [];
  for (let i = 0; i < 30; i++) {
    titles.push((await tour.locator('h2').textContent())!);
    const next = tour.getByRole('button', { name: 'Next' });
    if (!(await next.count())) break;
    await next.click();
  }
  expect(titles[0]).toBe('Central visual claim');
  expect(titles).toContain('Stage: Adolescence');
  expect(titles).toContain('Main loop: Social play as restoration');
  expect(titles).toContain('Outcome: Burnout / alienation');
  expect(titles).toContain('Possible interventions, none selected');
  expect(titles[titles.length - 1]).toBe('Design framing');
  expect(titles.length).toBe(1 + 3 + 3 + 4 + 5 + 1 + 1);
  await expect(page.locator('.kind-intervention')).toHaveCount(10);
  await expect(page.locator('.kind-intervention.selected')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('clicking an edge opens its provenance and meaning', async ({ page }) => {
  await open(page, `${BASE}&exp=ch_c1&z=-300,-700,1`);
  await page.locator('.edge[data-key="ch_c1_s4|out_intrinsic_joy|upward"] .edge-hit').dispatchEvent('click');
  const panel = page.getByTestId('detail-panel');
  await expect(panel).toContainText('A protective condition, recovery, or restoration of intrinsic joy');
  await expect(panel).toContainText('Inferred link: added to satisfy the map spec; not stated in the source');
});

test('lane focus and trace pathways', async ({ page }) => {
  await open(page, BASE);
  await page.locator('.lane-label').filter({ hasText: 'Media, platform' }).dispatchEvent('click');
  await expect(page.locator('[data-id="ch_a3"]')).toHaveClass(/emph-hl/);
  await expect(page.locator('[data-id="ch_a1"]')).toHaveClass(/emph-soft/); // platform is a secondary current of ch_a1
  await expect(page.locator('[data-id="ch_c3"]')).toHaveClass(/emph-faded/);
  await page.screenshot({ path: 'docs/screenshots/desktop-light--07-lane-focus.png' });
  await page.keyboard.press('Escape');
  await page.goto(`/${BASE}&sel=out_burnout`);
  await page.waitForSelector('[data-testid="detail-panel"]');
  await page.getByRole('button', { name: 'Trace upstream pathways' }).click();
  await expect(page.locator('[data-id="ch_d2"]')).toHaveClass(/emph-hl/);
  await expect(page.locator('[data-id="loop_adulthood"]')).toHaveClass(/emph-hl/);
  await expect(page.locator('[data-id="ch_c1"]')).toHaveClass(/emph-faded/);
  await page.screenshot({ path: 'docs/screenshots/desktop-light--08-trace-burnout.png' });
});

test('double-clicking a stage expands every chain and loop in it; reduced motion is respected', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, BASE);
  await page.locator('[data-id="stage_adulthood"]').dispatchEvent('dblclick');
  for (const id of ['ch_d1_s1', 'ch_d2_s1', 'ch_d3_s1', 'ch_d4_s1', 'ch_d5_s1', 'loop_adulthood_s1'])
    await expect(page.locator(`[data-id="${id}"]`)).toHaveCount(1);
  await expect(page.locator('[data-id="ch_c1_s1"]')).toHaveCount(0);
  const transition = await page.locator('.node').first().evaluate((e) => getComputedStyle(e).transitionDuration);
  expect(transition.split(',').every((d) => parseFloat(d) === 0)).toBe(true);
});
