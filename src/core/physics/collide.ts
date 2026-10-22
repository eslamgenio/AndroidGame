import { MAX_STEP, TILE } from './constants';

export interface Box {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export type SolidAt = (col: number, row: number) => boolean;

// Shrinks the far edge slightly so a box resting exactly on a tile edge
// does not count as overlapping the next tile.
const EPS = 1e-6;

/** Calls `visit` for every tile cell the box overlaps; stops early if it returns true. */
export function someCell(box: Box, visit: (col: number, row: number) => boolean): boolean {
  const c0 = Math.floor(box.x / TILE);
  const c1 = Math.floor((box.x + box.w - EPS) / TILE);
  const r0 = Math.floor(box.y / TILE);
  const r1 = Math.floor((box.y + box.h - EPS) / TILE);
  for (let row = r0; row <= r1; row++) {
    for (let col = c0; col <= c1; col++) {
      if (visit(col, row)) return true;
    }
  }
  return false;
}

export const overlapsSolid = (box: Box, solidAt: SolidAt): boolean => someCell(box, solidAt);

/**
 * Moves a box along one axis, stopping flush against the first solid tile.
 * Moves in small steps so fast bodies cannot skip over a tile.
 */
export function moveAxis(box: Box, axis: 'x' | 'y', delta: number, solidAt: SolidAt): { box: Box; hit: boolean } {
  let current = box;
  let remaining = delta;
  while (remaining !== 0) {
    const step = Math.sign(remaining) * Math.min(Math.abs(remaining), MAX_STEP);
    remaining -= step;
    const moved = { ...current, [axis]: current[axis] + step };
    if (overlapsSolid(moved, solidAt)) return { box: snapToEdge(current, axis, step), hit: true };
    current = moved;
  }
  return { box: current, hit: false };
}

/** Places the box flush against the tile boundary it was about to cross. */
function snapToEdge(box: Box, axis: 'x' | 'y', step: number): Box {
  const size = axis === 'x' ? box.w : box.h;
  const position =
    step > 0
      ? Math.floor((box[axis] + size + step - EPS) / TILE) * TILE - size
      : Math.floor((box[axis] + step) / TILE + 1) * TILE;
  return { ...box, [axis]: position };
}
