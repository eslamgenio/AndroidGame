import { type GameController, version } from './controller';
import { el } from './dom';

/** Every shipped patch, newest first, each with a revert button. Plus "restart level". */
export function mountPatchLog(container: HTMLElement, game: GameController): void {
  const list = el('ol', { class: 'patch-list', reversed: '' });
  const empty = el('p', { class: 'help' }, ['No patches shipped yet.']);
  const restart = el('button', { type: 'button', class: 'secondary' }, ['Restart level']);
  container.append(el('h2', {}, ['Patch log']), empty, list, restart);

  restart.addEventListener('click', () => game.restart());

  const render = () => {
    const patches = game.history.patches;
    empty.hidden = patches.length > 0;
    list.replaceChildren(
      ...[...patches].reverse().map((p) => {
        const revert = el('button', { type: 'button', class: 'link', 'aria-label': `Revert ${version(p.id)}` }, ['Revert']);
        revert.addEventListener('click', () => game.revert(p.id));
        return el('li', { value: String(p.id) }, [
          el('span', { class: 'patch-version' }, [version(p.id)]),
          ` ${p.ruleId}: ${String(p.from)} → ${String(p.to)} `,
          revert,
        ]);
      }),
    );
  };

  render();
  game.onChange(render);
}
