import { describe, expect, it } from 'vitest';
import { loadLevel } from '../../src/core/level/load';
import { runReplay } from '../../src/core/sim/replay';

// "Every level is a test case": each level ships a solution, and that
// solution must fail while the bug is present and pass once it is fixed.
const files = import.meta.glob<{ default: unknown }>('../../levels/*.json', { eager: true });

describe.each(Object.entries(files))('%s', (_path, mod) => {
  const level = loadLevel(mod.default);

  it('cannot be finished with the bug present', () => {
    expect(runReplay(level, [], level.solution.inputs).outcome).toBe('playing');
  });

  it('is finished, verified and without deaths, once patched', () => {
    const state = runReplay(level, level.solution.patches, level.solution.inputs);
    expect(state.outcome).toBe('verified');
    expect(state.deaths).toBe(0);
  });

  it('is deterministic', () => {
    const a = runReplay(level, level.solution.patches, level.solution.inputs);
    const b = runReplay(level, level.solution.patches, level.solution.inputs);
    expect(a).toEqual(b);
  });
});

it('finds the level files', () => {
  expect(Object.keys(files).length).toBeGreaterThan(0);
});
