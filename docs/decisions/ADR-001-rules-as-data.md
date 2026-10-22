# ADR-001: Game rules are data, read by a pure simulation

## Status
Accepted

## Date
2026-10-22

## Context
The whole game is "find the faulty rule and patch it." So rules have to be
things a player can see, name, change and undo while a level is running. They
also have to be things a level designer can write without touching code.
Every level must also be provably solvable once fixed.

## Decision
- Every rule is declared once in `src/core/rules/registry.ts` with a **closed
  list of allowed values** and a description. Levels may only use registered
  rules, and the loader rejects anything else with a readable error.
- A `RuleSet` is an **immutable** snapshot. `applyPatch` returns a new one, and
  `PatchHistory` rebuilds the current rules from the level's base rules plus
  the remaining patches, so reverting a patch means leaving it out.
- The simulation (`src/core/sim/step.ts`) is a **pure function**:
  `step(state, controls, level, rules) → state`. It reads the current
  `RuleSet` every tick and never hard-codes gameplay values. A patch therefore
  takes effect on the next tick with no reload.
- Each level JSON file carries a **recorded solution**. `tests/levels/` proves
  for every level that the solution fails with the bug and wins once patched.

## Alternatives Considered

### Rules as code (one class or `if` branch per bug)
- Pros: fastest way to get one level working.
- Cons: every level needs code; you can't list or diff the rules for an
  inspector; levels can't be validated or tested generically.
- Rejected: it contradicts the core mechanic, which is seeing and editing rules.

### Free-form rule values (any number, any string)
- Pros: more expressive levels.
- Cons: the bug-report form would need free text input, which is awkward on a
  phone; validation gets fuzzy; the puzzle becomes guessing numbers.
- Rejected: a closed list makes every report "pick one", and makes every value
  testable.

### Mutable rules object
- Pros: slightly less allocation.
- Cons: undo needs manual bookkeeping; the UI can't tell what changed by
  comparing references.
- Rejected: immutability makes revert, diffing and change detection trivial.

## Consequences
- Adding a mechanic means adding a rule to the registry **and** reading it in
  the simulation. Adding a level needs no code at all.
- Determinism is required: the core may not use `Math.random`, `Date.now` or
  DOM APIs. ESLint enforces this, and `tests/unit/boundary.test.ts` guards the
  lint rule itself.
- Tuning physics constants can break recorded solutions. The level tests fail
  loudly and name the level, and solutions are short scripts that are easy to
  re-record.
