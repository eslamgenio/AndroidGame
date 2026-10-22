import type { Outcome } from '../core/sim/step';
import { Renderer } from '../render/canvas';
import { version } from '../ui/controller';
import { mountInspector } from '../ui/inspector';
import { renderLevelSelect } from '../ui/levelSelect';
import { mountPatchLog } from '../ui/patchLog';
import { mountReportForm } from '../ui/report';
import { mountResult } from '../ui/result';
import { mountTouchControls } from '../ui/touch';
import { Game } from './game';
import { Input } from './input';
import { LEVELS } from './levels';
import { startLoop } from './loop';
import { registerServiceWorker } from './registerServiceWorker';

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

const LAYOUT = `
  <nav class="tickets"></nav>
  <div class="layout">
    <header class="ticket">
      <p class="ticket-id"></p>
      <h1></h1>
      <p class="ticket-report"></p>
    </header>
    <div class="stage-wrap">
      <div class="stage">
        <canvas class="screen" aria-label="Game screen"></canvas>
        <div class="result-slot" role="dialog" aria-label="Level result"></div>
      </div>
      <div class="touch"></div>
      <p class="status" role="status"></p>
    </div>
    <aside class="panel">
      <section class="inspector"></section>
      <form class="report"></form>
      <section class="patches"></section>
    </aside>
  </div>
`;

/** Keeps each level's best result for this session ("verified" beats "known issues"). */
function record(progress: Map<string, Outcome>, levelId: string, outcome: Outcome): void {
  if (outcome === 'playing' || progress.get(levelId) === 'verified') return;
  progress.set(levelId, outcome);
}

function start(root: HTMLElement): void {
  const input = new Input(window);
  const progress = new Map<string, Outcome>();
  let renderer: Renderer | null = null;
  let stopLoop = () => {};
  window.addEventListener('resize', () => renderer?.resize());

  const play = (index: number) => {
    const level = LEVELS[index];
    if (!level) throw new Error(`No level #${index}.`);
    stopLoop();
    const game = new Game(level);
    window.patchNotes = { game };

    root.innerHTML = LAYOUT;
    const q = <T extends Element>(selector: string) => root.querySelector(selector) as T;
    q<HTMLElement>('.ticket-id').textContent = level.ticket;
    q<HTMLElement>('h1').textContent = level.title;
    q<HTMLElement>('.ticket-report').textContent = level.report;
    const status = q<HTMLElement>('.status');
    const canvas = q<HTMLCanvasElement>('canvas');
    const nav = q<HTMLElement>('.tickets');

    const drawNav = () => renderLevelSelect(nav, LEVELS, index, progress, play);
    drawNav();
    mountInspector(q('.inspector'), game);
    mountReportForm(q('.report'), game);
    mountPatchLog(q('.patches'), game);
    mountTouchControls(q('.touch'), input);
    mountResult(q('.result-slot'), game, {
      next: index + 1 < LEVELS.length ? () => play(index + 1) : null,
      retry: () => game.restart(),
    });

    let lastRules = game.rules;
    let lastPatchCount = 0;
    game.onChange(() => {
      if (game.rules !== lastRules) glitch(canvas);
      status.textContent = describe(game, lastPatchCount);
      status.dataset['outcome'] = game.state.outcome;
      lastRules = game.rules;
      lastPatchCount = game.history.patches.length;
      record(progress, level.id, game.state.outcome);
      drawNav();
    });

    renderer = new Renderer(canvas, level);
    const draw = renderer;
    stopLoop = startLoop(
      () => game.tick(input.controls),
      () => draw.draw(game.state, game.rules),
    );
  };

  play(0);
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
if (root) start(root);
registerServiceWorker();
