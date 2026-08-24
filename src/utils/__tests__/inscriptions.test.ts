import { describe, it, expect } from 'vitest';
import {
  saisonDe,
  trouverOuCreerCompte,
  creerParticipant,
  creerAbonnement,
  adhesionReglee,
  inscrireDOffice,
  bornesSaison,
  premierJourDuMois,
  dernierJourDuMois,
} from '../inscriptions';

describe('saisonDe', () => {
  it('rattache la rentrée à la saison qui s’ouvre', () => {
    expect(saisonDe('2026-09-15')).toBe('2026-2027');
  });

  it('rattache janvier à la saison ouverte l’automne précédent', () => {
    // « Un début en janvier appartient à la saison ouverte l'automne
    // précédent » — la règle que nouveau.astro portait en ligne.
    expect(saisonDe('2027-01-10')).toBe('2026-2027');
    expect(saisonDe('2027-06-30')).toBe('2026-2027');
  });

  it('bascule dès le mois d’août, et pas en septembre', () => {
    // Le seuil est août : une inscription prise pendant l'été appartient à la
    // saison qui vient, non à celle qui s'achève. Déplacer ce seuil à
    // septembre rangerait les inscriptions d'août dans la saison écoulée.
    expect(saisonDe('2026-08-01')).toBe('2026-2027');
    expect(saisonDe('2026-07-31')).toBe('2025-2026');
  });
});

describe('bornesSaison', () => {
  it('borne une saison de septembre à juin', () => {
    // « Un forfait s'achète pour la saison, de septembre à juin » — la grille
    // du CMS, et les dates que l'écran d'inscription faisait saisir à la main.
    expect(bornesSaison('2026-2027')).toEqual({ debut: '2026-09-01', fin: '2027-06-30' });
    expect(bornesSaison('2025-2026')).toEqual({ debut: '2025-09-01', fin: '2026-06-30' });
  });

  it('déduit la saison du jour quand on ne la nomme pas', () => {
    // Le 24 août appartient déjà à la saison qui vient : c'est la règle de
    // saisonDe, et la même doit valoir ici.
    expect(bornesSaison(saisonDe('2026-08-24'))).toEqual({ debut: '2026-09-01', fin: '2027-06-30' });
    expect(bornesSaison(saisonDe('2027-01-10'))).toEqual({ debut: '2026-09-01', fin: '2027-06-30' });
  });

  it('refuse une saison qu’elle ne sait pas lire', () => {
    // Mieux vaut un champ vide qu'une date inventée : Isabelle la corrigerait
    // sans la remarquer.
    expect(bornesSaison('n’importe quoi')).toBeNull();
    expect(bornesSaison('')).toBeNull();
  });
});

describe('mois vers dates', () => {
  it('ouvre un mois au premier jour', () => {
    expect(premierJourDuMois('2026-09')).toBe('2026-09-01');
  });

  it('ferme un mois à son dernier jour, quelle qu’en soit la longueur', () => {
    // LE PIÈGE QUE LE CHAMP « mois » SUPPRIME : saisir « 30 » en février, ou
    // « 30/06 » pour un mois qui en compte 31, tronque la saison en silence.
    expect(dernierJourDuMois('2027-06')).toBe('2027-06-30');
    expect(dernierJourDuMois('2026-12')).toBe('2026-12-31');
    expect(dernierJourDuMois('2027-02')).toBe('2027-02-28');
    expect(dernierJourDuMois('2028-02')).toBe('2028-02-29');
  });

  it('laisse passer ce qui est déjà une date, et refuse le reste', () => {
    expect(premierJourDuMois('2026-09-15')).toBe('2026-09-15');
    expect(dernierJourDuMois('2027-06-15')).toBe('2027-06-15');
    expect(premierJourDuMois('')).toBe('');
  });
});

/**
 * Une doublure de client Supabase qui RETIENT CE QU'ON LUI ÉCRIT.
 *
 * Les assertions portent sur les lignes écrites, jamais sur le fait qu'une
 * méthode ait été appelée : c'est la forme de la ligne qui doit être vraie,
 * puisque la promesse du PRD (§6) est que l'écran d'Isabelle et le
 * provisionnement HelloAsso « écrivent exactement les mêmes lignes ».
 */
function doublure(existant: Record<string, unknown[]> = {}) {
  const ecrits: { table: string; ligne: Record<string, unknown> }[] = [];
  const comptesCrees: { email: string }[] = [];

  const requete = (table: string) => {
    const filtres: [string, unknown][] = [];
    const chaine = {
      select: () => chaine,
      eq: (col: string, val: unknown) => {
        filtres.push([col, val]);
        return chaine;
      },
      maybeSingle: async () => {
        const lignes = (existant[table] ?? []) as Record<string, unknown>[];
        const trouve = lignes.find((l) => filtres.every(([c, v]) => l[c] === v));
        return { data: trouve ?? null, error: null };
      },
      single: async () => ({ data: { id: `${table}-1` }, error: null }),
    };
    return chaine;
  };

  const client = {
    from: (table: string) => ({
      select: () => requete(table),
      insert: (ligne: Record<string, unknown>) => {
        ecrits.push({ table, ligne });
        return { select: () => ({ single: async () => ({ data: { id: `${table}-1` }, error: null }) }) };
      },
    }),
    auth: {
      admin: {
        createUser: async ({ email }: { email: string }) => {
          comptesCrees.push({ email });
          return { data: { user: { id: `auth-${comptesCrees.length}` } }, error: null };
        },
      },
    },
    rpc: async () => ({ data: 4, error: null }),
  };

  const ligneEcrite = (table: string) => ecrits.find((e) => e.table === table)?.ligne;
  return { client: client as never, ecrits, comptesCrees, ligneEcrite };
}

describe('trouverOuCreerCompte', () => {
  it('rend le compte existant sans en créer un second', async () => {
    // LE BUG QUI COÛTERAIT CHER : au deuxième achat d'une même famille, créer
    // un nouveau compte ferait repayer l'adhésion, puisque celle-ci se lit
    // sur `account_id`.
    const d = doublure({ accounts: [{ id: 'compte-marie', email: 'marie@exemple.fr' }] });

    const r = await trouverOuCreerCompte(d.client, 'marie@exemple.fr');

    expect(r).toEqual({ ok: true, valeur: 'compte-marie' });
    expect(d.comptesCrees).toEqual([]);
    expect(d.ecrits).toEqual([]);
  });

  it('retrouve un compte malgré la casse et les espaces', async () => {
    // HelloAsso rendra l'adresse du payeur telle qu'il l'a saisie. Sans
    // normalisation, « Marie@Exemple.FR » créerait une seconde famille.
    const d = doublure({ accounts: [{ id: 'compte-marie', email: 'marie@exemple.fr' }] });

    const r = await trouverOuCreerCompte(d.client, '  Marie@Exemple.FR ');

    expect(r).toEqual({ ok: true, valeur: 'compte-marie' });
    expect(d.comptesCrees).toEqual([]);
  });

  it('crée l’utilisateur d’authentification EN MÊME TEMPS que la ligne accounts', async () => {
    // Sans l'utilisateur d'authentification, la connexion échoue et l'écran
    // affiche « Compte non reconnu » alors que le compte existe.
    const d = doublure({ accounts: [] });

    const r = await trouverOuCreerCompte(d.client, 'nouvelle@exemple.fr');

    expect(r.ok).toBe(true);
    expect(d.comptesCrees).toEqual([{ email: 'nouvelle@exemple.fr' }]);
    expect(d.ligneEcrite('accounts')).toMatchObject({
      email: 'nouvelle@exemple.fr',
      auth_user_id: 'auth-1',
      role: 'member',
    });
  });

  it('refuse une adresse vide plutôt que de créer un compte anonyme', async () => {
    const d = doublure();
    const r = await trouverOuCreerCompte(d.client, '   ');
    expect(r.ok).toBe(false);
    expect(d.comptesCrees).toEqual([]);
  });
});

describe('creerParticipant', () => {
  it('accepte un participant sans compte', async () => {
    // `participants.account_id` est nullable par conception : l'adhérente qui
    // ne veut pas de compte existe quand même (PRD §4).
    const d = doublure();

    const r = await creerParticipant(d.client, {
      compteId: null, prenom: 'Léa', nom: 'D.', audience: 'ados',
    });

    expect(r.ok).toBe(true);
    expect(d.ligneEcrite('participants')).toMatchObject({
      account_id: null, first_name: 'Léa', last_name: 'D.', audience: 'ados',
    });
  });

  it('range les champs vides en null plutôt qu’en chaîne vide', async () => {
    const d = doublure();
    await creerParticipant(d.client, {
      compteId: 'c1', prenom: 'Léa', nom: 'D.', audience: 'ados', telephone: '', notes: '',
    });
    expect(d.ligneEcrite('participants')).toMatchObject({ phone: null, notes: null });
  });
});

describe('creerAbonnement', () => {
  it('avec une formule, laisse les DEUX colonnes de crédits nulles', async () => {
    // Le déclencheur `subscriptions_suit_formule` recopie `formules.seances`
    // dans `total_credits` et annule `credits_per_month`. Les renseigner ici
    // en même temps que la formule violerait la contrainte d'exclusion —
    // c'est l'erreur que le provisionnement HelloAsso ferait le plus
    // naturellement, puisqu'il connaît le nombre de séances.
    const d = doublure();

    // On passe DÉLIBÉRÉMENT les deux crédits en plus de la formule : c'est
    // ainsi que le provisionnement les fournira, connaissant le nombre de
    // séances. La formule doit l'emporter et les annuler tous les deux.
    await creerAbonnement(d.client, {
      participantId: 'p1', formuleId: '2026-2027-ados-9',
      creneauId: 'atelier-ados-du-samedi', debut: '2026-09-15', fin: '2027-06-30',
      totalCredits: 9, creditsParMois: 2,
    });

    expect(d.ligneEcrite('subscriptions')).toMatchObject({
      formule_id: '2026-2027-ados-9',
      credits_per_month: null,
      total_credits: null,
    });
  });

  it('sans formule, n’écrit qu’une seule des deux colonnes de crédits', async () => {
    const forfait = doublure();
    await creerAbonnement(forfait.client, {
      participantId: 'p1', totalCredits: 9, debut: '2026-09-15', fin: '2027-06-30',
    });
    expect(forfait.ligneEcrite('subscriptions')).toMatchObject({
      formule_id: null, total_credits: 9, credits_per_month: null,
    });

    const mensuel = doublure();
    await creerAbonnement(mensuel.client, {
      participantId: 'p1', creditsParMois: 2, debut: '2026-09-15', fin: '2027-06-30',
    });
    expect(mensuel.ligneEcrite('subscriptions')).toMatchObject({
      formule_id: null, credits_per_month: 2, total_credits: null,
    });
  });

  it('déduit la saison de la date de début quand on ne la donne pas', async () => {
    // Le provisionnement HelloAsso n'a pas de formulaire d'où la lire.
    // DEUX SAISONS DIFFÉRENTES, sans quoi un « 2026-2027 » écrit en dur
    // passerait le test sans rien déduire du tout.
    const d = doublure();
    await creerAbonnement(d.client, {
      participantId: 'p1', debut: '2027-01-10', fin: '2027-06-30', totalCredits: 9,
    });
    expect(d.ligneEcrite('subscriptions')).toMatchObject({ season: '2026-2027' });

    const precedente = doublure();
    await creerAbonnement(precedente.client, {
      participantId: 'p1', debut: '2025-11-10', fin: '2026-06-30', totalCredits: 9,
    });
    expect(precedente.ligneEcrite('subscriptions')).toMatchObject({ season: '2025-2026' });
  });

  it('porte l’identifiant de commande HelloAsso quand il existe', async () => {
    // C'est lui qui rend le rejeu d'une notification inoffensif : la colonne
    // est unique en base.
    const d = doublure();
    await creerAbonnement(d.client, {
      participantId: 'p1', debut: '2026-09-15', fin: '2027-06-30',
      formuleId: 'f1', helloassoOrderId: '12345',
    });
    expect(d.ligneEcrite('subscriptions')).toMatchObject({ helloasso_order_id: '12345' });
  });

  it('laisse l’identifiant de commande nul pour une création à la main', async () => {
    const d = doublure();
    await creerAbonnement(d.client, {
      participantId: 'p1', debut: '2026-09-15', fin: '2027-06-30', formuleId: 'f1',
    });
    expect(d.ligneEcrite('subscriptions')).toMatchObject({ helloasso_order_id: null });
  });
});

describe('adhesionReglee', () => {
  it('reconnaît l’adhésion de la famille pour la saison', async () => {
    const d = doublure({
      adhesions: [{ id: 'a1', account_id: 'compte-marie', saison: '2026-2027' }],
    });
    await expect(adhesionReglee(d.client, 'compte-marie', '2026-2027'))
      .resolves.toEqual({ ok: true, valeur: true });
  });

  it('ne la reconnaît pas d’une saison à l’autre', async () => {
    // 15 € par an : l'adhésion de l'an dernier ne vaut pas pour celle-ci.
    const d = doublure({
      adhesions: [{ id: 'a1', account_id: 'compte-marie', saison: '2025-2026' }],
    });
    await expect(adhesionReglee(d.client, 'compte-marie', '2026-2027'))
      .resolves.toEqual({ ok: true, valeur: false });
  });

  it('ne la reconnaît pas d’une famille à l’autre', async () => {
    const d = doublure({
      adhesions: [{ id: 'a1', account_id: 'compte-marie', saison: '2026-2027' }],
    });
    await expect(adhesionReglee(d.client, 'compte-paul', '2026-2027'))
      .resolves.toEqual({ ok: true, valeur: false });
  });
});

describe('inscrireDOffice', () => {
  it('rend le nombre de places posées', async () => {
    // L'écran d'abonnement l'annonce ; celui de création l'ignore. L'avaler
    // obligerait l'un des deux à rappeler la procédure autrement.
    const d = doublure();
    await expect(inscrireDOffice(d.client)).resolves.toEqual({ ok: true, valeur: 4 });
  });
});
