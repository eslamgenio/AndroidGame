import { TICKS_PER_SECOND } from '../core/physics/constants';

const STEP_MS = 1000 / TICKS_PER_SECOND;
// After a long pause (e.g. a background tab), skip ahead instead of
// running hundreds of catch-up ticks at once.
const MAX_STEPS_PER_FRAME = 5;

/**
 * Fixed-timestep loop: the simulation always advances in exact 1/60 s ticks,
 * however fast or slow the screen refreshes. Rendering happens once per frame.
 */
export function startLoop(tick: () => void, render: () => void): () => void {
  let last = performance.now();
  let pending = 0;
  let frame = 0;

  const onFrame = (now: number) => {
    pending += now - last;
    last = now;
    let steps = 0;
    while (pending >= STEP_MS && steps < MAX_STEPS_PER_FRAME) {
      tick();
      pending -= STEP_MS;
      steps++;
    }
    if (steps === MAX_STEPS_PER_FRAME) pending = 0;
    render();
    frame = requestAnimationFrame(onFrame);
  };

  frame = requestAnimationFrame(onFrame);
  return () => cancelAnimationFrame(frame);
}
