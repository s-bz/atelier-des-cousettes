import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

/**
 * Guards the Content-Security-Policy header declared in `vercel.json` against
 * accidental removal of origins that third-party integrations rely on.
 *
 * History: dropping `raw.githubusercontent.com` from `connect-src` broke every
 * Keystatic singleton with a Safari "Load failed" error, because `@keystatic/core`
 * fetches file blobs directly from that origin for public repos.
 * See `packages/keystatic/src/app/useItemData.ts` → `fetchGitHubBlob`.
 */

type CspDirectives = Record<string, string[]>;

function loadCsp(): CspDirectives {
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

describe('Content-Security-Policy (vercel.json)', () => {
  const directives = loadCsp();

  // Required origins per integration. Adding a new integration? Add a row here.
  it.each<[string, string, string]>([
    // Keystatic GitHub storage — dashboard/tree calls
    ['Keystatic (tree/graphql)', 'connect-src', 'https://api.github.com'],
    // Keystatic GitHub storage — file blob fetches for public repos
    // Regression guard for the "Load failed" bug.
    ['Keystatic (public blobs)', 'connect-src', 'https://raw.githubusercontent.com'],
    // Vercel analytics / live preview
    ['Vercel analytics', 'connect-src', 'https://va.vercel-scripts.com'],
    ['Vercel live', 'connect-src', 'https://vercel.live'],
    // Tally contact form (embedded iframe + script + fetch fallbacks)
    ['Tally fetch', 'connect-src', 'https://tally.so'],
    ['Tally iframe', 'frame-src', 'https://tally.so'],
    ['Tally script', 'script-src', 'https://tally.so'],
    // Google Analytics 4
    ['GA4 script', 'script-src', 'https://www.googletagmanager.com'],
    ['GA4 beacon', 'connect-src', 'https://www.google-analytics.com'],
    // YouTube lazy-loaded embeds
    ['YouTube frame', 'frame-src', 'https://www.youtube-nocookie.com'],
    ['YouTube thumbnail', 'img-src', 'https://img.youtube.com'],
    // GitHub-hosted image previews in Keystatic admin
    ['Keystatic image previews', 'img-src', 'https://*.githubusercontent.com'],
    // Self-hosted fonts
    ['Google Fonts stylesheet', 'style-src', 'https://fonts.googleapis.com'],
    ['Google Fonts files', 'font-src', 'https://fonts.gstatic.com'],
  ])('%s: %s must allow %s', (_label, directive, origin) => {
    expect(directives[directive]).toBeDefined();
    expect(directives[directive]).toContain(origin);
  });

  it('default-src is self-only (no implicit wildcards)', () => {
    expect(directives['default-src']).toEqual(["'self'"]);
  });

  it('declares all security-sensitive directives explicitly', () => {
    for (const directive of [
      'default-src',
      'script-src',
      'style-src',
      'img-src',
      'connect-src',
      'frame-src',
      'font-src',
    ]) {
      expect(directives[directive], `missing directive: ${directive}`).toBeDefined();
    }
  });
});
