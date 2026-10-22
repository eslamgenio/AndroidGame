# Spec: Patch Notes

> Status: **APPROVED** · Milestone 1 (vertical slice)

## Objective

**Patch Notes** is a 2D real-time platformer where you play a QA engineer
trapped inside a broken game. Each level has a *visible* bug that makes it
impossible to finish, such as gravity pulling upward or a glass bridge you fall
through. You find the bug by comparing what you **see** with the level's live
**rule inspector**, then file a **bug report**: you pick the faulty rule and the
value it should have. The patch "ships" and the level rewires itself live.

Debugging *is* the puzzle: Baba Is You crossed with a test case.

**Who it's for:** players on Android phones (installable web app) and desktop browsers.
**Learning goals for the developer:** a rule engine, data-driven level design,
and clean layered architecture.

### User stories

1. As a player, I can run and jump through a level with touch buttons (phone)
   or the keyboard (desktop).
2. As a player, I can always see a **rule inspector** listing the level's live
   rules and their current values, like a debugger's watch window.
3. As a player, I can **file a bug report**: choose a rule, then choose its new
   value from a short list of candidate fixes, and submit.
4. As a player, when I submit, the patch is applied **immediately, without
   restarting the level**. The level visibly "rewires" (a short glitch effect),
   and the inspector shows the change as a diff (`- gravity: UP` / `+ gravity: DOWN`).
5. As a player, if I file the **wrong** fix, it really ships and the level breaks
   in a new, visible way. I can **revert** any patch from the **patch log**.
6. As a player, I finish a level by reaching the exit. Spikes or falling out of
   the world respawn me at the start; patches stay applied.
7. As a player, I can restart the level (resets my position *and* all patches)
   and pick any of the 5 levels from a simple level-select screen.

### Milestone 1 levels (5)

Each level teaches one idea. Every level also shows **decoy rules** that look
suspicious but are correct, so the puzzle is reasoning, not just "find the odd value".

| # | Title (ticket) | Visible symptom | Faulty rule → fix | Example "wrong patch ships" |
|---|---|---|---|---|
| 1 | *BUG-001: Player falls up* | You fall onto the ceiling; the exit is on the floor | `gravity.direction: UP → DOWN` | `NONE`: you float and can't jump the block |
| 2 | *BUG-002: Jump button does nothing* | Can't climb a 2-tile ledge | `player.jumpPower: 0 → 1` | `3`: you rocket into the ceiling spikes |
| 3 | *BUG-003: Glass bridge has no collision* | You fall through a bridge onto spikes | `tile.glass.solid: false → true` | `tile.glass.visible: false`: the bridge disappears and still isn't solid. `hazard.spikes.lethal: false`: you survive the pit and hop out (known issues ⚠) |
| 4 | *BUG-004: Player too big for the tunnel* | Can't fit through a 1-tile tunnel | `player.scale: 2 → 1` | `0.5`: tiny, but it fits (known issues ⚠) |
| 5 | *BUG-005: Two regressions* | Gravity pulls **sideways** *and* the exit is locked with no key in the level | `gravity.direction: LEFT → DOWN` **and** `exit.requires: KEY → NONE` | Fixing only one isn't enough; `RIGHT` pins you against a step instead |

(Exact tile layouts live in each level's data file, not in code. The wrong-patch
consequences above are checked by `tests/levels/wrongPatches.test.ts`.)

## Core concept: how the rule engine works

```
 levels/01-gravity.json ──load+validate──▶ Level { tiles, entities, RuleSet }
                                                     │
          player input ──▶  Simulation.step(state, input, rules)  ◀── RuleSet (immutable)
          (fixed 1/60 s)               │                                  ▲
                                       ▼                                  │
                               new GameState ──▶ Renderer (Canvas)        │
                                                                          │
              Bug report UI ──▶ applyPatch(rules, {ruleId, value}) ───────┘
                                (returns a NEW RuleSet; old one kept in the patch log)
```

- **Rules are data.** A `RuleSet` is an immutable map of `ruleId → value`.
  Each rule id is declared once in a **rule registry** with its type
  (`enum | number | boolean`), its allowed values and a human description.
  Level files may only use registered rules, which is checked when the level loads.
- **The simulation reads rules; it never hard-codes them.** For example, gravity
  is `GRAVITY_VECTORS[rules.get('gravity.direction')] * rules.get('gravity.strength')`.
- **Patching is a pure function:** `applyPatch(ruleSet, patch) → newRuleSet`.
  Because the simulation reads the current `RuleSet` every step, swapping it is
  what makes the level "rewire itself" live.
- **Determinism:** the simulation advances in exact fixed steps (60 Hz),
  separate from the screen's frame rate, and uses no `Math.random()` or wall-clock
  time. The same level, rules and input sequence always give the same result.
  This is what makes levels testable.
- **Every level is a test case:** each level file contains a recorded
  `solution` (the patches to file, plus a tick-by-tick input replay). Automated
  tests prove that the replay **fails** with the buggy rules and **reaches the
  exit** with the patched rules.

## Tech Stack

| Concern | Choice | Why |
|---|---|---|
| Language | TypeScript 6.0.3 (strict) | Types catch rule/level mistakes before runtime. Not 7.x: typescript-eslint 8 supports only TS < 6.1 |
| Build/dev server | Vite 8.3.x | Fast dev server, simple static build |
| Unit tests | Vitest 5.0.x | Native TS + Vite; runs the core in Node |
| E2E tests | Playwright 1.56.1 (pre-installed Chromium) | Real-browser smoke tests in this container |
| Lint | ESLint 10 + typescript-eslint 8 | Also enforces the "core has no DOM" boundary |
| Rendering | HTML Canvas 2D | No engine; the developer owns the architecture |
| UI overlay | Plain DOM + CSS | Accessible forms and buttons for free |
| Install on Android | Web app manifest + minimal service worker (hand-written) | Install from Chrome, works offline |

Exact versions are pinned in `package.json` to releases at least two weeks old.
There are no runtime dependencies: everything that ships is our own code.

## Commands

```
Install:    npm ci
Dev:        npm run dev            # Vite dev server on http://localhost:5173
Build:      npm run build          # typecheck + production build into dist/
Preview:    npm run preview        # serve dist/ locally
Test:       npm test               # Vitest: unit + level replay tests
Coverage:   npm run test:coverage
E2E:        npm run test:e2e       # Playwright against the preview build
Lint:       npm run lint           # ESLint (add --fix to autofix)
Typecheck:  npm run typecheck      # tsc --noEmit
All checks: npm run check          # lint + typecheck + test + build
```

## Project Structure

```
src/
  core/            → PURE simulation, no DOM/browser APIs (enforced by lint)
    rules/         → rule registry, RuleSet, applyPatch, validation
    physics/       → AABB vs tile-grid collision, movement integration
    level/         → level schema, loader/validator
    sim/           → GameState, Simulation.step(), win/death logic
  render/          → Canvas renderer (reads GameState, never mutates it)
  ui/              → DOM overlay: rule inspector, bug-report form, patch log,
                     touch controls, level select
  app/             → wiring: fixed-timestep game loop, input capture, main.ts
levels/            → 01-gravity.json … 05-two-regressions.json (pure data)
tests/
  unit/            → core unit tests (mirrors src/core)
  levels/          → per-level replay tests ("every level is a test case")
e2e/               → Playwright smoke tests
public/            → manifest, icons, service worker
docs/              → ADRs and level-design notes
```

**Dependency direction (one way only):** `app → ui, render → core`. `core`
imports nothing from the other layers.

## Code Style

```ts
// src/core/rules/registry.ts
export const RULES = {
  'gravity.direction': {
    type: 'enum',
    values: ['DOWN', 'UP', 'LEFT', 'RIGHT', 'NONE'] as const,
    description: 'Which way the world pulls entities.',
  },
  'player.jumpPower': {
    type: 'number',
    values: [0, 0.5, 1.0, 3.0] as const,
    description: 'Jump impulse, as a multiple of the default.',
  },
} as const satisfies Record<string, RuleDefinition>;

export type RuleId = keyof typeof RULES;

// src/core/rules/ruleSet.ts
export function applyPatch(rules: RuleSet, patch: Patch): RuleSet {
  assertAllowedValue(patch.ruleId, patch.value);
  return new Map(rules).set(patch.ruleId, patch.value); // never mutate
}
```

- `camelCase` for functions/variables, `PascalCase` for types, `kebab-case` for
  level file names, and `dot.separated` rule ids.
- Pure functions and immutable data in `core`; state changes go through
  returned values, not mutation.
- Small files (aim for under 200 lines), named exports only, no `any`.
- Comments explain *why*, not *what*.

## Testing Strategy

| Level | Tool | What it covers | Location |
|---|---|---|---|
| Unit | Vitest | rule registry, applyPatch/revert, level validation, collision, movement | `tests/unit/` |
| Level replay | Vitest | each level: buggy rules + replay → **not** at exit; patched rules + replay → **at exit** | `tests/levels/` |
| E2E smoke | Playwright | page loads, inspector shows rules, filing a correct report rewires the level, revert works, touch buttons respond | `e2e/` |

- Coverage target: **≥ 90% lines for `src/core`**. Renderer and UI are covered by the E2E smoke tests.
- Bugs are fixed test-first (a failing test reproduces it, then the fix).
- Every new level must ship with its replay test.

## Boundaries

- **Always:** run `npm run check` before each commit; keep `core` free of DOM
  APIs; add or update tests with each change; keep levels as data (no
  level-specific `if` statements in code).
- **Ask first:** adding any dependency beyond the stack above; changing the
  level file format after it is approved; adding rules outside the milestone
  levels' needs; setting up hosting or CI.
- **Never:** commit secrets; use non-deterministic APIs (`Math.random`,
  `Date.now`) inside `core`; skip or delete failing tests to get green.

## Success Criteria (Milestone 1 is done when…)

1. All 5 levels are playable in Chrome (desktop and Android) with keyboard and touch controls.
2. All 5 levels have replay tests that **fail with the bug and pass with the
   fix**, and `npm test` is green.
3. Filing a report updates the level **within one simulation step**, with no
   reload and no lost player position.
4. Wrong patches really apply and can be reverted from the patch log.
5. `src/core` has ≥ 90% line coverage and no DOM imports (lint rule passes).
6. E2E smoke tests pass in headless Chromium.
7. On a 360×640 phone viewport, the canvas, inspector and touch buttons are all
   reachable without horizontal scrolling, and touch targets are at least 48 px.
8. The production bundle is under 100 KB gzipped (no engine, no runtime deps).
9. The app can be installed from Chrome on Android (manifest + service worker).

## Out of scope (Milestone 1)

Saved progress, scoring/stars, sound, a level editor, a native APK
(possible later via Capacitor), more than 5 levels. (Hosting was added after
Milestone 1; see Resolved Decisions.)

## Resolved Decisions

1. **Cheesing counts as a win.** If a wrong patch lets you reach the exit
   another way, the level is completed, but the end screen says **"Shipped
   with known issues ⚠"**. It says **"Verified fix ✓"** only when every faulty
   rule has its correct value. Level 5 has two faulty rules.
2. **Hosting: GitHub Pages.** `.github/workflows/deploy.yml` builds, runs
   `npm run check`, and publishes on every push to the default branch. The
   repository is public, because GitHub Free offers Pages for public
   repositories only.