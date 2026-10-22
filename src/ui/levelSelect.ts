import type { Level } from '../core/level/types';
import type { Outcome } from '../core/sim/step';
import { el } from './dom';

const MARK: Readonly<Record<Outcome, string>> = { playing: '', verified: ' ✓', 'known-issues': ' ⚠' };

/** A row of ticket buttons, one per level, marked with each level's best result. */
export function renderLevelSelect(
  nav: HTMLElement,
  levels: readonly Level[],
  current: number,
  progress: ReadonlyMap<string, Outcome>,
  onPick: (index: number) => void,
): void {
  nav.setAttribute('aria-label', 'Tickets');
  nav.replaceChildren(
    ...levels.map((level, i) => {
      const outcome = progress.get(level.id) ?? 'playing';
      const button = el('button', { type: 'button', class: `ticket-tab ${outcome}`, title: level.title }, [
        level.ticket + MARK[outcome],
      ]);
      if (i === current) button.setAttribute('aria-current', 'page');
      button.addEventListener('click', () => onPick(i));
      return button;
    }),
  );
  // On narrow screens the bar scrolls sideways; keep the current ticket visible.
  nav.querySelector('[aria-current]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}
