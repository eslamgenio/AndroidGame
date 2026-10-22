import { Renderer } from '../render/canvas';
import { Game } from './game';
import { Input } from './input';
import { LEVELS } from './levels';
import { startLoop } from './loop';

const OUTCOME_TEXT = {
  playing: '',
  verified: 'Verified fix ✓',
  'known-issues': 'Shipped with known issues ⚠',
} as const;

function mount(root: HTMLElement): void {
  const level = LEVELS[0];
  if (!level) throw new Error('No levels found.');
  const game = new Game(level);

  root.innerHTML = `
    <header class="ticket">
      <p class="ticket-id"></p>
      <h1></h1>
      <p class="ticket-report"></p>
    </header>
    <canvas class="screen" aria-label="Game screen"></canvas>
    <p class="status" role="status"></p>
  `;
  const q = <T extends Element>(selector: string) => root.querySelector(selector) as T;
  q<HTMLElement>('.ticket-id').textContent = level.ticket;
  q<HTMLElement>('h1').textContent = level.title;
  q<HTMLElement>('.ticket-report').textContent = level.report;
  const status = q<HTMLElement>('.status');

  const renderer = new Renderer(q<HTMLCanvasElement>('canvas'), level);
  const input = new Input(window);
  window.addEventListener('resize', () => renderer.resize());
  game.onChange(() => (status.textContent = OUTCOME_TEXT[game.state.outcome]));

  startLoop(
    () => game.tick(input.controls),
    () => renderer.draw(game.state, game.rules),
  );
}

const root = document.getElementById('app');
if (root) mount(root);
