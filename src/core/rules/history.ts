import type { RuleId, RuleValue } from './registry';
import { RuleError, type RuleSet } from './ruleSet';

export interface AppliedPatch {
  readonly id: number;
  readonly ruleId: RuleId;
  readonly from: RuleValue;
  readonly to: RuleValue;
}

/**
 * The patch log: the level's original rules plus every patch filed since.
 * The current rules are always recomputed from the base, so reverting a patch
 * is just leaving it out.
 */
export class PatchHistory {
  readonly current: RuleSet;

  constructor(
    readonly base: RuleSet,
    readonly patches: readonly AppliedPatch[] = [],
    private readonly nextId = 1,
  ) {
    this.current = patches.reduce((rules, p) => rules.with(p.ruleId, p.to), base);
  }

  apply(ruleId: RuleId, value: unknown): PatchHistory {
    const next = this.current.with(ruleId, value);
    const patch = { id: this.nextId, ruleId, from: this.current.get(ruleId), to: next.get(ruleId) };
    return new PatchHistory(this.base, [...this.patches, patch], this.nextId + 1);
  }

  revert(patchId: number): PatchHistory {
    if (!this.patches.some((p) => p.id === patchId)) throw new RuleError(`No patch #${patchId} to revert.`);
    return new PatchHistory(
      this.base,
      this.patches.filter((p) => p.id !== patchId),
      this.nextId,
    );
  }
}
