import { loadLevel } from '../core/level/load';
import type { Level } from '../core/level/types';

const files = import.meta.glob<{ default: unknown }>('../../levels/*.json', { eager: true });

/** All levels, ordered by file name (01-…, 02-…). */
export const LEVELS: readonly Level[] = Object.keys(files)
  .sort()
  .map((path) => loadLevel(files[path]?.default));
