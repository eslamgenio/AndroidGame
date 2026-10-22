import { Renderer } from '../render/canvas';
import { version } from '../ui/controller';
import { mountInspector } from '../ui/inspector';
import { mountPatchLog } from '../ui/patchLog';
import { mountReportForm } from '../ui/report';
import { Game } from './game';
import { Input } from './input';
import { LEVELS } from './levels';
import { startLoop } from './loop';

declare global {
  interface Window {
    /** Read-only hook for end-to-end tests and curious players. */
    patchNotes?: { game: Game };
  }
}

const OUTCOME_TEXT = {
  verified: 'Level complete: Verified fix ✓',
  'known-issues': 'Level complete: Shipped with known issues ⚠',
} as const;

function mount(root: HTMLElement): void {
  const level = LEVELS[0];
  if (!level) throw new Error('No levels found.');
  const game = new Game(level);

  root.innerHTML = `
    <div class="layout">
      <section class="play">
        <header class="ticket">
          <p class="ticket-id"></p>
          <h1></h1>
          <p class="ticket-report"></p>
        </header>
        <canvas class="screen" aria-label="Game screen"></canvas>
        <p class="status" role="status"></p>
      </section>
      <aside class="panel">
        <section class="inspector"></section>
        <form class="report"></form>
        <section class="patches"></section>
      </aside>
    </div>
  `;
  const q = <T extends Element>(selector: string) => root.querySelector(selector) as T;
  q<HTMLElement>('.ticket-id').textContent = level.ticket;
  q<HTMLElement>('h1').textContent = level.title;
  q<HTMLElement>('.ticket-report').textContent = level.report;
  const status = q<HTMLElement>('.status');
  const canvas = q<HTMLCanvasElement>('canvas');

  mountInspector(q('.inspector'), game);
  mountReportForm(q('.report'), game);
  mountPatchLog(q('.patches'), game);

  let lastRules = game.rules;
  let lastPatchCount = 0;
  game.onChange(() => {
    if (game.rules !== lastRules) glitch(canvas);
    status.textContent = describe(game, lastPatchCount);
    lastRules = game.rules;
    lastPatchCount = game.history.patches.length;
  });

  const renderer = new Renderer(canvas, level);
  const input = new Input(window);
  window.addEventListener('resize', () => renderer.resize());
  window.patchNotes = { game };

  startLoop(
    () => game.tick(input.controls),
    () => renderer.draw(game.state, game.rules),
  );
}

/** One line for the status bar, also read out by screen readers. */
function describe(game: Game, previousPatchCount: number): string {
  if (game.state.outcome !== 'playing') return OUTCOME_TEXT[game.state.outcome];
  const patches = game.history.patches;
  const latest = patches.at(-1);
  if (patches.length > previousPatchCount && latest) {
    return `Patch ${version(latest.id)} shipped: ${latest.ruleId} ${String(latest.from)} → ${String(latest.to)}`;
  }
  // Only a restart rewinds the clock; a revert keeps the player where they are.
  if (game.state.tick === 0) return 'Level restarted.';
  if (patches.length < previousPatchCount) return 'Patch reverted.';
  return '';
}

/** Restarts the CSS glitch animation on the game screen. */
function glitch(canvas: HTMLCanvasElement): void {
  canvas.classList.remove('glitch');
  void canvas.offsetWidth; // Forces a reflow so the animation can replay.
  canvas.classList.add('glitch');
}

const root = document.getElementById('app');
if (root) mount(root);
