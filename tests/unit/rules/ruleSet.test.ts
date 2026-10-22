import { describe, expect, it } from 'vitest';
import { RULES } from '../../../src/core/rules/registry';
import { RuleError, RuleSet, diffRules } from '../../../src/core/rules/ruleSet';

describe('RuleSet', () => {
  it('starts every rule at its registry default', () => {
    const rules = RuleSet.defaults();
    expect(rules.get('gravity.direction')).toBe(RULES['gravity.direction'].default);
    expect(rules.get('player.jumpPower')).toBe(1);
  });

  it('builds from level overrides', () => {
    const rules = RuleSet.from({ 'gravity.direction': 'UP', 'player.scale': 2 });
    expect(rules.get('gravity.direction')).toBe('UP');
    expect(rules.get('player.scale')).toBe(2);
    expect(rules.get('player.jumpPower')).toBe(1);
  });

  it('applies a patch without mutating the original', () => {
    const before = RuleSet.from({ 'gravity.direction': 'UP' });
    const after = before.with('gravity.direction', 'DOWN');
    expect(after.get('gravity.direction')).toBe('DOWN');
    expect(before.get('gravity.direction')).toBe('UP');
  });

  it('rejects unknown rules with a descriptive error', () => {
    expect(() => RuleSet.from({ 'gravity.sideways': true })).toThrow(RuleError);
    expect(() => RuleSet.from({ 'gravity.sideways': true })).toThrow(/Unknown rule "gravity.sideways"/);
  });

  it('rejects values outside the allowed list', () => {
    expect(() => RuleSet.defaults().with('player.jumpPower', 7)).toThrow(
      /"player.jumpPower" does not allow 7\. Allowed: 0, 0.5, 1, 3/,
    );
    expect(() => RuleSet.from({ 'tile.glass.solid': 'yes' })).toThrow(RuleError);
  });

  it('diffs two rule sets', () => {
    const a = RuleSet.from({ 'gravity.direction': 'UP' });
    const b = a.with('gravity.direction', 'DOWN').with('player.scale', 2);
    expect(diffRules(a, b)).toEqual([
      { ruleId: 'gravity.direction', from: 'UP', to: 'DOWN' },
      { ruleId: 'player.scale', from: 1, to: 2 },
    ]);
    expect(diffRules(a, a)).toEqual([]);
  });
});

describe('registry', () => {
  it('lists each default among its allowed values', () => {
    for (const [id, rule] of Object.entries(RULES)) {
      expect((rule.values as readonly unknown[]).includes(rule.default), id).toBe(true);
    }
  });
});
