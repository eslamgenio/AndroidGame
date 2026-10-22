// All units are pixels and simulation ticks (60 ticks per second).
// Tune feel here; nothing else in the code hard-codes these numbers.

export const TICKS_PER_SECOND = 60;
export const TILE = 16;

export const GRAVITY = 0.4;
export const MAX_FALL_SPEED = 8;
export const RUN_SPEED = 2;
export const RUN_ACCEL = 0.4;
export const JUMP_VELOCITY = 6.4;

export const PLAYER_WIDTH = 12;
export const PLAYER_HEIGHT = 14;

/** Bodies move at most this far per collision check, so nothing tunnels through a tile. */
export const MAX_STEP = 4;
