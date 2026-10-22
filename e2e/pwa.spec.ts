import { expect, test } from '@playwright/test';

// Install and offline behavior is the same on every screen size.
test.skip(({ isMobile }) => isMobile, 'desktop project only');

test('links a manifest that meets Chrome install requirements', async ({ page, request }) => {
  await page.goto('/');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBeTruthy();
  const manifestUrl = new URL(href ?? '', page.url());
  const manifest = await (await request.get(manifestUrl.href)).json();

  expect(manifest.name).toBe('Patch Notes');
  expect(manifest.start_url).toBeTruthy();
  expect(manifest.display).toBe('standalone');
  const sizes = manifest.icons.map((icon: { sizes: string }) => icon.sizes);
  expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']));
  expect(manifest.icons.some((icon: { purpose?: string }) => icon.purpose === 'maskable')).toBe(true);

  for (const icon of manifest.icons as { src: string }[]) {
    const response = await request.get(new URL(icon.src, manifestUrl).href);
    expect(response.ok(), icon.src).toBe(true);
  }
});

test('works offline after the first visit', async ({ page, context }) => {
  await page.goto('/');
  // Wait for the service worker to install and take control of the page.
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);

  await context.setOffline(true);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.reload();

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Player falls up');
  await expect(page.locator('.rule[data-rule="gravity.direction"] .rule-value')).toHaveText('UP');
  expect(await page.evaluate(() => window.patchNotes?.game.level.id)).toBe('01-gravity');
  expect(errors).toEqual([]);
});
