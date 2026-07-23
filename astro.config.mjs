// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import markdoc from '@astrojs/markdoc';
import keystatic from '@keystatic/astro';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync, readdirSync } from 'node:fs';

// Real lastmod per blog post from Keystatic frontmatter. A build-date lastmod
// on every URL gets discounted by Google as noise (the daily rebuild would
// stamp all pages "modified today", every day); honest dates on posts and no
// lastmod elsewhere is the crawl-priority signal search engines actually use.
// Canonical production origin. Single source of truth: the sitemap keys below
// and the `site` field must always agree, or blog lastmods silently drop out.
const SITE = 'https://atelier-des-cousettes.fr';

/** @type {Map<string, string>} */
const blogLastmod = new Map();
for (const entry of readdirSync('src/content/blog', { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const frontmatter = readFileSync(`src/content/blog/${entry.name}/index.mdoc`, 'utf8');
  const date = frontmatter.match(/^lastModified:\s*'?([\d-]+)'?/m)?.[1]
    ?? frontmatter.match(/^publishDate:\s*'?([\d-]+)'?/m)?.[1];
  if (date) blogLastmod.set(`${SITE}/blog/${entry.name}/`, date);
}

// https://astro.build/config
export default defineConfig({
  site: SITE,
  adapter: vercel(),
  integrations: [react(), markdoc(), keystatic(), sitemap({
    serialize(item) {
      const lastmod = blogLastmod.get(item.url);
      if (lastmod) item.lastmod = lastmod;
      else delete item.lastmod;
      return item;
    },
  })],
  vite: {
    build: {
      chunkSizeWarningLimit: 5000,
    },
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        '@keystatic/core',
        '@keystatic/core/ui',
      ],
    },
    resolve: {
      dedupe: ['react', 'react-dom'],
    },
  },
});
