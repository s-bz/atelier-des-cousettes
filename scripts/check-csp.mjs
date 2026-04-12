#!/usr/bin/env node
/**
 * Post-deploy smoke check: fetches the live Content-Security-Policy
 * header from one or more paths on a deployed URL and asserts every
 * origin declared in `src/config/csp.js` is present.
 *
 * Intentionally loose (containment, not set equality) — its job is to
 * catch infrastructure drift (stale deploy, CDN header rewrite, manual
 * Vercel dashboard edits), not intent drift. Strict equality is the
 * unit test's job and runs at PR time.
 *
 * Usage: node scripts/check-csp.mjs <base-url>
 * Example: node scripts/check-csp.mjs https://couture-tarn.fr
 *
 * Exit codes:
 *   0  all origins present on every checked path
 *   1  one or more origins missing, or a request failed after retries
 *   2  bad arguments
 *
 * Emits GitHub Actions `::error::` annotations on failure.
 */

import { CSP_DIRECTIVES, parseCspHeader } from '../src/config/csp.js';

const baseUrl = process.argv[2];
if (!baseUrl) {
  console.error('Usage: node scripts/check-csp.mjs <base-url>');
  process.exit(2);
}

/** Paths to verify on the deployed site. `/keystatic/` is the path where
 *  the original "Load failed" regression surfaced, so we re-check it
 *  explicitly. */
const PATHS_TO_CHECK = ['/', '/keystatic/'];

const MAX_ATTEMPTS = 3;
const RETRY_BACKOFFS_MS = [2_000, 4_000]; // between attempts 1→2 and 2→3

/**
 * Fetch the CSP header from a URL, retrying on network/HTTP errors.
 * We use GET (not HEAD) because some origins/paths 405 on HEAD, and
 * skip reading the body. Status code is intentionally ignored —
 * servers typically include the CSP header even on 401/403/404
 * responses, and the Keystatic admin path can return any of those.
 *
 * @param {string} url
 * @returns {Promise<string>}
 */
async function fetchCspHeader(url) {
  /** @type {unknown} */
  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, { redirect: 'follow' });
      // Discard the body without reading it.
      response.body?.cancel().catch(() => {});
      const header = response.headers.get('content-security-policy');
      if (!header) {
        throw new Error(
          `No Content-Security-Policy header on ${response.status} response`,
        );
      }
      return header;
    } catch (err) {
      lastError = err;
      if (attempt < MAX_ATTEMPTS) {
        const backoff = RETRY_BACKOFFS_MS[attempt - 1];
        const msg = err instanceof Error ? err.message : String(err);
        console.error(
          `  attempt ${attempt}/${MAX_ATTEMPTS} failed: ${msg} — retrying in ${backoff}ms`,
        );
        await new Promise((resolve) => setTimeout(resolve, backoff));
      }
    }
  }
  throw lastError;
}

/**
 * @param {string} fullUrl
 * @returns {Promise<boolean>} true if all origins present, false on any failure
 */
async function checkPath(fullUrl) {
  console.log(`\nChecking ${fullUrl}`);
  let header;
  try {
    header = await fetchCspHeader(fullUrl);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`::error::Failed to fetch CSP from ${fullUrl}: ${msg}`);
    return false;
  }

  const live = parseCspHeader(header);
  let ok = true;

  for (const [directive, expectedSources] of Object.entries(CSP_DIRECTIVES)) {
    const actualSources = live[directive] ?? [];
    const missing = expectedSources.filter((src) => !actualSources.includes(src));
    if (missing.length > 0) {
      ok = false;
      for (const src of missing) {
        console.error(`::error::${fullUrl}: ${directive} is missing '${src}'`);
      }
    } else {
      console.log(`  ok  ${directive} (${expectedSources.length} origins)`);
    }
  }
  return ok;
}

let hadFailure = false;
for (const path of PATHS_TO_CHECK) {
  const fullUrl = new URL(path, baseUrl).toString();
  const ok = await checkPath(fullUrl);
  if (!ok) hadFailure = true;
}

if (hadFailure) {
  console.error('\nCSP smoke check FAILED');
  process.exit(1);
}
console.log('\nCSP smoke check PASSED');
