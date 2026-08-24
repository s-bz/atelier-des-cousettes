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
  offresALUnite,
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
    idees: ['Coudre un ourlet', 'Faire des poches'],
  },
  articles: [
    { slug: 'coudre-tote-bag', titre: 'Coudre un tote bag', description: 'Les étapes\n essentielles.', publieLe: '2026-03-01' },
  ],
  glossaire: [
    // La définition porte un retour à la ligne exprès : les fiches sont saisies
    // en bloc littéral dans le CMS, et `uneLigne` doit les remettre à plat comme
    // il le fait pour les descriptions d'articles.
    { slug: 'droit-fil', terme: 'Droit fil', definition: 'La direction des fils\n de chaîne.' },
  ],
  avisProvisoire: 'Tarifs provisoires.',
  adhesionAnnuelle: '15 € par an',
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
    expect(texte).toContain('45 € la séance de 3 h, 35 € la séance de 2 h');
    expect(texte).toContain('de 38 € à 70 €');
  });

  it('ne cite aucune adresse redirigée', () => {
    expect(texte).not.toContain('un-apres-midi-couture');
    expect(texte).toContain('https://exemple.fr/seances-sans-engagement/');
  });

  /*
   * L'ADHÉSION A DEUX RÉGIMES, ET C'EST LA QUESTION QUI REVIENT LE PLUS.
   *
   * Le test d'avant exigeait « comprise dans TOUS les tarifs », et scellait
   * ainsi une phrase fausse : les stages et les séances à l'unité comprennent
   * leur adhésion ponctuelle, les forfaits de saison non — 15 € par an s'y
   * ajoutent. Un llms.txt est récité par des modèles qui répondent « combien ça
   * coûte » à notre place ; l'erreur y valait un devis faux.
   */
  it('distingue l’adhésion comprise de l’adhésion annuelle en plus', () => {
    expect(texte).toContain('comprise dans le prix des stages et des séances sans engagement');
    expect(texte).toContain('15 € par an, en plus du forfait de saison');
  });

  it('n’affirme plus que l’adhésion est comprise dans TOUS les tarifs', () => {
    expect(texte).not.toMatch(/adhésion est comprise dans tous les tarifs/);
    expect(texte).not.toContain('il n’y a rien à régler en plus');
  });

  it('se tait sur l’adhésion annuelle quand le CMS n’en porte aucune', () => {
    // Le champ vidé décrit un monde où le forfait la comprend : la page ne doit
    // alors annoncer ni « 0 € » ni un supplément qui n'existe pas.
    const sans = construireLlms({ ...faits, adhesionAnnuelle: null });
    expect(sans).not.toContain('en plus du forfait');
    expect(sans).toContain('comprise dans le prix des stages');
  });

  it('dit l’adhésion comprise sans dépendre d’un montant ponctuel', () => {
    // « 5 € » figurait dans le CMS sans jamais s'afficher : le champ ne servait
    // que de drapeau. Le fait, lui, reste vrai et doit se dire tout seul —
    // c'est celui qu'un modèle récite en répondant « combien ça coûte ».
    expect(texte).toContain('comprise dans le prix des stages et des séances sans engagement');
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
    expect(texte).toContain('45 € la séance');
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
    expect(texte).toContain('**Atelier enfants du jeudi** — enfants, 17h30–19h30, 35 € la séance');
  });

  /*
   * « HORS FORFAIT » A DISPARU DU LIBELLÉ, et pas seulement par concision : la
   * formule laissait entendre que ce montant facture les dépassements. Depuis
   * la table des formules, un dépassement se règle au prix divisé du forfait.
   * Ce prix-ci n'achète plus qu'une séance prise seule.
   */
  it('dit comment se prend un créneau qui ne se vend pas à la séance', () => {
    const auForfait = creneaux.map((c) =>
      c.audience === 'enfants' ? { ...c, aLUnite: false } : c,
    );
    const texte = construireTarifs({ ...faits, creneaux: auForfait });
    expect(texte).toContain('**Atelier enfants du jeudi** — enfants, 17h30–19h30, au forfait de saison uniquement');
    // Le montant inachetable ne paraît nulle part sur cette ligne.
    expect(texte).not.toContain('17h30–19h30, 35 €');
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
    expect(texte).toContain('Séance de 3 h : 45 €, adhésion comprise');
    expect(texte).toContain('10 séances : 36 € par mois');
  });

  it('marque « adhésion comprise » sans dépendre d’un montant ponctuel', () => {
    // Le suffixe était conditionné au champ `adhesionPonctuelle`, dont la valeur
    // n'était jamais affichée. Le champ supprimé, le fait doit tenir seul.
    expect(texte).toMatch(/- .+ : \d+ €, adhésion comprise/);
  });
});

describe('ce qu’on peut faire en séance', () => {
  it('énumère les idées dans llms-full', () => {
    // « Que peut-on faire en cours de couture ? » est une question posée aux
    // moteurs de réponse. Les prix y étaient, les gestes non.
    const texte = construireLlmsFull(faits);
    expect(texte).toContain('On peut y venir pour :');
    expect(texte).toContain('- Coudre un ourlet');
  });

  it('se tait quand aucune idée n’est saisie', () => {
    const texte = construireLlmsFull({ ...faits, seances: { ...faits.seances, idees: [] } });
    expect(texte).not.toContain('On peut y venir pour');
  });
});

describe('offresALUnite', () => {
  it('réunit les créneaux qui durent autant et coûtent autant', () => {
    // Deux créneaux adultes de 3 h à 45 € — le mardi et Verdalle — sont UNE
    // offre. Les énumérer par créneau aurait affiché deux fois le même tarif.
    expect(offresALUnite(creneaux)).toEqual([
      { titre: 'Séance de 3 h', duree: '3 h', prix: 45 },
      { titre: 'Séance de 2 h', duree: '2 h', prix: 35 },
    ]);
  });

  it('écarte un créneau qui ne se vend pas à l’unité, sans perdre son prix', () => {
    /*
     * LA DISTINCTION QUI COMPTE : facturer n'est pas proposer.
     *
     * Les ateliers ados et enfants gardent leur prix — il facture une séance
     * dépassant le forfait — mais ne s'achètent plus à la séance. Sans ce
     * filtre, /tarifs.md et /llms.txt continueraient d'annoncer « 35 € la
     * séance enfant » à des modèles qui le répéteraient à un parent.
     */
    const sansEnfants = creneaux.map((c) =>
      c.audience === 'enfants' ? { ...c, aLUnite: false } : c,
    );
    expect(offresALUnite(sansEnfants)).toEqual([
      { titre: 'Séance de 3 h', duree: '3 h', prix: 45 },
    ]);
    // Le prix demeure sur le créneau, il n'est simplement plus proposé.
    expect(sansEnfants.find((c) => c.audience === 'enfants')?.prixCents).toBe(3500);
  });

  it('ne compte pas les stages, qui ne sont pas des séances', () => {
    expect(offresALUnite(creneaux).map((o) => o.prix)).not.toContain(70);
  });

  it('range la formule la plus chère en tête', () => {
    // La longue est la formule principale ; la courte se lit ensuite comme ce
    // qu'elle est, une porte d'entrée.
    const avecCourte = [
      ...creneaux,
      { label: 'Séance du jeudi soir', kind: 'atelier', audience: 'adultes',
        lieu: 'Revel', debut: '17:30:00', fin: '19:00:00', prixCents: 2200 },
    ];
    expect(offresALUnite(avecCourte).map((o) => o.titre)).toEqual([
      'Séance de 3 h', 'Séance de 2 h', 'Séance de 1 h 30',
    ]);
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
