/**
 * Patches @keystatic/astro for Astro 6 compatibility.
 * See: https://github.com/Thinkmill/keystatic/pull/1527
 * Remove this script once @keystatic/astro supports Astro 6 natively.
 */
import { copyFileSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const internalDir = join('node_modules', '@keystatic', 'astro', 'internal');
const jsFile = join(internalDir, 'keystatic-page.js');
const tsxFile = join(internalDir, 'keystatic-page.tsx');
const astroFile = join(internalDir, 'keystatic-astro-page.astro');

if (!existsSync(jsFile)) {
  console.log('[patch-keystatic] Already patched or file not found, skipping.');
  process.exit(0);
}

// Copy .js to .tsx
copyFileSync(jsFile, tsxFile);

// Update import in .astro file
const astroContent = readFileSync(astroFile, 'utf-8');
const patched = astroContent.replace(
  "from './keystatic-page.js'",
  "from './keystatic-page.tsx'"
);
writeFileSync(astroFile, patched);

console.log('[patch-keystatic] Patched @keystatic/astro for Astro 6 compatibility.');
