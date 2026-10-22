import type { InputStep, Level, PatchRequest } from '../level/types';
import type { Controls } from '../physics/body';
import { PatchHistory } from '../rules/history';
import { type GameState, initialState, step } from './step';

/** Expands a compact replay script into one `Controls` value per tick. */
export function expandInputs(steps: readonly InputStep[]): Controls[] {
  return steps.flatMap(({ hold = [], ticks }) => {
    const controls = { left: hold.includes('left'), right: hold.includes('right'), jump: hold.includes('jump') };
    return Array.from({ length: ticks }, () => controls);
  });
}

/**
 * Files the given patches at tick 0, then plays the inputs.
 * Stops early once the level is won.
 */
export function runReplay(level: Level, patches: readonly PatchRequest[], inputs: readonly InputStep[]): GameState {
  const rules = patches.reduce((h, p) => h.apply(p.ruleId, p.value), new PatchHistory(level.rules)).current;
  let state = initialState(level, rules);
  for (const controls of expandInputs(inputs)) {
    state = step(state, controls, level, rules);
    if (state.outcome !== 'playing') break;
  }
  return state;
}
