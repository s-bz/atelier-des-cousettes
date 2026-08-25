import { describe, it, expect } from 'vitest';
import { lireCommande } from '../provisionnement';

const intentionPayee = {
  id: 6941321,
  metadata: {
    saison: '2026-2027',
    produit: 'forfait',
    formule_id: '2026-2027-adultes-9',
    creneau_id: 'atelier-du-jeudi-matin',
    participant: 'Léa D.',
    adhesion_cents: 1500,
  },
  order: {
    id: 88123,
    payer: { email: 'marie@exemple.fr', firstName: 'Marie', lastName: 'D.' },
  },
};

describe('lireCommande', () => {
  it('lit tout ce qu’il faut pour provisionner', () => {
    const r = lireCommande(intentionPayee);

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.valeur).toEqual({
      produit: 'forfait',
      orderId: '88123',
      codePromo: null,
      email: 'marie@exemple.fr',
      prenom: 'Léa',
      nom: 'D.',
      saison: '2026-2027',
      formuleId: '2026-2027-adultes-9',
      creneauId: 'atelier-du-jeudi-matin',
      adhesionCents: 1500,
      // Cette intention-là n'en porte pas : elle est du même âge que celles
      // créées avant que le champ existe. Zéro plutôt qu'absent — la mesure
      // d'audience additionne, elle ne doit pas rencontrer `undefined`.
      montantCents: 0,
    });
  });

  it('retient le code employé, pour en compter l’usage', () => {
    // L'usage se décompte au provisionnement, pas à la création de l'intention :
    // un panier abandonné ne doit pas consommer un code à tirage limité.
    const r = lireCommande({
      ...intentionPayee,
      metadata: { ...intentionPayee.metadata, code_promo: 'RENTREE26', reduction_cents: 3240 },
    });
    expect(r.ok && r.valeur.codePromo).toBe('RENTREE26');
  });

  it('refuse une intention dont le paiement n’est pas acquis', () => {
    // `order` n'apparaît qu'une fois le paiement autorisé. Provisionner avant,
    // ce serait créer un abonnement pour quelqu'un qui a fermé l'onglet.
    const { order, ...sansCommande } = intentionPayee;
    const r = lireCommande(sansCommande);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erreur).toMatch(/paiement/i);
  });

  it('refuse plutôt que de deviner un champ manquant', () => {
    // Chacun de ces cas part dans la file « à traiter » avec sa charge utile :
    // aucune commande n'est jamais silencieusement ignorée (PRD §6).
    const sans = (cle: string) => {
      const metadata = { ...intentionPayee.metadata } as Record<string, unknown>;
      delete metadata[cle];
      return lireCommande({ ...intentionPayee, metadata });
    };

    for (const cle of ['formule_id', 'creneau_id', 'participant', 'saison']) {
      const r = sans(cle);
      expect(r.ok, `${cle} manquant devrait être refusé`).toBe(false);
    }
  });

  it('refuse une commande sans adresse de payeur', () => {
    // Sans elle, impossible de rattacher la commande à une famille — ni même
    // d'en créer une.
    const r = lireCommande({ ...intentionPayee, order: { id: 88123, payer: {} } });
    expect(r.ok).toBe(false);
  });

  it('tient une adhésion absente pour zéro', () => {
    const { adhesion_cents, ...metadata } = intentionPayee.metadata;
    const r = lireCommande({ ...intentionPayee, metadata });
    expect(r.ok).toBe(true);
    if (r.ok && r.valeur.produit === 'forfait') expect(r.valeur.adhesionCents).toBe(0);
  });

  it('sépare le prénom du nom, et supporte un nom composé', () => {
    // Le nom saisi est libre : « Léa » seule, « Marie-Claire de la Tour »…
    // Le premier mot est le prénom, le reste le nom — et jamais l'inverse.
    const avec = (participant: string) =>
      lireCommande({ ...intentionPayee, metadata: { ...intentionPayee.metadata, participant } });

    const compose = avec('Marie-Claire de la Tour');
    expect(compose.ok && compose.valeur).toMatchObject({ prenom: 'Marie-Claire', nom: 'de la Tour' });

    const seul = avec('Léa');
    expect(seul.ok && seul.valeur).toMatchObject({ prenom: 'Léa', nom: '' });
  });

  it('tient pour un forfait une intention d’avant les achats à l’unité', () => {
    // Les intentions créées avant l'ajout des stages ne portent pas `produit`.
    // Une famille qui paie le lendemain de la mise en ligne ne doit pas tomber
    // dans la file « à traiter » pour un champ qui n'existait pas.
    const { produit, ...sansProduit } = intentionPayee.metadata as Record<string, unknown>;
    const r = lireCommande({ ...intentionPayee, metadata: sansProduit });
    expect(r.ok && r.valeur.produit).toBe('forfait');
  });
});

const seancePayee = {
  id: 7001,
  metadata: {
    saison: '2026-2027',
    produit: 'seance',
    session_id: '5f0f9f2e-1111-4222-8333-444455556666',
    creneau_id: 'stage-banane',
    participant: 'Léa D.',
  },
  order: { id: 90210, payer: { email: 'marie@exemple.fr' } },
};

describe('lireCommande — une place à l’unité', () => {
  it('lit la séance achetée', () => {
    const r = lireCommande(seancePayee);
    expect(r.ok).toBe(true);
    if (!r.ok || r.valeur.produit !== 'seance') throw new Error('produit inattendu');
    expect(r.valeur).toEqual({
      produit: 'seance',
      orderId: '90210',
      codePromo: null,
      email: 'marie@exemple.fr',
      prenom: 'Léa',
      nom: 'D.',
      saison: '2026-2027',
      sessionId: '5f0f9f2e-1111-4222-8333-444455556666',
      creneauId: 'stage-banane',
      montantCents: 0,
    });
  });

  it('lit le montant quand l’intention le porte', () => {
    /*
     * C'EST LE SEUL CHEMIN PAR LEQUEL UN CHIFFRE D'AFFAIRES REMONTE. `order` ne
     * dit que ce qui a été autorisé — la première échéance sur un règlement
     * échelonné — et le provisionnement ne relit ni la formule ni le tarif.
     * Sans ce champ, une saison vendue vaudrait zéro dans la mesure.
     */
    const r = lireCommande({
      ...seancePayee,
      metadata: { ...seancePayee.metadata, montant_cents: 4500 },
    });
    expect(r.ok && r.valeur.montantCents).toBe(4500);
  });

  it('exige la date précise, et non le seul créneau', () => {
    // Un stage a plusieurs dates au catalogue : sans `session_id`, provisionner
    // reviendrait à choisir une date au hasard pour quelqu'un qui en a payé une.
    const { session_id, ...metadata } = seancePayee.metadata;
    const r = lireCommande({ ...seancePayee, metadata });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erreur).toMatch(/session_id/);
  });

  it('n’attend aucune adhésion : elle est comprise dans le prix', () => {
    // Les pages publiques l'écrivent — « il n'y a rien à régler en plus ». Un
    // achat à l'unité ne porte donc pas d'`adhesion_cents`, et n'en réclame pas.
    const r = lireCommande(seancePayee);
    expect(r.ok && 'adhesionCents' in r.valeur).toBe(false);
  });
});
