import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * TOUTE PAGE QUI LIT `Astro.locals.account` DOIT ÊTRE VUE PAR LE MIDDLEWARE.
 *
 * `onRequest` sort immédiatement hors de `/espace-membre` : les pages
 * publiques sont prérendues, et il s'y exécuterait au build, sans requête.
 * Les pages d'achat font exception — elles sont rendues à la demande — et sont
 * nommées une par une.
 *
 * CETTE LISTE S'OUBLIE. Deux fois : à l'ajout des pages de réservation, puis à
 * celui de l'inscription aux ateliers. Le symptôme trompe — la page affiche
 * « Déjà venu ? Connectez-vous » à quelqu'un qui l'est, et rien n'échoue. Ce
 * test relie les deux bouts pour que l'oubli se voie ici plutôt qu'à l'écran.
 */

const RACINE = 'src/pages';

function fichiers(dossier: string): string[] {
  return readdirSync(dossier).flatMap((entree) => {
    const chemin = join(dossier, entree);
    return statSync(chemin).isDirectory() ? fichiers(chemin) : [chemin];
  });
}

/** `src/pages/a/b.astro` → `/a/b` ; un `index` disparaît, comme au routage. */
const routeDe = (chemin: string) =>
  chemin.replace(/^src\/pages/, '').replace(/\.astro$/, '').replace(/\/index$/, '');

describe('le middleware voit les pages qui en dépendent', () => {
  it('aucune page publique ne lit locals.account sans y être déclarée', () => {
    const middleware = readFileSync('src/middleware.ts', 'utf8');
    // Seuls les chemins : les commentaires français du bloc sont pleins
    // d'apostrophes, que « '...' » prendrait pour des chaînes.
    const bloc = middleware.slice(middleware.indexOf('const ACHAT'));
    const declarees = [...bloc.slice(0, bloc.indexOf(']')).matchAll(/'(\/[^']*)'/g)].map((m) => m[1]);

    const oubliees = fichiers(RACINE)
      .filter((f) => f.endsWith('.astro'))
      .filter((f) => readFileSync(f, 'utf8').includes('Astro.locals.account'))
      .map(routeDe)
      .filter((route) => !route.startsWith('/espace-membre'))
      .filter((route) => !declarees.includes(route));

    expect(oubliees, `pages à ajouter à ACHAT dans src/middleware.ts : ${oubliees.join(', ')}`)
      .toEqual([]);
  });

  it('rien n’est déclaré en trop', () => {
    // Une entrée qui ne correspond plus à aucune page fait croire à une
    // couverture qui n'existe pas.
    const middleware = readFileSync('src/middleware.ts', 'utf8');
    // Seuls les chemins : les commentaires français du bloc sont pleins
    // d'apostrophes, que « '...' » prendrait pour des chaînes.
    const bloc = middleware.slice(middleware.indexOf('const ACHAT'));
    const declarees = [...bloc.slice(0, bloc.indexOf(']')).matchAll(/'(\/[^']*)'/g)].map((m) => m[1]);

    const routes = fichiers(RACINE).filter((f) => f.endsWith('.astro')).map(routeDe);
    expect(declarees.filter((d) => !routes.includes(d))).toEqual([]);
  });
});
