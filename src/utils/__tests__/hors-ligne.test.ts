import { describe, it, expect } from 'vitest';
import { normaliserCode, etatDe, verifierReglement } from '../hors-ligne';
import type { ReglementHorsLigne } from '../hors-ligne';

const base: ReglementHorsLigne = {
  code: 'K7M4PQ2R',
  moyen: 'cheque',
  montantCents: 33900,        // forfait 324 € + adhésion 15 €
  saison: '2026-2027',
  encaisseLe: '2026-08-20',
  utiliseLe: null,
  expireLe: null,
};
const contexte = { saison: '2026-2027', aujourdhui: new Date('2026-09-01T00:00:00Z') };

describe('normaliserCode', () => {
  it('ignore la casse et les espaces', () => {
    expect(normaliserCode('  k7m4pq2r ')).toBe('K7M4PQ2R');
  });
});

describe('etatDe', () => {
  it('dit disponible un règlement de la saison, jamais employé', () => {
    expect(etatDe(base, contexte)).toBe('disponible');
  });

  it('dit employé un règlement déjà consommé', () => {
    expect(etatDe({ ...base, utiliseLe: '2026-08-25T10:00:00Z' }, contexte)).toBe('utilise');
  });

  it('dit expiré un règlement dont le dernier jour est passé', () => {
    expect(etatDe({ ...base, expireLe: '2026-08-31' }, contexte)).toBe('expire');
    // Le dernier jour est inclus, comme partout ailleurs.
    expect(etatDe({ ...base, expireLe: '2026-09-01' }, contexte)).toBe('disponible');
  });

  it('dit hors saison un règlement d’une autre saison', () => {
    expect(etatDe({ ...base, saison: '2025-2026' }, contexte)).toBe('hors-saison');
  });

  /*
   * L'ORDRE COMPTE, comme pour les codes de réduction : ce qu'Isabelle lit dans
   * sa liste doit être ce que la famille lit à l'écran. Un règlement employé ET
   * périmé se présente comme employé des deux côtés.
   */
  it('retient le même motif que le refus à l’achat', () => {
    const cumule = { ...base, utiliseLe: '2026-08-25T10:00:00Z', expireLe: '2026-08-31' };
    expect(etatDe(cumule, contexte)).toBe('utilise');
    const r = verifierReglement(33900, cumule, contexte);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erreur).toMatch(/déjà servi/i);
  });
});

describe('verifierReglement', () => {
  it('accepte quand le montant reçu est exactement le prix', () => {
    expect(verifierReglement(33900, base, contexte)).toEqual({ ok: true, valeur: null });
  });

  /*
   * L'ÉCART ARRÊTE L'ACHAT, ET LE MESSAGE NOMME LES DEUX CHIFFRES.
   *
   * Le chèque a payé un forfait de neuf séances ; laisser passer celui de
   * dix-huit reviendrait à en offrir la moitié sans que personne l'ait décidé.
   * Et « ce code ne marche pas » ferait ressaisir le même code, alors que voir
   * 339 contre 546 explique tout.
   */
  it('refuse une inscription plus chère que le règlement', () => {
    const r = verifierReglement(54600, base, contexte);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.erreur).toContain('339');
      expect(r.erreur).toContain('546');
    }
  });

  it('refuse aussi une inscription moins chère', () => {
    // Le trop-perçu n'est pas plus acceptable que le sous-paiement : c'est
    // quinze euros d'adhésion déjà réglés qu'on encaisserait deux fois.
    const r = verifierReglement(32400, base, contexte);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erreur).toContain('324');
  });

  it('refuse un règlement d’une autre saison', () => {
    const r = verifierReglement(33900, { ...base, saison: '2025-2026' }, contexte);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erreur).toMatch(/saison/i);
  });

  it('refuse un règlement expiré', () => {
    const r = verifierReglement(33900, { ...base, expireLe: '2026-08-31' }, contexte);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erreur).toMatch(/expir/i);
  });

  it('ne dit disponible que ce que l’achat accepte vraiment', () => {
    // Le lien entre les deux écrans : tout règlement dit « disponible » doit
    // passer, à montant égal.
    const cas: ReglementHorsLigne[] = [
      base,
      { ...base, moyen: 'especes' },
      { ...base, expireLe: '2026-09-30' },
    ];
    for (const r of cas) {
      expect(etatDe(r, contexte)).toBe('disponible');
      expect(verifierReglement(r.montantCents, r, contexte).ok).toBe(true);
    }
  });
});
