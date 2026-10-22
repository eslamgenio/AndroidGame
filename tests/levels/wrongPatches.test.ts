import { describe, expect, it } from 'vitest';
import { loadLevel } from '../../src/core/level/load';
import type { InputStep, PatchRequest } from '../../src/core/level/types';
import { runReplay } from '../../src/core/sim/replay';
import type { Outcome } from '../../src/core/sim/step';

// Level design promises from SPEC.md: a wrong fix really ships and has a
// visible consequence. Each case plays the level's own solution inputs
// unless it names its own.
const files = import.meta.glob<{ default: unknown }>('../../levels/*.json', { eager: true });
const level = (id: string) => loadLevel(files[`../../levels/${id}.json`]?.default);

interface Case {
  level: string;
  wrong: PatchRequest[];
  inputs?: InputStep[];
  expect: { outcome: Outcome; died?: boolean };
  why: string;
}

// Hop across the pit, then walk (endless hopping sails over the exit).
const hop: InputStep[] = [
  { hold: ['right', 'jump'], ticks: 92 },
  { hold: ['right'], ticks: 200 },
];

const cases: Case[] = [
  { level: '01-gravity', wrong: [{ ruleId: 'gravity.direction', value: 'NONE' }], expect: { outcome: 'playing' }, why: 'you float and cannot jump the block' },
  { level: '02-jump', wrong: [{ ruleId: 'player.jumpPower', value: 3 }], expect: { outcome: 'playing', died: true }, why: 'you rocket into the ceiling spikes' },
  { level: '02-jump', wrong: [{ ruleId: 'player.jumpPower', value: 0.5 }], expect: { outcome: 'playing' }, why: 'a half jump cannot clear the ledge' },
  { level: '03-glass', wrong: [{ ruleId: 'tile.glass.visible', value: false }], expect: { outcome: 'playing', died: true }, why: 'hiding the bridge does not make it solid' },
  { level: '03-glass', wrong: [{ ruleId: 'hazard.spikes.lethal', value: false }], inputs: hop, expect: { outcome: 'known-issues' }, why: 'you survive the pit and hop out' },
  { level: '04-scale', wrong: [{ ruleId: 'player.scale', value: 0.5 }], expect: { outcome: 'known-issues' }, why: 'tiny, but it fits' },
  { level: '05-regressions', wrong: [{ ruleId: 'gravity.direction', value: 'DOWN' }], expect: { outcome: 'playing' }, why: 'the exit is still locked' },
  { level: '05-regressions', wrong: [{ ruleId: 'exit.requires', value: 'NONE' }], expect: { outcome: 'playing' }, why: 'still pinned to the wall' },
  {
    level: '05-regressions',
    wrong: [
      { ruleId: 'gravity.direction', value: 'RIGHT' },
      { ruleId: 'exit.requires', value: 'NONE' },
    ],
    expect: { outcome: 'playing' },
    why: 'pinned against the step instead',
  },
];

describe.each(cases)('$level with a wrong fix', (c) => {
  it(`${c.wrong.map((p) => `${p.ruleId}=${String(p.value)}`).join(', ')}: ${c.why}`, () => {
    const l = level(c.level);
    const state = runReplay(l, c.wrong, c.inputs ?? l.solution.inputs);
    expect(state.outcome).toBe(c.expect.outcome);
    if (c.expect.died !== undefined) expect(state.deaths > 0).toBe(c.expect.died);
  });
});
