import { describe, expect, it } from 'vitest';
import { LevelError, loadLevel } from '../../../src/core/level/load';

function validLevel(): Record<string, unknown> {
  return {
    id: 'test',
    ticket: 'BUG-000',
    title: 'Test level',
    report: 'Expected: works. Actual: does not.',
    tiles: ['#####', '#P.E#', '#####'],
    inspect: ['gravity.direction', 'player.speed'],
    rules: { 'gravity.direction': 'UP' },
    fixes: { 'gravity.direction': 'DOWN' },
    solution: { patches: [{ ruleId: 'gravity.direction', value: 'DOWN' }], inputs: [{ hold: ['right'], ticks: 30 }] },
  };
}

function errorsOf(data: unknown): string[] {
  try {
    loadLevel(data);
  } catch (e) {
    if (e instanceof LevelError) return e.errors;
    throw e;
  }
  throw new Error('expected loadLevel to throw');
}

describe('loadLevel', () => {
  it('loads a valid level', () => {
    const level = loadLevel(validLevel());
    expect(level.width).toBe(5);
    expect(level.height).toBe(3);
    expect(level.spawn).toEqual({ col: 1, row: 1 });
    expect(level.exit).toEqual({ col: 3, row: 1 });
    expect(level.key).toBeNull();
    expect(level.tileAt(0, 0)).toBe('wall');
    expect(level.tileAt(1, 1)).toBe('empty'); // the spawn marker is not a tile
    expect(level.rules.get('gravity.direction')).toBe('UP');
    expect(level.solution.inputs).toEqual([{ hold: ['right'], ticks: 30 }]);
  });

  it('treats everything outside the map as wall', () => {
    const level = loadLevel(validLevel());
    expect(level.tileAt(-1, 0)).toBe('wall');
    expect(level.tileAt(0, 99)).toBe('wall');
  });

  it('reports ragged rows and unknown tiles', () => {
    expect(errorsOf({ ...validLevel(), tiles: ['#####', '#P.E', '##X##'] })).toEqual([
      'tiles[1] has 4 columns; expected 5.',
      'tiles[2] col 2: unknown tile "X".',
    ]);
  });

  it('requires exactly one spawn and one exit', () => {
    expect(errorsOf({ ...validLevel(), tiles: ['#####', '#..E#', '#####'] })).toContain('Level needs exactly one "P" (found 0).');
    expect(errorsOf({ ...validLevel(), tiles: ['#####', '#PEE#', '#####'] })).toContain('Level needs exactly one "E" (found 2).');
  });

  it('reports unknown rules and disallowed values', () => {
    const errors = errorsOf({ ...validLevel(), inspect: ['gravity.flavor'], rules: { 'player.speed': 9 } });
    expect(errors).toContain('inspect: unknown rule "gravity.flavor".');
    expect(errors.some((e) => e.startsWith('rules: "player.speed" does not allow 9'))).toBe(true);
  });

  it('checks that fixes are inspectable, allowed, and actually change something', () => {
    const errors = errorsOf({
      ...validLevel(),
      fixes: { 'gravity.direction': 'UP', 'player.scale': 1, 'player.speed': 5 },
    });
    expect(errors).toContain('fixes: "gravity.direction" is already UP, so it is not a bug.');
    expect(errors).toContain('fixes: "player.scale" is not in inspect, so the player cannot patch it.');
    expect(errors.some((e) => e.startsWith('fixes: "player.speed" does not allow 5'))).toBe(true);
  });

  it('requires at least one fix', () => {
    expect(errorsOf({ ...validLevel(), fixes: {} })).toContain('fixes: a level needs at least one bug.');
  });

  it('validates the solution script', () => {
    const errors = errorsOf({
      ...validLevel(),
      solution: { patches: [{ ruleId: 'nope', value: 1 }], inputs: [{ hold: ['dance'], ticks: 0 }] },
    });
    expect(errors).toContain('solution.patches[0]: unknown rule "nope".');
    expect(errors).toContain('solution.inputs[0]: unknown button "dance".');
    expect(errors).toContain('solution.inputs[0]: ticks must be a positive integer.');
  });

  it('rejects missing text fields', () => {
    const level = validLevel();
    delete level['title'];
    expect(errorsOf(level)).toContain('title must be a non-empty string.');
  });
});
