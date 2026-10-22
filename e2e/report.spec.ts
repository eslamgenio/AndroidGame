import { type Page, expect, test } from '@playwright/test';

const gameState = (page: Page) =>
  page.evaluate(() => {
    if (!window.patchNotes) throw new Error('window.patchNotes is missing');
    return window.patchNotes.game.state;
  });
const player = async (page: Page) => (await gameState(page)).player;
const rule = (page: Page, id: string) => page.locator(`.rule[data-rule="${id}"] .rule-value`);

async function fileReport(page: Page, ruleId: string, value: string) {
  await page.getByLabel('Faulty rule').selectOption(ruleId);
  await page.getByRole('radio', { name: value, exact: true }).check();
  await page.getByRole('button', { name: 'Ship patch' }).click();
}

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  // Let the bug play out: the player falls onto the ceiling.
  await expect.poll(async () => (await player(page)).grounded).toBe(true);
  expect(errors).toEqual([]);
});

test('shows the ticket and the live rules', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Player falls up' })).toBeVisible();
  await expect(rule(page, 'gravity.direction')).toHaveText('UP');
  await expect(page.getByText('No patches shipped yet.')).toBeVisible();
  expect((await player(page)).y).toBe(16); // Resting against the ceiling.
});

test('a correct report rewires the level live', async ({ page }) => {
  const before = await player(page);
  await fileReport(page, 'gravity.direction', 'DOWN');

  await expect(rule(page, 'gravity.direction')).toHaveText('UP DOWN');
  await expect(page.locator('.rule[data-rule="gravity.direction"] del')).toHaveText('UP');
  await expect(page.locator('.patch-list li')).toHaveText(/v1\.0\.1 gravity\.direction: UP → DOWN/);
  await expect(page.getByRole('status')).toHaveText('Patch v1.0.1 shipped: gravity.direction UP → DOWN');

  // No reload and no respawn: the player falls from where they were to the floor.
  await expect.poll(async () => (await player(page)).y).toBe(146);
  const after = await player(page);
  expect(after.x).toBe(before.x);
  expect((await gameState(page)).deaths).toBe(0);
});

test('a wrong report really ships, and can be reverted', async ({ page }) => {
  await fileReport(page, 'gravity.direction', 'NONE');
  await expect(rule(page, 'gravity.direction')).toHaveText('UP NONE');
  await expect.poll(async () => (await player(page)).grounded).toBe(false);

  await page.getByRole('button', { name: 'Revert v1.0.1' }).click();
  await expect(rule(page, 'gravity.direction')).toHaveText('UP');
  await expect(page.getByRole('status')).toHaveText('Patch reverted.');
  await expect(page.getByText('No patches shipped yet.')).toBeVisible();
});

test('the current value cannot be chosen as a fix', async ({ page }) => {
  await page.getByLabel('Faulty rule').selectOption('gravity.direction');
  await expect(page.getByRole('radio', { name: 'UP (current)' })).toBeDisabled();
});

test('restart resets patches and the player', async ({ page }) => {
  await fileReport(page, 'player.speed', '2');
  await fileReport(page, 'gravity.direction', 'DOWN');
  await expect(page.locator('.patch-list li')).toHaveCount(2);

  await page.getByRole('button', { name: 'Restart level' }).click();
  await expect(page.getByRole('status')).toHaveText('Level restarted.');
  await expect(page.locator('.patch-list li')).toHaveCount(0);
  await expect(rule(page, 'gravity.direction')).toHaveText('UP');
  await expect(rule(page, 'player.speed')).toHaveText('1');
});
