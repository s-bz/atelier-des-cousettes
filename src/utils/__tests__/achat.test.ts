import { describe, it, expect } from 'vitest';
import { verifierAchat, origineJoignable } from '../achat';

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

describe('origineJoignable', () => {
  const site = new URL('https://atelier-des-cousettes.fr');

  it('garde une origine publique', () => {
    expect(origineJoignable('https://atelier-des-cousettes.fr', site))
      .toBe('https://atelier-des-cousettes.fr');
  });

  it('garde une adresse de prévisualisation', () => {
    // Les déploiements de préversion sont joignables : HelloAsso les accepte.
    expect(origineJoignable('https://atelier-abc123.vercel.app', site))
      .toBe('https://atelier-abc123.vercel.app');
  });

  it('remplace une origine locale par le site public', () => {
    // « Le champ BackUrl est invalide » : HelloAsso refuse localhost. Sans ce
    // repli, le parcours d'achat est intestable en développement.
    for (const locale of ['http://localhost:4321', 'http://127.0.0.1:4321', 'http://[::1]:4321']) {
      expect(origineJoignable(locale, site)).toBe('https://atelier-des-cousettes.fr');
    }
  });

  it('refuse le http en clair, que HelloAsso rejette aussi', () => {
    expect(origineJoignable('http://exemple.fr', site)).toBe('https://atelier-des-cousettes.fr');
  });

  it('ne laisse jamais de barre oblique finale', () => {
    // `String(Astro.site)` en porte une : sans cela on construirait
    // « https://…fr//ateliers-reguliers/ ».
    expect(origineJoignable('http://localhost:4321', new URL('https://atelier-des-cousettes.fr/')))
      .toBe('https://atelier-des-cousettes.fr');
  });

  it('rend l’origine telle quelle si aucun site n’est configuré', () => {
    // Rien de mieux à proposer : l'erreur de l'API sera plus parlante qu'un
    // repli inventé.
    expect(origineJoignable('http://localhost:4321', undefined)).toBe('http://localhost:4321');
  });
});
