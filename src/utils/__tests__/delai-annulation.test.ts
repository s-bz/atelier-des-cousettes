import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/*
 * LE DÉLAI D'ANNULATION SE DIT À DEUX ENDROITS, ET UN SEUL FACTURE.
 *
 * La base retient le crédit d'un désistement tardif ; l'écran du planning
 * prévient AVANT le clic, parce que l'apprendre après porterait sur de
 * l'argent. Le seuil vit donc en double : `interval '...'` dans une migration,
 * et une soustraction de millisecondes dans `planning.astro`.
 *
 * `20260824240000_delai_annulation_dix_jours` a fait passer la base de 48 h à
 * 10 jours. L'écran, lui, est resté à 48 h — son commentaire et le texte qu'il
 * affiche disaient pourtant « moins de 10 jours ». Résultat : entre 10 jours et
 * 48 h, l'avertissement ne s'affichait pas et la séance était retenue quand
 * même. Exactement la mauvaise surprise que l'avertissement existe pour éviter.
 *
 * Ce test ne fige aucun nombre : il LIT le délai dans la migration la plus
 * récente qui le déclare, et exige que les écrans disent la même chose. Changer
 * le délai en base suffira donc à faire échouer le front resté en arrière —
 * ce qui est l'ordre dans lequel la panne est arrivée.
 *
 * Il balaie tous les écrans de l'espace membre plutôt que de nommer
 * `planning.astro` : un écran jumeau qui porterait le même bouton est le cas
 * dangereux, et un test qui nomme sa cible ne peut pas le trouver.
 */

const MIGRATIONS = 'supabase/migrations';
const ESPACE_MEMBRE = 'src/pages/espace-membre';

const MS = { hour: 3600e3, hours: 3600e3, day: 86400e3, days: 86400e3 } as const;

/** Le délai que la base applique, lu dans la DERNIÈRE migration qui le déclare. */
function delaiDeLaBase(): { ms: number; source: string } {
  const candidates = readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith('.sql'))
    .sort() // l'horodatage en tête de nom fait l'ordre chronologique
    .reverse();

  for (const fichier of candidates) {
    const source = readFileSync(join(MIGRATIONS, fichier), 'utf8');
    // La ligne qui décide, et elle seule : `v_tardif := ... interval '10 days'`
    const ligne = source.split('\n').find((l) => l.includes('v_tardif') && l.includes('interval'));
    if (!ligne) continue;
    const m = ligne.match(/interval\s+'(\d+)\s+(hours?|days?)'/);
    if (!m) continue;
    return { ms: Number(m[1]) * MS[m[2] as keyof typeof MS], source: fichier };
  }
  throw new Error('Aucune migration ne déclare le délai de désistement tardif.');
}

function ecrans(dossier = ESPACE_MEMBRE): string[] {
  return readdirSync(dossier, { withFileTypes: true }).flatMap((e) => {
    const chemin = join(dossier, e.name);
    if (e.isDirectory()) return ecrans(chemin);
    return e.name.endsWith('.astro') ? [chemin] : [];
  });
}

/** Les seuils codés en dur dans les écrans, en millisecondes. */
function seuilsDesEcrans() {
  return ecrans().flatMap((chemin) => {
    const lignes = readFileSync(chemin, 'utf8').split('\n');
    return lignes
      .map((ligne, i) => ({ ligne, ligneNo: i + 1 }))
      .filter(({ ligne }) => /const\s+tardif\s*=/.test(ligne))
      .map(({ ligne, ligneNo }) => {
        // Le membre de droite de la comparaison : `... < 10 * 24 * 3600e3;`
        const m = ligne.match(/<\s*([\d\s*.e+]+?)\s*;/);
        if (!m) return { chemin, ligneNo, ms: null as number | null, brut: ligne.trim() };
        const expr = m[1].trim();
        // Arithmétique purement numérique — rien d'autre n'est évalué.
        if (!/^[\d\s*.e+]+$/.test(expr)) return { chemin, ligneNo, ms: null, brut: expr };
        return { chemin, ligneNo, ms: Number(Function(`"use strict";return(${expr})`)()), brut: expr };
      });
  });
}

describe('le délai d’annulation annoncé est celui que la base applique', () => {
  const base = delaiDeLaBase();
  const seuils = seuilsDesEcrans();

  it('trouve bien le délai en base et les écrans qui l’affichent', () => {
    // Sans ces bornes, un chemin devenu faux rendrait l'assertion suivante
    // verte en ne lisant rien — la panne se rejouerait sous un test au vert.
    expect(base.ms).toBeGreaterThan(0);
    expect(seuils.length).toBeGreaterThanOrEqual(1);
    expect(seuils.every((s) => s.ms !== null)).toBe(true);
  });

  it('n’avertit jamais plus tard que la base ne retient le crédit', () => {
    const desaccords = seuils
      .filter((s) => s.ms !== base.ms)
      .map((s) => `${s.chemin}:${s.ligneNo} annonce ${s.brut} (${s.ms} ms) au lieu de ${base.ms} ms`);

    expect(
      desaccords,
      `Le délai fait foi dans ${base.source} : ${base.ms} ms. Les écrans doivent le suivre.`,
    ).toEqual([]);
  });
});
