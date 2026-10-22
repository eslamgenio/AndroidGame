# Implementation Plan: Patch Notes, Milestone 1

## Overview

We're building the 5-level vertical slice described in `SPEC.md`: a deterministic,
fixed-timestep platformer whose behavior is driven entirely by a data-defined
`RuleSet`, plus a DOM overlay where the player files bug reports that patch the
rules live. Detailed tasks are in `tasks/todo.md`.

## Architecture Decisions

- **The pure core comes first.** `src/core` (rules, level loading, physics,
  simulation) is built and tested in Node before any browser code exists.
  *Why:* it's the riskiest and most important part, and it's the fastest to
  test.
- **Walking skeleton before features.** Level 1 is made playable end to end
  (data, then simulation, then canvas, then keyboard) before the bug-report UI,
  touch controls or the other levels. *Why:* it proves the architecture early.
  If physics or determinism has a flaw, we find it in task 6, not task 13.
- **Replays are compact scripts, not raw frame dumps.** A level's solution
  input is written as segments like `[{ "hold": ["right"], "ticks": 40 },
  { "press": ["jump"] }]`. *Why:* people can read and edit them, and they're
  easy to re-record when physics constants are tuned.
- **One shared `RuleSet` value per tick.** The game loop owns the current
  `RuleSet`. The UI asks for patches through a small `GameController`
  interface (`applyPatch`, `revert`, `restart`), never by touching state
  directly. *Why:* it keeps the dependency direction one-way and makes the UI
  replaceable.
- **Tile collision resolves one axis at a time** (move along x and resolve,
  then move along y and resolve) against a tile grid, with gravity as a
  vector. *Why:* it's the simplest correct method for box-vs-grid collision,
  and sideways gravity in level 5 falls out of it with no special cases.
- **Exact dependency versions, nothing at runtime.** TypeScript 6.0.3 (see
  SPEC), Vite 8.3.x, Vitest 5.0.x, ESLint 10, typescript-eslint 8, Playwright
  1.56.1.

## Dependency graph

```
T1 scaffold
 └─ T2 rule engine ─┬─ T3 level loader ─┐
                    │                   ├─ T5 simulation + replay ─ T6 browser app (L1 playable)
                    └─ T4 physics ──────┘                               │
                                       ┌────────────────────────────────┤
                         T7 inspector ─ T8 bug report ─ T9 patch log ─ T10 e2e
                                                                        │
                         T11 touch + layout   T12 levels 2–3   T13 levels 4–5
                                                                        │
                                          T14 level select + end screens
                                                                        │
                                          T15 PWA + bundle   T16 final verification + docs
```

## Task List (summary; details in `tasks/todo.md`)

### Phase 1: Foundation
- [x] T1 Project scaffold and quality gates
- [x] T2 Rule engine (registry, RuleSet, applyPatch, patch history)
- [x] T3 Level format, loader and validator, plus level 1 data

### Checkpoint A: core builds, lint boundary enforced, tests green

### Phase 2: Walking skeleton
- [x] T4 Physics: tile collision, gravity vector, movement, jump
- [x] T5 Simulation step, hazards/respawn/win, replay runner, level 1 replay test
- [x] T6 Browser app: fixed-timestep loop, keyboard, Canvas renderer (level 1 playable)

### Checkpoint B: level 1 playable on desktop; its replay test proves bug blocks / fix passes → **review with you**

### Phase 3: Bug-report loop
- [ ] T7 Rule inspector panel with live values and diff highlighting
- [ ] T8 Bug-report form that applies patches live, with the glitch effect
- [ ] T9 Patch log with revert, and restart level
- [ ] T10 Playwright e2e smoke tests

### Checkpoint C: full report → rewire → revert loop works in a real browser → **review with you**

### Phase 4: Content and mobile
- [ ] T11 Touch controls and responsive layout (360×640)
- [ ] T12 Levels 2 and 3 (jumpPower, glass solid/visible) with replay tests
- [ ] T13 Levels 4 and 5 (player.scale; sideways gravity + exit.requires) with replay tests
- [ ] T14 Level select and end screens (Verified ✓ / Known issues ⚠)

### Checkpoint D: all 5 levels pass replay tests, playable on a phone-sized viewport

### Phase 5: Ship-ready
- [ ] T15 PWA manifest, icons, service worker; bundle-size check
- [ ] T16 Verify all 9 success criteria; README and architecture ADR

### Checkpoint E: Milestone 1 done → **review with you**

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Platformer physics feels bad (floaty or stiff) | Med | All tuning constants live in one file; tune once level 1 is playable (Checkpoint B) |
| Tuning physics breaks recorded replays | Med | Replays are short scripts; replay tests fail loudly and point at the level, then we re-record |
| A level can be cheesed by accident | Low | That's allowed by design (it's labelled "known issues"); replay tests still pin the intended path |
| Bugs that can't be proven "impossible" with the bug present | Med | The replay test proves the intended path fails with the bug; level layouts are designed so the symptom physically blocks progress |
| Touch controls get in the way of the inspector on small screens | Med | The layout is designed in T11 against a 360×640 viewport, checked with Playwright screenshots |
| A brand-new toolchain version misbehaves | Low | Pinned versions at least two weeks old; TS held at 6.0.3 for typescript-eslint compatibility |

## Open Questions

None. Every decision is recorded in `SPEC.md`.
