import { describe, it, expect } from 'vitest';
import { reductionDe, normaliserCode, etatDe } from '../codes-promo';

const base = {
  code: 'RENTREE26',
  reductionPourcent: null as number | null,
  reductionCents: null as number | null,
  saison: null as string | null,
  usagesMax: null as number | null,
  usages: 0,
  expireLe: null as string | null,
};
const contexte = { saison: '2026-2027', aujourdhui: new Date('2026-09-01T00:00:00Z') };

describe('normaliserCode', () => {
  it('ignore la casse et les espaces', () => {
    expect(normaliserCode('  rentree26 ')).toBe('RENTREE26');
  });
});

describe('reductionDe', () => {
  it('applique un pourcentage, arrondi au centime', () => {
    expect(reductionDe(32400, { ...base, reductionPourcent: 10 }, contexte))
      .toEqual({ ok: true, valeur: 3240 });
    // 53100 × 15 % = 7965 exactement ; 22500 × 33 % = 7425.
    expect(reductionDe(53100, { ...base, reductionPourcent: 15 }, contexte))
      .toEqual({ ok: true, valeur: 7965 });
  });

  it('applique un montant fixe', () => {
    expect(reductionDe(32400, { ...base, reductionCents: 2000 }, contexte))
      .toEqual({ ok: true, valeur: 2000 });
  });

  it('ne réduit jamais au-delà du prix du forfait', () => {
    // Un montant fixe plus grand que le forfait ne doit pas produire un total
    // négatif — ni, pire, une réduction qui déborderait sur l'adhésion.
    expect(reductionDe(22500, { ...base, reductionCents: 99000 }, contexte))
      .toEqual({ ok: true, valeur: 22500 });
  });

  it('refuse un code expiré', () => {
    const r = reductionDe(32400, { ...base, reductionPourcent: 10, expireLe: '2026-08-31' }, contexte);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erreur).toMatch(/expir/i);
  });

  it('accepte un code qui expire aujourd’hui', () => {
    // Le dernier jour est inclus : « valable jusqu'au 1er septembre » se
    // comprend comme « le 1er compris ».
    expect(reductionDe(32400, { ...base, reductionPourcent: 10, expireLe: '2026-09-01' }, contexte).ok)
      .toBe(true);
  });

  it('refuse un code dont les usages sont épuisés', () => {
    const r = reductionDe(32400, { ...base, reductionPourcent: 10, usagesMax: 5, usages: 5 }, contexte);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erreur).toMatch(/plus disponible|épuisé/i);
  });

  it('laisse passer tant qu’il reste un usage', () => {
    expect(reductionDe(32400, { ...base, reductionPourcent: 10, usagesMax: 5, usages: 4 }, contexte).ok)
      .toBe(true);
  });

  it('refuse un code d’une autre saison', () => {
    const r = reductionDe(32400, { ...base, reductionPourcent: 10, saison: '2025-2026' }, contexte);
    expect(r.ok).toBe(false);
  });

  it('accepte un code sans saison, valable partout', () => {
    expect(reductionDe(32400, { ...base, reductionPourcent: 10, saison: null }, contexte).ok).toBe(true);
  });

  it('refuse un code qui ne réduit rien', () => {
    // Ni pourcentage ni montant : une saisie fautive côté admin. Mieux vaut le
    // dire que d'accorder une remise de zéro sans que personne ne comprenne.
    expect(reductionDe(32400, base, contexte).ok).toBe(false);
  });
});

describe('etatDe', () => {
  it('dit actif un code sans limite', () => {
    expect(etatDe({ ...base, reductionPourcent: 10 }, contexte)).toBe('actif');
  });

  it('dit épuisé un code dont les usages sont consommés', () => {
    expect(etatDe({ ...base, usagesMax: 1, usages: 1 }, contexte)).toBe('epuise');
    expect(etatDe({ ...base, usagesMax: 5, usages: 4 }, contexte)).toBe('actif');
  });

  it('dit expiré un code dont le dernier jour est passé', () => {
    expect(etatDe({ ...base, expireLe: '2026-08-31' }, contexte)).toBe('expire');
    // Le dernier jour est inclus : il vaut encore aujourd'hui.
    expect(etatDe({ ...base, expireLe: '2026-09-01' }, contexte)).toBe('actif');
  });

  it('dit hors saison un code d’une autre saison', () => {
    expect(etatDe({ ...base, saison: '2025-2026' }, contexte)).toBe('hors-saison');
    expect(etatDe({ ...base, saison: null }, contexte)).toBe('actif');
  });

  /*
   * L'ORDRE COMPTE : l'état affiché à Isabelle doit être celui que l'adhérent
   * lit à l'écran. Deux raisons de refus, un seul motif montré — le même des
   * deux côtés, sinon elle cherche un code « épuisé » qu'on a dit « expiré ».
   */
  it('retient le même motif que le refus à l’encaissement', () => {
    const cumule = { ...base, reductionPourcent: 10, saison: '2025-2026', expireLe: '2026-08-31', usagesMax: 1, usages: 1 };
    expect(etatDe(cumule, contexte)).toBe('hors-saison');

    const perime = { ...base, reductionPourcent: 10, expireLe: '2026-08-31', usagesMax: 1, usages: 1 };
    expect(etatDe(perime, contexte)).toBe('expire');
    const r = reductionDe(32400, perime, contexte);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erreur).toMatch(/expir/i);
  });

  it('ne dit actif que ce que le moteur accepte vraiment', () => {
    // Le lien entre les deux : tout code dit « actif » doit produire une remise.
    const cas = [
      { ...base, reductionPourcent: 10 },
      { ...base, reductionCents: 2000, usagesMax: 5, usages: 4 },
      { ...base, reductionPourcent: 50, expireLe: '2026-09-30', saison: '2026-2027' },
    ];
    for (const c of cas) {
      expect(etatDe(c, contexte)).toBe('actif');
      expect(reductionDe(32400, c, contexte).ok).toBe(true);
    }
  });
});
