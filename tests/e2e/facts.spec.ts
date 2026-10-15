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
  await expect(page.getByTestId('legend')).toHaveCount(0); // a toggle next to Menu
  await page.getByRole('button', { name: 'Legend' }).click();
  await expect(page.getByTestId('legend')).toBeVisible();
  const lb = (await page.getByRole('button', { name: 'Legend' }).boundingBox())!;
  const mb = (await page.getByRole('button', { name: 'Menu' }).boundingBox())!;
  expect(mb.x - (lb.x + lb.width)).toBeLessThan(12); // right next to Menu
  const drop = (await page.locator('#tb-legend').boundingBox())!;
  expect(drop.y).toBeGreaterThanOrEqual(lb.y + lb.height); // born out of the button
  expect(drop.x + drop.width).toBeGreaterThan(lb.x);
  expect(drop.x).toBeLessThan(lb.x + lb.width);
  const fs = await page.getByTestId('legend').evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
  expect(fs).toBeLessThanOrEqual(9);
  await expect(page.getByTestId('count-bidirectional')).toHaveText('0, supported but not used in this dataset');
  await expect(page.getByTestId('count-downward')).toHaveText('62 links');
  await expect(page.getByTestId('count-dashed')).toHaveText('20 links');
});

test('required copy is visible: consequences column, framing note, design question', async ({ page }) => {
  await open(page, BASE);
  await expect(page.locator('.tb-title')).toHaveText('Reward systems of intrinsic vs extrinsic joy: A chronological view');
  await expect(page.getByTestId('band-outcomes')).toContainText('Consequences');
  await expect(page.locator('.kind-reference')).toHaveCount(0); // comparative-references row removed on request
  await page.goto(`/${BASE}&sel=ch_d3`);
  await expect(page.getByTestId('detail-panel')).toContainText('Framing note');
  await page.goto(`/${BASE}&sel=loop_C`);
  await expect(page.getByTestId('detail-panel')).toContainText('How could an object preserve the boundary between play and proof?');
  await page.goto(`/${BASE}&sel=ch_d4`);
  await expect(page.getByTestId('detail-panel')).toContainText('Design implication');
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
});

test('menu opens a column under the top-right button; export downloads a PNG of the whole map', async ({ page }) => {
  await open(page, BASE);
  await expect(page.getByRole('combobox')).toHaveCount(0); // no search bar
  await page.getByRole('button', { name: 'Menu' }).click();
  const menu = page.getByTestId('menu');
  await expect(menu).toBeVisible();
  const mb = (await menu.boundingBox())!;
  const vw = page.viewportSize()!.width;
  expect(mb.x + mb.width).toBeGreaterThan(vw - 20);
  expect(mb.y).toBeLessThan(60);
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60_000 }), menu.getByRole('button', { name: 'Export as PNG' }).click()]);
  expect(dl.suggestedFilename()).toBe('joy-deficit-systems-map.png');
  const path = await dl.path();
  const fs = await import('node:fs');
  const buf = fs.readFileSync(path!);
  expect(buf.subarray(1, 4).toString()).toBe('PNG');
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  expect(h).toBeGreaterThan(w); // the fully expanded map is taller than wide
  expect(w).toBeGreaterThan(4000);
  // a QR code in the bottom-right corner leads back to the interactive map
  const { PNG } = await import('pngjs');
  const jsQR = (await import('jsqr')).default;
  const png = PNG.sync.read(buf);
  const cw = 900;
  const crop = new Uint8ClampedArray(cw * cw * 4);
  for (let y = 0; y < cw; y++)
    for (let x = 0; x < cw; x++) {
      const si = ((png.height - cw + y) * png.width + (png.width - cw + x)) * 4;
      crop.set(png.data.subarray(si, si + 4), (y * cw + x) * 4);
    }
  expect(jsQR(crop, cw, cw)?.data).toBe('https://gfranco96.github.io/IDEP_systemsmap/');
});

test('two-finger scroll pans, pinch (ctrl+wheel) zooms', async ({ page }) => {
  await open(page, `${BASE}&z=0,0,0.5`);
  const tf = () => page.locator('.map-svg > g').getAttribute('transform');
  await page.mouse.move(700, 450);
  await page.mouse.wheel(120, 200);
  await page.waitForTimeout(200);
  const after = (await tf())!;
  expect(after).toContain('scale(0.5)');
  expect(after).toMatch(/translate\(-120,-200\)/);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -100);
  await page.keyboard.up('Control');
  await page.waitForTimeout(200);
  expect(await tf()).not.toContain('scale(0.5)');
});

test('zoom to fit shows every node after everything is expanded', async ({ page }) => {
  await open(page, BASE);
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByTestId('menu').getByRole('button', { name: 'Expand all' }).click();
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Fit to screen' }).click();
  await page.waitForTimeout(700);
  const stage = (await page.locator('.canvas-wrap').boundingBox())!;
  const boxes = await page.locator('.map-svg .node').evaluateAll((els) => els.map((e) => e.getBoundingClientRect()).map((r) => [r.left, r.top, r.right, r.bottom]));
  expect(boxes.length).toBeGreaterThan(190);
  for (const [l, t, r, b] of boxes) {
    expect(l).toBeGreaterThanOrEqual(stage.x - 1);
    expect(t).toBeGreaterThanOrEqual(stage.y - 1);
    expect(r).toBeLessThanOrEqual(stage.x + stage.width + 1);
    expect(b).toBeLessThanOrEqual(stage.y + stage.height + 1);
  }
});

test('clicking a node under the details window pans it into view', async ({ page }) => {
  await open(page, BASE);
  await page.locator('[data-id="ch_c1"]').dispatchEvent('click'); // left side: opens the window, no pan needed
  await page.waitForTimeout(700);
  const panel = (await page.getByTestId('detail-panel').boundingBox())!;
  expect(panel.width).toBeLessThan(340); // picture-in-picture, not a full-height sidebar
  const id = await page.evaluate((p) => {
    for (const el of document.querySelectorAll<SVGGElement>('.map-svg .node')) {
      const r = el.getBoundingClientRect();
      const cx = (r.left + r.right) / 2;
      const cy = (r.top + r.bottom) / 2;
      if (cx > p.x && cx < p.x + p.width && cy > p.y && cy < p.y + p.height) return el.dataset.id!;
    }
    return null;
  }, panel);
  expect(id).not.toBeNull();
  await page.locator(`[data-id="${id}"]`).dispatchEvent('click');
  await page.waitForTimeout(900);
  const r = (await page.locator(`[data-id="${id}"]`).boundingBox())!;
  const p2 = (await page.getByTestId('detail-panel').boundingBox())!;
  expect(r.x + r.width / 2).toBeLessThan(p2.x);
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
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'Walk through the map' }).click();
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
  await page.locator('.lane-label[data-current="platform"]').dispatchEvent('click');
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

test('walk-through and node details are never shown together; fixed-size, scrolling, explicit order', async ({ page }) => {
  await open(page, `${BASE}&sel=ch_c3`);
  await expect(page.getByTestId('detail-panel')).toBeVisible();
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'Walk through the map' }).click();
  const tour = page.getByTestId('tour');
  await expect(tour).toBeVisible();
  await expect(page.getByTestId('detail-panel')).toHaveCount(0);
  await expect(tour.locator('.tour-parts li')).toHaveCount(7);
  const heights = new Set<number>();
  for (let i = 0; i < 17; i++) {
    await expect(page.getByTestId('detail-panel')).toHaveCount(0);
    const bb = (await tour.boundingBox())!;
    heights.add(Math.round(bb.height));
    const body = page.getByTestId('tour-body');
    const fits = await body.evaluate((e) => e.scrollHeight <= e.clientHeight || getComputedStyle(e).overflowY === 'auto');
    expect(fits).toBe(true);
    await tour.getByRole('button', { name: 'Next' }).click();
  }
  expect(heights.size).toBe(1); // same window size for every step
  await expect(tour.locator('.tour-pos')).toContainText('Part 7/7');
  // jump to a part from the order strip
  await tour.getByRole('button', { name: '5. Consequences' }).click();
  await expect(tour.locator('.tour-pos')).toContainText('Part 5/7 · Consequences · 1 of 5');
  // clicking a node ends the tour, then shows its details
  await page.locator('[data-id="out_burnout"]').dispatchEvent('click');
  await expect(tour).toHaveCount(0);
  await expect(page.getByTestId('detail-panel')).toContainText('Burnout');
});

test('row titles are rotated in a narrow gutter; stage dividers are thin, short-dashed, constant width', async ({ page }) => {
  await open(page, `${BASE}&z=0,0,0.05`);
  const labels = page.locator('.lane-label');
  await expect(labels).toHaveCount(6); // 4 lanes + cultural + main feedback loops
  const t = await labels.first().locator('g[transform*="rotate(-90)"]').count();
  expect(t).toBe(1);
  const w = await labels.first().locator('.lane-label-bg').getAttribute('width');
  expect(Number(w)).toBeLessThan(60);
  const d = page.getByTestId('stage-divider').first();
  await expect(d).toHaveAttribute('vector-effect', 'non-scaling-stroke');
  const sw = await d.evaluate((e) => parseFloat(getComputedStyle(e).strokeWidth));
  expect(sw).toBe(0.25);
  expect(await d.evaluate((e) => getComputedStyle(e).strokeDasharray)).toBe('1.5px, 1.5px');
});

test('pop-up type is small', async ({ page }) => {
  await open(page, `${BASE}&sel=out_joy_deficit`);
  const panelFs = await page.getByTestId('detail-panel').evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
  expect(panelFs).toBeLessThanOrEqual(9);
  await page.getByRole('button', { name: 'Menu' }).click();
  const menuFs = await page.getByTestId('menu').locator('.menu-item').first().evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
  expect(menuFs).toBeLessThanOrEqual(9);
});

test('walk-through keeps the highlighted node above its window', async ({ page }) => {
  await open(page, BASE);
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'Walk through the map' }).click();
  const tour = page.getByTestId('tour');
  for (let i = 0; i < 17; i++) {
    await tour.getByRole('button', { name: 'Next' }).click();
    await page.waitForTimeout(650); // focus animation
    const sel = await page.locator('.map-svg .node.selected').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().bottom));
    const tb = (await tour.boundingBox())!;
    const stage = (await page.locator('.canvas-wrap').boundingBox())!;
    for (const bottom of sel) {
      expect(bottom, `step ${i + 2}`).toBeLessThanOrEqual(tb.y);
      expect(bottom).toBeGreaterThan(stage.y);
    }
    if (i === 15) {
      // interventions step: focused intervention row must be above the window too
      const ib = await page.locator('[data-id="int_protected_time"]').boundingBox();
      if (ib) expect(ib.y + ib.height).toBeLessThanOrEqual(tb.y);
    }
  }
});

test('Legend and Menu buttons are compact (half the previous size)', async ({ page }) => {
  await open(page, BASE);
  for (const name of ['Legend', 'Menu']) {
    const bb = (await page.getByRole('button', { name, exact: true }).boundingBox())!;
    expect(bb.height).toBeLessThanOrEqual(13);
  }
});

test('an expanded cross-life system box grows to hold its chains side by side', async ({ page }) => {
  await open(page, BASE);
  const before = (await page.locator('[data-id="sys_education"]').boundingBox())!;
  await page.locator('[data-id="sys_education"]').dispatchEvent('click');
  await page.waitForTimeout(600);
  const box = (await page.locator('[data-id="sys_education"] .shape').boundingBox())!;
  expect(box.height).toBeGreaterThan(before.height * 2); // the same box grew downward
  const heads = await Promise.all(['xl_edu1', 'xl_edu2', 'xl_edu3'].map(async (id) => (await page.locator(`[data-id="${id}"]`).boundingBox())!));
  expect(Math.abs(heads[0].y - heads[2].y)).toBeLessThan(1); // side by side
  expect(heads[1].x).toBeGreaterThan(heads[0].x + heads[0].width);
  for (const h of heads) {
    expect(h.x).toBeGreaterThanOrEqual(box.x);
    expect(h.x + h.width).toBeLessThanOrEqual(box.x + box.width + 0.5);
    expect(h.y).toBeGreaterThan(box.y);
    expect(h.y + h.height).toBeLessThan(box.y + box.height);
  }
  await expect(page.locator('[data-id="xl_edu3"]')).toHaveAttribute('aria-label', /^Academic admissions/);
});

test('hover bubbles are half size; pop-up text is at 2/3', async ({ page }) => {
  await open(page, `${BASE}&sel=out_joy_deficit`);
  const panelFs = await page.getByTestId('detail-panel').evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
  expect(panelFs).toBeCloseTo(6, 1);
  await page.waitForTimeout(600);
  const bb = (await page.locator('[data-id="out_joy_deficit"]').boundingBox())!;
  await page.mouse.move(bb.x + 10, bb.y + 10);
  const tipFs = await page.locator('.tooltip').evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
  expect(tipFs).toBeCloseTo(4.25, 1);
});

test('stage dividers are hidden behind cross-life system boxes; outcomes column starts at the adulthood edge', async ({ page }) => {
  await open(page, `${BASE}&exp=sys_education`);
  const fill = await page.locator('[data-id="sys_education"] .shape').evaluate((e) => getComputedStyle(e).fill);
  const alpha = fill.startsWith('rgba') ? parseFloat(fill.split(',')[3]) : fill.includes('/') ? parseFloat(fill.split('/')[1]) : 1;
  expect(alpha).toBe(1); // opaque
  const order = await page.evaluate(() => {
    const divider = document.querySelector('.stage-divider')!;
    const sys = document.querySelector('[data-id="sys_education"]')!;
    return divider.compareDocumentPosition(sys) & Node.DOCUMENT_POSITION_FOLLOWING;
  });
  expect(order).toBeTruthy(); // the box is painted over the divider
  const col = (await page.getByTestId('band-outcomes').locator('rect').boundingBox())!;
  const lane = await page.evaluate(() => Math.max(...[...document.querySelectorAll('rect.lane-bg')].map((r) => r.getBoundingClientRect().right)));
  expect(col.x - lane).toBeLessThan(6);
  expect(col.x - lane).toBeGreaterThanOrEqual(0);
});

test('legend line samples are fully visible', async ({ page }) => {
  await open(page, BASE);
  await page.getByRole('button', { name: 'Legend' }).click();
  const clipped = await page.locator('.legend-arrows li').evaluateAll((lis) =>
    lis.map((li) => {
      const svg = li.querySelector('svg')!;
      const box = svg.getBoundingClientRect();
      const content = (svg.querySelector('.edge-line') as SVGGraphicsElement).getBoundingClientRect();
      return getComputedStyle(svg).overflow === 'visible' && content.height <= box.height + 8;
    }),
  );
  expect(clipped.every(Boolean)).toBe(true);
  await expect(page.getByTestId('legend')).toContainText('Relationship not explicitly extracted from source');
});

test('links inside an expanded cross-life system are visible without hovering', async ({ page }) => {
  await open(page, `${BASE}&exp=sys_education,sys_platform`);
  for (const key of ['xl_edu1_s1|xl_edu1_s2|downward', 'xl_plat4_s1|xl_plat4_s2b|downward']) {
    const edge = page.locator(`.edge[data-key="${key}"]`);
    await expect(edge).toHaveCount(1);
    // the line is painted after (on top of) its system box
    const after = await page.evaluate((k) => {
      const e = document.querySelector(`.edge[data-key="${k}"]`)!;
      const sys = document.querySelector('[data-id="sys_education"]')!;
      return !!(sys.compareDocumentPosition(e) & Node.DOCUMENT_POSITION_FOLLOWING);
    }, key);
    expect(after).toBe(true);
    // and it is actually what the browser draws at its midpoint
    const hit = await page.evaluate((k) => {
      const path = document.querySelector(`.edge[data-key="${k}"] .edge-line`) as SVGPathElement;
      const pt = path.getPointAtLength(path.getTotalLength() * 0.3);
      const m = path.getScreenCTM()!;
      const x = pt.x * m.a + m.e;
      const y = pt.y * m.d + m.f;
      const top = document.elementsFromPoint(x, y);
      return top.slice(0, 3).some((el) => el.closest('.edge'));
    }, key);
    expect(hit).toBe(true);
  }
});
