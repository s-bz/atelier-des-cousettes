/**
 * Reporte les stages 2025-2026 du site sur la saison 2026-2027.
 *
 *   node --env-file=.env.local scripts/seed-stages.mjs          # aperçu
 *   node --env-file=.env.local scripts/seed-stages.mjs --creer   # création
 *
 * Même règle de report que pour les ateliers : le JOUR DE LA SEMAINE et son
 * RANG DANS LE MOIS, jamais la date. Un stage du samedi doit rester un samedi.
 *
 * Les prix et les horaires viennent de src/content/pages/stages-thematiques/,
 * saisis à la main par Isabelle : c'est la meilleure source disponible, et elle
 * reste un point de départ à corriger dans l'écran des séances. Les stages des
 * vacances scolaires sont particulièrement à vérifier — le calendrier des
 * vacances ne suit pas la règle du rang dans le mois.
 */
import { createClient } from '@supabase/supabase-js';

/**
 * `forfait` marque les stages dont le prix couvre PLUSIEURS séances : le tarif
 * n'est alors pas celui d'une séance, et le porter sur chacune facturerait
 * plusieurs fois le même stage. Ces séances sont créées à 0 €, le prix restant
 * à poser une fois la règle tranchée.
 */
const STAGES = [
  {
    id: 'stage-initiation-machine',
    label: 'Initiation machine à coudre',
    audience: 'adultes',
    capacite: 6,
    seances: [
      { date: '2026-01-10', debut: '14:00', fin: '17:00', prix: 4000 },
      { date: '2026-01-08', debut: '17:15', fin: '19:45', prix: 3300 },
      { date: '2026-01-22', debut: '17:15', fin: '19:45', prix: 3300 },
      { date: '2026-01-24', debut: '17:15', fin: '19:45', prix: 3300 },
    ],
  },
  {
    id: 'stage-decouverte-couture-complete',
    label: 'Stage découverte de la couture — formule complète',
    audience: 'adultes',
    capacite: 6,
    forfait: '90 € pour les trois demi-journées',
    consecutif: true,
    seances: [
      { date: '2025-10-22', debut: '10:00', fin: '12:00', prix: 0 },
      { date: '2025-10-23', debut: '10:00', fin: '12:00', prix: 0 },
      { date: '2025-10-24', debut: '10:00', fin: '13:00', prix: 0 },
    ],
  },
  // La « formule courte » du stage découverte n'est pas reconduite : les deux
  // dates d'avril figurant dans le contenu 2025-2026 ne sont pas reprises.
  // Le tarif annoncé — 40 € pour 3 h — ne correspondait d'ailleurs pas à ces
  // séances de 2 h 30.
  {
    id: 'stage-surjeteuse',
    label: 'Stage surjeteuse',
    audience: 'adultes',
    capacite: 6,
    forfait: '65 € pour les deux demi-journées',
    consecutif: true,
    seances: [
      { date: '2025-10-30', debut: '14:00', fin: '16:30', prix: 0 },
      { date: '2025-10-31', debut: '14:00', fin: '16:30', prix: 0 },
    ],
  },
  {
    id: 'stage-patronage',
    label: 'Stage patronage',
    audience: 'adultes',
    capacite: 6,
    seances: [
      { date: '2025-10-25', debut: '14:00', fin: '17:00', prix: 4000 },
      { date: '2025-11-29', debut: '14:00', fin: '17:00', prix: 4000 },
      { date: '2026-01-10', debut: '14:00', fin: '17:00', prix: 4000 },
      { date: '2026-02-14', debut: '14:00', fin: '17:00', prix: 4000 },
      { date: '2026-03-21', debut: '14:00', fin: '17:00', prix: 4000 },
      { date: '2026-05-16', debut: '14:00', fin: '17:00', prix: 4000 },
      { date: '2026-06-20', debut: '14:00', fin: '17:00', prix: 4000 },
    ],
  },
  {
    id: 'stage-banane',
    label: 'Stage banane',
    audience: 'adultes',
    capacite: 6,
    seances: [
      { date: '2026-04-28', debut: '14:00', fin: '18:00', prix: 5000 },
    ],
  },
  {
    id: 'stage-sac-tote-bag',
    label: 'Stage sac et tote bag',
    audience: 'adultes',
    capacite: 6,
    seances: [
      { date: '2026-05-16', debut: '09:30', fin: '12:30', prix: 4000 },
      { date: '2026-06-20', debut: '09:30', fin: '12:30', prix: 4000 },
    ],
  },
];

const LIEU = 'Revel';

const NOMS_JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const NOMS_MOIS = ['', 'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
                   'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/**
 * Instant UTC correspondant à une heure locale à Paris.
 *
 * Écrire « +02:00 » en dur est faux la moitié de l'année : le 28 octobre 2026
 * est déjà à l'heure d'hiver, et un stage annoncé à 10 h y serait enregistré
 * pour 9 h. Le reste du code compose ces horaires en SQL — « (date + time) at
 * time zone 'Europe/Paris' » — précisément pour ne pas avoir à connaître le
 * décalage ; ce script n'a pas ce luxe, il le déduit donc de la date.
 *
 * La méthode est un essai vérifié plutôt qu'un calcul : on candidate les deux
 * décalages possibles et on garde celui qui, réaffiché à Paris, redonne l'heure
 * demandée. Aucune table de règles à maintenir, et le résultat est prouvé.
 */
const heureParis = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hour12: false,
});

function instantParis(iso, hhmm) {
  const [y, m, d] = iso.split('-').map(Number);
  const [hh, mi] = hhmm.split(':').map(Number);
  const voulu = `${String(hh).padStart(2, '0')}:${String(mi).padStart(2, '0')}`;

  for (const decalage of [1, 2]) {
    const candidat = new Date(Date.UTC(y, m - 1, d, hh - decalage, mi));
    if (heureParis.format(candidat) === voulu) return candidat.toISOString();
  }
  throw new Error(`Horaire impossible à Paris : ${iso} ${hhmm} (heure inexistante ?)`);
}

/** n-ième `jourSemaine` du mois ; on recule si le mois n'en compte pas autant. */
function nieme(annee, mois, jourSemaine, rang) {
  const premier = new Date(Date.UTC(annee, mois - 1, 1)).getUTCDay();
  let jour = 1 + ((jourSemaine - premier + 7) % 7) + (rang - 1) * 7;
  const dansLeMois = new Date(Date.UTC(annee, mois, 0)).getUTCDate();
  while (jour > dansLeMois) jour -= 7;
  return jour;
}

/** Reporte une date d'une saison sur la suivante, à jour et rang constants. */
function reporter(iso) {
  const [a, m, j] = iso.split('-').map(Number);
  const source = new Date(Date.UTC(a, m - 1, j));
  const jourSemaine = source.getUTCDay();
  const rang = Math.ceil(j / 7);
  const anneeCible = a + 1;
  const jourCible = nieme(anneeCible, m, jourSemaine, rang);
  return {
    iso: `${anneeCible}-${String(m).padStart(2, '0')}-${String(jourCible).padStart(2, '0')}`,
    jourSemaine, rang, mois: m, jourSource: j, anneeSource: a, jourCible, anneeCible,
  };
}

const creer = process.argv.includes('--creer');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } },
);

let totalSeances = 0;
let totalCreees = 0;

for (const stage of STAGES) {
  console.log(`\n${stage.label}`);
  if (stage.forfait) console.log(`  ⚠ prix au forfait — ${stage.forfait} — séances créées à 0 €`);

  /*
    Un stage étalé sur des jours CONSÉCUTIFS ne se reporte pas séance par
    séance. Appliquée à chacune, la règle du rang dans le mois disloque la
    suite : les 22, 23 et 24 octobre 2025 — mercredi, jeudi, vendredi — donnent
    les 28, 22 et 23 octobre 2026, ni consécutifs ni même dans l'ordre. Or ces
    trois demi-journées sont un seul stage, qui se tient sur trois jours de
    suite pendant les vacances.

    On reporte donc la PREMIÈRE date, et les suivantes suivent au jour près, en
    conservant chacune son propre horaire.
  */
  let reportees;
  if (stage.consecutif) {
    const ancre = reporter(stage.seances[0].date);
    const origine = Date.UTC(...stage.seances[0].date.split('-').map((n, i) => i === 1 ? Number(n) - 1 : Number(n)));
    reportees = stage.seances.map((s) => {
      const propre = Date.UTC(...s.date.split('-').map((n, i) => i === 1 ? Number(n) - 1 : Number(n)));
      const decalage = Math.round((propre - origine) / 86400000);
      const [ay, am, ad] = ancre.iso.split('-').map(Number);
      const cible = new Date(Date.UTC(ay, am - 1, ad + decalage));
      return { ...s, report: { ...reporter(s.date), iso: cible.toISOString().slice(0, 10),
                               jourCible: cible.getUTCDate(), mois: cible.getUTCMonth() + 1 } };
    });
  } else {
    reportees = stage.seances.map((s) => ({ ...s, report: reporter(s.date) }));
  }

  for (const s of reportees) {
    const r = s.report;
    console.log(
      `    ${NOMS_JOURS[r.jourSemaine].padEnd(9)} ${String(r.jourSource).padStart(2)} ${NOMS_MOIS[r.mois]} ${r.anneeSource}` +
      `  →  ${String(r.jourCible).padStart(2)} ${NOMS_MOIS[r.mois]} ${r.anneeCible}` +
      `   ${s.debut}–${s.fin}   ${(s.prix / 100).toFixed(0)} €`,
    );
  }
  totalSeances += reportees.length;

  if (!creer) continue;

  // Le créneau porte le stage ; group_id reste vide, un stage n'appartenant à
  // aucun groupe d'ateliers. Les valeurs par défaut viennent de la première
  // séance : elles ne servent qu'à préremplir l'écran de création.
  const premiere = reportees[0];
  const { error: eC } = await supabase.from('creneaux').upsert({
    id: stage.id,
    label: stage.label,
    group_id: null,
    kind: 'stage',
    audience: stage.audience,
    default_start_time: `${premiere.debut}:00`,
    default_end_time: `${premiere.fin}:00`,
    default_location: LIEU,
    default_capacity: stage.capacite,
    default_unit_price_cents: premiere.prix,
  });
  if (eC) { console.error(`    ✗ créneau : ${eC.message}`); continue; }

  // Une séance à la fois : chacune a son horaire et son prix, ce que
  // create_sessions — bâti pour un créneau régulier — ne sait pas exprimer.
  for (const s of reportees) {
    const { error } = await supabase.from('sessions').insert({
      creneau_id: stage.id,
      starts_at: instantParis(s.report.iso, s.debut),
      ends_at: instantParis(s.report.iso, s.fin),
      location: LIEU,
      capacity: stage.capacite,
      unit_price_cents: s.prix,
      status: 'scheduled',
    });
    if (error) console.error(`    ✗ ${s.report.iso} : ${error.message}`);
    else totalCreees++;
  }
  console.log(`    → ${reportees.length} séance(s) traitée(s)`);
}

console.log(
  creer
    ? `\n${totalCreees} séances créées sur ${totalSeances} prévues.`
    : `\n${STAGES.length} stages, ${totalSeances} séances seraient créés. Relancer avec --creer.`,
);
