/**
 * Le calendrier réel de la saison 2026-2027, dicté par Isabelle.
 *
 *   node --env-file=.env.local scripts/saison-2026-2027.mjs             # aperçu
 *   node --env-file=.env.local scripts/saison-2026-2027.mjs --appliquer # écriture
 *
 * IL REMPLACE `seed-saison.mjs`, ET C'EST TOUT SON OBJET. Celui-ci reportait le
 * calendrier 2025-2026 sur 2026-2027 par le rang du jour dans le mois — le 3ᵉ
 * jeudi de septembre restant le 3ᵉ jeudi de septembre. C'était la meilleure
 * approximation disponible tant qu'Isabelle n'avait pas arrêté ses dates, et
 * elle l'annonçait : « un point de départ à corriger ». Les vraies dates sont
 * là ; aucune ne coïncide avec le report. Les garder côte à côte donnerait deux
 * calendriers, dont un faux.
 *
 * POURQUOI IL EFFACE AVANT D'ÉCRIRE. `create_sessions` est idempotent par
 * (créneau, instant de début) : il ajoute sans jamais retirer. Le lancer seul
 * laisserait les dates reportées EN PLUS des vraies — 10 mardis inventés et
 * 12 réels au même calendrier, sans rien pour les distinguer. Le remplacement
 * doit donc être explicite.
 *
 * CE QU'IL REFUSE D'EFFACER : toute séance déjà passée. Aucune n'existe
 * aujourd'hui — la saison s'ouvre le 5 septembre 2026 et rien n'a encore eu
 * lieu — mais le garde-fou vaut pour le jour où l'on relancera ce script en
 * cours de saison pour rectifier la fin de l'année. Une séance passée porte des
 * présences ; l'effacer réécrirait ce qui s'est réellement produit.
 */
import { createClient } from '@supabase/supabase-js';

/**
 * Les dates, telles qu'elles ont été dictées : jour/mois, sans année.
 *
 * L'année se déduit du mois — septembre à décembre en 2026, janvier à juin en
 * 2027 — plutôt que d'être recopiée 76 fois. Chaque date est ensuite vérifiée
 * contre le jour de la semaine attendu, sans quoi une coquille de saisie ferait
 * naître un « atelier du mardi » un mercredi, en silence.
 */
const CALENDRIER = [
  {
    creneau: 'atelier-du-mardi-apres-midi',
    jour: 2, // mardi
    dates: ['29/09', '13/10', '17/11', '08/12', '29/12',
            '12/01', '02/02', '02/03', '16/03', '27/04', '25/05', '08/06'],
  },
  {
    creneau: 'atelier-du-jeudi-matin',
    jour: 4,
    dates: ['01/10', '19/11', '03/12',
            '14/01', '04/02', '11/03', '01/04', '13/05', '10/06'],
  },
  {
    creneau: 'atelier-du-jeudi-apres-midi',
    jour: 4,
    dates: ['17/09', '01/10', '15/10', '05/11', '19/11', '03/12', '17/12',
            '14/01', '28/01', '04/02', '25/02', '11/03', '25/03', '01/04',
            '22/04', '13/05', '27/05', '10/06', '24/06'],
  },
  {
    creneau: 'atelier-du-samedi-matin',
    jour: 6,
    dates: ['05/09', '17/10', '21/11', '19/12',
            '30/01', '06/02', '13/03', '03/04', '22/05', '19/06'],
  },
  {
    // Les mêmes dates que l'atelier adultes du samedi matin : les deux groupes
    // tournent en parallèle, 9h30-12h30 pour l'un, 10h30-12h30 pour l'autre.
    creneau: 'atelier-ados-du-samedi',
    jour: 6,
    dates: ['05/09', '17/10', '21/11', '19/12',
            '30/01', '06/02', '13/03', '03/04', '22/05', '19/06'],
  },
  {
    /*
     * Le samedi après-midi, adultes et ados en parallèle — 14h-17h pour les uns,
     * 14h-16h pour les autres — sur les mêmes 19 dates.
     *
     * DEUX DATES ONT ÉTÉ CORRIGÉES à la saisie : la liste dictée portait les
     * mardis 29/09 et 08/12, tous deux présents dans la liste du mardi
     * après-midi — un report de ligne. Ils deviennent les samedis 26/09 et
     * 12/12, sur décision d'Isabelle. Sans la vérification du jour de la
     * semaine plus bas, deux ateliers du samedi se seraient posés un mardi.
     */
    creneau: 'atelier-du-samedi-apres-midi',
    jour: 6,
    dates: ['26/09', '03/10', '17/10', '14/11', '28/11', '12/12', '19/12',
            '09/01', '23/01', '06/02', '27/02', '13/03', '27/03', '03/04',
            '24/04', '22/05', '29/05', '05/06', '19/06'],
  },
  {
    creneau: 'atelier-ados-du-samedi-apres-midi',
    jour: 6,
    dates: ['26/09', '03/10', '17/10', '14/11', '28/11', '12/12', '19/12',
            '09/01', '23/01', '06/02', '27/02', '13/03', '27/03', '03/04',
            '24/04', '22/05', '29/05', '05/06', '19/06'],
  },
  {
    /*
     * La séance du jeudi soir — 1 h 30 à 22 €, hors forfait.
     *
     * Elle ne se pose sur aucun forfait (`au_forfait` faux en base) et ne paraît
     * donc que sur la page des séances sans engagement. Ses dates sont dictées
     * à part des ateliers réguliers, et ne coïncident avec eux que par hasard.
     *
     * TROIS DATES CORRIGÉES à la saisie : le samedi 30/01 est devenu le jeudi
     * 28/01 — les neuf autres étaient des jeudis — puis Isabelle a remplacé le
     * 24/09 par le 17/09 et le 19/11 par le 05/11.
     */
    creneau: 'seance-du-jeudi-soir',
    jour: 4,
    dates: ['17/09', '15/10', '05/11', '17/12',
            '28/01', '25/02', '25/03', '22/04', '27/05', '24/06'],
  },
  {
    creneau: 'ateliers-enfants-samedi',
    jour: 6,
    dates: ['12/09', '26/09', '03/10', '10/10', '14/11', '28/11', '05/12', '12/12',
            '09/01', '23/01', '27/02', '27/03', '24/04', '29/05', '05/06', '12/06'],
  },
];

/**
 * LES STAGES — une date, un horaire.
 *
 * Séparés des ateliers parce qu'ils ne se programment pas de la même façon : un
 * atelier revient à son heure habituelle, un stage se pose là où la salle est
 * libre. La surjeteuse se tient de 9 h à 13 h en février et de 14 h à 18 h en
 * mai ; la trousse un samedi matin puis un mardi après-midi. Aucun horaire par
 * défaut ne décrit cela, d'où `create_sessions_horaires` et son objet par
 * séance (migration 20260824180000).
 *
 * `jour` est ici PAR DATE, et non par créneau : c'est le jour annoncé par
 * Isabelle, vérifié plus bas contre le calendrier réel. Il a déjà rattrapé le
 * « samedi 29/12 » de la trousse — un mardi, gardé tel quel après vérification.
 */
const STAGES = [
  {
    creneau: 'stage-initiation-machine-3h',
    seances: [
      { jour: 4, date: '10/09', debut: '14:00', fin: '17:00' },
      { jour: 6, date: '12/09', debut: '14:00', fin: '17:00' },
      { jour: 4, date: '24/09', debut: '14:00', fin: '17:00' },
      { jour: 6, date: '10/10', debut: '14:00', fin: '17:00' },
      { jour: 4, date: '22/10', debut: '14:00', fin: '17:00' },
    ],
  },
  {
    creneau: 'stage-surjeteuse',
    seances: [
      { jour: 4, date: '18/02', debut: '09:00', fin: '13:00' },
      { jour: 6, date: '08/05', debut: '14:00', fin: '18:00' },
    ],
  },
  {
    creneau: 'stage-banane',
    seances: [
      { jour: 4, date: '26/11', debut: '14:00', fin: '18:00' },
      { jour: 6, date: '30/01', debut: '14:00', fin: '18:00' },
      { jour: 6, date: '12/06', debut: '14:00', fin: '18:00' },
    ],
  },
  {
    creneau: 'stage-trousse',
    seances: [
      { jour: 6, date: '24/10', debut: '09:30', fin: '12:30' },
      // Annoncé samedi, c'est un mardi — vérifié, puis gardé tel quel.
      { jour: 2, date: '29/12', debut: '14:00', fin: '17:00' },
    ],
  },
  {
    creneau: 'stage-sac-tote-bag',
    seances: [
      { jour: 4, date: '22/10', debut: '09:30', fin: '12:30' },
      { jour: 6, date: '13/02', debut: '09:30', fin: '12:30' },
      { jour: 2, date: '02/03', debut: '14:00', fin: '17:00' },
    ],
  },
  {
    creneau: 'stage-gilet-de-berger',
    seances: [
      { jour: 6, date: '24/10', debut: '14:00', fin: '18:00' },
      { jour: 6, date: '21/11', debut: '14:00', fin: '18:00' },
    ],
  },
  {
    creneau: 'stage-patronage',
    seances: [
      { jour: 6, date: '10/04', debut: '10:00', fin: '18:00' },
    ],
  },
];

/**
 * Les créneaux qui s'arrêtent, et dont les séances reportées n'auront pas lieu.
 *
 * Ils sont archivés par la migration 20260824090100 : leurs dates ne sont donc
 * plus publiées. Mais elles restent au calendrier de l'écran d'administration,
 * où elles se lisent comme un programme — or ces séances ne se tiendront pas.
 * Les retirer ne perd rien : ce sont des dates REPORTÉES automatiquement, pas
 * des séances qui ont eu lieu.
 */
const ARRETES = [
  'atelier-du-jeudi-fin-de-journee',
  // Le stage découverte, ses deux formules, et l'initiation de 2 h 30 —
  // archivés par 20260824180100. Leurs dates reportées n'auront pas lieu.
  'stage-decouverte-couture-complete',
  'stage-decouverte-couture-courte',
  'stage-initiation-machine',
];

const NOMS_JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

/** « 29/09 » → « 2026-09-29 ». Septembre à décembre en 2026, le reste en 2027. */
function enDateIso(jourMois) {
  const [jj, mm] = jourMois.split('/').map(Number);
  const annee = mm >= 9 ? 2026 : 2027;
  return `${annee}-${String(mm).padStart(2, '0')}-${String(jj).padStart(2, '0')}`;
}

const appliquer = process.argv.includes('--appliquer');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } },
);

/* ------------------------------------------------------------------ *
 * 1. Vérification des dates AVANT toute écriture.
 *
 * Un jour de la semaine qui ne correspond pas est une coquille, et le seul
 * moment où elle se remarque encore facilement est maintenant : une fois la
 * séance créée, elle ressemble à toutes les autres.
 * ------------------------------------------------------------------ */
const erreurs = [];
for (const { creneau, jour, dates } of CALENDRIER) {
  for (const d of dates) {
    const iso = enDateIso(d);
    const reel = new Date(`${iso}T12:00:00Z`).getUTCDay();
    if (reel !== jour) {
      erreurs.push(
        `${creneau} : ${iso} tombe un ${NOMS_JOURS[reel]}, ` +
        `or ce créneau a lieu le ${NOMS_JOURS[jour]}`,
      );
    }
  }
  const doublons = dates.filter((d, i) => dates.indexOf(d) !== i);
  if (doublons.length) erreurs.push(`${creneau} : date en double — ${doublons.join(', ')}`);
}

// Les stages : chaque séance porte son jour annoncé et son horaire.
for (const { creneau, seances } of STAGES) {
  for (const { jour, date, debut, fin } of seances) {
    const iso = enDateIso(date);
    const reel = new Date(`${iso}T12:00:00Z`).getUTCDay();
    if (reel !== jour) {
      erreurs.push(
        `${creneau} : ${iso} tombe un ${NOMS_JOURS[reel]}, ` +
        `or cette séance est annoncée le ${NOMS_JOURS[jour]}`,
      );
    }
    if (debut >= fin) {
      erreurs.push(`${creneau} : ${iso}, ${debut}–${fin} — la fin ne suit pas le début`);
    }
  }
  const cles = seances.map((s) => s.date);
  const doublons = cles.filter((d, i) => cles.indexOf(d) !== i);
  if (doublons.length) erreurs.push(`${creneau} : date en double — ${doublons.join(', ')}`);
}

if (erreurs.length) {
  console.error('Dates incohérentes, rien n’a été écrit :\n');
  erreurs.forEach((e) => console.error(`  ✗ ${e}`));
  process.exit(1);
}

/* ------------------------------------------------------------------ *
 * 2. Les créneaux concernés doivent exister — sinon les migrations n'ont pas
 *    été appliquées, et créer les séances échouerait une par une.
 * ------------------------------------------------------------------ */
const concernes = [
  ...CALENDRIER.map((c) => c.creneau),
  ...STAGES.map((s) => s.creneau),
  ...ARRETES,
];
const { data: existants, error: eCreneaux } = await supabase
  .from('creneaux')
  .select('id, label, audience, default_start_time, default_end_time, default_unit_price_cents, archived_at')
  .in('id', concernes);

if (eCreneaux) {
  console.error(`Lecture des créneaux impossible : ${eCreneaux.message}`);
  process.exit(1);
}

const manquants = concernes.filter((id) => !existants.some((c) => c.id === id));
if (manquants.length) {
  console.error(
    'Créneaux absents de la base :\n' +
    manquants.map((m) => `  ✗ ${m}`).join('\n') +
    '\n\nAppliquez d’abord les migrations : supabase db push',
  );
  process.exit(1);
}

/* ------------------------------------------------------------------ *
 * 3. État actuel : ce qui va disparaître, et ce que cela emporte.
 * ------------------------------------------------------------------ */
const maintenant = new Date().toISOString();

const { data: seances, error: eSeances } = await supabase
  .from('sessions')
  .select('id, creneau_id, starts_at, bookings(id, status)')
  .in('creneau_id', concernes)
  .order('starts_at');

if (eSeances) {
  console.error(`Lecture des séances impossible : ${eSeances.message}`);
  process.exit(1);
}

const passees = seances.filter((s) => s.starts_at <= maintenant);
if (passees.length) {
  console.error(
    `${passees.length} séance(s) déjà passée(s) parmi les créneaux visés.\n` +
    'Ce script ne réécrit pas le passé : retirez ces créneaux du calendrier\n' +
    'ci-dessus, ou effacez ces séances à la main si elles sont vraiment fausses.\n',
  );
  passees.forEach((s) => console.error(`  ✗ ${s.creneau_id} — ${s.starts_at}`));
  process.exit(1);
}

const label = (id) => existants.find((c) => c.id === id)?.label ?? id;

console.log('SÉANCES ACTUELLES — toutes seront effacées\n');
let reservationsPerdues = 0;
for (const id of concernes) {
  const miennes = seances.filter((s) => s.creneau_id === id);
  const resa = miennes.reduce((n, s) => n + (s.bookings?.length ?? 0), 0);
  reservationsPerdues += resa;
  const arrete = ARRETES.includes(id) ? '  [créneau arrêté]' : '';
  console.log(
    `  ${label(id).padEnd(34)} ${String(miennes.length).padStart(2)} séance(s)` +
    `${resa ? `, ${resa} réservation(s)` : ''}${arrete}`,
  );
}

console.log('\nSÉANCES À CRÉER\n');
let total = 0;
for (const { creneau, dates } of CALENDRIER) {
  const c = existants.find((x) => x.id === creneau);
  total += dates.length;
  console.log(
    `  ${label(creneau).padEnd(34)} ${String(dates.length).padStart(2)} séance(s)` +
    `  ${c.default_start_time.slice(0, 5)}–${c.default_end_time.slice(0, 5)}  (${c.audience})`,
  );
  console.log(`      ${dates.map(enDateIso).join('  ')}`);
}

for (const { creneau, seances: ses } of STAGES) {
  const c = existants.find((x) => x.id === creneau);
  total += ses.length;
  console.log(
    `  ${label(creneau).padEnd(34)} ${String(ses.length).padStart(2)} séance(s)` +
    `  ${(c.default_unit_price_cents / 100).toFixed(0)} €  (stage)`,
  );
  for (const s of ses) {
    console.log(`      ${enDateIso(s.date)}  ${s.debut}–${s.fin}`);
  }
}

console.log(
  `\n${seances.length} séance(s) effacée(s), ${total} créée(s).` +
  (reservationsPerdues
    ? `\n${reservationsPerdues} réservation(s) disparaissent avec elles ` +
      '(suppression en cascade).'
    : ''),
);

if (!appliquer) {
  console.log('\nAperçu seulement. Relancer avec --appliquer pour écrire.');
  process.exit(0);
}

/* ------------------------------------------------------------------ *
 * 4. Écriture.
 * ------------------------------------------------------------------ */
console.log('\n— Écriture —\n');

const { error: eSuppr, count } = await supabase
  .from('sessions')
  .delete({ count: 'exact' })
  .in('creneau_id', concernes)
  .gt('starts_at', maintenant);

if (eSuppr) {
  console.error(`Suppression impossible : ${eSuppr.message}`);
  process.exit(1);
}
console.log(`  ${count} séance(s) effacée(s).`);

let crees = 0;
for (const { creneau, dates } of CALENDRIER) {
  const { data, error } = await supabase.rpc('create_sessions', {
    p_creneau: creneau,
    p_dates: dates.map(enDateIso),
  });
  if (error) {
    console.error(`  ✗ ${label(creneau)} : ${error.message}`);
    continue;
  }
  crees += data ?? 0;
  console.log(`  ${label(creneau).padEnd(34)} ${data} créée(s).`);
}

for (const { creneau, seances: ses } of STAGES) {
  const { data, error } = await supabase.rpc('create_sessions_horaires', {
    p_creneau: creneau,
    p_seances: ses.map((s) => ({ date: enDateIso(s.date), debut: s.debut, fin: s.fin })),
  });
  if (error) {
    console.error(`  ✗ ${label(creneau)} : ${error.message}`);
    continue;
  }
  crees += data ?? 0;
  console.log(`  ${label(creneau).padEnd(34)} ${data} créée(s).`);
}

console.log(`\n${crees} séance(s) créée(s) sur ${total} prévues.`);
if (crees !== total) {
  console.error('Écart entre prévu et créé — vérifiez les messages ci-dessus.');
  process.exit(1);
}
