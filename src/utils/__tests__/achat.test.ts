import { describe, it, expect } from 'vitest';
import { verifierAchat } from '../achat';

const formule = {
  id: '2026-2027-adultes-9', libelle: '9 séances', audience: 'adultes',
  seances: 9, prixCents: 32400, mensualites: 9,
};
const creneau = { id: 'atelier-du-jeudi-matin', label: 'Atelier du jeudi matin', audience: 'adultes' };

describe('verifierAchat', () => {
  it('laisse passer un achat cohérent', () => {
    expect(verifierAchat({ audience: 'adulte', prenom: 'Léa D.', formule, creneau }))
      .toEqual({ ok: true, valeur: null });
  });

  it('refuse un créneau d’un autre public', () => {
    // L'inscription d'office exige que le créneau soit celui du public de la
    // personne, et écarte le reste en silence : laisser passer ferait payer
    // quelqu'un pour un planning qui resterait vide.
    const r = verifierAchat({
      audience: 'enfant', prenom: 'Léa D.', formule,
      creneau: { ...creneau, audience: 'ados' },
    });
    expect(r.ok).toBe(false);
  });

  it('refuse une formule d’un autre public', () => {
    const r = verifierAchat({
      audience: 'ado', prenom: 'Léa D.', creneau: { ...creneau, audience: 'ados' },
      formule: { ...formule, audience: 'adultes' },
    });
    expect(r.ok).toBe(false);
  });

  it('exige un nom', () => {
    for (const prenom of ['', '   ']) {
      expect(verifierAchat({ audience: 'adulte', prenom, formule, creneau }).ok).toBe(false);
    }
  });

  it('refuse une formule ou un créneau introuvable', () => {
    expect(verifierAchat({ audience: 'adulte', prenom: 'Léa', formule: undefined, creneau }).ok)
      .toBe(false);
    expect(verifierAchat({ audience: 'adulte', prenom: 'Léa', formule, creneau: undefined }).ok)
      .toBe(false);
  });

  it('dit lequel des deux ne va pas, et pour quel public', () => {
    // Le message part à l'écran : « ça ne marche pas » ferait recommencer au
    // hasard.
    const r = verifierAchat({
      audience: 'enfant', prenom: 'Léa', formule, creneau: { ...creneau, audience: 'ados' },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.erreur).toContain('ados');
      expect(r.erreur).toContain('enfant');
    }
  });
});
