import type { Level } from '../core/level/types';
import type { AppliedPatch } from '../core/rules/history';
import type { RuleId } from '../core/rules/registry';
import type { RuleSet } from '../core/rules/ruleSet';
import type { GameState } from '../core/sim/step';

/** Everything the UI may see or do. The UI never touches the game's internals. */
export interface GameController {
  readonly level: Level;
  readonly rules: RuleSet;
  readonly state: GameState;
  readonly history: { readonly base: RuleSet; readonly patches: readonly AppliedPatch[] };
  applyPatch(ruleId: RuleId, value: unknown): void;
  revert(patchId: number): void;
  restart(): void;
  onChange(listener: () => void): () => void;
}

export const version = (patchId: number): string => `v1.0.${patchId}`;
