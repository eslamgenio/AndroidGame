import type { Level } from '../core/level/types';
import type { Controls } from '../core/physics/body';
import type { RuleId } from '../core/rules/registry';
import { PatchHistory } from '../core/rules/history';
import { type GameState, initialState, step } from '../core/sim/step';

type Listener = (game: Game) => void;

/**
 * The imperative shell around the pure core: holds the current level, patch
 * history and game state, and tells listeners when the rules change.
 */
export class Game {
  history: PatchHistory;
  state: GameState;
  private readonly listeners = new Set<Listener>();

  constructor(readonly level: Level) {
    this.history = new PatchHistory(level.rules);
    this.state = initialState(level, this.history.current);
  }

  get rules() {
    return this.history.current;
  }

  tick(controls: Controls): void {
    const before = this.state.outcome;
    this.state = step(this.state, controls, this.level, this.rules);
    if (this.state.outcome !== before) this.emit();
  }

  /** Files a bug report. The patch takes effect on the very next tick. */
  applyPatch(ruleId: RuleId, value: unknown): void {
    this.history = this.history.apply(ruleId, value);
    this.emit();
  }

  revert(patchId: number): void {
    this.history = this.history.revert(patchId);
    this.emit();
  }

  /** Restarts the level from scratch, including its original (buggy) rules. */
  restart(): void {
    this.history = new PatchHistory(this.level.rules);
    this.state = initialState(this.level, this.rules);
    this.emit();
  }

  onChange(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    for (const listener of this.listeners) listener(this);
  }
}
