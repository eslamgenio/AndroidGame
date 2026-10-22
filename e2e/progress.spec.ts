import { type Page, expect, test } from '@playwright/test';

/**
 * Files the given patches, then plays the level's recorded solution through
 * the game's real tick() in one synchronous call, so the animation loop
 * cannot interleave and the run is deterministic.
 */
async function playSolution(page: Page, patches?: { ruleId: string; value: unknown }[]) {
  await page.evaluate((patches) => {
    const game = window.patchNotes?.game;
    if (!game) throw new Error('window.patchNotes is missing');
    game.restart();
    for (const p of patches ?? game.level.solution.patches) game.applyPatch(p.ruleId as never, p.value);
    for (const { hold = [], ticks } of game.level.solution.inputs) {
      const controls = { left: hold.includes('left'), right: hold.includes('right'), jump: hold.includes('jump') };
      for (let i = 0; i < ticks && game.state.outcome === 'playing'; i++) game.tick(controls);
    }
  }, patches);
}

const tab = (page: Page, ticket: string) => page.getByRole('navigation', { name: 'Tickets' }).getByRole('button', { name: new RegExp(ticket) });

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('a verified fix shows the result card and unlocks the next ticket', async ({ page }) => {
  await playSolution(page);
  const card = page.getByRole('dialog', { name: 'Level result' });
  await expect(card.getByRole('heading')).toHaveText('Verified fix ✓');
  await expect(card).toContainText('Every faulty rule fixed in 1 patch.');
  await expect(tab(page, 'BUG-001')).toHaveText('BUG-001 ✓');

  await card.getByRole('button', { name: 'Next ticket →' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Jump button does nothing');
  await expect(tab(page, 'BUG-002')).toHaveAttribute('aria-current', 'page');
  await expect(card).toBeHidden();
});

test('a workaround ships with known issues and names the real bug', async ({ page }) => {
  await tab(page, 'BUG-004').click();
  await playSolution(page, [{ ruleId: 'player.scale', value: 0.5 }]);
  const card = page.getByRole('dialog', { name: 'Level result' });
  await expect(card.getByRole('heading')).toHaveText('Shipped with known issues ⚠');
  await expect(card).toContainText('player.scale is 0.5, should be 1');
  await expect(tab(page, 'BUG-004')).toHaveText('BUG-004 ⚠');

  // A later verified fix upgrades the ticket's mark.
  await card.getByRole('button', { name: 'Retry' }).click();
  await expect(card).toBeHidden();
  await playSolution(page);
  await expect(tab(page, 'BUG-004')).toHaveText('BUG-004 ✓');
});

test('the last ticket needs both fixes and closes the game', async ({ page }) => {
  await tab(page, 'BUG-005').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Two regressions');
  await playSolution(page);
  const card = page.getByRole('dialog', { name: 'Level result' });
  await expect(card).toContainText('Every faulty rule fixed in 2 patches.');
  await expect(card).toContainText('All tickets closed.');
  await expect(card.getByRole('button', { name: 'Next ticket →' })).toHaveCount(0);
});

test('every level loads without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const ticket of ['BUG-001', 'BUG-002', 'BUG-003', 'BUG-004', 'BUG-005']) {
    await tab(page, ticket).click();
    await expect(tab(page, ticket)).toHaveAttribute('aria-current', 'page');
  }
  expect(errors).toEqual([]);
});
