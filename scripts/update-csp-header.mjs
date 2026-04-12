#!/usr/bin/env node
/**
 * Rewrites the Content-Security-Policy header value in `vercel.json`
 * from `src/config/csp.js`. Idempotent: prints "nothing to do" and
 * exits 0 if they already match.
 *
 * Usage: node scripts/update-csp-header.mjs
 *
 * Uses a targeted regex replacement rather than round-tripping the JSON,
 * so the existing formatting of `vercel.json` (compact inline objects,
 * redirect ordering, trailing newline) is preserved exactly.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { buildCspHeader } from '../src/config/csp.js';

const vercelJsonPath = fileURLToPath(new URL('../vercel.json', import.meta.url));
const original = readFileSync(vercelJsonPath, 'utf8');

// Match only the `"value"` paired with `"key": "Content-Security-Policy"`.
// CSP values don't contain `"` in practice, so `[^"]*` is safe.
const cspRegex =
  /("key":\s*"Content-Security-Policy",\s*"value":\s*)"[^"]*"/;

if (!cspRegex.test(original)) {
  console.error(
    'Error: could not find a "Content-Security-Policy" header entry in vercel.json',
  );
  process.exit(1);
}

const newHeader = buildCspHeader();
if (newHeader.includes('"')) {
  // Defensive: if CSP_DIRECTIVES ever includes a `"` (shouldn't happen),
  // the regex replacement and JSON escaping below would need to change.
  console.error('Error: generated CSP contains a double quote; aborting');
  process.exit(1);
}

const updated = original.replace(cspRegex, `$1"${newHeader}"`);

if (updated === original) {
  console.log('vercel.json CSP already matches src/config/csp.js; nothing to do');
  process.exit(0);
}

writeFileSync(vercelJsonPath, updated);
console.log('Updated Content-Security-Policy header in vercel.json');
