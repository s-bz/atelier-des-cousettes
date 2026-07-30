import { describe, it, expect } from 'vitest';
import { ATELIER_GROUPS, ATELIER_GROUP_LABELS, groupeDe } from '../ateliers';

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
