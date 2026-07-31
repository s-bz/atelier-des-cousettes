import { describe, expect, it } from 'vitest';
import {
  forfaitLePlusBas,
  formuleLaMoinsChere,
  fourchette,
  fourchetteForfaits,
  prixDeuxPublics,
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

describe('prixDeuxPublics', () => {
  it('ouvre sur le tarif adulte et range l’enfant entre parenthèses', () => {
    expect(prixDeuxPublics(36, 28, '/mois pour 10 séances'))
      .toBe('36 €/mois pour 10 séances (28 € enfant)');
  });

  it('n’annonce plus « Dès » — 45 € est le prix, pas un plancher', () => {
    expect(prixDeuxPublics(45, 35, ' la séance')).toBe('45 € la séance (35 € enfant)');
  });

  it('ne fabrique pas de parenthèse quand un seul public est tarifé', () => {
    expect(prixDeuxPublics(45, null, ' la séance')).toBe('45 € la séance');
    expect(prixDeuxPublics(45, 45, ' la séance')).toBe('45 € la séance');
    expect(prixDeuxPublics(null, 35, ' la séance')).toBe('35 € la séance');
  });

  it('se tait complètement plutôt que d’afficher un prix vide', () => {
    expect(prixDeuxPublics(null, null, ' la séance')).toBeNull();
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
