import { test, expect } from '@playwright/test';

async function setRange(page, id, value) {
  await page.locator(`#${id}`).fill(String(value));
}

const zoomLevel = (page) => page.locator('#function-plot svg').evaluate((element) => element.__zoom.k);

test.beforeEach(async ({ page }) => {
  await page.goto('calculus.html');
  await expect(page.locator('[data-calculus][data-v-app] #value')).toHaveText('1.000');
});

test('Vue controls update values, plots, visibility, and URL state', async ({ page }) => {
  await expect(page.locator('.chart svg')).toHaveCount(3);
  await page.locator('#exponent').fill('');
  await expect(page.locator('#value')).toHaveText('1.000');
  await page.getByRole('button', { name: 'Reset all controls' }).click();
  await expect(page.locator('#exponent')).toHaveValue('2');
  const initialCurve = await page.locator('#function-plot .curve').getAttribute('d');
  await setRange(page, 'coefficient', 2);
  await setRange(page, 'point', 2);
  await expect(page.locator('#value')).toHaveText('8.000');
  await expect(page.locator('#slope')).toHaveText('8.000');
  await expect(page.locator('#integral')).toHaveText('5.333');
  await expect(page.locator('#function-plot .curve')).not.toHaveAttribute('d', initialCurve);
  await page.locator('#exponent').fill('3');
  await expect(page.locator('#value')).toHaveText('16.000');
  await page.locator('#exponent').fill('');
  await expect(page.locator('#value')).toHaveText('16.000');
  await page.locator('#exponent').fill('7');
  await expect(page.locator('#value')).toHaveText('16.000');
  await page.locator('#exponent').fill('2');
  await page.locator('#tangent').uncheck();
  await page.locator('#shade').uncheck();
  await expect(page.locator('#function-plot .tangent-line')).toHaveCount(0);
  await expect(page.locator('#function-plot .signed-area')).toHaveCount(0);
  await expect(page.locator('#integral-plot .signed-area')).toHaveCount(2);
  await expect(page).toHaveURL(/coefficient=2.*point=2.*tangent=false&shade=false/);
  await page.reload();
  await expect(page.locator('#value')).toHaveText('8.000');
  await expect(page.locator('#tangent')).not.toBeChecked();
  await page.locator('#family').selectOption('log');
  await expect(page.locator('#coefficient-control')).toBeHidden();
  await expect(page.locator('#exponent-control')).toBeHidden();
  await expect(page.locator('#lower')).toHaveValue('1');
  await expect(page.locator('#point')).toHaveValue('2');
  await expect(page.locator('#value')).toHaveText('0.693');
});

test('comparison, numerical integration, reversed bounds, and undefined values', async ({ page }) => {
  await page.locator('#family').selectOption('sigmoid');
  await page.locator('#compare').check();
  await expect(page.locator('#comparison-table')).toBeVisible();
  await expect(page.locator('#comparison-table tbody tr')).toHaveCount(5);
  await expect(page.locator('#function-plot .comparison-curve')).toHaveCount(4);
  await page.locator('#family').selectOption('relu');
  await setRange(page, 'point', 0);
  await expect(page.locator('#slope')).toHaveText('Undefined');
  await expect(page.locator('#math-status')).toContainText('no derivative');
  await expect(page.locator('#function-plot .tangent-line')).toHaveCount(0);
  await expect(page.locator('#derivative-plot .relu-kink')).toHaveCount(2);
  await page.locator('#family').selectOption('softplus');
  await expect(page.locator('#integral')).toContainText('\u2248');
  await page.locator('#family').selectOption('linear');
  await setRange(page, 'lower', 2);
  await setRange(page, 'point', 0);
  await expect(page.locator('#integral')).toHaveText('-2.000');
  await page.locator('#family').selectOption('reciprocal');
  await setRange(page, 'lower', -1);
  await expect(page.locator('#integral')).toHaveText('Undefined');
  await expect(page.locator('#integral-plot .accumulation-empty')).toBeVisible();
  await expect(page.locator('#math-status')).toHaveClass(/invalid/);
});

test('D3 zoom and pan survive point changes and reset correctly', async ({ page }) => {
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await expect.poll(() => zoomLevel(page)).toBe(1.5);
  await setRange(page, 'point', 2);
  await expect(page.locator('#value')).toHaveText('4.000');
  await expect.poll(() => zoomLevel(page)).toBe(1.5);
  const svg = page.locator('#function-plot svg');
  await svg.focus();
  await page.keyboard.press('ArrowRight');
  const moved = await svg.evaluate((element) => element.__zoom.x);
  await page.keyboard.press('+');
  await expect.poll(() => zoomLevel(page)).toBe(2.25);
  expect(moved).not.toBe(0);
  await page.keyboard.press('0');
  await expect.poll(() => zoomLevel(page)).toBe(1);
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await setRange(page, 'coefficient', 2);
  await expect.poll(() => zoomLevel(page)).toBe(1);
  for (let index = 0; index < 12; index += 1) {
    const button = page.locator('#zoom-in');
    if (await button.isEnabled()) await button.click();
  }
  await expect(page.locator('#zoom-in')).toBeDisabled();
  await page.getByRole('button', { name: 'Reset all controls' }).click();
  await expect(page.locator('#value')).toHaveText('1.000');
  await expect.poll(() => zoomLevel(page)).toBe(1);
  await expect(page.locator('#zoom-in')).toBeEnabled();
});

test('chapter navigation and old shared links preserve state', async ({ page }) => {
  await page.goto('./#family=sigmoid&point=2&compare=true');
  await expect(page.locator('#family')).toHaveValue('sigmoid');
  await expect(page.locator('#point')).toHaveValue('2');
  await expect(page.locator('#comparison-table')).toBeVisible();
  const url = page.url();
  await page.getByRole('link', { name: 'Reference', exact: true }).click();
  await expect(page).toHaveURL(url);
  await expect(page.locator('#_keep_in_mind')).toBeFocused();
  const source = await page.request.get('calculus.adoc');
  expect(source.ok()).toBe(true);
  await page.locator('.contents-link').click();
  await expect(page.locator('.chapter-row')).toHaveCount(4);
  await expect(page.locator('script[src*="chapters/"]')).toHaveCount(0);
  await page.locator('.chapter-link').click();
  await expect(page.locator('#value')).toHaveText('1.000');
});

test('responsive layout keeps plots visible without overflow', async ({ page }, testInfo) => {
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const plot of await page.locator('.chart svg').all()) {
      await expect(plot).toBeVisible();
      const box = await plot.boundingBox();
      expect(box.width).toBeGreaterThan(200);
      expect(box.height).toBeGreaterThan(150);
    }
    if (width === 390 || width === 1440) await page.screenshot({ path: testInfo.outputPath(`calculus-${width}.png`), fullPage: true, animations: 'disabled' });
  }
});