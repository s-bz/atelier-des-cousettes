/**
 * Lint (and optionally auto-fix) internal links missing a trailing slash.
 *
 * Usage:
 *   pnpm lint:trailing-slash         — report violations, exit 1 if any found
 *   pnpm lint:trailing-slash --fix   — auto-fix all violations in-place
 */

import { readFileSync, writeFileSync, globSync } from 'fs';

const FIX = process.argv.includes('--fix');

// ---------------------------------------------------------------------------
// Patterns that describe internal links WITHOUT a trailing slash.
// Each entry: { label, glob, regex, fix }
//   regex  — must capture the full match in group 0; group 1 = the bare path
//   fix    — receives the full match and returns the corrected string
// ---------------------------------------------------------------------------
const RULES = [
  {
    label: 'Markdown link  ]( /path )',
    glob: 'src/**/*.mdoc',
    // Matches ](/some/path) where path ends with a non-slash character
    regex: /\]\((\/[a-z][a-z0-9/-]*[a-z0-9])\)/g,
    fix: (m, path) => `](${path}/)`,
  },
  {
    label: 'HTML/JSX href="  /path  "',
    glob: 'src/**/*.{astro,tsx,ts}',
    // Matches href="/some/path" or href='/some/path' without trailing slash
    // Excludes static assets (no extension check needed — asset paths have dots)
    regex: /href=["'](\/[a-z][a-z0-9/-]*[a-z0-9])["']/g,
    fix: (m, path) => m.replace(path, `${path}/`),
  },
  {
    label: 'JS template literal href={`/path`}',
    glob: 'src/**/*.{astro,tsx,ts}',
    regex: /href=\{`(\/[a-z][a-z0-9/-]*[a-z0-9])`\}/g,
    fix: (m, path) => m.replace(path, `${path}/`),
  },
  {
    label: 'Astro.redirect( /path )',
    glob: 'src/**/*.{astro,ts}',
    regex: /Astro\.redirect\(['"`](\/[a-z][a-z0-9/-]*[a-z0-9])['"`]\)/g,
    fix: (m, path) => m.replace(path, `${path}/`),
  },
  {
    label: 'new URL( /path , ... )',
    glob: 'src/**/*.{astro,ts}',
    regex: /new URL\(['"`](\/[a-z][a-z0-9/-]*[a-z0-9])['"`],/g,
    fix: (m, path) => m.replace(path, `${path}/`),
  },
  {
    label: 'YAML href: /path',
    glob: 'src/content/**/*.yaml',
    regex: /href:\s*(\/[a-z][a-z0-9/-]*[a-z0-9])\s*$/gm,
    fix: (m, path) => m.replace(path, `${path}/`),
  },
];

// ---------------------------------------------------------------------------
// Paths that are intentionally slash-free (static files, external patterns)
// ---------------------------------------------------------------------------
const IGNORED_PATHS = new Set([
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/site.webmanifest',
  '/og-default.jpg',
  '/sitemap-index.xml',
  '/sitemap.xml',
  '/robots.txt',
  '/llms.txt',
  '/llms-full.txt',
]);

let totalViolations = 0;

for (const rule of RULES) {
  const files = globSync(rule.glob, { cwd: process.cwd(), absolute: true });

  for (const file of files) {
    const original = readFileSync(file, 'utf8');
    let updated = original;
    const violations = [];

    let match;
    // Reset lastIndex before each file
    rule.regex.lastIndex = 0;

    while ((match = rule.regex.exec(original)) !== null) {
      const path = match[1];
      if (IGNORED_PATHS.has(path)) continue;
      violations.push({ match: match[0], path, index: match.index });
    }

    if (violations.length === 0) continue;

    const relFile = file.replace(process.cwd() + '/', '');

    if (FIX) {
      // Apply fixes (replace all occurrences)
      for (const v of violations) {
        updated = updated.replaceAll(v.match, rule.fix(v.match, v.path));
      }
      if (updated !== original) {
        writeFileSync(file, updated, 'utf8');
        console.log(`  fixed  ${relFile} (${violations.length} occurrence${violations.length > 1 ? 's' : ''})`);
      }
    } else {
      for (const v of violations) {
        const line = original.slice(0, v.index).split('\n').length;
        console.error(`  ${relFile}:${line}  [${rule.label}]  ${v.match}`);
      }
      totalViolations += violations.length;
    }
  }
}

if (FIX) {
  console.log('Done. All trailing slash violations fixed.');
} else if (totalViolations > 0) {
  console.error(`\nFound ${totalViolations} internal link${totalViolations > 1 ? 's' : ''} missing a trailing slash.`);
  console.error('Run  pnpm lint:trailing-slash --fix  to auto-fix.\n');
  process.exit(1);
} else {
  console.log('All internal links have trailing slashes.');
}
