import { describe, expect, it } from 'vitest';
import {
  forfaitLePlusBas,
  formuleLaMoinsChere,
  fourchette,
  fourchetteForfaits,
  prixParPublic,
  grilleAvecPrixDeLaBase,
  libelleFormule,
  heureCourte,
  montantFr,
  remplacerFourchette,
} from '../tarifs';

describe('fourchette', () => {
  it('écrit la tournure employée dans les phrases', () => {
    expect(fourchette({ min: 38, max: 95 })).toBe('de 38 € à 95 €');
  });

  it('ne renvoie rien quand la base n’a rien dit', () => {
    expect(fourchette(null)).toBeNull();
  });
});

describe('remplacerFourchette', () => {
  it('remplace les deux nombres sans toucher aux mots', () => {
    expect(remplacerFourchette(
      'Les tarifs varient en fonction du contenu du stage, de 45 € à 95 €.',
      'de 38 € à 95 €',
    )).toBe('Les tarifs varient en fonction du contenu du stage, de 38 € à 95 €.');
  });

  it('reconnaît la graphie sans espace avant l’euro', () => {
    // Le contenu mélange « de 45 € à 95 € » et « de 45€ à 95€ » ; les deux
    // doivent être rattrapées, sans quoi la moitié des pages resterait figée.
    expect(remplacerFourchette('petits groupes, de 25€ à 90€. Avec Isabelle', 'de 28 € à 95 €'))
      .toBe('petits groupes, de 28 € à 95 €. Avec Isabelle');
  });

  it('conserve la majuscule du « de » d’origine', () => {
    // La même tournure ouvre une phrase ici et se glisse au milieu d'une autre
    // ailleurs : imposer une casse abîmerait toujours l'un des deux.
    expect(remplacerFourchette('De 25 € à 95 € selon la formule.', 'de 28 € à 95 €'))
      .toBe('De 28 € à 95 € selon la formule.');
    expect(remplacerFourchette('à partir de 25 € à 95 €.', 'De 28 € à 95 €'))
      .toBe('à partir de 28 € à 95 €.');
  });

  it('laisse le texte intact quand la base n’a rien fourni', () => {
    const texte = 'Les tarifs varient, de 45 € à 95 €.';
    expect(remplacerFourchette(texte, null)).toBe(texte);
  });

  it('ne touche pas à un prix isolé', () => {
    // « 45 € la séance » n'est pas une fourchette : le confondre avec une
    // écraserait un montant juste.
    expect(remplacerFourchette('45 € la séance pour un adulte.', 'de 38 € à 95 €'))
      .toBe('45 € la séance pour un adulte.');
  });
});

describe('forfaitLePlusBas', () => {
  it('lit le montant écrit dans le libellé du forfait', () => {
    expect(forfaitLePlusBas([
      { formules: [{ mensuel: '36 € par mois' }, { mensuel: '58 € par mois' }] },
      { formules: [{ mensuel: '28 € par mois' }, { mensuel: '45 € par mois' }] },
    ])).toBe(28);
  });

  it('ne renvoie rien plutôt que zéro quand il n’y a pas de forfait', () => {
    // Zéro s'afficherait « Dès 0 €/mois » : mieux vaut laisser le texte du CMS.
    expect(forfaitLePlusBas([])).toBeNull();
    expect(forfaitLePlusBas(null)).toBeNull();
    expect(forfaitLePlusBas([{ formules: [{ mensuel: '' }] }])).toBeNull();
  });
});

describe('formuleLaMoinsChere', () => {
  const grille = [
    {
      audience: 'adultes',
      formules: [
        { mensuel: '36 € par mois', seances: '10 séances' },
        { mensuel: '58 € par mois', seances: '20 séances' },
      ],
    },
    {
      audience: 'enfants',
      formules: [
        { mensuel: '28 € par mois', seances: '10 séances' },
        { mensuel: '45 € par mois', seances: '20 séances' },
      ],
    },
  ];

  it('rend le montant AVEC le volume de la même formule', () => {
    // Tout l'intérêt de la fonction : 36 € et « 10 séances » sortent de la même
    // ligne. Les lire séparément permettrait d'annoncer 36 € pour 20 séances.
    expect(formuleLaMoinsChere(grille, 'adultes')).toEqual({
      mensuel: 36,
      seances: '10 séances',
    });
  });

  it('ne mélange pas les publics', () => {
    expect(formuleLaMoinsChere(grille, 'enfants')?.mensuel).toBe(28);
    // Sans public demandé, le moins cher de toute la grille — un prix d'enfant.
    expect(formuleLaMoinsChere(grille)?.mensuel).toBe(28);
  });

  it('renvoie la formule même si son volume n’est pas renseigné', () => {
    // Le suffixe se réduit alors à « /mois » côté page : un prix sans son
    // volume reste juste, un volume inventé ne le serait pas.
    expect(formuleLaMoinsChere([{ formules: [{ mensuel: '36 € par mois' }] }])).toEqual({
      mensuel: 36,
      seances: null,
    });
  });

  it('ne renvoie rien plutôt qu’une formule à zéro euro', () => {
    expect(formuleLaMoinsChere([])).toBeNull();
    expect(formuleLaMoinsChere(null)).toBeNull();
    expect(formuleLaMoinsChere([{ formules: [{ mensuel: '' }] }])).toBeNull();
  });
});

describe('prixParPublic', () => {
  it('ouvre sur le tarif adulte et range l’enfant entre parenthèses', () => {
    expect(prixParPublic({ adultes: 36, enfants: 28 }, '/mois pour 10 séances'))
      .toBe('36 €/mois pour 10 séances (28 € enfant)');
  });

  it('n’annonce plus « Dès » — 45 € est le prix, pas un plancher', () => {
    expect(prixParPublic({ adultes: 45, enfants: 35 }, ' la séance'))
      .toBe('45 € la séance (35 € enfant)');
  });

  it('ne fabrique pas de parenthèse quand un seul public est tarifé', () => {
    expect(prixParPublic({ adultes: 45, enfants: null }, ' la séance')).toBe('45 € la séance');
    expect(prixParPublic({ adultes: 45, enfants: 45 }, ' la séance')).toBe('45 € la séance');
    expect(prixParPublic({ adultes: null, enfants: 35 }, ' la séance')).toBe('35 € la séance');
  });

  it('se tait complètement plutôt que d’afficher un prix vide', () => {
    expect(prixParPublic({ adultes: null, enfants: null }, ' la séance')).toBeNull();
  });

  /*
   * LES TROIS PUBLICS. La fonction n'en connaissait que deux, et l'arrivée des
   * ados ne se serait signalée nulle part : la phrase serait restée juste pour
   * les adultes et les enfants, en taisant simplement le troisième tarif.
   */
  it('réunit les publics qui paient le même prix', () => {
    expect(prixParPublic({ adultes: 45, ados: 35, enfants: 35 }, ' la séance'))
      .toBe('45 € la séance (35 € ado et enfant)');
  });

  it('les sépare quand les montants diffèrent, du plus âgé au plus jeune', () => {
    expect(prixParPublic({ adultes: 45, ados: 40, enfants: 35 }, ' la séance'))
      .toBe('45 € la séance (40 € ado, 35 € enfant)');
  });

  it('ouvre sur les ados quand les adultes n’ont pas de tarif', () => {
    // L'ordre d'AUDIENCES fait la hiérarchie : jamais un prix d'enfant en tête.
    expect(prixParPublic({ ados: 25, enfants: 28 }, '/mois')).toBe('25 €/mois (28 € enfant)');
  });
});

describe('fourchetteForfaits', () => {
  it('va du forfait le plus bas au plus élevé de la grille', () => {
    expect(fourchetteForfaits([
      { formules: [{ mensuel: '36 € par mois' }, { mensuel: '58 € par mois' }] },
      { formules: [{ mensuel: '28 € par mois' }, { mensuel: '45 € par mois' }] },
    ])).toBe('De 28€ à 58€');
  });

  it('ne renvoie rien sans grille', () => {
    expect(fourchetteForfaits(null)).toBeNull();
  });
});


describe('montantFr', () => {
  it('écrit la virgule française, et pas de centimes inutiles', () => {
    expect(montantFr(3600)).toBe('36');
    expect(montantFr(2950)).toBe('29,50');
    expect(montantFr(2125)).toBe('21,25');
  });
});

describe('grilleAvecPrixDeLaBase', () => {
  const formules = [
    { audience: 'adultes', seances: 9, prixCents: 32400, mensualites: 9 },
    { audience: 'adultes', seances: 18, prixCents: 53100, mensualites: 9 },
    { audience: 'enfants', seances: 16, prixCents: 34000, mensualites: 10 },
  ];

  const grille = [
    {
      audience: 'adultes',
      formules: [
        {
          seances: '9 séances',
          mensuel: '36 € par mois',
          detail: 'environ une fois par mois sur la saison ; 324 €, en 9 mensualités ou en une fois',
        },
      ],
    },
  ];

  /*
   * LA PHRASE APPARTIENT À ISABELLE, LES NOMBRES À LA BASE — le geste de
   * `remplacerFourchette`, appliqué à la grille. Depuis que la séance en
   * dépassement se facture au prix divisé du forfait, ces montants facturent :
   * les laisser dans le CMS en aurait fait un prix affiché et un prix facturé.
   */
  it('reprend le mensuel, le total et le nombre d’échéances', () => {
    const dehors = [{ audience: 'adultes', seances: 9, prixCents: 36000, mensualites: 10 }];
    const [t] = grilleAvecPrixDeLaBase(grille, dehors);
    expect(t.formules[0].mensuel).toBe('36 € par mois');   // 360 / 10
    expect(t.formules[0].detail).toContain('360 €');
    expect(t.formules[0].detail).toContain('en 10 mensualités');
  });

  it('garde les mots autour des nombres', () => {
    const [t] = grilleAvecPrixDeLaBase(grille, formules);
    expect(t.formules[0].mensuel).toBe('36 € par mois');
    expect(t.formules[0].detail).toBe(
      'environ une fois par mois sur la saison ; 324 €, en 9 mensualités ou en une fois',
    );
  });

  it('écrit les centimes quand le mensuel n’est pas rond', () => {
    const [t] = grilleAvecPrixDeLaBase(
      [{ audience: 'adultes', formules: [{ seances: '18 séances', mensuel: '59 € par mois', detail: null }] }],
      [{ audience: 'adultes', seances: 18, prixCents: 53100, mensualites: 18 }],
    );
    expect(t.formules[0].mensuel).toBe('29,50 € par mois');
  });

  it('apparie sur le public ET le nombre de séances', () => {
    // 16 séances existe chez les enfants, pas chez les adultes : la ligne
    // adulte ne doit pas hériter du tarif enfant.
    const [t] = grilleAvecPrixDeLaBase(
      [{ audience: 'adultes', formules: [{ seances: '16 séances', mensuel: '99 € par mois', detail: null }] }],
      formules,
    );
    expect(t.formules[0].mensuel).toBe('99 € par mois');
  });

  it('laisse la grille intacte si la base ne répond pas', () => {
    // Le repli de tout ce fichier : un tarif périmé affiché vaut mieux qu'une
    // page sans prix, et mieux qu'une construction qui échoue.
    expect(grilleAvecPrixDeLaBase(grille, null)[0].formules[0].mensuel).toBe('36 € par mois');
    expect(grilleAvecPrixDeLaBase(grille, [])[0].formules[0].mensuel).toBe('36 € par mois');
  });

  it('ne perd pas une ligne du CMS qu’aucune formule ne porte', () => {
    const [t] = grilleAvecPrixDeLaBase(
      [{ audience: 'ados', formules: [{ seances: '9 séances', mensuel: '25 € par mois', detail: null }] }],
      formules,
    );
    expect(t.formules).toHaveLength(1);
    expect(t.formules[0].mensuel).toBe('25 € par mois');
  });
});

describe('libelleFormule', () => {
  it('dit le public, le volume, le prix, et ce que coûte une séance en plus', () => {
    // Le prix divisé est la raison d'être de l'étiquette : c'est lui qui
    // facture un dépassement, et il ne se lit nulle part ailleurs.
    expect(libelleFormule({
      libelle: '18 séances',
      audience: 'adultes', seances: 18, prixCents: 53100,
    })).toBe('adultes — 18 séances · 531 € (29,50 € la séance en plus)');
  });

  it('garde les deux décimales même sur un compte rond', () => {
    expect(libelleFormule({
      libelle: '9 séances',
      audience: 'ados', seances: 9, prixCents: 22500,
    })).toBe('ados — 9 séances · 225 € (25,00 € la séance en plus)');
  });
});

describe('libelleFormule — version publique', () => {
  const f = { libelle: '18 séances', audience: 'adultes', seances: 18, prixCents: 53100 };

  it('tait le prix d’un dépassement, qui ne regarde pas l’acheteur', () => {
    // « 29,50 € la séance en plus » sert à Isabelle quand elle corrige un
    // abonnement. À quelqu'un qui choisit sa formule, c'est un second prix qui
    // brouille le premier.
    expect(libelleFormule(f, { prixDivise: false }))
      .toBe('adultes — 18 séances · 531 €');
  });

  it('le garde par défaut, pour les écrans d’administration', () => {
    expect(libelleFormule(f)).toBe('adultes — 18 séances · 531 € (29,50 € la séance en plus)');
  });
});

describe('heureCourte', () => {
  it('abrège une heure de base de données', () => {
    expect(heureCourte('09:30:00')).toBe('9h30');
    expect(heureCourte('14:00:00')).toBe('14h');
    expect(heureCourte('10:05:00')).toBe('10h05');
  });

  it('rend ce qu’elle ne sait pas lire, plutôt que rien', () => {
    expect(heureCourte('')).toBe('');
    expect(heureCourte('n’importe quoi')).toBe('n’importe quoi');
  });
});
