// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import markdoc from '@astrojs/markdoc';
import keystatic from '@keystatic/astro';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync, readdirSync } from 'node:fs';
import { toSlug } from './src/utils/strings';

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
 * les pages lues en base levaient une erreur — 500 sans type de contenu, que le
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

/**
 * Les pages écartées du plan du site.
 *
 * Une seule règle les réunit : AUCUNE N'EST INDEXABLE. Les y laisser demandait
 * à Google de venir voir des pages qu'on lui interdit de retenir — la Search
 * Console le signale comme « URL envoyée marquée noindex ». Le plan du site est
 * une invitation à explorer, pas un inventaire de ce qui existe.
 *
 * Aucune ne devient pour autant inaccessible : elles répondent comme avant, et
 * les mentions légales gardent leur lien en pied de page.
 */
/**
 * Les fiches de stage, ajoutées au plan du site à la main.
 *
 * ELLES SONT RENDUES À LA REQUÊTE — elles lisent les dates en base — et
 * `@astrojs/sitemap` ne voit que les routes prérendues. Sans cette liste, six
 * pages neuves n'existeraient pour Google que par les liens du moyeu, ce qui
 * les ferait découvrir tard et indexer plus tard encore.
 *
 * La liste vient du CMS et non de la base : le plan du site se construit sans
 * réseau ni identifiants, et le contenu porte déjà le nom de chaque stage. Ce
 * nom est celui qui fait la jointure avec la base — c'est écrit dans le
 * formulaire Keystatic — donc `toSlug` y donne la même adresse des deux côtés.
 *
 * Un stage renommé d'un seul côté sortirait du plan et se signalerait par une
 * redirection vers le moyeu, ce qui se voit dans la Search Console.
 */
function fichesDeStage() {
  const yaml = readFileSync('src/content/pages/stages-thematiques/index.yaml', 'utf8');
  const noms = [...yaml.matchAll(/^  - name:\s*(.+)$/gm)].map((m) => m[1].trim());
  return noms.map((nom) => `${SITE}/stages-thematiques/${toSlug(nom)}/`);
}

const HORS_PLAN = [
  // Douze adresses, dont les neuf écrans d'administration. Pour un visiteur
  // anonyme — donc pour Google — toutes répondent 302 vers la connexion.
  // La connexion elle-même répond 200 mais porte `noIndex` ; elle demeure la
  // page d'accueil déclarée pour la validation OAuth de Google, qui ne dépend
  // pas du plan du site.
  '/espace-membre/',
  // Marquées `noIndex` de longue date : elles n'ont rien à dire à une recherche.
  '/mentions-legales/',
  '/confidentialite/',
  // Les trois fichiers écrits pour les machines. Ils ne sont pas des pages : les
  // annoncer au plan du site inviterait Google à indexer trois textes bruts qui
  // répètent, sans mise en page, ce que les pages disent déjà — le doublon exact
  // qu'une balise canonique sert d'ordinaire à éviter. Les robots qui les lisent
  // vont les chercher à une adresse convenue, pas dans un plan de site.
  '/llms.txt',
  '/llms-full.txt',
  '/tarifs.md',
];

// https://astro.build/config
export default defineConfig({
  site: SITE,
  adapter: vercel({ includeFiles: contenuKeystatic() }),
  integrations: [react(), markdoc(), keystatic(), sitemap({
    customPages: fichesDeStage(),
    filter: (page) => !HORS_PLAN.some((motif) => page.includes(motif)),
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
