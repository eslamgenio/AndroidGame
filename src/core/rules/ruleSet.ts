import { RULES, RULE_IDS, isRuleId, type RuleId, type RuleValue, type RuleValueOf } from './registry';

export class RuleError extends Error {
  override name = 'RuleError';
}

export interface RuleChange {
  readonly ruleId: RuleId;
  readonly from: RuleValue;
  readonly to: RuleValue;
}

/** An immutable snapshot of every rule's current value. */
export class RuleSet {
  private constructor(private readonly values: Readonly<Record<RuleId, RuleValue>>) {}

  static defaults(): RuleSet {
    const values = Object.fromEntries(RULE_IDS.map((id) => [id, RULES[id].default]));
    return new RuleSet(Object.freeze(values) as Record<RuleId, RuleValue>);
  }

  /** Builds a rule set from untrusted data, such as a level file. */
  static from(overrides: Readonly<Record<string, unknown>>): RuleSet {
    return Object.entries(overrides).reduce<RuleSet>((rules, [id, value]) => {
      if (!isRuleId(id)) throw new RuleError(`Unknown rule "${id}".`);
      return rules.with(id, value);
    }, RuleSet.defaults());
  }

  get<K extends RuleId>(id: K): RuleValueOf<K> {
    return this.values[id] as RuleValueOf<K>;
  }

  /** Returns a new rule set with one rule changed. Throws on a disallowed value. */
  with(id: RuleId, value: unknown): RuleSet {
    assertAllowed(id, value);
    return new RuleSet(Object.freeze({ ...this.values, [id]: value }));
  }
}

export function assertAllowed(id: RuleId, value: unknown): asserts value is RuleValue {
  const allowed: readonly unknown[] = RULES[id].values;
  if (!allowed.includes(value)) {
    throw new RuleError(`"${id}" does not allow ${String(value)}. Allowed: ${allowed.join(', ')}.`);
  }
}

export function diffRules(before: RuleSet, after: RuleSet): RuleChange[] {
  return RULE_IDS.filter((id) => before.get(id) !== after.get(id)).map((id) => ({
    ruleId: id,
    from: before.get(id),
    to: after.get(id),
  }));
}
