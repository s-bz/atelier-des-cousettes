import { describe, it, expect } from 'vitest';
import {
  ATELIER_GROUPS,
  ATELIER_GROUP_LABELS,
  AUDIENCES,
  PRIX_SEANCE_PAR_DEFAUT,
  creneauDe,
  groupeDe,
  libelleAudience,
  personneDe,
  titreAudience,
} from '../ateliers';

describe('ATELIER_GROUPS', () => {
  it('has unique ids', () => {
    const ids = ATELIER_GROUPS.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all entries have non-empty id and label', () => {
    ATELIER_GROUPS.forEach((g) => {
      expect(g.id.length).toBeGreaterThan(0);
      expect(g.label.length).toBeGreaterThan(0);
    });
  });
});

describe('ATELIER_GROUP_LABELS', () => {
  it('has one entry per group', () => {
    expect(Object.keys(ATELIER_GROUP_LABELS)).toHaveLength(ATELIER_GROUPS.length);
  });

  it('maps each id to its label', () => {
    ATELIER_GROUPS.forEach((g) => {
      expect(ATELIER_GROUP_LABELS[g.id]).toBe(g.label);
    });
  });
});

describe('groupeDe', () => {
  it('déduit le groupe des paires connues', () => {
    expect(groupeDe('Revel', 'adultes')).toBe('revel-adultes');
    expect(groupeDe('Revel', 'enfants')).toBe('revel-enfants');
    expect(groupeDe('Verdalle', 'adultes')).toBe('verdalle');
    expect(groupeDe('Verdalle', 'enfants')).toBe('verdalle-enfants');
  });

  it('ignore la casse et les espaces du lieu', () => {
    // Le lieu vient d'un champ libre : « verdalle » et « Verdalle  » doivent
    // aboutir au même groupe, sans quoi un doublon apparaîtrait sur le site.
    expect(groupeDe('  verdalle ', 'adultes')).toBe('verdalle');
  });

  it('fabrique un groupe pour un lieu inconnu plutôt que d’échouer', () => {
    // Le jour où l'atelier s'installe ailleurs, la création doit rester
    // possible : la page publique retombe sur le nom du lieu.
    expect(groupeDe('Sorèze', 'adultes')).toBe('soreze-adultes');
    expect(groupeDe('Saint-Amans', 'enfants')).toBe('saint-amans-enfants');
  });

  it('ne renvoie jamais de chaîne vide, que la contrainte refuserait', () => {
    expect(groupeDe('', 'adultes')).toBe('lieu-adultes');
  });
});

describe('AUDIENCES', () => {
  it('va du public le plus âgé au plus jeune — c’est l’ordre d’affichage', () => {
    expect(AUDIENCES.map((a) => a.creneau)).toEqual(['adultes', 'ados', 'enfants']);
  });

  /*
   * LE PLURIEL EST EXACTEMENT LE SINGULIER SUIVI D'UN « s », et ce n'est pas une
   * coquetterie : la base rapproche les deux vocabulaires en concaténant ce
   * caractère (`p.audience || 's'`), dans book_participant comme dans
   * run_auto_enrolment. Un public qui romprait la règle — « ados » / « adolescent »
   * — ne serait jamais apparié, et personne ne pourrait plus s'y inscrire sans
   * qu'aucune erreur ne le dise.
   */
  it('garde le pluriel que la base fabrique en ajoutant un « s »', () => {
    AUDIENCES.forEach((a) => expect(`${a.personne}s`).toBe(a.creneau));
  });

  it('tarife chaque public à la création d’un créneau', () => {
    AUDIENCES.forEach((a) => {
      expect(PRIX_SEANCE_PAR_DEFAUT[a.creneau]).toMatch(/^\d+\.\d{2}$/);
    });
  });
});

describe('personneDe / creneauDe', () => {
  it('traduit dans les deux sens', () => {
    expect(personneDe('adultes')).toBe('adulte');
    expect(personneDe('ados')).toBe('ado');
    expect(personneDe('enfants')).toBe('enfant');
    expect(creneauDe('ado')).toBe('ados');
  });

  it('rend un public inconnu tel quel plutôt que de le ranger chez les adultes', () => {
    // Le ternaire qu'elles remplacent faisait exactement l'inverse : tout ce
    // qui n'était pas « enfants » devenait « adulte », ados compris. Une valeur
    // que la base refusera vaut mieux qu'une requête adressée au mauvais public.
    expect(personneDe('seniors')).toBe('seniors');
    expect(creneauDe('senior')).toBe('senior');
  });
});

describe('libelleAudience / titreAudience', () => {
  it('nomme le public au singulier comme au pluriel', () => {
    expect(libelleAudience('ados')).toBe('Ados');
    expect(libelleAudience('ado')).toBe('Ados');
    expect(titreAudience('ados')).toBe('Pour les ados');
  });

  it('ne perd pas un public qu’elle ne connaît pas', () => {
    expect(libelleAudience('seniors')).toBe('seniors');
    expect(titreAudience('seniors')).toBe('Pour les seniors');
  });
});

describe('groupeDe, pour le public ados', () => {
  it('reconnaît le croisement Revel × ados', () => {
    expect(groupeDe('Revel', 'ados')).toBe('revel-ados');
  });
});
