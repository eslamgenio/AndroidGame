import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Browser globals that must never appear in the pure simulation core.
const browserOnly = Object.keys(globals.browser).filter((name) => !(name in globals.es2021));

export default tseslint.config(
  { ignores: ['dist/', 'coverage/', 'playwright-report/', 'test-results/', '.claude/'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    files: ['src/**/*.ts'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['tests/**/*.ts', 'e2e/**/*.ts', 'build/**/*.ts', 'scripts/**/*.mjs', '*.config.{js,ts}'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['src/sw/**/*.js'],
    // __VERSION__ and __PRECACHE__ are filled in by build/serviceWorker.ts.
    languageOptions: { globals: { ...globals.serviceworker, __PRECACHE__: 'readonly' } },
  },
  {
    // The core must stay deterministic and runnable in Node: no DOM, no
    // clock, no randomness, and no imports from the layers above it.
    files: ['src/core/**/*.ts'],
    languageOptions: { globals: {} },
    rules: {
      'no-restricted-globals': ['error', ...browserOnly],
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['**/app/**', '**/render/**', '**/ui/**'], message: 'core must not depend on outer layers.' }] },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'core must be deterministic.' },
        { object: 'Date', property: 'now', message: 'core must be deterministic.' },
        { object: 'performance', property: 'now', message: 'core must be deterministic.' },
      ],
    },
  },
);
