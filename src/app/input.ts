import type { Button } from '../core/level/types';
import type { Controls } from '../core/physics/body';

const KEYS: Readonly<Record<string, Button>> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'jump',
  KeyW: 'jump',
  Space: 'jump',
};

/** Tracks which buttons are held. Other input sources (touch) call `set` too. */
export class Input {
  private readonly held = new Set<Button>();

  constructor(target: Window) {
    target.addEventListener('keydown', (e) => this.onKey(e, true));
    target.addEventListener('keyup', (e) => this.onKey(e, false));
    target.addEventListener('blur', () => this.held.clear());
  }

  set(button: Button, down: boolean): void {
    if (down) this.held.add(button);
    else this.held.delete(button);
  }

  get controls(): Controls {
    return { left: this.held.has('left'), right: this.held.has('right'), jump: this.held.has('jump') };
  }

  private onKey(e: KeyboardEvent, down: boolean): void {
    const button = KEYS[e.code];
    // Leave keys alone while the player is typing in the bug-report form.
    if (!button || (e.target instanceof HTMLElement && e.target.closest('form'))) return;
    e.preventDefault();
    this.set(button, down);
  }
}
