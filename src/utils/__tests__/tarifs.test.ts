import { describe, expect, it } from 'vitest';
import { forfaitLePlusBas, fourchette, fourchetteForfaits, remplacerFourchette } from '../tarifs';

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
