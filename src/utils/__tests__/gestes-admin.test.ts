import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/*
 * CE QU'ISABELLE FAIT DEPUIS L'ADMINISTRATION DOIT SE DIRE.
 *
 * Les écrans d'administration appelaient `release_booking` et `book_participant`
 * directement : la place partait ou se posait, et l'intéressé n'apprenait rien.
 * Le geste le plus courant de l'atelier était le seul muet.
 *
 * LA PREMIÈRE VERSION DE CE TEST NE LISAIT QU'UN ÉCRAN — celui d'une séance,
 * le seul qu'on venait de corriger. La fiche d'un participant portait le même
 * bouton, et la libération suivante est repartie muette. Il lit donc désormais
 * TOUS les écrans : c'est l'écran non corrigé qui est le cas dangereux, et un
 * test nommant sa cible ne peut pas le trouver.
 *
 * Ces assertions lisent du texte. C'est grossier, et c'est le prix d'un défaut
 * qui vit dans ce qu'on a OMIS d'écrire : aucun test de comportement ne se
 * plaint d'un courriel qu'on n'a jamais demandé.
 */
const RACINE = 'src/pages/espace-membre/admin';

function ecrans(dossier = RACINE): string[] {
  return readdirSync(dossier, { withFileTypes: true }).flatMap((e) => {
    const chemin = join(dossier, e.name);
    if (e.isDirectory()) return ecrans(chemin);
    return e.name.endsWith('.astro') ? [chemin] : [];
  });
}

const tous = ecrans().map((chemin) => ({ chemin, source: readFileSync(chemin, 'utf8') }));

/** Les appels à `appel` que n'accompagne pas `annonce`, dans les lignes voisines. */
function sansAnnonce(source: string, appel: string, annonce: string, portee = 16) {
  const lignes = source.split('\n');
  return lignes
    .map((l, i) => ({ l, i }))
    .filter(({ l }) => l.includes(appel))
    .filter(({ i }) => !lignes.slice(Math.max(0, i - portee), i + portee).some((v) => v.includes(annonce)))
    .map(({ i }) => i + 1);
}

describe('les écrans d’administration préviennent de ce qu’ils font', () => {
  it('trouve bien les écrans à lire', () => {
    // Sans cette borne, un chemin devenu faux rendrait toutes les autres
    // assertions vertes en ne lisant rien.
    expect(tous.length).toBeGreaterThanOrEqual(5);
    expect(tous.some((e) => e.chemin.includes('seances/[id]'))).toBe(true);
    expect(tous.some((e) => e.chemin.includes('participants/[id]'))).toBe(true);
  });

  it('ne libère jamais une place sans passer par le chemin qui prévient', () => {
    // `libererPlace` porte le courriel de l'adhérent, l'avis à l'atelier et la
    // liste d'attente. L'appel direct les contournait tous les trois.
    const fautifs = tous
      .filter((e) => /rpc\('release_booking'/.test(e.source))
      .map((e) => e.chemin);
    expect(fautifs).toEqual([]);
  });

  it('annonce chaque place qu’il pose', () => {
    const fautifs = tous.flatMap((e) =>
      sansAnnonce(e.source, "rpc('book_participant'", 'annoncerInscription')
        .map((ligne) => `${e.chemin}:${ligne}`),
    );
    expect(fautifs).toEqual([]);
  });

  it('annonce aussi les dates d’un stage inscrit ou retiré en bloc', () => {
    // `book_stage` et `release_stage` rendent un nombre, pas des identifiants :
    // c'est `placesDuStage` qui donne les dates à quoi écrire, et pour un
    // retrait elle doit être lue AVANT que la libération pose ses pierres.
    const fautifs = tous.flatMap((e) => [
      ...sansAnnonce(e.source, "rpc('book_stage'", 'annoncerInscription'),
      ...sansAnnonce(e.source, "rpc('release_stage'", 'annoncerLiberationDeStage'),
    ].map((ligne) => `${e.chemin}:${ligne}`));
    expect(fautifs).toEqual([]);

    const stages = tous.find((e) => e.chemin.includes('seances/[id]'))!.source;
    expect(stages).toMatch(/const places = await placesDuStage\([\s\S]{0,400}?rpc\('release_stage'/);
  });

  it('ne promet plus qu’aucun message n’est parti', () => {
    // La fiche d'un participant l'écrivait noir sur blanc — c'était vrai, et
    // ça ne l'est plus. Une phrase fausse à l'écran vaut un courriel manquant.
    for (const { chemin, source } of tous) {
      expect(source, chemin).not.toMatch(/Aucun message n’a été envoyé/);
    }
  });
});
