import { RULES } from '../core/rules/registry';
import type { GameController } from './controller';
import { el } from './dom';

/** The always-on rule inspector: live rule values, with patched rules shown as a diff. */
export function mountInspector(container: HTMLElement, game: GameController): void {
  const list = el('ul', { class: 'rules' });
  container.append(el('h2', { id: 'inspector-title' }, ['Rule inspector']), list);
  container.setAttribute('aria-labelledby', 'inspector-title');

  const render = () => {
    list.replaceChildren(
      ...game.level.inspect.map((id) => {
        const before = game.history.base.get(id);
        const now = game.rules.get(id);
        const value =
          before === now
            ? el('span', { class: 'rule-value' }, [String(now)])
            : el('span', { class: 'rule-value' }, [
                el('del', {}, [String(before)]),
                ' ',
                el('ins', {}, [String(now)]),
              ]);
        return el('li', { class: before === now ? 'rule' : 'rule patched', title: RULES[id].description, 'data-rule': id }, [
          el('code', { class: 'rule-id' }, [id]),
          value,
        ]);
      }),
    );
  };

  render();
  game.onChange(render);
}
