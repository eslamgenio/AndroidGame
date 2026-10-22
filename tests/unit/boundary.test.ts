import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

// Guards the architecture rule from SPEC.md: src/core stays pure.
const eslint = new ESLint();

async function coreErrors(code: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath: 'src/core/example.ts' });
  return (result?.messages ?? []).map((m) => m.ruleId ?? m.message);
}

describe('core layer boundary', () => {
  it('rejects DOM globals', async () => {
    expect(await coreErrors('export const el = document.body;\n')).toContain('no-restricted-globals');
  });

  it('rejects non-deterministic APIs', async () => {
    expect(await coreErrors('export const r = Math.random();\n')).toContain('no-restricted-properties');
    expect(await coreErrors('export const t = Date.now();\n')).toContain('no-restricted-properties');
  });

  it('rejects imports from outer layers', async () => {
    expect(await coreErrors("import { x } from '../../render/canvas';\nexport const y = x;\n")).toContain(
      'no-restricted-imports',
    );
  });

  it('accepts plain pure code', async () => {
    expect(await coreErrors('export const add = (a: number, b: number): number => a + b;\n')).toEqual([]);
  });
});
