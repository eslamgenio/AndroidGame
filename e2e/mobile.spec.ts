import { expect, test } from '@playwright/test';

const playerX = (page: import('@playwright/test').Page) =>
  page.evaluate(() => window.patchNotes?.game.state.player.x ?? Number.NaN);

test.describe('on a touch phone', () => {
  test.skip(({ isMobile }) => !isMobile, 'touch only');
  test.use({ viewport: { width: 360, height: 640 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Level 1 starts upside down; fix gravity so the player can run.
    await page.getByLabel('Faulty rule').selectOption('gravity.direction');
    await page.getByRole('radio', { name: 'DOWN', exact: true }).check();
    await page.getByRole('button', { name: 'Ship patch' }).click();
  });

  test('holding the on-screen right button runs right', async ({ page }) => {
    const button = page.getByRole('button', { name: 'Move right' });
    const box = await button.boundingBox();
    if (!box) throw new Error('no button box');
    const before = await playerX(page);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(400);
    await page.mouse.up();
    expect(await playerX(page)).toBeGreaterThan(before + 20);
  });

  test('fits the screen, with large touch targets', async ({ page }) => {
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
    for (const name of ['Move left', 'Move right', 'Jump']) {
      const box = await page.getByRole('button', { name }).boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(48);
      expect(box?.height).toBeGreaterThanOrEqual(48);
    }
  });

  test('keeps the game in view while the report form is used', async ({ page }) => {
    await page.getByRole('button', { name: 'Ship patch' }).scrollIntoViewIfNeeded();
    await expect(page.locator('canvas')).toBeInViewport();
    await expect(page.getByRole('button', { name: 'Jump' })).toBeInViewport();
  });
});

test('touch controls are hidden on desktop', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop only');
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Move right' })).toBeHidden();
});
