import { describe, it, expect } from 'vitest';
import {
  construireDates,
  construireLlms,
  construireLlmsFull,
  construireTarifs,
  faitsCles,
  fourchetteStages,
  prixSeance,
  prixStage,
  type CreneauPublic,
  type FaitsPublics,
  type SeancePublique,
} from '../faits-publics';

const creneaux: CreneauPublic[] = [
  { label: 'Atelier du mardi après-midi', kind: 'atelier', audience: 'adultes', lieu: 'Revel', debut: '14:00:00', fin: '17:00:00', prixCents: 4500 },
  { label: 'Atelier enfants du jeudi', kind: 'atelier', audience: 'enfants', lieu: 'Revel', debut: '17:30:00', fin: '19:30:00', prixCents: 3500 },
  { label: 'Atelier de Verdalle', kind: 'atelier', audience: 'adultes', lieu: 'Verdalle', debut: '09:30:00', fin: '12:30:00', prixCents: 4500 },
  { label: 'Stage surjeteuse', kind: 'stage', audience: 'adultes', lieu: 'Revel', debut: '09:30:00', fin: '16:30:00', prixCents: 7000 },
  { label: 'Initiation machine à coudre — formule courte', kind: 'stage', audience: 'adultes', lieu: 'Revel', debut: '14:00:00', fin: '17:00:00', prixCents: 3800 },
  { label: 'Initiation machine à coudre — formule longue', kind: 'stage', audience: 'adultes', lieu: 'Revel', debut: '14:00:00', fin: '18:00:00', prixCents: 4500 },
];

/**
 * Des horodatages fixes, en heure d'été de Paris (UTC+2).
 *
 * Écrits en UTC pour que le test dise la même chose sur toutes les machines :
 * `07:30Z` doit ressortir « 09h30 », et c'est précisément la conversion qu'on
 * veut vérifier — un fuseau pris sur le serveur donnerait des heures fausses aux
 * lecteurs, sans que rien ne le signale.
 */
const seancesAVenir: SeancePublique[] = [
  { creneau: 'Atelier de Verdalle', kind: 'atelier', audience: 'adultes', lieu: 'Verdalle', debut: '2026-09-10T07:30:00+00:00', fin: '2026-09-10T10:30:00+00:00', prixCents: 4500, capacite: 6 },
  { creneau: 'Atelier du mardi après-midi', kind: 'atelier', audience: 'adultes', lieu: 'Revel', debut: '2026-09-15T12:00:00+00:00', fin: '2026-09-15T15:00:00+00:00', prixCents: 4500, capacite: 8 },
  { creneau: 'Stage surjeteuse', kind: 'stage', audience: 'adultes', lieu: 'Revel', debut: '2026-10-03T07:30:00+00:00', fin: '2026-10-03T14:30:00+00:00', prixCents: 7000, capacite: 5 },
];

const faits: FaitsPublics = {
  siteUrl: 'https://exemple.fr',
  siteName: "L'Atelier des Cousettes",
  email: 'info@exemple.fr',
  telephones: ['06.00.00.00.00'],
  facebookUrl: 'https://facebook.com/exemple',
  auteur: 'Isabelle Bultez',
  auteurTitre: 'Couturière diplômée CAP',
  adresse: { rue: '118 lieu dit En Rivals', ville: 'Verdalle', codePostal: '81110', region: 'Tarn' },
  noteGoogle: '5,0',
  creneaux,
  seancesAVenir,
  ateliers: {
    introduction: 'Rejoignez un groupe convivial.',
    tarifsIntro: "L'adhésion est comprise.",
    tarifsNote: 'Le tissu reste à votre charge.',
    grille: [
      {
        audience: 'adultes',
        dureeSeance: 'Séances de 3 h',
        formules: [
          { seances: '10 séances', mensuel: '36 € par mois', detail: 'ou 360 € en une fois' },
          { seances: '20 séances', mensuel: '58 € par mois', detail: 'ou 580 € en une fois' },
        ],
      },
      {
        audience: 'enfants',
        dureeSeance: 'Séances de 2 h',
        formules: [{ seances: '10 séances', mensuel: '28 € par mois', detail: null }],
      },
    ],
    creneauxCms: [
      { name: 'Atelier de Verdalle', location: 'Verdalle', day: '1 fois par mois le jeudi ', time: 'de 9h30 à 12h30' },
    ],
  },
  stages: {
    introduction: 'Une technique par stage.',
    liste: [
      { name: 'Initiation machine à coudre', shortDescription: 'Découvrez votre machine.', prerequisite: '' },
      { name: 'Stage surjeteuse', shortDescription: 'Apprivoisez la surjeteuse.', prerequisite: 'Connaissance de base recommandée.' },
      { name: 'Stage inconnu de la base', shortDescription: 'Pas encore programmé.', prerequisite: '' },
    ],
  },
  seances: {
    introduction: 'Une séance ponctuelle.',
    description: null,
    publics: ['Les débutants.'],
  },
  articles: [
    { slug: 'coudre-tote-bag', titre: 'Coudre un tote bag', description: 'Les étapes\n essentielles.', publieLe: '2026-03-01' },
  ],
  avisProvisoire: 'Tarifs provisoires.',
};

describe('lecture des prix en base', () => {
  it('donne le prix d’une séance par public', () => {
    expect(prixSeance(creneaux, 'adultes')).toBe(45);
    expect(prixSeance(creneaux, 'enfants')).toBe(35);
  });

  it('ne trouve rien pour un public absent', () => {
    expect(prixSeance(creneaux, 'ados')).toBeNull();
  });

  it('apparie un stage à ses formules par le début de son nom', () => {
    expect(prixStage(creneaux, 'Initiation machine à coudre')).toEqual([38, 45]);
    expect(prixStage(creneaux, 'Stage surjeteuse')).toEqual([70]);
    expect(prixStage(creneaux, 'Stage inconnu de la base')).toEqual([]);
  });

  it('donne la fourchette de tous les stages', () => {
    expect(fourchetteStages(creneaux)).toBe('de 38 € à 70 €');
    expect(fourchetteStages([])).toBeNull();
  });
});

describe('construireLlms', () => {
  const texte = construireLlms(faits);

  it('annonce les tarifs lus en base et dans la grille, pas des montants figés', () => {
    expect(texte).toContain('de 28 € à 58 € par mois');
    expect(texte).toContain('45 € pour les adultes, 35 € pour les enfants');
    expect(texte).toContain('de 38 € à 70 €');
  });

  it('ne cite aucune adresse redirigée', () => {
    expect(texte).not.toContain('un-apres-midi-couture');
    expect(texte).toContain('https://exemple.fr/seances-sans-engagement/');
  });

  it('dit que l’adhésion est comprise — la question qui revient le plus', () => {
    expect(texte).toContain('adhésion comprise');
    expect(texte).toMatch(/adhésion est comprise dans tous les tarifs/);
  });

  it('garde le sigle du titre professionnel intact', () => {
    expect(texte).toContain('couturière diplômée CAP');
  });

  it('liste tous les articles, sur une seule ligne chacun', () => {
    expect(texte).toContain('[Coudre un tote bag](https://exemple.fr/blog/coudre-tote-bag/) — Les étapes essentielles.');
  });

  it('reprend l’avertissement de saison quand il existe', () => {
    expect(texte).toContain('Tarifs provisoires.');
    expect(construireLlms({ ...faits, avisProvisoire: null })).not.toContain('À noter');
  });
});

describe('faitsCles', () => {
  it('compte les créneaux et les stages en base plutôt que de les annoncer à la main', () => {
    const lignes = faitsCles(faits).join('\n');
    expect(lignes).toContain("**Créneaux d'atelier au programme** : 3");
    expect(lignes).toContain('**Stages au programme** : 3');
  });

  it('prend la taille des groupes sur la plus grande capacité programmée', () => {
    expect(faitsCles(faits).join('\n')).toContain('**Taille des groupes** : 8 participants au maximum');
  });

  it('lit les durées dans la grille, sans recopier le préfixe « Séances de »', () => {
    expect(faitsCles(faits).join('\n')).toContain(
      "**Durée d'une séance** : 3 h pour les adultes, 2 h pour les enfants",
    );
  });

  it('tait un fait que sa source ne porte pas, plutôt que d’en inventer un', () => {
    const sansBase = faitsCles({ ...faits, noteGoogle: null, creneaux: [], seancesAVenir: [] }).join('\n');
    expect(sansBase).not.toContain('Note Google');
    expect(sansBase).not.toContain('Taille des groupes');
    expect(sansBase).not.toContain('au programme');
    // Ce qui ne dépend d'aucune source reste : la saison et les niveaux sont
    // vrais même quand la base ne répond pas.
    expect(sansBase).toContain('**Saison** : de septembre à juin');
  });
});

describe('construireDates', () => {
  const texte = construireDates(faits);

  it('donne chaque date en ISO et en toutes lettres', () => {
    expect(texte).toContain('**2026-09-15** — mardi 15 septembre 2026, 14h00–17h00');
  });

  it('convertit les heures en fuseau de Paris, pas en UTC', () => {
    expect(texte).toContain('09h30–12h30');
  });

  it('sépare les ateliers des stages, et groupe les ateliers par lieu', () => {
    const [avantStages, apresStages] = texte.split('## Stages thématiques');
    expect(avantStages).toContain('### Revel');
    expect(avantStages).toContain('### Verdalle');
    expect(avantStages).toContain('Atelier du mardi après-midi');
    expect(avantStages).not.toContain('Stage surjeteuse');
    expect(apresStages).toContain('Stage surjeteuse');
  });

  it('précise le périmètre du prix des ateliers, qui n’est pas celui des stages', () => {
    expect(texte).toContain('45 € la séance hors forfait');
    expect(texte).toContain('70 €\n');
  });

  it('ne publie aucune place restante — elles changent plus vite que le cache', () => {
    expect(texte).not.toMatch(/\d+ places? (restante|libre)/);
    expect(texte).toContain('Elles ne figurent pas dans ce fichier');
  });

  it('invite à écrire quand aucune date n’est programmée', () => {
    const vide = construireDates({ ...faits, seancesAVenir: [] });
    expect(vide).toContain('Aucune date programmée pour le moment');
    expect(vide).toContain('info@exemple.fr');
  });
});

describe('construireTarifs', () => {
  const texte = construireTarifs(faits);

  it('sépare les grilles adultes et enfants', () => {
    expect(texte).toContain('### Ateliers réguliers — Adultes');
    expect(texte).toContain('### Ateliers réguliers — Enfants');
    expect(texte).toContain('**10 séances** : 36 € par mois (ou 360 € en une fois)');
  });

  it('donne un prix par stage, et le dit quand la base n’en a pas', () => {
    expect(texte).toContain('**Initiation machine à coudre** : 38 € ou 45 € selon la formule');
    expect(texte).toContain('**Stage inconnu de la base** : prix communiqué');
  });

  it('met le prérequis en minuscule après le deux-points', () => {
    expect(texte).toContain('prérequis : connaissance de base recommandée');
  });

  it('groupe les créneaux par lieu avec leur prix à l’unité', () => {
    expect(texte).toContain('### Revel');
    expect(texte).toContain('### Verdalle');
    expect(texte).toContain('**Atelier enfants du jeudi** — enfants, 17h30–19h30, 35 € la séance hors forfait');
  });

  it('reste servable quand la base ne répond pas', () => {
    const sansBase = construireTarifs({ ...faits, creneaux: [] });
    expect(sansBase).toContain('Prix communiqué sur demande.');
    expect(sansBase).toContain('36 € par mois');
  });
});

describe('construireLlmsFull', () => {
  const texte = construireLlmsFull(faits);

  it('nettoie les espaces de fin saisis dans le CMS', () => {
    expect(texte).toContain('1 fois par mois le jeudi, de 9h30 à 12h30');
    expect(texte).not.toContain('jeudi , ');
  });

  it('range les stages sous la formule qui les porte', () => {
    expect(texte).toContain('### Stages thématiques');
    expect(texte).toContain('#### Stage surjeteuse (70 €)');
  });

  it('répète les montants plutôt que de renvoyer à tarifs.md', () => {
    expect(texte).toContain('Adulte : 45 € la séance de 3 h, adhésion comprise');
    expect(texte).toContain('10 séances : 36 € par mois');
  });
});

describe('les dates en toutes lettres', () => {
  it('écrit « 1er » pour le premier du mois, et « 1 » nulle part', () => {
    const texte = construireDates({
      ...faits,
      seancesAVenir: [
        { creneau: 'Atelier', kind: 'atelier', audience: 'adultes', lieu: 'Revel', debut: '2026-10-01T12:00:00+00:00', fin: '2026-10-01T15:00:00+00:00', prixCents: 4500, capacite: 6 },
        { creneau: 'Atelier', kind: 'atelier', audience: 'adultes', lieu: 'Revel', debut: '2026-10-21T12:00:00+00:00', fin: '2026-10-21T15:00:00+00:00', prixCents: 4500, capacite: 6 },
      ],
    });
    expect(texte).toContain('jeudi 1er octobre 2026');
    expect(texte).not.toContain('jeudi 1 octobre');
    // Le 21 garde ses deux chiffres : seul un « 1 » isolé prend l'ordinal.
    expect(texte).toContain('mercredi 21 octobre 2026');
  });
});
