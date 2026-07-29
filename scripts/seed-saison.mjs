/**
 * Reporte le calendrier 2025-2026 du site sur la saison 2026-2027.
 *
 *   node --env-file=.env.local scripts/seed-saison.mjs          # aperçu
 *   node --env-file=.env.local scripts/seed-saison.mjs --creer  # création
 *
 * La règle de report est le JOUR DE LA SEMAINE et son RANG DANS LE MOIS, pas la
 * date. Le 18 septembre 2025 est le 3ᵉ jeudi de septembre ; il devient le 3ᵉ
 * jeudi de septembre 2026, soit le 17. Reporter la date telle quelle donnerait
 * un vendredi, et l'atelier du jeudi tomberait un jour où il n'a pas lieu.
 *
 * Les dates viennent du contenu du site, saisi à la main par Isabelle : elles
 * sont donc la meilleure source disponible, mais elles restent un point de
 * départ à corriger dans l'écran des séances — vacances scolaires et
 * indisponibilités ne s'en déduisent pas.
 */
import { createClient } from '@supabase/supabase-js';

const CRENEAUX = {
  'atelier-du-mardi-apres-midi': {
    9: [23], 10: [14], 11: [4], 12: [16],
    1: [13], 2: [10], 3: [10], 4: [14], 5: [19], 6: [9],
  },
  'atelier-du-jeudi-apres-midi': {
    9: [18], 10: [2, 9], 11: [6, 20], 12: [4, 18],
    1: [8, 22], 2: [5, 19], 3: [12, 26], 4: [2, 16], 5: [7, 21], 6: [4, 18],
  },
  'atelier-du-jeudi-fin-de-journee': {
    9: [18], 10: [2, 9], 11: [6, 20], 12: [4, 18],
    1: [8, 22], 2: [5, 19], 3: [12, 26], 4: [2, 16], 5: [7, 21], 6: [4, 18],
  },
  'atelier-du-samedi-matin': {
    10: [4, 25], 11: [29], 12: [20],
    1: [31], 2: [21], 3: [21], 4: [18], 5: [9], 6: [6],
  },
  'atelier-du-samedi-apres-midi': {
    9: [13, 27], 10: [4, 11], 11: [8, 22], 12: [13, 20],
    1: [24, 31], 2: [7, 21], 3: [14, 28], 4: [11, 18], 5: [9, 30], 6: [6, 27],
  },
  'ateliers-enfants-samedi': {
    9: [13, 27], 10: [11], 11: [8, 22], 12: [13],
    1: [10, 24], 2: [7, 14], 3: [14, 28], 4: [4, 11], 5: [30], 6: [27],
  },
  // « Atelier de Verdalle » n'a pas de dates publiées — « Me contacter ».
};

const SAISON_SOURCE = { debut: 2025, fin: 2026 };
const SAISON_CIBLE = { debut: 2026, fin: 2027 };

const annee = (mois, saison) => (mois >= 9 ? saison.debut : saison.fin);

/** Jour de la semaine (0 = dimanche) et rang de ce jour dans son mois. */
function jourEtRang(annee, mois, jour) {
  const d = new Date(Date.UTC(annee, mois - 1, jour));
  return { jour: d.getUTCDay(), rang: Math.ceil(jour / 7) };
}

/**
 * n-ième `jourSemaine` du mois. Si le mois n'en compte pas autant — un 5ᵉ jeudi
 * qui n'existe pas — on prend le dernier, plutôt que de déborder sur le mois
 * suivant et de placer une séance là où personne ne l'attend.
 */
function nieme(annee, mois, jourSemaine, rang) {
  const premier = new Date(Date.UTC(annee, mois - 1, 1)).getUTCDay();
  let jour = 1 + ((jourSemaine - premier + 7) % 7) + (rang - 1) * 7;
  const dansLeMois = new Date(Date.UTC(annee, mois, 0)).getUTCDate();
  while (jour > dansLeMois) jour -= 7;
  return jour;
}

const NOMS_JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const NOMS_MOIS = ['', 'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
                   'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

const creer = process.argv.includes('--creer');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } },
);

let totalPrevu = 0;
let totalCree = 0;

for (const [creneau, moisJours] of Object.entries(CRENEAUX)) {
  const dates = [];
  const apercu = [];

  // Ordre de saison : septembre d'abord, juin en dernier.
  const moisOrdonnes = Object.keys(moisJours)
    .map(Number)
    .sort((a, b) => (a >= 9 ? a - 9 : a + 3) - (b >= 9 ? b - 9 : b + 3));

  for (const mois of moisOrdonnes) {
    for (const jourSource of moisJours[mois]) {
      const anneeSource = annee(mois, SAISON_SOURCE);
      const anneeCible = annee(mois, SAISON_CIBLE);
      const { jour, rang } = jourEtRang(anneeSource, mois, jourSource);
      const jourCible = nieme(anneeCible, mois, jour, rang);

      dates.push(`${anneeCible}-${String(mois).padStart(2, '0')}-${String(jourCible).padStart(2, '0')}`);
      apercu.push(
        `    ${NOMS_JOURS[jour]} ${String(jourSource).padStart(2)} ${NOMS_MOIS[mois]} ${anneeSource}` +
        `  →  ${NOMS_JOURS[jour]} ${String(jourCible).padStart(2)} ${NOMS_MOIS[mois]} ${anneeCible}`,
      );
    }
  }

  console.log(`\n${creneau} — ${dates.length} séances`);
  apercu.forEach((l) => console.log(l));
  totalPrevu += dates.length;

  if (creer) {
    const { data, error } = await supabase.rpc('create_sessions', {
      p_creneau: creneau,
      p_dates: dates,
    });
    if (error) {
      console.error(`    ✗ ${error.message}`);
    } else {
      totalCree += data ?? 0;
      const ignorees = dates.length - (data ?? 0);
      console.log(`    → ${data} créée(s)${ignorees ? `, ${ignorees} déjà présente(s)` : ''}`);
    }
  }
}

console.log(
  creer
    ? `\n${totalCree} séances créées sur ${totalPrevu} prévues.`
    : `\n${totalPrevu} séances seraient créées. Relancer avec --creer pour les enregistrer.`,
);
