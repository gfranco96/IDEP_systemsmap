import { test, expect, type Page } from '@playwright/test';

const BASE_LAYERS = 'cultural,crossLife,loops,references,inferred';
const ALL = [
  'ch_c1', 'ch_c2', 'ch_c3', 'ch_c4', 'ch_a1', 'ch_a2', 'ch_a3', 'ch_a4', 'ch_d1', 'ch_d2', 'ch_d3', 'ch_d4', 'ch_d5',
  'loop_childhood', 'loop_adolescence', 'loop_adulthood', 'loop_A', 'loop_B', 'loop_C', 'loop_D',
  'sys_education', 'sys_family', 'sys_market', 'sys_platform', 'sys_cultural',
];
const LOOPS = ['loop_childhood', 'loop_adolescence', 'loop_adulthood', 'loop_A', 'loop_B', 'loop_C', 'loop_D'];

async function open(page: Page, hash: string) {
  const problems: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') problems.push(`${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  await page.goto('/' + hash);
  await page.waitForSelector('.map-svg .node, [data-testid="outline"]');
  await page.waitForTimeout(700);
  return problems;
}

const shot = (page: Page, name: string) =>
  page.screenshot({ path: `docs/screenshots/${test.info().project.name}--${name}.png` });

/** Every rendered SVG label must fit its declared width (measured by the browser). */
async function textOverflow(page: Page) {
  return page.evaluate(() => {
    const bad: string[] = [];
    document.querySelectorAll<SVGTextElement>('.map-svg text[data-maxw]').forEach((t) => {
      if (getComputedStyle(t).display === 'none') return;
      const max = Number(t.dataset.maxw);
      const len = t.getComputedTextLength();
      if (len > max + 1) bad.push(`${t.textContent} (${len.toFixed(1)} > ${max})`);
    });
    return bad;
  });
}

test('first visit opens the About panel', async ({ page }) => {
  const problems = await open(page, '');
  await expect(page.getByTestId('about-panel')).toBeVisible();
  const about = page.getByTestId('about-panel');
  await expect(about).toContainText('Relationship branch definition');
  await expect(about).toContainText('across five ‘systemic layers’');
  await expect(about.getByTestId('sources').locator('li')).toHaveCount(30);
  for (const gone of ['Reading notes', 'How arrows were assigned', 'Design framing', 'Link provenance', 'Evidence links'])
    await expect(about).not.toContainText(gone);
  await shot(page, '00-about');
  expect(problems).toEqual([]);
});

test('default overview', async ({ page }) => {
  const problems = await open(page, `#layers=${BASE_LAYERS}`);
  await shot(page, '01-default');
  expect(problems).toEqual([]);
  expect(await textOverflow(page)).toEqual([]);
});

test('fully expanded', async ({ page }) => {
  const problems = await open(page, `#layers=${BASE_LAYERS},interventions&exp=${ALL.join(',')}&intlinks=all`);
  await page.getByRole('button', { name: 'Fit to screen' }).click();
  await page.waitForTimeout(700);
  await shot(page, '02-expanded-fit');
  expect(await textOverflow(page)).toEqual([]);
  expect(problems).toEqual([]);
});

for (const id of LOOPS) {
  test(`loop expanded: ${id}`, async ({ page }) => {
    const problems = await open(page, `#layers=${BASE_LAYERS}&exp=${id}&sel=${id}`);
    await page.waitForTimeout(600);
    await shot(page, `03-${id}`);
    expect(await page.locator(`.edge[data-arrow="circular"]`).count()).toBeGreaterThanOrEqual(5);
    expect(problems).toEqual([]);
  });
}

test('intervention layer with one intervention hovered', async ({ page }) => {
  const problems = await open(page, `#layers=${BASE_LAYERS},interventions&sel=int_adult_third_place`);
  await page.keyboard.press('Escape'); // clear selection: show hover only
  await page.getByRole('button', { name: 'Fit to screen' }).click();
  await page.waitForTimeout(700);
  const node = page.locator('[data-id="int_adult_third_place"]');
  await node.hover({ force: true });
  await page.waitForTimeout(300);
  await expect(page.locator('.edge[data-arrow="dashed"]')).toHaveCount(2);
  await shot(page, '04-intervention-hover');
  expect(problems).toEqual([]);
});

test('outline view', async ({ page }) => {
  const problems = await open(page, `#layers=${BASE_LAYERS}&view=outline&sel=ch_d3`);
  await expect(page.getByTestId('outline')).toBeVisible();
  await shot(page, '05-outline');
  expect(problems).toEqual([]);
});

test('detail panel for an outcome lists pathways with provenance', async ({ page }) => {
  const problems = await open(page, `#layers=${BASE_LAYERS}&sel=out_joy_deficit`);
  const panel = page.getByTestId('detail-panel');
  await expect(panel).toContainText('Pathways into this outcome');
  await expect(panel.locator('.prov-inferred').first()).toBeVisible();
  await shot(page, '06-outcome-panel');
  expect(problems).toEqual([]);
});
