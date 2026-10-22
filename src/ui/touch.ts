import type { Button } from '../core/level/types';
import { el } from './dom';

interface ButtonSink {
  set(button: Button, down: boolean): void;
}

const BUTTONS: readonly { button: Button; label: string; symbol: string }[] = [
  { button: 'left', label: 'Move left', symbol: '◀' },
  { button: 'right', label: 'Move right', symbol: '▶' },
  { button: 'jump', label: 'Jump', symbol: '▲' },
];

/** On-screen buttons for touch devices. Each finger is tracked separately, so you can run and jump at once. */
export function mountTouchControls(container: HTMLElement, input: ButtonSink): void {
  container.append(
    ...BUTTONS.map(({ button, label, symbol }) => {
      const node = el('button', { type: 'button', class: `touch-${button}`, 'aria-label': label }, [symbol]);
      const release = () => {
        node.classList.remove('held');
        input.set(button, false);
      };
      node.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        node.setPointerCapture(e.pointerId);
        node.classList.add('held');
        input.set(button, true);
      });
      node.addEventListener('pointerup', release);
      node.addEventListener('pointercancel', release);
      node.addEventListener('lostpointercapture', release);
      node.addEventListener('contextmenu', (e) => e.preventDefault());
      return node;
    }),
  );
}
