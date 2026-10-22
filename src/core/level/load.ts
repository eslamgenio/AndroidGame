import { isRuleId, type RuleId, type RuleValue } from '../rules/registry';
import { RuleError, RuleSet, assertAllowed } from '../rules/ruleSet';
import { BUTTONS, type Button, type Cell, type InputStep, type Level, type PatchRequest, type Tile } from './types';

export class LevelError extends Error {
  override name = 'LevelError';
  constructor(
    readonly levelId: string,
    readonly errors: string[],
  ) {
    super(`Level "${levelId}" is invalid:\n- ${errors.join('\n- ')}`);
  }
}

const TILE_CHARS: Readonly<Record<string, Tile>> = { '.': 'empty', '#': 'wall', G: 'glass', '^': 'spikes' };
const MARKERS = ['P', 'E', 'K'] as const;

type Json = Record<string, unknown>;

const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Validates untrusted level data and turns it into a `Level`. Reports every problem at once. */
export function loadLevel(data: unknown): Level {
  const errors: string[] = [];
  const json: Json = isObject(data) ? data : {};
  if (!isObject(data)) errors.push('Level must be a JSON object.');

  const text = (field: string): string => {
    const value = json[field];
    if (typeof value === 'string' && value.length > 0) return value;
    errors.push(`${field} must be a non-empty string.`);
    return '';
  };
  const id = text('id');
  const ticket = text('ticket');
  const title = text('title');
  const report = text('report');

  const grid = parseTiles(json['tiles'], errors);
  const inspect = parseInspect(json['inspect'], errors);
  const rules = parseRules(json['rules'], errors);
  const fixes = parseFixes(json['fixes'], rules, inspect, errors);
  const solution = parseSolution(json['solution'], errors);

  if (errors.length > 0 || !grid || !rules) throw new LevelError(id || '?', errors);

  const { tiles, width, height, markers } = grid;
  return {
    id,
    ticket,
    title,
    report,
    width,
    height,
    spawn: markers.P[0] as Cell,
    exit: markers.E[0] as Cell,
    key: markers.K[0] ?? null,
    inspect,
    rules,
    fixes,
    solution,
    tileAt: (col, row) => tiles[row]?.[col] ?? 'wall',
  };
}

function parseTiles(value: unknown, errors: string[]) {
  if (!Array.isArray(value) || value.length === 0 || !value.every((r) => typeof r === 'string')) {
    errors.push('tiles must be a non-empty array of strings.');
    return null;
  }
  const rows = value as string[];
  const width = rows[0]?.length ?? 0;
  const markers: Record<(typeof MARKERS)[number], Cell[]> = { P: [], E: [], K: [] };
  const tiles = rows.map((line, row) => {
    if (line.length !== width) errors.push(`tiles[${row}] has ${line.length} columns; expected ${width}.`);
    return [...line].map((ch, col): Tile => {
      if ((MARKERS as readonly string[]).includes(ch)) {
        markers[ch as (typeof MARKERS)[number]].push({ col, row });
        return 'empty';
      }
      const tile = TILE_CHARS[ch];
      if (!tile) errors.push(`tiles[${row}] col ${col}: unknown tile "${ch}".`);
      return tile ?? 'empty';
    });
  });
  for (const m of ['P', 'E'] as const) {
    if (markers[m].length !== 1) errors.push(`Level needs exactly one "${m}" (found ${markers[m].length}).`);
  }
  if (markers.K.length > 1) errors.push(`Level allows at most one "K" (found ${markers.K.length}).`);
  return { tiles, width, height: rows.length, markers };
}

function parseInspect(value: unknown, errors: string[]): RuleId[] {
  if (!Array.isArray(value)) {
    errors.push('inspect must be an array of rule ids.');
    return [];
  }
  return value.filter((id): id is RuleId => {
    if (typeof id === 'string' && isRuleId(id)) return true;
    errors.push(`inspect: unknown rule "${String(id)}".`);
    return false;
  });
}

function parseRules(value: unknown, errors: string[]): RuleSet | null {
  try {
    return RuleSet.from(isObject(value) ? value : {});
  } catch (e) {
    if (!(e instanceof RuleError)) throw e;
    errors.push(`rules: ${e.message}`);
    return null;
  }
}

function parseFixes(value: unknown, rules: RuleSet | null, inspect: readonly RuleId[], errors: string[]) {
  const fixes: Partial<Record<RuleId, RuleValue>> = {};
  if (!isObject(value) || Object.keys(value).length === 0) {
    errors.push('fixes: a level needs at least one bug.');
    return fixes;
  }
  for (const [id, fix] of Object.entries(value)) {
    if (!isRuleId(id)) {
      errors.push(`fixes: unknown rule "${id}".`);
      continue;
    }
    try {
      assertAllowed(id, fix);
    } catch (e) {
      if (!(e instanceof RuleError)) throw e;
      errors.push(`fixes: ${e.message}`);
      continue;
    }
    if (!inspect.includes(id)) errors.push(`fixes: "${id}" is not in inspect, so the player cannot patch it.`);
    if (rules?.get(id) === fix) errors.push(`fixes: "${id}" is already ${String(fix)}, so it is not a bug.`);
    fixes[id] = fix;
  }
  return fixes;
}

function parseSolution(value: unknown, errors: string[]) {
  const json = isObject(value) ? value : {};
  const rawPatches = Array.isArray(json['patches']) ? (json['patches'] as unknown[]) : [];
  const rawInputs = Array.isArray(json['inputs']) ? (json['inputs'] as unknown[]) : [];
  if (!isObject(value) || !Array.isArray(json['patches']) || !Array.isArray(json['inputs'])) {
    errors.push('solution must have "patches" and "inputs" arrays.');
  }

  const patches: PatchRequest[] = [];
  rawPatches.forEach((p, i) => {
    const { ruleId, value: v } = isObject(p) ? p : {};
    if (typeof ruleId !== 'string' || !isRuleId(ruleId)) {
      errors.push(`solution.patches[${i}]: unknown rule "${String(ruleId)}".`);
      return;
    }
    try {
      assertAllowed(ruleId, v);
      patches.push({ ruleId, value: v });
    } catch (e) {
      if (!(e instanceof RuleError)) throw e;
      errors.push(`solution.patches[${i}]: ${e.message}`);
    }
  });

  const inputs: InputStep[] = rawInputs.map((s, i) => {
    const step = isObject(s) ? s : {};
    const hold = Array.isArray(step['hold']) ? (step['hold'] as unknown[]) : [];
    for (const b of hold) {
      if (!(BUTTONS as readonly unknown[]).includes(b)) errors.push(`solution.inputs[${i}]: unknown button "${String(b)}".`);
    }
    const ticks = step['ticks'];
    if (typeof ticks !== 'number' || !Number.isInteger(ticks) || ticks < 1) {
      errors.push(`solution.inputs[${i}]: ticks must be a positive integer.`);
    }
    return hold.length > 0 ? { hold: hold as Button[], ticks: Number(ticks) } : { ticks: Number(ticks) };
  });

  return { patches, inputs };
}
