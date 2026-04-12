import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

import {
  CSP_DIRECTIVES,
  buildCspHeader,
  parseCspHeader,
} from '../../config/csp.js';

/**
 * Guards the Content-Security-Policy header deployed by Vercel.
 *
 * The CSP is declared once, in `src/config/csp.js`, and rendered into
 * `vercel.json` via `node scripts/update-csp-header.mjs`. This test
 * asserts `vercel.json` is in sync with the single source of truth.
 *
 * # On failure
 *
 * - If you just edited `src/config/csp.js` and forgot to sync:
 *   run `node scripts/update-csp-header.mjs`, then re-run the tests.
 * - If `vercel.json` was hand-edited and is now ahead of the SSOT:
 *   port the intent into `src/config/csp.js` (with an inline comment
 *   naming the integration), then run the update script.
 *
 * Do not edit `vercel.json`'s CSP by hand — it will drift.
 */

type VercelHeader = { key: string; value: string };
type VercelHeaderRule = { source: string; headers: VercelHeader[] };
type VercelJson = { headers: VercelHeaderRule[] };

const vercelJsonPath = fileURLToPath(
  new URL('../../../vercel.json', import.meta.url),
);

function loadVercelCspHeader(): string {
  const parsed: unknown = JSON.parse(readFileSync(vercelJsonPath, 'utf8'));

  // Structure assertions with actionable messages rather than cryptic
  // TypeErrors if `vercel.json` drifts from the shape we expect.
  expect(
    parsed,
    'vercel.json: expected an object at the top level',
  ).toBeTypeOf('object');
  const vercelJson = parsed as Partial<VercelJson>;
  expect(
    Array.isArray(vercelJson.headers),
    'vercel.json: expected a top-level "headers" array',
  ).toBe(true);

  const rulesWithCsp = (vercelJson.headers as VercelHeaderRule[]).filter(
    (rule) =>
      Array.isArray(rule.headers) &&
      rule.headers.some((h) => h.key === 'Content-Security-Policy'),
  );
  expect(
    rulesWithCsp,
    'vercel.json: expected exactly one header rule to declare a Content-Security-Policy',
  ).toHaveLength(1);

  const cspHeader = rulesWithCsp[0].headers.find(
    (h) => h.key === 'Content-Security-Policy',
  );
  expect(cspHeader, 'Content-Security-Policy header entry not found').toBeDefined();
  expect(
    typeof cspHeader!.value,
    'Content-Security-Policy header value must be a string',
  ).toBe('string');
  return cspHeader!.value;
}

const sorted = (xs: readonly string[]) => [...xs].sort();

describe('Content-Security-Policy', () => {
  const actualHeader = loadVercelCspHeader();
  const actual = parseCspHeader(actualHeader);

  it('vercel.json header equals buildCspHeader() exactly (catches format drift)', () => {
    expect(actualHeader).toBe(buildCspHeader());
  });

  it('declares exactly the directives in CSP_DIRECTIVES (no extras, no missing)', () => {
    expect(sorted(Object.keys(actual))).toEqual(sorted(Object.keys(CSP_DIRECTIVES)));
  });

  it.each(Object.entries(CSP_DIRECTIVES))(
    '%s: sources match the SSOT allowlist exactly',
    (directive, expectedSources) => {
      const actualSources = actual[directive] ?? [];
      expect(sorted(actualSources)).toEqual(sorted(expectedSources));
    },
  );
});

/**
 * Meta-test: ensure the post-deploy smoke script stays wired to the
 * same source of truth this file uses, so the two guards can never
 * drift. Before, the workflow had its own hand-maintained subset list.
 */
describe('CSP smoke script wiring', () => {
  const scriptPath = fileURLToPath(
    new URL('../../../scripts/check-csp.mjs', import.meta.url),
  );

  it('imports CSP_DIRECTIVES from the SSOT module', () => {
    const source = readFileSync(scriptPath, 'utf8');
    expect(source).toMatch(
      /from\s+['"]\.\.\/src\/config\/csp\.js['"]/,
    );
    expect(source).toContain('CSP_DIRECTIVES');
  });
});
