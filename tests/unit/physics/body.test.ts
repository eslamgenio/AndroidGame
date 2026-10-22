import { describe, expect, it } from 'vitest';
import { type Body, type Controls, resizeBody, solidAtFor, stepBody } from '../../../src/core/physics/body';
import { moveAxis } from '../../../src/core/physics/collide';
import { TILE } from '../../../src/core/physics/constants';
import { loadLevel } from '../../../src/core/level/load';
import { RuleSet } from '../../../src/core/rules/ruleSet';

// An 8x8 room: walls all round, a glass floor tile at col 2, a wall stub at col 6.
const room = loadLevel({
  id: 'room',
  ticket: 'T',
  title: 'T',
  report: 'T',
  tiles: ['########', '#......#', '#......#', '#......#', '#....#.#', '#P...#E#', '#.G....#', '########'],
  inspect: ['gravity.direction'],
  rules: {},
  fixes: { 'gravity.direction': 'UP' },
  solution: { patches: [], inputs: [] },
});

const idle: Controls = { left: false, right: false, jump: false };
const body = (x: number, y: number, extra: Partial<Body> = {}): Body => ({
  x,
  y,
  w: 12,
  h: 14,
  vx: 0,
  vy: 0,
  grounded: false,
  ...extra,
});

function run(start: Body, rules: RuleSet, ticks: number, controls: Controls = idle): Body {
  const solidAt = solidAtFor(room.tileAt, rules);
  let b = start;
  for (let i = 0; i < ticks; i++) b = stepBody(b, controls, rules, solidAt);
  return b;
}

describe('stepBody', () => {
  it('falls and rests on the floor under DOWN gravity', () => {
    const b = run(body(TILE * 3, TILE * 2), RuleSet.defaults(), 120);
    expect(b.y + b.h).toBe(TILE * 7);
    expect(b.vy).toBe(0);
    expect(b.grounded).toBe(true);
  });

  it('falls onto the ceiling under UP gravity', () => {
    const b = run(body(TILE * 3, TILE * 4), RuleSet.from({ 'gravity.direction': 'UP' }), 120);
    expect(b.y).toBe(TILE);
    expect(b.grounded).toBe(true);
  });

  it('is pulled onto the left wall and ignores running under LEFT gravity', () => {
    const rules = RuleSet.from({ 'gravity.direction': 'LEFT' });
    const b = run(body(TILE * 3, TILE * 2), rules, 120, { ...idle, right: true });
    expect(b.x).toBe(TILE);
    expect(b.grounded).toBe(true);
  });

  it('floats in place with no gravity', () => {
    const b = run(body(TILE * 3, TILE * 2), RuleSet.from({ 'gravity.direction': 'NONE' }), 60);
    expect(b.y).toBe(TILE * 2);
    expect(b.grounded).toBe(false);
  });

  it('runs and stops flush against a wall', () => {
    // Starts on the bottom floor (row 6) and runs into the right outer wall (col 7).
    const b = run(body(TILE * 3, TILE * 7 - 14), RuleSet.defaults(), 120, { ...idle, right: true });
    expect(b.x + b.w).toBe(TILE * 7);
    expect(b.vx).toBe(0);
  });

  it('jumps only when grounded', () => {
    const rules = RuleSet.defaults();
    const solidAt = solidAtFor(room.tileAt, rules);
    const airborne = stepBody(body(TILE * 3, TILE * 2), { ...idle, jump: true }, rules, solidAt);
    expect(airborne.vy).toBeGreaterThan(0);
    const grounded = run(body(TILE * 3, TILE * 2), rules, 120);
    expect(stepBody(grounded, { ...idle, jump: true }, rules, solidAt).vy).toBeLessThan(0);
  });

  it('gets no lift when jumpPower is 0', () => {
    const rules = RuleSet.from({ 'player.jumpPower': 0 });
    const grounded = run(body(TILE * 3, TILE * 2), rules, 120);
    const after = run(grounded, rules, 30, { ...idle, jump: true });
    expect(after.y).toBe(grounded.y);
  });

  it('falls through glass only when glass is not solid', () => {
    const start = body(TILE * 2 + 2, TILE * 5);
    expect(run(start, RuleSet.defaults(), 60).y + 14).toBe(TILE * 6);
    expect(run(start, RuleSet.from({ 'tile.glass.solid': false }), 60).y + 14).toBe(TILE * 7);
  });
});

describe('moveAxis', () => {
  it('does not tunnel through a one-tile wall at high speed', () => {
    const solidAt = solidAtFor(room.tileAt, RuleSet.defaults());
    const { box, hit } = moveAxis(body(TILE * 1, TILE * 4 + 1), 'x', 100, solidAt);
    expect(hit).toBe(true);
    expect(box.x + box.w).toBe(TILE * 5);
  });

  it('moves freely when nothing is in the way', () => {
    const solidAt = solidAtFor(room.tileAt, RuleSet.defaults());
    expect(moveAxis(body(TILE, TILE), 'x', 10, solidAt)).toEqual({ box: body(TILE + 10, TILE), hit: false });
  });
});

describe('resizeBody', () => {
  const rules = RuleSet.defaults();
  const solidAt = solidAtFor(room.tileAt, rules);

  it('keeps the feet in place when shrinking', () => {
    const big = body(TILE * 3, TILE * 7 - 28, { w: 24, h: 28 });
    const small = resizeBody(big, { w: 12, h: 14 }, rules, solidAt);
    expect(small.y + small.h).toBe(TILE * 7);
    expect(small.x + small.w / 2).toBe(big.x + big.w / 2);
  });

  it('keeps the old size when the new one would overlap a wall', () => {
    const b = body(TILE + 1, TILE * 7 - 14);
    expect(resizeBody(b, { w: 24, h: 28 }, rules, solidAt)).toBe(b);
  });
});
