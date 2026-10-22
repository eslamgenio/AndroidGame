import { defineConfig } from 'vitest/config';
import { serviceWorker } from './build/serviceWorker';

export default defineConfig({
  // Relative URLs, so the build works from any folder (e.g. GitHub Pages).
  base: './',
  plugins: [serviceWorker()],
  test: {
    include: ['tests/**/*.test.ts'],
    coverage: {
      include: ['src/core/**'],
      thresholds: { lines: 90 },
    },
  },
});
