import type { RuleId, RuleValue } from '../rules/registry';
import type { RuleSet } from '../rules/ruleSet';

export type Tile = 'empty' | 'wall' | 'glass' | 'spikes';

export const BUTTONS = ['left', 'right', 'jump'] as const;
export type Button = (typeof BUTTONS)[number];

export interface Cell {
  readonly col: number;
  readonly row: number;
}

/** One step of a replay script: hold these buttons for this many ticks. */
export interface InputStep {
  readonly hold?: readonly Button[];
  readonly ticks: number;
}

export interface PatchRequest {
  readonly ruleId: RuleId;
  readonly value: RuleValue;
}

export interface Solution {
  readonly patches: readonly PatchRequest[];
  readonly inputs: readonly InputStep[];
}

export interface Level {
  readonly id: string;
  readonly ticket: string;
  readonly title: string;
  readonly report: string;
  readonly width: number;
  readonly height: number;
  readonly spawn: Cell;
  readonly exit: Cell;
  readonly key: Cell | null;
  /** Rules shown in the inspector and offered in the bug-report form. */
  readonly inspect: readonly RuleId[];
  /** The level's starting (buggy) rules. */
  readonly rules: RuleSet;
  /** The correct value of every faulty rule. */
  readonly fixes: Readonly<Partial<Record<RuleId, RuleValue>>>;
  readonly solution: Solution;
  /** Tiles outside the map count as walls, so nothing escapes sideways. */
  tileAt(col: number, row: number): Tile;
}
