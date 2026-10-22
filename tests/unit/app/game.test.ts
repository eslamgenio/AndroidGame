import { describe, expect, it } from 'vitest';
import data from '../../../levels/01-gravity.json';
import { Game } from '../../../src/app/game';
import { loadLevel } from '../../../src/core/level/load';

const idle = { left: false, right: false, jump: false };

function settled(): Game {
  const game = new Game(loadLevel(data));
  for (let i = 0; i < 60; i++) game.tick(idle); // Falls onto the ceiling.
  return game;
}

describe('Game', () => {
  it('applies a patch on the very next tick, without moving the player first', () => {
    const game = settled();
    const before = game.state.player;
    game.applyPatch('gravity.direction', 'DOWN');
    expect(game.state.player).toBe(before); // Patching alone changes nothing yet...
    game.tick(idle);
    expect(game.state.player.vy).toBeGreaterThan(0); // ...one tick later, gravity pulls down.
    expect(game.state.player.x).toBe(before.x);
    expect(game.state.deaths).toBe(0);
  });

  it('notifies listeners on patch, revert and restart', () => {
    const game = settled();
    let calls = 0;
    game.onChange(() => calls++);
    game.applyPatch('gravity.direction', 'DOWN');
    game.revert(1);
    game.restart();
    expect(calls).toBe(3);
  });

  it('restart restores the buggy rules and the spawn position', () => {
    const game = settled();
    game.applyPatch('gravity.direction', 'DOWN');
    game.restart();
    expect(game.rules.get('gravity.direction')).toBe('UP');
    expect(game.history.patches).toEqual([]);
    expect(game.state.tick).toBe(0);
  });
});
