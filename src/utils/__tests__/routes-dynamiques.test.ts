import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/*
 * UNE ADRESSE QUI NE MÈNE À RIEN DOIT LE DIRE DÉFINITIVEMENT.
 *
 * `/stages-thematiques/<slug inconnu>/` répondait 302 vers le moyeu. Une 302
 * dit à Google « temporaire, repasse voir » : l'adresse ne sort jamais de la
 * file d'attente. C'est un soft 404, et la Search Console le range comme tel.
 *
 * Deux adresses y dormaient — `/stages-thematiques/stage-patronage/` et
 * `/stages-thematiques/stage-decouverte-de-la-couture/` — toutes deux
 * « découvertes, actuellement non indexées », alors qu'AUCUNE n'a jamais
 * existé : elles sont nées de fautes de frappe dans le champ « stage » de dix
 * fiches du glossaire. Google les avait trouvées par ces liens, et la 302
 * l'empêchait de les oublier.
 *
 * POURQUOI CE TEST NE NOMME PAS `[stage].astro`. Le commentaire qu'il a
 * remplacé affirmait s'aligner sur le blog — « c'est ce que fait déjà le
 * blog ». C'était faux, et personne ne pouvait le voir : `/blog/[slug].astro`
 * porte bien un `Astro.redirect`, mais la route est PRÉRENDUE, donc la ligne ne
 * s'exécute jamais et un slug absent y répond 404. Une croyance fausse sur une
 * route voisine a produit le défaut sur celle-ci. Le test lit donc TOUTES les
 * routes dynamiques publiques, et vérifie l'invariant plutôt que le fichier.
 *
 * L'INVARIANT : une route dynamique publique répond à un slug inconnu soit par
 * une 404 (c'est gratuit quand elle est prérendue : le fichier n'existe pas),
 * soit par une redirection PERMANENTE. Jamais par une redirection temporaire.
 *
 * Les écrans d'administration sont exclus, et ce n'est pas un oubli : leurs
 * redirections suivent une action — « supprimé », puis retour à la liste — et
 * une 302 y est le bon code. Ils sont d'ailleurs en `noindex`, donc hors de
 * portée de ce que ce test protège.
 */

const RACINE = 'src/pages';

/** Les écrans qui ne s'adressent pas au public, et dont les 302 sont légitimes. */
const PRIVÉ = ['/espace-membre/', '/api/'];

function routes(dossier = RACINE): string[] {
  return readdirSync(dossier, { withFileTypes: true }).flatMap((e) => {
    const chemin = join(dossier, e.name);
    if (e.isDirectory()) return routes(chemin);
    return e.name.endsWith('.astro') ? [chemin] : [];
  });
}

/** `src/pages/stages-thematiques/[stage].astro` → `/stages-thematiques/[stage]/` */
const versRoute = (chemin: string) =>
  `${chemin.slice(RACINE.length).replace(/\.astro$/, '').replace(/\/index$/, '')}/`;

const dynamiquesPubliques = routes()
  .filter((c) => /\[[^\]]+\]/.test(c))
  .map((chemin) => ({ chemin, route: versRoute(chemin), source: readFileSync(chemin, 'utf8') }))
  .filter(({ route }) => !PRIVÉ.some((p) => route.startsWith(p)));

/** Les `Astro.redirect(...)` d'un fichier, avec leur numéro de ligne. */
function redirections(source: string) {
  return source
    .split('\n')
    .map((ligne, i) => ({ ligne: ligne.trim(), no: i + 1 }))
    .filter(({ ligne }) => ligne.includes('Astro.redirect('));
}

/** Une redirection porte-t-elle un code permanent (301 ou 308) ? */
const estPermanente = (ligne: string) => /Astro\.redirect\([^)]*,\s*30[18]\s*\)/.test(ligne);

const estPrerendue = (source: string) => /export const prerender = false/.test(source) === false;

describe('les routes dynamiques publiques', () => {
  it('trouve bien les routes à lire', () => {
    // Sans cette borne, un chemin devenu faux rendrait l'assertion suivante
    // verte en ne lisant rien — le défaut se rejouerait sous un test au vert.
    expect(dynamiquesPubliques.length).toBeGreaterThanOrEqual(3);
    const routesLues = dynamiquesPubliques.map((d) => d.route);
    expect(routesLues).toContain('/blog/[slug]/');
    expect(routesLues).toContain('/glossaire/[terme]/');
    expect(routesLues).toContain('/stages-thematiques/[stage]/');
  });

  it('ne renvoie jamais un slug inconnu par une redirection temporaire', () => {
    const fautives = dynamiquesPubliques
      .filter(({ source }) => !estPrerendue(source))
      .flatMap(({ chemin, source }) =>
        redirections(source)
          .filter(({ ligne }) => !estPermanente(ligne))
          .map(({ no, ligne }) => `${chemin}:${no} → ${ligne}`),
      );

    expect(
      fautives,
      'Une redirection temporaire sur une route publique dit à Google de garder '
        + "l'adresse en file indéfiniment. Passez-la en 301, ou laissez la route "
        + 'prérendue répondre 404.',
    ).toEqual([]);
  });

  /*
   * L'AUTRE MOITIÉ DE L'INVARIANT, et celle qui a menti.
   *
   * Une route prérendue répond 404 d'elle-même sur un slug absent : son
   * `Astro.redirect` ne s'exécute pas. Le garder n'est pas une faute, mais il
   * se lit comme un comportement réel — c'est exactement la lecture qui a
   * produit la 302 sur les stages. Le test constate donc l'état des lieux, pour
   * que la prochaine personne le voie écrit.
   */
  it('sait lesquelles répondent 404 sans rien faire', () => {
    const prerendues = dynamiquesPubliques.filter(({ source }) => estPrerendue(source));
    expect(prerendues.length).toBeGreaterThanOrEqual(2);
    for (const { chemin, source } of prerendues) {
      const mortes = redirections(source);
      if (mortes.length === 0) continue;
      // Si cette route passe un jour en `prerender = false`, ces lignes
      // deviendront de vraies 302 — et l'assertion précédente les attrapera.
      expect(/export const prerender = false/.test(source)).toBe(false);
      expect(chemin).toBeTruthy();
    }
  });
});
