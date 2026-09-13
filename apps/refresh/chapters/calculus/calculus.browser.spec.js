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

test('composition rules update contributions and preserve each lab state', async ({ page }) => {
  await setRange(page, 'point', 2);
  await page.getByRole('tab', { name: 'Derivative composition' }).click();
  await expect(page.locator('.composition-chart svg')).toHaveCount(3);
  await expect(page.locator('#composition-slope')).toHaveText('2.540');
  await page.locator('#composition-outer').selectOption('linear');
  await setRange(page, 'composition-outer-coefficient', 2);
  await expect(page.locator('#composition-term-0')).toHaveText('2.000');
  await expect(page.locator('#composition-term-1')).toHaveText('2.000');
  await expect(page.locator('#composition-slope')).toHaveText('4.000');
  await page.getByRole('radio', { name: 'Product', exact: true }).check();
  await expect(page.locator('#composition-slope')).toHaveText('6.000');
  await setRange(page, 'composition-point', 2);
  await expect(page.locator('#composition-slope')).toHaveText('24.000');
  await page.getByRole('radio', { name: 'Chain', exact: true }).check();
  await expect(page.locator('#composition-slope')).toHaveText('8.000');
  await page.getByRole('tab', { name: 'Function lab', exact: true }).click();
  await expect(page.locator('#point')).toHaveValue('2');
  await expect(page.locator('#value')).toHaveText('4.000');
  await page.getByRole('tab', { name: 'Function lab', exact: true }).press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Derivative composition' })).toBeFocused();
  await expect(page.locator('#composition-slope')).toHaveText('8.000');
  await page.getByRole('button', { name: 'Reset composition' }).click();
  await expect(page.locator('#composition-slope')).toHaveText('2.540');
  await expect(page.getByRole('radio', { name: 'Addition', exact: true })).toBeChecked();
});

test('chain evaluates the outer slope at g(x) and swapping reverses nesting', async ({ page }) => {
  await page.getByRole('tab', { name: 'Derivative composition' }).click();
  await page.getByRole('radio', { name: 'Chain', exact: true }).check();
  await setRange(page, 'composition-point', 2);
  await expect(page.locator('#composition-intermediate')).toHaveText('4.000');
  await expect(page.locator('#composition-outer-slope')).toHaveText('-0.654');
  await expect(page.locator('#composition-inner-slope')).toHaveText('4.000');
  await expect(page.locator('#composition-slope')).toHaveText('-2.615');
  await expect(page.locator('.composition-plots section').first()).toHaveAttribute('aria-label', 'g(x) plot');
  await page.getByRole('button', { name: 'Swap f and g' }).click();
  await expect(page.locator('#composition-outer')).toHaveValue('power');
  await expect(page.locator('#composition-intermediate')).toHaveText('0.909');
  await expect(page.locator('#composition-slope')).toHaveText('-0.757');
  await page.getByRole('radio', { name: 'Product', exact: true }).check();
  await page.locator('#composition-outer').selectOption('sin');
  await page.locator('#composition-inner').selectOption('cos');
  await setRange(page, 'composition-point', 0.79);
  await expect(page.locator('#composition-term-0')).toHaveText('0.495');
  await expect(page.locator('#composition-term-1')).toHaveText('-0.505');
  await expect(page.locator('#composition-slope')).toHaveText('-0.009');
  const negativeBar = await page.locator('.contribution-track > div').nth(1).evaluate((element) => parseFloat(element.style.left));
  expect(negativeBar).toBeLessThan(50);
});

test('composition plots and rule controls fit desktop and mobile', async ({ page }, testInfo) => {
  await page.getByRole('tab', { name: 'Derivative composition' }).click();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const name of ['Addition', 'Product', 'Chain']) {
      await page.getByRole('radio', { name, exact: true }).check();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      for (const svg of await page.locator('.composition-chart svg').all()) {
        await expect(svg).toBeVisible();
        await expect(svg.locator('.composition-curve')).toHaveAttribute('d', /^M/);
        await expect(svg.locator('.composition-tangent')).toHaveAttribute('d', /^M/);
      }
      if (width === 390 || width === 1440) await page.locator('.composition-lab').screenshot({ path: testInfo.outputPath(`composition-${name}-${width}.png`), animations: 'disabled' });
    }
  }
});

test('composition zoom and pan stay synchronized across plots and resizing', async ({ page }, testInfo) => {
  await page.getByRole('tab', { name: 'Derivative composition' }).click();
  const plots = page.locator('.composition-chart svg');
  const levels = () => plots.evaluateAll((elements) => elements.map((element) => element.__zoom.k));
  const initial = await plots.first().locator('.composition-curve').getAttribute('d');
  const initialSlope = await page.locator('#composition-slope').textContent();
  await page.getByRole('button', { name: 'Zoom out all plots', exact: true }).click();
  await expect.poll(levels).toEqual([1 / 1.5, 1 / 1.5, 1 / 1.5]);
  await expect(plots.first().locator('.composition-curve')).not.toHaveAttribute('d', initial);
  await page.getByRole('button', { name: 'Zoom in all plots', exact: true }).click();
  await expect.poll(levels).toEqual([1, 1, 1]);
  await expect(page.locator('#composition-slope')).toHaveText(initialSlope);
  for (const plot of await plots.all()) {
    const previous = (await levels())[0];
    await plot.hover();
    await page.mouse.wheel(0, -160);
    await expect.poll(async () => (await levels()).every((scale) => scale > previous)).toBe(true);
    const current = await levels();
    expect(current.every((scale) => Math.abs(scale - current[0]) < 1e-9)).toBe(true);
  }
  const box = await plots.nth(1).boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 45, box.y + box.height / 2 + 20, { steps: 5 });
  await page.mouse.up();
  const normalized = () => plots.evaluateAll((elements) => elements.map((element) => {
    const transform = element.__zoom;
    const width = element.viewBox.baseVal.width;
    return { k: transform.k, x: (transform.x - 56 * (1 - transform.k)) / (width - 76), y: (transform.y - 18 * (1 - transform.k)) / 218 };
  }));
  const beforeResize = (await normalized())[0];
  for (const view of await normalized()) {
    expect(view.x).toBeCloseTo(beforeResize.x, 8);
    expect(view.y).toBeCloseTo(beforeResize.y, 8);
  }
  await page.setViewportSize({ width: 390, height: 900 });
  await expect.poll(async () => (await normalized()).every((view) => Math.abs(view.x - beforeResize.x) < 1e-8 && Math.abs(view.y - beforeResize.y) < 1e-8)).toBe(true);
  await plots.last().focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(async () => (await normalized()).every((view) => Math.abs(view.x - (beforeResize.x - 0.1)) < 1e-8)).toBe(true);
  await page.keyboard.press('0');
  await expect.poll(levels).toEqual([1, 1, 1]);
  await page.keyboard.press('+');
  await expect.poll(levels).toEqual([1.5, 1.5, 1.5]);
  await setRange(page, 'composition-point', 2);
  await expect(page.locator('#composition-point')).toHaveValue('2');
  await expect.poll(levels).toEqual([1.5, 1.5, 1.5]);
  await page.getByRole('button', { name: 'Reset all plot views', exact: true }).click();
  await expect.poll(levels).toEqual([1, 1, 1]);
  await expect(page.locator('#composition-point')).toHaveValue('2');
  for (let index = 0; index < 5; index += 1) {
    const button = page.getByRole('button', { name: 'Zoom out all plots', exact: true });
    if (await button.isEnabled()) await button.click();
  }
  await expect.poll(levels).toEqual([0.25, 0.25, 0.25]);
  await expect(page.getByRole('button', { name: 'Zoom out all plots', exact: true })).toBeDisabled();
  await page.locator('.composition-lab').screenshot({ path: testInfo.outputPath('composition-zoomed-mobile.png'), animations: 'disabled' });
  await page.getByRole('radio', { name: 'Chain', exact: true }).check();
  await expect.poll(levels).toEqual([1, 1, 1]);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole('button', { name: 'Zoom out all plots', exact: true }).click();
  await page.locator('.composition-lab').screenshot({ path: testInfo.outputPath('composition-zoomed-desktop.png'), animations: 'disabled' });
});

test('composition touch pinch synchronizes all three views', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, hasTouch: true, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    await page.goto('calculus.html');
    await page.getByRole('tab', { name: 'Derivative composition' }).click();
    const plot = page.locator('.composition-chart svg').first();
    await plot.scrollIntoViewIfNeeded();
    const box = await plot.boundingBox();
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    const session = await context.newCDPSession(page);
    const contacts = (distance) => [{ x: centerX - distance, y: centerY, id: 1 }, { x: centerX + distance, y: centerY, id: 2 }];
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: contacts(30) });
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: contacts(60) });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect.poll(() => page.locator('.composition-chart svg').evaluateAll((elements) => elements.map((element) => element.__zoom.k))).toEqual([2, 2, 2]);
  } finally {
    await context.close();
  }
});