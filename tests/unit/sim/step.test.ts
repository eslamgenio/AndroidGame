import { describe, expect, it } from 'vitest';
import { loadLevel } from '../../../src/core/level/load';
import type { InputStep } from '../../../src/core/level/types';
import { expandInputs, runReplay } from '../../../src/core/sim/replay';
import { initialState, outcomeFor, step } from '../../../src/core/sim/step';
import { RuleSet } from '../../../src/core/rules/ruleSet';

// A corridor: spawn on the left, then spikes, key, and exit to the right.
function corridor(tiles: string[], rules: Record<string, unknown> = {}) {
  return loadLevel({
    id: 'corridor',
    ticket: 'T',
    title: 'T',
    report: 'T',
    tiles,
    inspect: ['gravity.direction', 'exit.requires', 'hazard.spikes.lethal'],
    rules,
    fixes: { 'gravity.direction': 'UP' },
    solution: { patches: [], inputs: [] },
  });
}

const runRight: InputStep[] = [{ hold: ['right'], ticks: 200 }];

describe('step', () => {
  it('wins when the player reaches the exit', () => {
    const level = corridor(['#######', '#P...E#', '#######']);
    const state = runReplay(level, [{ ruleId: 'gravity.direction', value: 'UP' }], runRight);
    expect(state.outcome).toBe('verified');
  });

  it('wins with known issues when the faulty rule was not the one fixed', () => {
    const level = corridor(['#######', '#P...E#', '#######']);
    expect(runReplay(level, [], runRight).outcome).toBe('known-issues');
  });

  it('respawns the player on lethal spikes', () => {
    const level = corridor(['#######', '#P...E#', '##^####']);
    const state = runReplay(level, [], runRight);
    expect(state.deaths).toBeGreaterThan(0);
    expect(state.outcome).toBe('playing');
  });

  it('lets the player walk over harmless spikes', () => {
    const level = corridor(['#######', '#P...E#', '##^####'], { 'hazard.spikes.lethal': false });
    expect(runReplay(level, [], runRight).outcome).toBe('known-issues');
  });

  it('keeps a key-locked exit shut until the key is collected', () => {
    const locked = corridor(['#######', '#P...E#', '#######'], { 'exit.requires': 'KEY' });
    expect(runReplay(locked, [], runRight).outcome).toBe('playing');
    const withKey = corridor(['#######', '#P.K.E#', '#######'], { 'exit.requires': 'KEY' });
    const state = runReplay(withKey, [], runRight);
    expect(state.hasKey).toBe(true);
    expect(state.outcome).toBe('known-issues');
  });

  it('respawns a player who falls through a hole onto spikes', () => {
    const level = corridor(['#####', '#P.E#', '#G###', '#^###'], { 'tile.glass.solid': false });
    const idle = expandInputs([{ ticks: 120 }]);
    const state = idle.reduce((s, c) => step(s, c, level, level.rules), initialState(level, level.rules));
    expect(state.deaths).toBeGreaterThan(0);
  });

  it('stops changing once the level is over', () => {
    const level = corridor(['#######', '#P...E#', '#######']);
    const won = runReplay(level, [], runRight);
    expect(step(won, { left: true, right: false, jump: true }, level, level.rules)).toBe(won);
  });
});

describe('outcomeFor', () => {
  it('requires every faulty rule to match its fix', () => {
    const level = corridor(['#######', '#P...E#', '#######']);
    expect(outcomeFor(level, RuleSet.from({ 'gravity.direction': 'UP' }))).toBe('verified');
    expect(outcomeFor(level, RuleSet.defaults())).toBe('known-issues');
  });
});
