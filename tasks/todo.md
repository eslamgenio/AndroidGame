# Tasks: Patch Notes, Milestone 1

Plan and rationale: `tasks/plan.md`. Spec: `SPEC.md`.
Every task also meets `.claude/references/definition-of-done.md`.

---

## Phase 1: Foundation

### Task 1: Project scaffold and quality gates
**Description:** Create the npm project with pinned dev dependencies, strict TS config, Vite, Vitest, ESLint (including a rule that bans DOM globals and imports from other layers inside `src/core`), and the `npm run check` script.
**Acceptance criteria:**
- [ ] `npm ci && npm run check` passes on an empty `src/main.ts`
- [ ] A test file that uses `document` inside `src/core` fails lint
**Verification:** `npm run check`
**Dependencies:** None
**Files:** `package.json`, `tsconfig.json`, `vite.config.ts`, `eslint.config.js`, `index.html`
**Scope:** S

### Task 2: Rule engine
**Description:** Rule registry (id, type, allowed values, description), immutable `RuleSet`, `applyPatch`, `diffRules`, and a `PatchHistory` (apply / revert by id).
**Acceptance criteria:**
- [ ] `applyPatch` returns a new RuleSet and never mutates its input
- [ ] Patching an unknown rule or a disallowed value throws a descriptive error
- [ ] Reverting a patch restores that rule's previous value, and later patches survive
**Verification:** `npm test -- rules`
**Dependencies:** T1
**Files:** `src/core/rules/{registry,ruleSet,history}.ts`, `tests/unit/rules/*.test.ts`
**Scope:** S

### Task 3: Level format and loader, plus level 1 data
**Description:** Level JSON schema (meta/ticket, tile rows, legend, spawn, exit, rules, faultyRules + fixes, decoy rules, solution). The validator returns readable errors. Write `levels/01-gravity.json`.
**Acceptance criteria:**
- [ ] A valid level loads into a typed `Level` with an initial RuleSet
- [ ] Ragged rows, unknown tiles, unknown rules, a missing spawn/exit, or a fix value outside the rule's options each produce a specific error
**Verification:** `npm test -- level`
**Dependencies:** T2
**Files:** `src/core/level/{types,load}.ts`, `levels/01-gravity.json`, `tests/unit/level/*.test.ts`
**Scope:** S–M

### ✅ Checkpoint A: `npm run check` green; the core-boundary lint rule is proven to work

---

## Phase 2: Walking skeleton

### Task 4: Physics
**Description:** AABB vs tile grid with one-axis-at-a-time resolution; gravity vector from rules; walk, jump (relative to gravity), grounded detection; the player's size comes from `player.scale`.
**Acceptance criteria:**
- [ ] The body lands and rests on the floor under DOWN gravity, and on the ceiling under UP
- [ ] The body cannot pass through solid tiles at maximum speed (no tunneling)
- [ ] Jump only fires when grounded; `jumpPower: 0` produces no lift
**Verification:** `npm test -- physics`
**Dependencies:** T2
**Files:** `src/core/physics/{constants,collide,body}.ts`, tests
**Scope:** M

### Task 5: Simulation and replay
**Description:** `GameState`, `step(state, input, rules, level)`; spikes or out-of-bounds respawn the player; reaching the exit sets the outcome (verified vs known-issues). The replay runner expands solution scripts into per-tick input. Level 1 replay test.
**Acceptance criteria:**
- [ ] `step` is pure and deterministic (same inputs give identical states)
- [ ] Level 1: the replay with the original rules does NOT win; with the solution patches it wins with outcome `verified`
**Verification:** `npm test`
**Dependencies:** T3, T4
**Files:** `src/core/sim/{state,step,replay}.ts`, `tests/levels/levels.test.ts`
**Scope:** M

### Task 6: Browser app (level 1 playable)
**Description:** Fixed-timestep loop (accumulator), keyboard input, debug-view Canvas renderer (grid, tiles, hitbox, exit, spawn).
**Acceptance criteria:**
- [ ] Level 1 is playable in the dev server with arrows/WASD + Space
- [ ] The simulation advances at 60 steps/s no matter the display frame rate
**Verification:** `npm run build`; a Playwright screenshot of level 1
**Dependencies:** T5
**Files:** `src/app/{main,loop,input}.ts`, `src/render/canvas.ts`, `index.html`, `src/styles.css`
**Scope:** M

### ✅ Checkpoint B: level 1 playable; its replay proves bug blocks / fix passes → **review with user**

---

## Phase 3: Bug-report loop
- [ ] **T7 Rule inspector**: live rules panel, with patched rules shown as a diff. *AC:* values update the same tick a patch lands. (S–M; deps T6)
- [ ] **T8 Bug-report form**: pick a rule, then a value from its options, then submit; `GameController.applyPatch`; glitch effect. *AC:* a correct report on level 1 rewires gravity live without a position reset; a wrong one really ships. (M; deps T7)
- [ ] **T9 Patch log + restart**: revert any patch; restart resets the player and the rules. (S; deps T8)
- [ ] **T10 E2E smoke**: load → inspector → file report → level rewires → revert. (S; deps T9)

### ✅ Checkpoint C: the full loop works in a real browser → **review with user**

## Phase 4: Content and mobile
- [ ] **T11 Touch controls + layout**: left/right/jump buttons ≥ 48px; 360×640 with no horizontal scroll. (M; deps T10)
- [ ] **T12 Levels 2–3**: `player.jumpPower`, `tile.glass.solid/visible`, with replay tests. (M; deps T5)
- [ ] **T13 Levels 4–5**: `player.scale`; sideways gravity + `exit.requires`, with replay tests. (M; deps T5)
- [ ] **T14 Level select + end screens**: Verified ✓ / Known issues ⚠, next level. (S; deps T12, T13)

### ✅ Checkpoint D: 5 levels pass replay tests and are playable at phone size

## Phase 5: Ship-ready
- [ ] **T15 PWA**: manifest, icons, service worker; bundle under 100 KB gzipped. (S)
- [ ] **T16 Final verification**: check all 9 spec success criteria; README; ADR for the rule engine. (S)

### ✅ Checkpoint E: Milestone 1 done → **review with user**
