import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/*
 * CE QU'ISABELLE FAIT DEPUIS L'ADMINISTRATION DOIT SE DIRE.
 *
 * L'écran d'une séance appelait `release_booking` et `book_participant`
 * directement : la place partait ou se posait, et l'intéressé n'apprenait rien.
 * Le geste le plus courant de l'atelier était le seul muet — découvert en
 * replaçant quelqu'un d'une date de stage sur une autre, sans qu'il en soit
 * averti ni d'un côté ni de l'autre.
 *
 * Ces assertions lisent le texte de l'écran. C'est grossier, et c'est le prix
 * d'un défaut qui vit dans ce qu'on a OMIS d'écrire : aucun test de comportement
 * ne se plaint d'un courriel qu'on n'a jamais demandé.
 */
const ecran = readFileSync('src/pages/espace-membre/admin/seances/[id].astro', 'utf8');
const lignes = ecran.split('\n');

/** Cette ligne appelle-t-elle X, puis Y dans les quelques lignes qui suivent ? */
const suiviDe = (appel: string, annonce: string, portee = 16) =>
  lignes
    .map((l, i) => ({ l, i }))
    .filter(({ l }) => l.includes(appel))
    .map(({ i }) => ({
      ligne: i + 1,
      annonce: lignes.slice(Math.max(0, i - portee), i + portee).some((v) => v.includes(annonce)),
    }));

describe('l’écran d’une séance prévient de ce qu’il fait', () => {
  it('ne libère jamais une place sans passer par le chemin qui prévient', () => {
    // `libererPlace` porte le courriel de l'adhérent, l'avis à l'atelier et la
    // liste d'attente. L'appel direct les contournait tous les trois.
    expect(ecran).not.toMatch(/rpc\('release_booking'/);
    expect(ecran).toMatch(/libererPlace\(/);
  });

  it('annonce chaque place qu’il pose', () => {
    const poses = suiviDe("rpc('book_participant'", 'annoncerInscription');
    expect(poses.length, 'aucun appel trouvé : le test ne mesure plus rien').toBeGreaterThan(0);
    expect(poses.filter((p) => !p.annonce)).toEqual([]);
  });

  it('annonce aussi les dates d’un stage inscrit ou retiré en bloc', () => {
    // `book_stage` et `release_stage` rendent un nombre, pas des identifiants :
    // c'est `placesDuStage` qui donne les dates à quoi écrire, et pour un
    // retrait elle doit être lue AVANT que la libération pose ses pierres.
    expect(suiviDe("rpc('book_stage'", 'annoncerInscription').every((p) => p.annonce)).toBe(true);
    expect(suiviDe("rpc('release_stage'", 'annoncerLiberationDeStage').every((p) => p.annonce)).toBe(true);
    expect(ecran).toMatch(/const places = await placesDuStage\([\s\S]{0,400}?rpc\('release_stage'/);
  });
});
