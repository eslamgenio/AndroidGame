export type RuleValue = string | number | boolean;

export interface RuleDefinition {
  readonly description: string;
  readonly values: readonly RuleValue[];
  readonly default: RuleValue;
}

/**
 * Every rule the simulation understands. Each one is a closed list of values,
 * so a bug report is always "pick a rule, then pick one of its values".
 */
export const RULES = {
  'gravity.direction': {
    description: 'Which way the world pulls you.',
    values: ['DOWN', 'UP', 'LEFT', 'RIGHT', 'NONE'],
    default: 'DOWN',
  },
  'gravity.strength': {
    description: 'How hard gravity pulls, as a multiple of normal.',
    values: [0.5, 1, 2],
    default: 1,
  },
  'player.speed': {
    description: 'Running speed, as a multiple of normal.',
    values: [0.5, 1, 2],
    default: 1,
  },
  'player.jumpPower': {
    description: 'Jump impulse, as a multiple of normal.',
    values: [0, 0.5, 1, 3],
    default: 1,
  },
  'player.scale': {
    description: 'Player hitbox size, as a multiple of normal.',
    values: [0.5, 1, 2],
    default: 1,
  },
  'tile.glass.solid': {
    description: 'Whether glass tiles block movement.',
    values: [true, false],
    default: true,
  },
  'tile.glass.visible': {
    description: 'Whether glass tiles are drawn.',
    values: [true, false],
    default: true,
  },
  'hazard.spikes.lethal': {
    description: 'Whether touching spikes respawns you.',
    values: [true, false],
    default: true,
  },
  'exit.requires': {
    description: 'What you must carry for the exit to open.',
    values: ['NONE', 'KEY'],
    default: 'NONE',
  },
} as const satisfies Record<string, RuleDefinition>;

export type RuleId = keyof typeof RULES;
export type RuleValueOf<K extends RuleId> = (typeof RULES)[K]['values'][number];

export const RULE_IDS = Object.keys(RULES) as RuleId[];

export function isRuleId(id: string): id is RuleId {
  return Object.hasOwn(RULES, id);
}
