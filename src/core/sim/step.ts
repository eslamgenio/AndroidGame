import type { Cell, Level } from '../level/types';
import { type Body, type Controls, playerSize, resizeBody, solidAtFor, stepBody } from '../physics/body';
import { type Box, someCell } from '../physics/collide';
import { TILE } from '../physics/constants';
import type { RuleSet } from '../rules/ruleSet';

export type Outcome = 'playing' | 'verified' | 'known-issues';

export interface GameState {
  readonly tick: number;
  readonly player: Body;
  readonly hasKey: boolean;
  readonly deaths: number;
  readonly outcome: Outcome;
}

export function initialState(level: Level, rules: RuleSet): GameState {
  return { tick: 0, player: spawnBody(level, rules), hasKey: false, deaths: 0, outcome: 'playing' };
}

/** Advances the game by one tick. Pure and deterministic. */
export function step(state: GameState, controls: Controls, level: Level, rules: RuleSet): GameState {
  if (state.outcome !== 'playing') return state;
  const solidAt = solidAtFor(level.tileAt, rules);
  const resized = resizeBody(state.player, playerSize(rules), rules, solidAt);
  const player = stepBody(resized, controls, rules, solidAt);
  const tick = state.tick + 1;

  if (touchesSpikes(player, level) && rules.get('hazard.spikes.lethal')) {
    return { ...state, tick, player: spawnBody(level, rules), deaths: state.deaths + 1 };
  }

  const hasKey = state.hasKey || (level.key !== null && touches(player, level.key));
  const exitOpen = rules.get('exit.requires') === 'NONE' || hasKey;
  const outcome = exitOpen && touches(player, level.exit) ? outcomeFor(level, rules) : 'playing';
  return { tick, player, hasKey, deaths: state.deaths, outcome };
}

/** "Verified" only if every faulty rule now has its correct value. */
export function outcomeFor(level: Level, rules: RuleSet): Outcome {
  const fixed = Object.entries(level.fixes).every(([id, value]) => rules.get(id as keyof typeof level.fixes) === value);
  return fixed ? 'verified' : 'known-issues';
}

function spawnBody(level: Level, rules: RuleSet): Body {
  const { w, h } = playerSize(rules);
  const { col, row } = level.spawn;
  // Feet on the bottom of the spawn tile, centred horizontally.
  return { x: col * TILE + (TILE - w) / 2, y: (row + 1) * TILE - h, w, h, vx: 0, vy: 0, grounded: false };
}

function touches(box: Box, cell: Cell): boolean {
  return someCell(box, (c, r) => c === cell.col && r === cell.row);
}

/**
 * Spikes are solid, so "touching" means being flush against one. The sides and
 * the top/bottom are probed separately so a diagonal corner does not count.
 */
function touchesSpikes(box: Box, level: Level): boolean {
  const isSpikes = (c: number, r: number) => level.tileAt(c, r) === 'spikes';
  return (
    someCell({ ...box, x: box.x - 1, w: box.w + 2 }, isSpikes) ||
    someCell({ ...box, y: box.y - 1, h: box.h + 2 }, isSpikes)
  );
}
