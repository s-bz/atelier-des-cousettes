import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

/**
 * Guards the Content-Security-Policy header declared in `vercel.json`.
 *
 * This is a **strict allowlist**: the CSP in `vercel.json` must match
 * `EXPECTED_CSP` below exactly. Adding or removing an origin in
 * `vercel.json` without updating this file fails the test on purpose —
 * that way, every CSP change is a deliberate, reviewable diff and you
 * can't silently ship a missing entry (as happened with
 * `raw.githubusercontent.com` and the Keystatic "Load failed" bug).
 *
 * # How to update
 *
 * When you add a third-party integration:
 * 1. Add the required origin(s) to the right directive in `vercel.json`.
 * 2. Add the same origin(s) to the matching directive in `EXPECTED_CSP`
 *    below, with a comment saying which integration needs it.
 * 3. Keep `.github/workflows/csp-smoke.yml` in sync (it re-checks the
 *    live header after deploy using a subset of these origins).
 *
 * When a test failure surprises you, read the vitest diff — it shows
 * which directive drifted. Either update this file to match the new
 * intent, or revert the CSP change.
 */

/**
 * Complete, exact CSP source list per directive. Every source — including
 * keywords like `'self'` and schemes like `data:` / `blob:` — must be listed.
 */
const EXPECTED_CSP: Record<string, string[]> = {
  'default-src': ["'self'"],

  'script-src': [
    "'self'",
    "'unsafe-inline'",
    'https://va.vercel-scripts.com', // Vercel Analytics
    'https://vercel.live', // Vercel toolbar / live preview
    'https://tally.so', // Tally contact form script
    'https://www.googletagmanager.com', // Google Analytics 4 loader
  ],

  'style-src': [
    "'self'",
    "'unsafe-inline'",
    'https://fonts.googleapis.com', // Google Fonts stylesheet (fallback)
  ],

  'img-src': [
    "'self'",
    'data:',
    'blob:',
    'https://img.youtube.com', // YouTube thumbnails (hqdefault.jpg)
    'https://*.ytimg.com', // YouTube thumbnails (alternate CDN)
    'https://*.githubusercontent.com', // Keystatic image previews in admin
    'https://www.googletagmanager.com', // GA4 tracking pixel
  ],

  'frame-src': [
    'https://www.youtube-nocookie.com', // YouTube lazy-loaded embeds
    'https://vercel.live', // Vercel toolbar
    'https://tally.so', // Tally embedded form iframe
  ],

  'connect-src': [
    "'self'",
    'https://api.github.com', // Keystatic GitHub mode: GraphQL + trees
    'https://raw.githubusercontent.com', // Keystatic GitHub mode: public-repo blob content
    'https://*.githubusercontent.com', // Keystatic GitHub mode: wildcard fallback
    'https://va.vercel-scripts.com', // Vercel Analytics beacon
    'https://vercel.live', // Vercel toolbar
    'https://tally.so', // Tally API fallbacks
    'https://www.google-analytics.com', // GA4 beacon
    'https://*.google-analytics.com', // GA4 beacon (regional endpoints)
    'https://*.analytics.google.com', // GA4 beacon (regional endpoints)
  ],

  'font-src': [
    "'self'",
    'data:',
    'https://fonts.gstatic.com', // Google Fonts binary files (fallback)
  ],
};

type CspDirectives = Record<string, string[]>;

function loadActualCsp(): CspDirectives {
  const vercelJson = JSON.parse(
    readFileSync(join(process.cwd(), 'vercel.json'), 'utf8'),
  );
  const catchAllRule = vercelJson.headers.find(
    (rule: { source: string }) => rule.source === '/(.*)',
  );
  const cspHeader = catchAllRule.headers.find(
    (h: { key: string }) => h.key === 'Content-Security-Policy',
  );
  return Object.fromEntries(
    cspHeader.value
      .split(';')
      .map((directive: string) => directive.trim())
      .filter(Boolean)
      .map((directive: string) => {
        const [name, ...sources] = directive.split(/\s+/);
        return [name, sources];
      }),
  );
}

const sorted = (xs: string[]) => [...xs].sort();

describe('Content-Security-Policy (vercel.json)', () => {
  const actual = loadActualCsp();

  it('declares exactly the directives in EXPECTED_CSP (no extras, no missing)', () => {
    expect(sorted(Object.keys(actual))).toEqual(sorted(Object.keys(EXPECTED_CSP)));
  });

  describe.each(Object.entries(EXPECTED_CSP))('%s', (directive, expectedSources) => {
    it('matches the expected source allowlist exactly', () => {
      const actualSources = actual[directive] ?? [];
      expect(sorted(actualSources)).toEqual(sorted(expectedSources));
    });
  });
});
