import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(({}, info) => {
  test.skip(!['desktop-light', 'desktop-dark'].includes(info.project.name), 'a11y scan on desktop themes');
});

const BASE = '#layers=cultural,crossLife,loops,references,inferred';

for (const [name, hash] of [
  ['map', `${BASE}&z=0,0,1`],
  ['map + panel', `${BASE}&sel=ch_d4&z=0,0,1`],
  ['outline', `${BASE}&view=outline&sel=out_joy_deficit`],
  ['about', ''],
] as const) {
  test(`axe: ${name}`, async ({ page }) => {
    await page.goto('/' + hash);
    await page.waitForTimeout(900);
    const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    const summary = res.violations.map((v) => `${v.id}: ${v.nodes.length} × ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
    expect(summary).toEqual([]);
  });
}
