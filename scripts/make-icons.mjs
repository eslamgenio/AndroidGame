// Renders public/icons/icon.svg to the PNG sizes Android and iOS need.
// Run with: npm run icons
import { readFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const SIZES = [180, 192, 512];
const svg = await readFile(new URL('../public/icons/icon.svg', import.meta.url), 'utf8');

const browser = await chromium.launch();
const page = await browser.newPage();
for (const size of SIZES) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<style>*{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
  );
  const out = new URL(`../public/icons/icon-${size}.png`, import.meta.url);
  await page.screenshot({ path: out.pathname, omitBackground: false });
  console.log(`wrote ${out.pathname}`);
}
await browser.close();
