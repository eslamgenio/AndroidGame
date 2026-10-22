import type { RuleId } from '../core/rules/registry';
import type { GameController } from './controller';
import { el } from './dom';

interface ResultActions {
  readonly next: (() => void) | null;
  readonly retry: () => void;
}

/** The end-of-level card. Shown over the game screen once the exit is reached. */
export function mountResult(container: HTMLElement, game: GameController, actions: ResultActions): void {
  container.classList.add('result');
  container.hidden = true;

  let shown: string | null = null;
  const render = () => {
    const { outcome } = game.state;
    // A snapshot of the moment the level ended; later rule changes don't rewrite it.
    if (outcome === shown) return;
    shown = outcome;
    container.hidden = outcome === 'playing';
    if (outcome === 'playing') return;

    const verified = outcome === 'verified';
    const stillWrong = (Object.entries(game.level.fixes) as [RuleId, unknown][]).filter(
      ([id, fix]) => game.rules.get(id) !== fix,
    );
    const patches = game.history.patches.length;
    const next = actions.next
      ? el('button', { type: 'button', class: 'next' }, ['Next ticket →'])
      : el('p', {}, ['All tickets closed. Nice debugging!']);
    const retry = el('button', { type: 'button', class: 'secondary' }, ['Retry']);
    if (actions.next) next.addEventListener('click', actions.next);
    retry.addEventListener('click', actions.retry);

    container.replaceChildren(
      el('h2', { class: verified ? 'ok' : 'warn' }, [verified ? 'Verified fix ✓' : 'Shipped with known issues ⚠']),
      el('p', {}, [
        verified
          ? `Every faulty rule fixed in ${patches} patch${patches === 1 ? '' : 'es'}.`
          : 'You reached the exit, but the original bug is still in the build:',
      ]),
      el(
        'ul',
        {},
        stillWrong.map(([id, fix]) => el('li', {}, [`${id} is ${String(game.rules.get(id))}, should be ${String(fix)}`])),
      ),
      el('div', { class: 'actions' }, [next, retry]),
    );
    (container.querySelector('button') as HTMLButtonElement | null)?.focus();
  };

  render();
  game.onChange(render);
}
