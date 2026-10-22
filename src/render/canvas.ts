import type { Level } from '../core/level/types';
import { TILE } from '../core/physics/constants';
import type { RuleSet } from '../core/rules/ruleSet';
import type { GameState } from '../core/sim/step';

const COLORS = {
  bg: '#0d1117',
  grid: '#161b22',
  wall: '#30363d',
  wallEdge: '#484f58',
  glass: 'rgba(121, 192, 255, 0.25)',
  glassEdge: '#79c0ff',
  spikes: '#f85149',
  exit: '#3fb950',
  locked: '#f85149',
  key: '#d29922',
  player: '#58a6ff',
  velocity: '#d2a8ff',
};

/** Draws one frame. Reads the game state; never changes it. */
export class Renderer {
  private readonly ctx: CanvasRenderingContext2D;

  constructor(
    readonly canvas: HTMLCanvasElement,
    private readonly level: Level,
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not supported.');
    this.ctx = ctx;
    this.resize();
  }

  /** Matches the backing store to the displayed size, for crisp pixels. */
  resize(): void {
    const scale = Math.max(1, Math.round((this.canvas.clientWidth * devicePixelRatio) / (this.level.width * TILE)));
    this.canvas.width = this.level.width * TILE * scale;
    this.canvas.height = this.level.height * TILE * scale;
    this.ctx.setTransform(scale, 0, 0, scale, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
  }

  draw(state: GameState, rules: RuleSet): void {
    const { ctx, level } = this;
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, level.width * TILE, level.height * TILE);
    this.drawGrid();
    this.drawTiles(rules);
    this.drawExit(rules.get('exit.requires') === 'NONE' || state.hasKey);
    if (level.key && !state.hasKey) this.drawKey(level.key.col, level.key.row);
    this.drawPlayer(state);
  }

  private drawGrid(): void {
    const { ctx, level } = this;
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let c = 0; c <= level.width; c++) {
      ctx.moveTo(c * TILE, 0);
      ctx.lineTo(c * TILE, level.height * TILE);
    }
    for (let r = 0; r <= level.height; r++) {
      ctx.moveTo(0, r * TILE);
      ctx.lineTo(level.width * TILE, r * TILE);
    }
    ctx.stroke();
  }

  private drawTiles(rules: RuleSet): void {
    const { ctx, level } = this;
    const glassVisible = rules.get('tile.glass.visible');
    for (let row = 0; row < level.height; row++) {
      for (let col = 0; col < level.width; col++) {
        const x = col * TILE;
        const y = row * TILE;
        switch (level.tileAt(col, row)) {
          case 'wall':
            box(ctx, x, y, TILE, TILE, COLORS.wall, COLORS.wallEdge);
            break;
          case 'glass':
            if (glassVisible) box(ctx, x, y, TILE, TILE, COLORS.glass, COLORS.glassEdge, rules.get('tile.glass.solid') ? [] : [2, 2]);
            break;
          case 'spikes':
            spikes(ctx, x, y);
            break;
          case 'empty':
            break;
        }
      }
    }
  }

  private drawExit(open: boolean): void {
    const { col, row } = this.level.exit;
    const color = open ? COLORS.exit : COLORS.locked;
    box(this.ctx, col * TILE + 2, row * TILE, TILE - 4, TILE, open ? 'rgba(63, 185, 80, 0.2)' : 'rgba(248, 81, 73, 0.15)', color);
    label(this.ctx, open ? 'EXIT' : 'LOCK', col * TILE + TILE / 2, row * TILE - 2, color);
  }

  private drawKey(col: number, row: number): void {
    const { ctx } = this;
    const cx = col * TILE + TILE / 2;
    const cy = row * TILE + TILE / 2;
    ctx.strokeStyle = COLORS.key;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx - 3, cy, 3, 0, Math.PI * 2);
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + 6, cy);
    ctx.lineTo(cx + 6, cy + 3);
    ctx.stroke();
  }

  private drawPlayer({ player }: GameState): void {
    const { ctx } = this;
    box(ctx, player.x, player.y, player.w, player.h, 'rgba(88, 166, 255, 0.25)', COLORS.player);
    // Velocity vector, like a debug overlay.
    const cx = player.x + player.w / 2;
    const cy = player.y + player.h / 2;
    ctx.strokeStyle = COLORS.velocity;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + player.vx * 3, cy + player.vy * 3);
    ctx.stroke();
  }
}

function box(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  stroke: string,
  dash: number[] = [],
): void {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  ctx.setLineDash(dash);
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.setLineDash([]);
}

function spikes(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = COLORS.spikes;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const left = x + i * (TILE / 4);
    ctx.moveTo(left, y + TILE);
    ctx.lineTo(left + TILE / 8, y + TILE / 3);
    ctx.lineTo(left + TILE / 4, y + TILE);
  }
  ctx.fill();
}

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string): void {
  ctx.fillStyle = color;
  ctx.font = '5px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y);
}
