// Fails the build if the code we ship grows past the budget in SPEC.md.
// Counts gzipped HTML, JS, CSS, the manifest and the service worker; icons are excluded.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const BUDGET_KB = 100;
const DIST = new URL('../dist', import.meta.url).pathname;
const CODE = /\.(html|js|css|webmanifest)$/;

const files = readdirSync(DIST, { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile() && CODE.test(entry.name))
  .map((entry) => join(entry.parentPath, entry.name));

const totalKb = files.reduce((sum, file) => sum + gzipSync(readFileSync(file)).length, 0) / 1024;
console.log(`Shipped code: ${totalKb.toFixed(1)} KB gzipped (${files.length} files, budget ${BUDGET_KB} KB)`);
if (totalKb > BUDGET_KB) {
  console.error('Over budget.');
  process.exit(1);
}
