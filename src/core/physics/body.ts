import type { Tile } from '../level/types';
import type { RuleSet } from '../rules/ruleSet';
import { type Box, type SolidAt, moveAxis, overlapsSolid } from './collide';
import {
  GRAVITY,
  JUMP_VELOCITY,
  MAX_FALL_SPEED,
  PLAYER_HEIGHT,
  PLAYER_WIDTH,
  RUN_ACCEL,
  RUN_SPEED,
} from './constants';

export interface Body extends Box {
  readonly vx: number;
  readonly vy: number;
  readonly grounded: boolean;
}

export interface Controls {
  readonly left: boolean;
  readonly right: boolean;
  readonly jump: boolean;
}

export interface Vec {
  readonly x: number;
  readonly y: number;
}

const DIRECTIONS: Readonly<Record<string, Vec>> = {
  DOWN: { x: 0, y: 1 },
  UP: { x: 0, y: -1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
  NONE: { x: 0, y: 0 },
};

/** Unit vector pointing the way gravity pulls. */
export function gravityDirection(rules: RuleSet): Vec {
  return DIRECTIONS[rules.get('gravity.direction')] ?? { x: 0, y: 0 };
}

export function isSolid(tile: Tile, rules: RuleSet): boolean {
  if (tile === 'wall') return true;
  if (tile === 'glass') return rules.get('tile.glass.solid');
  return false;
}

export function solidAtFor(tileAt: (col: number, row: number) => Tile, rules: RuleSet): SolidAt {
  return (col, row) => isSolid(tileAt(col, row), rules);
}

export function playerSize(rules: RuleSet): { w: number; h: number } {
  const scale = rules.get('player.scale');
  return { w: PLAYER_WIDTH * scale, h: PLAYER_HEIGHT * scale };
}

/** Advances a body by one tick under the given rules. Pure: returns a new body. */
export function stepBody(body: Body, controls: Controls, rules: RuleSet, solidAt: SolidAt): Body {
  const down = gravityDirection(rules);
  const g = GRAVITY * rules.get('gravity.strength');
  let { vx, vy } = body;

  // Running is always horizontal; when gravity is sideways it owns the x axis.
  if (down.x === 0) {
    const target = (Number(controls.right) - Number(controls.left)) * RUN_SPEED * rules.get('player.speed');
    vx = approach(vx, target, RUN_ACCEL);
  }
  vx = fall(vx + down.x * g, down.x);
  vy = fall(vy + down.y * g, down.y);

  const jumpPower = rules.get('player.jumpPower');
  if (controls.jump && body.grounded && jumpPower > 0) {
    // Jump against gravity, replacing velocity along the gravity axis.
    if (down.x !== 0) vx = -down.x * JUMP_VELOCITY * jumpPower;
    if (down.y !== 0) vy = -down.y * JUMP_VELOCITY * jumpPower;
  }

  const afterX = moveAxis(body, 'x', vx, solidAt);
  const afterY = moveAxis(afterX.box, 'y', vy, solidAt);
  const moved = afterY.box;
  return {
    ...moved,
    vx: afterX.hit ? 0 : vx,
    vy: afterY.hit ? 0 : vy,
    grounded: isGrounded(moved, down, solidAt),
  };
}

/** Resizes a body, keeping its feet in place. Keeps the old size if the new one would not fit. */
export function resizeBody(body: Body, size: { w: number; h: number }, rules: RuleSet, solidAt: SolidAt): Body {
  if (body.w === size.w && body.h === size.h) return body;
  const down = gravityDirection(rules);
  const resized = {
    ...body,
    ...size,
    x: down.x > 0 ? body.x + body.w - size.w : down.x < 0 ? body.x : body.x + (body.w - size.w) / 2,
    y: down.y < 0 ? body.y : down.y > 0 ? body.y + body.h - size.h : body.y + (body.h - size.h) / 2,
  };
  return overlapsSolid(resized, solidAt) ? body : resized;
}

function isGrounded(box: Box, down: Vec, solidAt: SolidAt): boolean {
  if (down.x === 0 && down.y === 0) return false;
  return overlapsSolid({ ...box, x: box.x + down.x, y: box.y + down.y }, solidAt);
}

function approach(value: number, target: number, step: number): number {
  return value < target ? Math.min(value + step, target) : Math.max(value - step, target);
}

/** Caps speed in the direction gravity pulls; movement against gravity (jumps) is uncapped. */
function fall(velocity: number, pull: number): number {
  if (pull > 0) return Math.min(velocity, MAX_FALL_SPEED);
  if (pull < 0) return Math.max(velocity, -MAX_FALL_SPEED);
  return velocity;
}
