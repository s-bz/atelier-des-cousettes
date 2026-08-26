import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { estNonIndexable, estHorsPlanDuSite } from '../hors-index';
import { footerLinks } from '../navLinks';
import { SERVICE_LINKS } from '../nav';

/*
 * UNE PAGE EN NOINDEX N'A RIEN À FAIRE AU PLAN DU SITE.
 *
 * Le plan du site dit à Google « viens voir ceci » ; la balise `robots` de la
 * page lui répond « ne me retiens pas ». Six adresses tenaient les deux
 * discours à la fois — le tunnel de paiement, ses écrans de retour et les
 * conditions de vente. La Search Console range cela sous « URL envoyée marquée
 * noindex », et chaque passage du robot sur ces pages est pris sur le budget
 * d'exploration des pages qui, elles, doivent remonter.
 *
 * La cause était que deux endroits décidaient séparément : la page réclamait
 * `noIndex` à `BaseLayout`, `astro.config.mjs` tenait sa propre liste. Rien ne
 * les reliait. `src/utils/hors-index.ts` est désormais la liste unique, et ce
 * test tient l'autre bout : il refuse qu'une page réclame `noIndex` sans y
 * figurer.
 *
 * IL BALAIE, IL NE NOMME PERSONNE. C'est la page qu'on ajoutera demain — un
 * nouveau tunnel, un nouvel écran de retour — qui est le cas dangereux, et un
 * test qui nomme ses cibles ne peut pas la trouver. D'où aussi les bornes
 * basses : un chemin devenu faux rendrait tout vert en ne lisant rien.
 */

const PAGES = 'src/pages';
const LAYOUTS = ['src/layouts', 'src/components'];

function fichiers(dossier: string, garder: (nom: string) => boolean): string[] {
  return readdirSync(dossier, { withFileTypes: true }).flatMap((e) => {
    const chemin = join(dossier, e.name);
    if (e.isDirectory()) return fichiers(chemin, garder);
    return garder(e.name) ? [chemin] : [];
  });
}

/** `src/pages/reserver/retour.astro` → `/reserver/retour/` */
function routeDe(chemin: string): string {
  const sansRacine = chemin.slice(`${PAGES}/`.length).replace(/\.astro$/, '');
  const sansIndex = sansRacine.replace(/(^|\/)index$/, '');
  return `/${sansIndex}${sansIndex.endsWith('/') || sansIndex === '' ? '' : '/'}`;
}

/**
 * Les gabarits qui posent `noindex` d'eux-mêmes.
 *
 * `AdminLayout.astro` le fait pour ses quinze écrans : une page qui l'emploie
 * est en noindex sans que le mot apparaisse chez elle. Le chercher plutôt que
 * le nommer, pour qu'un second gabarit du même genre soit vu tout seul.
 */
const gabaritsQuiPosentNoindex = LAYOUTS.flatMap((d) => fichiers(d, (n) => n.endsWith('.astro')))
  .filter((chemin) => /noIndex(=\{true\}|\s*\/?>|\s*$)/m.test(readFileSync(chemin, 'utf8')))
  .map((chemin) => chemin.split('/').pop()!.replace('.astro', ''));

const pages = fichiers(PAGES, (n) => n.endsWith('.astro')).map((chemin) => {
  const source = readFileSync(chemin, 'utf8');
  return {
    chemin,
    route: routeDe(chemin),
    // Soit la page réclame `noIndex` elle-même, soit elle passe par un gabarit
    // qui le pose pour elle.
    noindex: /\bnoIndex\b/.test(source)
      || gabaritsQuiPosentNoindex.some((g) => new RegExp(`<${g}[\\s>]`).test(source)),
  };
});

/** Les fichiers rendus pour les machines : `llms.txt.ts` → `/llms.txt`. */
const fichiersMachine = fichiers(PAGES, (n) => /\.(txt|md)\.ts$/.test(n))
  .map((chemin) => ({ chemin, route: `/${chemin.slice(`${PAGES}/`.length).replace(/\.ts$/, '')}` }));

describe('le plan du site n’annonce que des pages indexables', () => {
  const enNoindex = pages.filter((p) => p.noindex);

  it('trouve bien les pages à lire', () => {
    // Sans ces bornes, un chemin devenu faux laisserait tout le reste vert.
    expect(pages.length).toBeGreaterThanOrEqual(30);
    expect(enNoindex.length).toBeGreaterThanOrEqual(8);
    expect(fichiersMachine.length).toBeGreaterThanOrEqual(3);
    // Le gabarit d'administration pose `noindex` pour ses écrans : s'il cesse
    // d'être reconnu, quinze pages sortiraient du balayage sans bruit.
    expect(gabaritsQuiPosentNoindex).toContain('AdminLayout');
  });

  it('écarte du plan chaque page qui porte noindex', () => {
    const contradictoires = enNoindex
      .filter((p) => !estHorsPlanDuSite(p.route))
      .map((p) => `${p.chemin} → ${p.route}`);

    expect(
      contradictoires,
      'Ces pages disent « ne me retiens pas » et resteraient au plan du site. '
        + 'Ajoutez leur adresse à PAGES_NON_INDEXABLES dans src/utils/hors-index.ts.',
    ).toEqual([]);
  });

  it('écarte aussi les fichiers écrits pour les machines', () => {
    // Ils ne portent aucune balise `robots` : rien d'autre que cette liste ne
    // peut les tenir hors du plan.
    const oublies = fichiersMachine.filter((f) => !estHorsPlanDuSite(f.route)).map((f) => f.route);
    expect(oublies).toEqual([]);
  });

  it('n’étouffe aucune page que le site propose lui-même', () => {
    // L'autre sens de la même exigence. Une entrée trop large — `/reserver/`
    // au lieu de `/reserver/retour/`, `/conditions/` élargi en `/co` — mettrait
    // en noindex des pages qui doivent remonter. La navigation du site dit
    // lesquelles : ce qu'on offre en pied de page, on veut le voir indexé.
    const offertes = ['/', ...footerLinks.map((l) => l.href), ...SERVICE_LINKS.map((l) => l.href)];
    expect(offertes.length).toBeGreaterThanOrEqual(8);

    const etouffees = offertes.filter((route) => estHorsPlanDuSite(route));
    expect(etouffees).toEqual([]);
  });

  it('fait lire cette liste au plan du site, et à lui seul', () => {
    // Le filtre de `@astrojs/sitemap` doit s'appuyer sur `hors-index.ts`. Une
    // liste rivale rouvrirait exactement la brèche qu'on vient de fermer.
    const config = readFileSync('astro.config.mjs', 'utf8');
    expect(config).toMatch(/from '\.\/src\/utils\/hors-index'/);
    expect(config).toMatch(/filter:\s*\(page\)\s*=>\s*!estHorsPlanDuSite\(page\)/);
  });

  it('fait lire cette liste à la balise robots', () => {
    // L'autre usage de la liste unique : une adresse qui y figure est en
    // noindex même si la page a oublié de le demander.
    const layout = readFileSync('src/layouts/BaseLayout.astro', 'utf8');
    expect(layout).toMatch(/estNonIndexable/);
    expect(layout).toMatch(/name="robots" content=\{horsIndex \?/);
  });
});

describe('les adresses connues du plan du site', () => {
  // Les six adresses relevées en production le 26/08/2026 : au plan du site ET
  // en noindex. Elles ne prouvent rien que le balayage ne prouve déjà, mais
  // elles nomment le défaut pour qui lira ce fichier dans un an.
  const relevees = [
    '/ateliers-reguliers/inscription/',
    '/ateliers-reguliers/inscription/retour/',
    '/reserver/retour/',
    '/seances-sans-engagement/reserver/',
    '/stages-thematiques/reserver/',
    '/conditions/',
  ];

  it.each(relevees)('%s est en noindex, et donc hors du plan', (route) => {
    expect(estNonIndexable(route)).toBe(true);
    expect(estHorsPlanDuSite(route)).toBe(true);
  });
});
