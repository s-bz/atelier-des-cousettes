import { describe, it, expect } from 'vitest';
import { lireNotification, jetonValide, construireEcheancier, corpsIntention }
  from '../helloasso';

describe('lireNotification', () => {
  it('tire sa clé d’idempotence de l’identifiant de commande', () => {
    // HelloAsso réémet une notification non acquittée pendant 48 h. C'est cette
    // clé qui fait qu'un réémission ne crée jamais une seconde ligne.
    const brut = { eventType: 'Order', data: { id: 12345 }, metadata: {} };

    expect(lireNotification(brut)).toEqual({
      type: 'Order',
      identifiant: '12345',
      cle: 'Order:12345',
    });
  });

  it('ne confond pas deux charges utiles qu’elle ne sait pas lire', () => {
    // LE CAS QUI COÛTE DE L'ARGENT. Sans identifiant reconnu, une clé constante
    // ferait passer la deuxième notification pour un doublon de la première :
    // elle serait écartée, et la commande qu'elle portait disparaîtrait.
    const a = lireNotification({ eventType: 'Bizarre', data: { reference: 'A' } });
    const b = lireNotification({ eventType: 'Bizarre', data: { reference: 'B' } });

    expect(a.cle).not.toBe(b.cle);
  });
});

describe('jetonValide', () => {
  const URL_OK = 'https://atelier-des-cousettes.fr/api/helloasso/notifications/?jeton=secret';

  it('reconnaît le jeton attendu', () => {
    expect(jetonValide(URL_OK, 'secret')).toBe(true);
  });

  it('refuse un jeton faux, absent, ou de longueur différente', () => {
    expect(jetonValide(URL_OK, 'autre-chose')).toBe(false);
    expect(jetonValide('https://exemple.fr/api/helloasso/notifications/', 'secret')).toBe(false);
    expect(jetonValide(URL_OK, 'secre')).toBe(false);
  });

  it('refuse quand aucun secret n’est configuré', () => {
    // Sans secret attendu, rien ne peut être vérifié. Répondre « valide »
    // reviendrait à traiter comme authentifiée n'importe quelle requête d'un
    // environnement mal configuré.
    expect(jetonValide(URL_OK, undefined)).toBe(false);
    expect(jetonValide(URL_OK, '')).toBe(false);
  });
});

describe('construireEcheancier', () => {
  // Toutes les règles ci-dessous ont été mesurées contre l'API réelle le
  // 24/08/2026, et non lues dans une documentation. Voir DESIGN-helloasso.md §8.
  const achat = new Date('2026-08-24T10:00:00Z');

  it('répartit un forfait en autant de versements que de mensualités', () => {
    // Neuf versements = un paiement à l'inscription, puis huit échéances.
    const e = construireEcheancier({ totalCents: 32400, versements: 9, achatLe: achat });

    expect(e.initialAmount).toBe(3600);
    expect(e.terms).toHaveLength(8);
    expect(e.terms.every((t) => t.amount === 3600)).toBe(true);
    expect(e.totalAmount).toBe(32400);
  });

  it('respecte l’invariant qu’HelloAsso vérifie', () => {
    // « totalAmount must be equal to the sum of the initial amount and
    // subsequent terms » — une intention qui y manque est refusée.
    for (const [total, n] of [[32400, 9], [53100, 9], [22500, 9], [39600, 9], [34000, 10]] as const) {
      const e = construireEcheancier({ totalCents: total, versements: n, achatLe: achat });
      expect(e.initialAmount + e.terms.reduce((s, t) => s + t.amount, 0)).toBe(e.totalAmount);
      expect(e.totalAmount).toBe(total);
    }
  });

  it('place la première échéance le mois SUIVANT le paiement initial', () => {
    // « Aucune échéance n'est autorisée sur le mois courant ou dans le passé ».
    const e = construireEcheancier({ totalCents: 32400, versements: 9, achatLe: achat });
    expect(e.terms[0].date.slice(0, 7)).toBe('2026-09');
  });

  it('ne dépasse jamais le 27 du mois', () => {
    // « Aucune échéance après le 27 de chaque mois n'est autorisée ».
    const tard = construireEcheancier({ totalCents: 32400, versements: 9, achatLe: achat, jour: 31 });
    expect(tard.terms.every((t) => Number(t.date.slice(8, 10)) <= 27)).toBe(true);

    const tot = construireEcheancier({ totalCents: 32400, versements: 9, achatLe: achat, jour: 5 });
    expect(tot.terms.every((t) => t.date.slice(8, 10) === '05')).toBe(true);
  });

  it('une échéance par mois, dans l’ordre', () => {
    const e = construireEcheancier({ totalCents: 34000, versements: 10, achatLe: achat });
    const mois = e.terms.map((t) => t.date.slice(0, 7));
    expect(mois).toEqual([...new Set(mois)]);
    expect([...mois].sort()).toEqual(mois);
  });

  it('refuse un échéancier qui dépasserait douze mois', () => {
    // « Aucune échéance n'est autorisée au delà de 12 mois ».
    expect(() => construireEcheancier({ totalCents: 120000, versements: 14, achatLe: achat }))
      .toThrow(/12 mois/);
  });

  it('pose l’adhésion sur le premier versement, et sur lui seul', () => {
    // La campagne ne savait pas le faire : son montant mensuel était unique.
    const e = construireEcheancier({
      totalCents: 32400, versements: 9, achatLe: achat, supplementInitialCents: 1500,
    });

    expect(e.initialAmount).toBe(5100);
    expect(e.terms.every((t) => t.amount === 3600)).toBe(true);
    expect(e.totalAmount).toBe(33900);
  });

  it('ne perd pas un centime sur un montant qui ne tombe pas juste', () => {
    // Le reste se pose sur le premier versement : c'est le seul que le payeur
    // voit avant de s'engager, donc le seul où une différence est honnête.
    const e = construireEcheancier({ totalCents: 10000, versements: 3, achatLe: achat });
    expect(e.initialAmount + e.terms.reduce((s, t) => s + t.amount, 0)).toBe(10000);
    expect(e.terms.map((t) => t.amount)).toEqual([3333, 3333]);
    expect(e.initialAmount).toBe(3334);
  });
});

describe('corpsIntention', () => {
  const achat = new Date('2026-08-24T10:00:00Z');
  const base = {
    libelle: 'Forfait adultes 9 séances — Léa D. — saison 2026-2027',
    totalCents: 32400,
    versements: 9,
    achatLe: achat,
    metadata: { saison: '2026-2027', formule_id: '2026-2027-adultes-9' },
    urls: {
      retour: 'https://exemple.fr/retour/',
      erreur: 'https://exemple.fr/erreur/',
      retourArriere: 'https://exemple.fr/ateliers-reguliers/',
    },
  };

  it('assemble un corps que l’API accepte', () => {
    const c = corpsIntention(base);

    expect(c.itemName).toBe(base.libelle);
    expect(c.totalAmount).toBe(32400);
    expect(c.initialAmount).toBe(3600);
    expect(c.terms).toHaveLength(8);
    expect(c.containsDonation).toBe(false);
    expect(c.returnUrl).toBe('https://exemple.fr/retour/');
    expect(c.errorUrl).toBe('https://exemple.fr/erreur/');
    expect(c.backUrl).toBe('https://exemple.fr/ateliers-reguliers/');
  });

  it('porte les métadonnées telles quelles', () => {
    // C'est `metadata` qui remplace la table de correspondance du PRD §6 : le
    // formule_id est écrit par le site, il n'a jamais à être deviné.
    expect(corpsIntention(base).metadata).toEqual(base.metadata);
  });

  it('borne le libellé aux 250 caractères de l’API', () => {
    const c = corpsIntention({ ...base, libelle: 'Forfait ' + 'très long '.repeat(40) });
    expect(c.itemName.length).toBe(250);
  });

  it('ne pose aucune échéance sur un règlement en une fois', () => {
    const c = corpsIntention({ ...base, versements: 1 });
    expect(c.terms).toEqual([]);
    expect(c.initialAmount).toBe(32400);
    expect(c.totalAmount).toBe(32400);
  });

  it('n’envoie un payeur que s’il est connu', () => {
    // Un objet payeur vide vaut mieux absent : HelloAsso demandera alors les
    // coordonnées lui-même plutôt que d'afficher des champs pré-remplis à blanc.
    expect(corpsIntention(base).payer).toBeUndefined();

    const avec = corpsIntention({ ...base, payeur: { email: 'marie@exemple.fr' } });
    expect(avec.payer).toEqual({ email: 'marie@exemple.fr' });
  });
});
