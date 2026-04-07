// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import markdoc from '@astrojs/markdoc';
import keystatic from '@keystatic/astro';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://couture-tarn.fr',
  adapter: vercel(),
  integrations: [react(), markdoc(), keystatic(), sitemap({
    serialize(item) {
      // Set lastmod to today for all pages (content was recently redesigned)
      item.lastmod = new Date().toISOString();
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
