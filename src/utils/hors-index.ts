/**
 * CE QUI NE S'INDEXE PAS, ÉCRIT UNE SEULE FOIS.
 *
 * Deux endroits décidaient séparément du même sujet : `BaseLayout.astro` posait
 * `noindex` quand la page le lui demandait, et `astro.config.mjs` tenait sa
 * propre liste d'adresses à écarter du plan du site. Rien ne les reliait, et
 * elles ont divergé : six adresses étaient AU PLAN DU SITE ET EN NOINDEX à la
 * fois — les cinq écrans du tunnel de paiement et les conditions de vente.
 *
 * Le signal envoyé à Google est contradictoire : le plan du site dit « viens
 * voir », la page dit « ne retiens pas ». La Search Console le range sous
 * « URL envoyée marquée noindex », et chaque passage du robot sur ces pages est
 * pris sur le budget d'exploration des pages qui, elles, doivent remonter.
 *
 * D'où cette liste unique. Elle sert aux DEUX usages :
 *  - `BaseLayout.astro` en tire la balise `robots` — une adresse listée ici est
 *    en `noindex` même si la page a oublié de le demander ;
 *  - `astro.config.mjs` en tire le filtre du plan du site.
 *
 * Une page ne peut donc plus être en noindex sans sortir du plan : c'est la
 * même phrase qui produit les deux. `plan-du-site.test.ts` tient l'autre bout,
 * en refusant qu'une page réclame `noIndex` sans figurer ici.
 *
 * AUCUNE DE CES ADRESSES NE DISPARAÎT : elles répondent comme avant, et gardent
 * leurs liens — le pied de page mène toujours aux mentions légales, le tunnel
 * de paiement s'ouvre toujours depuis les pages de service.
 */

/**
 * Les pages que la recherche ne doit pas retenir. Préfixes de chemin : tout ce
 * qui est dessous en hérite.
 */
export const PAGES_NON_INDEXABLES = [
  // Le tunnel de paiement et les écrans de retour. Ils n'existent que pour
  // quelqu'un qui vient de cliquer « réserver » : hors de ce parcours, ils ne
  // disent rien, et une arrivée depuis Google y tomberait sans contexte.
  '/ateliers-reguliers/inscription/',
  '/seances-sans-engagement/reserver/',
  '/stages-thematiques/reserver/',
  '/reserver/retour/',

  // L'espace membre : douze adresses, dont les neuf écrans d'administration.
  // Pour un visiteur anonyme — donc pour Google — toutes répondent 302 vers la
  // connexion. La connexion elle-même répond 200 ; elle demeure la page
  // d'accueil déclarée pour la validation OAuth de Google, qui ne dépend pas du
  // plan du site.
  '/espace-membre/',

  // Les pages légales et contractuelles. Elles n'ont rien à dire à une
  // recherche, et leur texte est le même que sur mille autres sites.
  '/mentions-legales/',
  '/confidentialite/',
  '/conditions/',

  // Une page d'erreur n'a rien à faire dans un index de recherche.
  '/404/',
];

/**
 * Les fichiers écrits pour les machines.
 *
 * Ils sortent du plan du site pour une autre raison que les pages ci-dessus :
 * ce ne sont pas des pages, ils ne portent aucune balise `robots`, et les
 * annoncer inviterait Google à indexer des textes bruts qui répètent sans mise
 * en page ce que les pages disent déjà — le doublon exact qu'une balise
 * canonique sert d'ordinaire à éviter. Les robots qui les lisent vont les
 * chercher à une adresse convenue, pas dans un plan de site.
 */
export const FICHIERS_POUR_MACHINES = [
  '/llms.txt',
  '/llms-full.txt',
  '/tarifs.md',
  '/dates.md',
];

/** Le chemin seul, avec sa barre oblique finale quand c'est une page. */
function chemin(cible: string): string {
  const brut = cible.startsWith('http') ? new URL(cible).pathname : cible;
  const dernier = brut.split('/').pop() ?? '';
  if (dernier.includes('.')) return brut; // un fichier : `/llms.txt`, `/tarifs.md`
  return brut.endsWith('/') ? brut : `${brut}/`;
}

function figureDans(liste: string[], cible: string): boolean {
  const p = chemin(cible);
  return liste.some((route) => p === route || p.startsWith(route));
}

/**
 * Cette adresse porte-t-elle `noindex` ? Lu par `BaseLayout.astro`.
 *
 * Accepte un chemin (`/conditions/`) ou une adresse complète.
 */
export function estNonIndexable(cible: string): boolean {
  return figureDans(PAGES_NON_INDEXABLES, cible);
}

/**
 * Cette adresse doit-elle rester hors du plan du site ? Lu par le filtre de
 * `@astrojs/sitemap`, dans `astro.config.mjs`.
 *
 * Tout ce qui est en `noindex` en fait partie — c'est le lien qu'on cherchait.
 */
export function estHorsPlanDuSite(cible: string): boolean {
  return estNonIndexable(cible) || figureDans(FICHIERS_POUR_MACHINES, cible);
}
