import { describe, expect, it } from 'vitest';
import { PatchHistory } from '../../../src/core/rules/history';
import { RuleSet } from '../../../src/core/rules/ruleSet';

const base = RuleSet.from({ 'gravity.direction': 'UP', 'player.scale': 2 });

describe('PatchHistory', () => {
  it('starts at the base rules with no patches', () => {
    const history = new PatchHistory(base);
    expect(history.current).toBe(base);
    expect(history.patches).toEqual([]);
  });

  it('records each patch with the value it replaced', () => {
    const history = new PatchHistory(base).apply('gravity.direction', 'NONE').apply('gravity.direction', 'DOWN');
    expect(history.current.get('gravity.direction')).toBe('DOWN');
    expect(history.patches).toEqual([
      { id: 1, ruleId: 'gravity.direction', from: 'UP', to: 'NONE' },
      { id: 2, ruleId: 'gravity.direction', from: 'NONE', to: 'DOWN' },
    ]);
  });

  it('is immutable', () => {
    const start = new PatchHistory(base);
    start.apply('player.scale', 1);
    expect(start.patches).toEqual([]);
  });

  it('reverts one patch and keeps the later ones', () => {
    const history = new PatchHistory(base).apply('gravity.direction', 'DOWN').apply('player.scale', 1);
    const reverted = history.revert(1);
    expect(reverted.current.get('gravity.direction')).toBe('UP');
    expect(reverted.current.get('player.scale')).toBe(1);
    expect(reverted.patches.map((p) => p.id)).toEqual([2]);
  });

  it('keeps ids increasing after a revert', () => {
    const history = new PatchHistory(base).apply('player.scale', 1).revert(1).apply('player.scale', 0.5);
    expect(history.patches.map((p) => p.id)).toEqual([2]);
  });

  it('throws when reverting an unknown patch', () => {
    expect(() => new PatchHistory(base).revert(9)).toThrow(/No patch #9/);
  });
});
