/// <reference types="node" />
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { Plugin } from 'vite';

const TEMPLATE = new URL('../src/sw/sw.template.js', import.meta.url);
const PUBLIC_DIR = new URL('../public', import.meta.url).pathname;

function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? listFiles(join(dir, entry.name)) : [join(dir, entry.name)],
  );
}

/**
 * Emits sw.js at build time with the exact list of files to cache for
 * offline play. Vite's output file names change every build, so the list
 * cannot be written by hand.
 */
export function serviceWorker(): Plugin {
  return {
    name: 'patch-notes-service-worker',
    apply: 'build',
    generateBundle(_options, bundle) {
      const built = Object.keys(bundle).filter((file) => file !== 'index.html');
      const publicFiles = listFiles(PUBLIC_DIR).map((file) => relative(PUBLIC_DIR, file));
      const files = ['./', ...[...built, ...publicFiles].sort().map((file) => `./${file}`)];
      const version = createHash('sha256').update(files.join('\n')).digest('hex').slice(0, 12);
      const source = readFileSync(TEMPLATE, 'utf8')
        .replace('__VERSION__', version)
        .replace('__PRECACHE__', JSON.stringify(files));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}
