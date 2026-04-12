/**
 * Single source of truth for the site's Content-Security-Policy header.
 *
 * The deployed CSP value (in `vercel.json`) must be the string produced by
 * `buildCspHeader()`. This invariant is enforced by:
 *
 *   - `src/utils/__tests__/csp.test.ts`
 *       Fails PR checks if `vercel.json` drifts from this module.
 *   - `.github/workflows/csp-smoke.yml` → `scripts/check-csp.mjs`
 *       Fails after deploys if the live header is missing any origin.
 *
 * # Updating the CSP
 *
 *   1. Edit `CSP_DIRECTIVES` below. Add a comment naming the integration.
 *   2. Run `node scripts/update-csp-header.mjs` to rewrite `vercel.json`.
 *   3. Commit both files.
 *
 * Plain ESM JavaScript (not TypeScript) so standalone Node scripts can
 * import it without a compile step. JSDoc provides the types.
 */

/** @typedef {Record<string, readonly string[]>} CspDirectives */

/**
 * Complete CSP source list per directive. Every source — including
 * keywords like `'self'` and schemes like `data:` / `blob:` — must be
 * listed explicitly. The order here is the order emitted into the
 * deployed header (cosmetic, but stable for diffs).
 *
 * @type {CspDirectives}
 */
export const CSP_DIRECTIVES = {
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

/**
 * Serialize `CSP_DIRECTIVES` into the exact string that must appear as
 * the Content-Security-Policy header value in `vercel.json`.
 *
 * @returns {string}
 */
export function buildCspHeader() {
  return Object.entries(CSP_DIRECTIVES)
    .map(([name, sources]) => `${name} ${sources.join(' ')}`)
    .join('; ');
}

/**
 * Parse a Content-Security-Policy header value into a directive map.
 * Whitespace-tolerant. Preserves source order within each directive.
 *
 * @param {string} header
 * @returns {Record<string, string[]>}
 */
export function parseCspHeader(header) {
  /** @type {Record<string, string[]>} */
  const result = {};
  for (const directive of header.split(';')) {
    const trimmed = directive.trim();
    if (!trimmed) continue;
    const [name, ...sources] = trimmed.split(/\s+/);
    result[name] = sources;
  }
  return result;
}
