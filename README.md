# Patch Notes

You're a QA engineer trapped inside a broken platformer. Every level has a
visible bug: gravity pulls up, the jump button does nothing, a glass bridge has
no collision. Compare what you **see** with the live **rule inspector**, then
**file a bug report**: pick the faulty rule and the value it should have. The
patch ships immediately and the level rewires itself while you watch.

Wrong fixes ship too. Revert them from the patch log. If a workaround still
gets you to the exit, the ticket closes as **"Shipped with known issues ⚠"**.
Fix the real bug for **"Verified fix ✓"**.

## Play

**Online:** https://eslamgenio.github.io/AndroidGame/ (on Android, open it in
Chrome and choose *Install app* or *Add to Home screen*; it works offline after
the first visit).

**Locally:**

```
npm ci
npm run dev        # http://localhost:5173
```

| Action | Keyboard | Touch |
|---|---|---|
| Run | ← → or A D | ◀ ▶ |
| Jump | Space, ↑ or W | ▲ |

## Deploy

`.github/workflows/deploy.yml` publishes to GitHub Pages on every push to the
default branch (or by hand from the Actions tab). It runs `npm run check` first,
so nothing broken goes live. One-time setup: **Settings → Pages → Source:
GitHub Actions**. The build uses relative paths, so it works from any folder.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Type-check and build into `dist/` |
| `npm run preview` | Serve `dist/` locally |
| `npm test` | Unit tests and level replay tests (Vitest) |
| `npm run test:coverage` | The same, with coverage (core must stay ≥ 90%) |
| `npm run test:e2e` | Browser tests at desktop and phone sizes (Playwright) |
| `npm run check` | Lint, type-check, test, build, and the 100 KB size budget; run before each commit |
| `npm run icons` | Re-render the PNG icons from `public/icons/icon.svg` |

Needs Node 22.12 or newer. If `npm install` crashes with *"Cannot read
properties of null (reading 'edgesOut')"*, that's an npm 10 bug; use
`npx npm@11 install`. `npm ci` works on npm 10.

## How it works

```
levels/*.json ──load + validate──▶ Level { tiles, RuleSet, fixes, solution }
                                          │
 input ──▶ step(state, controls, level, rules) ──▶ new state ──▶ Canvas renderer
           (pure, 60 ticks/s)          ▲
                                       │ next tick reads the new rules
 bug report ──▶ PatchHistory.apply() ──┘
```

- **Rules are data.** `src/core/rules/registry.ts` lists every rule and its
  allowed values. A patch produces a *new* immutable `RuleSet`, so undo is
  trivial and the inspector can show a diff.
- **The core is pure.** `src/core` has no DOM, no clock and no randomness
  (enforced by ESLint), so the same inputs always give the same result.
- **Every level is a test case.** Each level file carries a recorded solution,
  and `tests/levels/` proves it fails with the bug and wins once patched.

The reasoning is in [ADR-001](docs/decisions/ADR-001-rules-as-data.md) and
[ADR-002](docs/decisions/ADR-002-hand-rolled-engine.md).

```
src/core/     rules, level loading, physics, simulation (pure, Node-testable)
src/render/   Canvas renderer: reads state, never changes it
src/ui/       inspector, bug-report form, patch log, touch controls, result card
src/app/      game loop, input, wiring (the only mutable state lives here)
levels/       one JSON file per level
tests/        unit tests and level replay tests
e2e/          Playwright browser tests
build/        Vite plugin that writes the service worker
```

## Adding a level

Levels need no code. Add `levels/06-something.json`; files load in name order.

```jsonc
{
  "id": "06-something",
  "ticket": "BUG-006",
  "title": "Short symptom",
  "report": "Steps / Expected / Actual, as the player reads it.",
  "tiles": [              // all rows the same width
    "##########",         // #  wall      G  glass     ^  spikes
    "#........#",         // P  spawn     E  exit      K  key
    "#........#",         // .  empty     (outside the map counts as wall)
    "#........#",
    "#........#",
    "#........#",
    "#P......E#",         // the bug must really block you: with gravity UP
    "##########"          // you stick to the ceiling, out of jump range of E
  ],
  "inspect": ["gravity.direction", "player.speed"],  // shown in the inspector, decoys included
  "rules": { "gravity.direction": "UP" },            // the bug(s): overrides of the defaults
  "fixes": { "gravity.direction": "DOWN" },          // the correct value of each faulty rule
  "solution": {
    "patches": [{ "ruleId": "gravity.direction", "value": "DOWN" }],
    "inputs": [{ "hold": ["right"], "ticks": 120 }]  // 60 ticks = 1 second
  }
}
```

Then run `npm test`. The loader reports every mistake in the file at once, and
the level tests check that your solution fails with the bug and wins once
fixed. To pin down what a *wrong* fix should do, add a case to
`tests/levels/wrongPatches.test.ts`. A new mechanic needs a new rule: add it to
the registry and read it in `src/core`.
