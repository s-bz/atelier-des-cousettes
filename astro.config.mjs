// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import markdoc from '@astrojs/markdoc';
import keystatic from '@keystatic/astro';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync, readdirSync } from 'node:fs';

/**
 * Les fichiers de contenu à embarquer dans la fonction Vercel.
 *
 * `src/utils/reader.ts` construit un lecteur Keystatic sur le SYSTÈME DE FICHIERS,
 * à partir de `process.cwd()`. À la construction, c'est la racine du dépôt et tout
 * est là. À l'exécution dans la fonction, c'est la racine de la fonction — où rien
 * de `src/content/` n'était copié.
 *
 * Les pages prérendues ne s'en apercevaient pas : le lecteur n'y tourne qu'à la
 * construction. Mais toute page rendue à la requête récoltait `null`, avec deux
 * conséquences bien différentes selon la manière dont le code s'y attendait :
 * les pages /apercu/ levaient une erreur — 500 sans type de contenu, que le
 * navigateur mobile proposait de télécharger — tandis que Footer.astro et
 * ContactCTA.astro, qui écrivent `settings?.email`, se dégradaient en silence.
 * Le pied de page de tout l'espace membre avait ainsi perdu l'e-mail, les
 * téléphones et les liens d'Isabelle, sans que rien ne le signale.
 *
 * includeFiles ne développe pas les jokers : chaque entrée passe par `new URL()`.
 * D'où cette énumération, générée et non écrite à la main — un fichier ajouté
 * depuis le CMS doit suivre sans que personne ait à y penser.
 *
 * @param {string} dir
 * @returns {string[]} chemins relatifs à la racine du projet
 */
function contenuKeystatic(dir = 'src/content') {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const chemin = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return contenuKeystatic(chemin);
    return /\.(yaml|mdoc)$/.test(entry.name) ? [chemin] : [];
  });
}

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
  adapter: vercel({ includeFiles: contenuKeystatic() }),
  integrations: [react(), markdoc(), keystatic(), sitemap({
    // Les pages d'aperçu sont des doublons en cours de validation : elles
    // affichent le même contenu que les pages publiées, à partir de la base.
    // Les laisser dans le plan du site les ferait indexer comme du contenu
    // dupliqué, et une page d'essai pourrait sortir en résultat de recherche
    // avant la page réelle. Le noindex de chacune est la seconde barrière.
    filter: (page) => !page.includes('/apercu/'),
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
