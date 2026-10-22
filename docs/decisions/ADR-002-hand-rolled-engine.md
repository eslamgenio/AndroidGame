# ADR-002: A hand-rolled, fixed-timestep engine instead of a game framework

## Status
Accepted

## Date
2026-10-22

## Context
Patch Notes is a real-time platformer, but every level must work as a
repeatable test case (see ADR-001). Its rules, such as gravity direction,
solidity and player size, must be controlled entirely by our `RuleSet`. The
project is also a learning exercise in clean architecture, and it must run
on Android phones and be testable in Node and headless Chromium.

## Decision
- Plain TypeScript in three layers, with dependencies pointing one way only:
  `app → ui, render → core`.
- **Physics:** an axis-aligned box against a tile grid, resolved one axis at
  a time, moving in steps of at most 4 px so nothing tunnels through a 16 px
  tile.
- **Fixed timestep:** the game loop (`src/app/loop.ts`) runs the simulation at
  exactly 60 ticks per second, separate from the display frame rate. This
  keeps results identical across devices.
- **Rendering:** Canvas 2D for the game, plain DOM for the inspector and forms,
  which gives accessible controls for free.
- **Offline support:** a ~25-line Vite plugin (`build/serviceWorker.ts`)
  writes the service worker's file list at build time, instead of pulling in
  Workbox.

## Alternatives Considered

### Phaser 3
- Pros: physics, input and scenes out of the box; large community.
- Cons: its physics owns gravity and collision, so our rules would fight it;
  frame-rate-dependent behavior makes replays unreliable; headless testing is
  hard; it hides the architecture the project is meant to teach.
- Rejected.

### Entity-Component-System
- Pros: flexible; rules could switch systems on and off.
- Cons: too many layers of abstraction for 5 levels and one moving body.
- Rejected; worth revisiting if levels gain many interacting entities.

### Godot
- Pros: a full engine with Android export.
- Cons: can't be built or verified in this project's environment; the editor
  owns the structure.
- Rejected.

## Consequences
- Physics feel lives in one file (`src/core/physics/constants.ts`) and is
  ours to tune.
- The whole shipped app is about 12 KB gzipped, enforced by a 100 KB budget
  in `npm run check`.
- New mechanics (moving platforms, enemies) have to be written by hand; the
  pure-function core keeps each one unit-testable.
