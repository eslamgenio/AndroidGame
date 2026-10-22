import { RULES, type RuleId, type RuleValue } from '../core/rules/registry';
import type { GameController } from './controller';
import { el } from './dom';

/**
 * The bug-report form: pick the faulty rule, then the value it should have.
 * Whatever is submitted ships, including wrong fixes.
 */
export function mountReportForm(form: HTMLFormElement, game: GameController): void {
  const select = el('select', { id: 'report-rule', name: 'rule' });
  const help = el('p', { class: 'help', id: 'report-help' });
  const values = el('fieldset', { class: 'values' });
  const submit = el('button', { type: 'submit' }, ['Ship patch']);

  select.append(...game.level.inspect.map((id) => el('option', { value: id }, [id])));
  select.setAttribute('aria-describedby', 'report-help');
  form.append(
    el('h2', {}, ['File a bug report']),
    el('label', { for: 'report-rule' }, ['Faulty rule']),
    select,
    help,
    values,
    submit,
  );

  const selectedRule = () => select.value as RuleId;

  const renderValues = () => {
    const id = selectedRule();
    const current = game.rules.get(id);
    help.textContent = RULES[id].description;
    values.replaceChildren(
      el('legend', {}, ['Should be']),
      ...(RULES[id].values as readonly RuleValue[]).map((value, i) => {
        const input = el('input', { type: 'radio', name: 'value', id: `report-value-${i}`, value: String(i), required: '' });
        input.disabled = value === current;
        return el('label', { for: input.id, class: 'choice' }, [input, ` ${String(value)}`, value === current ? ' (current)' : null]);
      }),
    );
  };

  select.addEventListener('change', renderValues);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const choice = form.querySelector<HTMLInputElement>('input[name="value"]:checked');
    if (!choice) return;
    const id = selectedRule();
    game.applyPatch(id, RULES[id].values[Number(choice.value)]);
    // Hand the keyboard back to the game.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });

  renderValues();
  game.onChange(renderValues);
}
