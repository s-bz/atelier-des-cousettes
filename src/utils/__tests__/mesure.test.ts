import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/*
 * CE FICHIER DÉCIDE DE CE QUI SORT DE L'ASSOCIATION.
 *
 * Il envoie des adresses électroniques à un tiers. Ce qui se teste ici n'est
 * donc pas « la mesure fonctionne-t-elle » mais : rien ne part sans clé, rien
 * ne part de quelqu'un qui s'y est opposé, rien ne part que ce qu'on croit, et
 * une panne du tiers ne remonte jamais dans un parcours de paiement.
 */

/*
 * La base est simulée : `mesure.ts` y lit la liste des personnes qui refusent
 * la mesure. `vi.hoisted` parce que la fabrique d'un `vi.mock` est hissée au-
 * dessus du fichier, et ne peut donc pas fermer sur une variable ordinaire.
 */
const base = vi.hoisted(() => ({ refusant: [] as string[], enPanne: false }));

vi.mock('../supabase', () => ({
  getAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: async () =>
          base.enPanne
            ? { data: null, error: { message: 'base injoignable' } }
            : { data: base.refusant.map((email) => ({ email })), error: null },
      }),
    }),
  }),
}));

/**
 * La liste d'opposition est mise en cache pour la durée de vie de l'instance.
 * Chaque test repart donc d'un module neuf, faute de quoi le premier
 * chargement déciderait pour tous les suivants.
 */
async function chargerMesure() {
  vi.resetModules();
  return (await import('../mesure')).mesurer;
}

beforeEach(() => {
  base.refusant = [];
  base.enPanne = false;
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('mesurer', () => {
  it('n’appelle personne sans clé de projet', async () => {
    vi.stubEnv('PUBLIC_POSTHOG_KEY', '');
    const appel = vi.fn();
    vi.stubGlobal('fetch', appel);

    const mesurer = await chargerMesure();
    await mesurer('achat_abouti', 'marie@exemple.fr', { montant_cents: 32400 });

    // En développement et dans les tests, la mesure n'existe pas — et son
    // absence ne doit ni ralentir ni faire échouer quoi que ce soit.
    expect(appel).not.toHaveBeenCalled();
  });

  it('porte l’adresse en identifiant, et la pose sur la personne', async () => {
    vi.stubEnv('PUBLIC_POSTHOG_KEY', 'phc_test');
    const appel = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', appel);

    const mesurer = await chargerMesure();
    await mesurer('achat_abouti', '  Marie@Exemple.FR ', { montant_cents: 32400 });

    const [url, options] = appel.mock.calls[0];
    expect(String(url)).toBe('https://eu.i.posthog.com/i/v0/e/');

    const corps = JSON.parse(options.body);
    expect(corps.api_key).toBe('phc_test');
    expect(corps.event).toBe('achat_abouti');
    // Normalisée : la même personne saisit son adresse de trois façons au fil
    // de la saison, et trois identités valent autant qu'aucune.
    expect(corps.distinct_id).toBe('marie@exemple.fr');
    expect(corps.properties.montant_cents).toBe(32400);
    expect(corps.properties.$set).toEqual({ email: 'marie@exemple.fr' });
    /*
     * L'IP de cet appel est celle de notre serveur, pas celle du payeur.
     * Laisser PostHog l'enrichir rangerait toutes les ventes de l'association
     * sous la région du centre de données qui a répondu.
     */
    expect(corps.properties.$geoip_disable).toBe(true);
  });

  it('n’identifie personne quand l’événement n’appartient à personne', async () => {
    vi.stubEnv('PUBLIC_POSTHOG_KEY', 'phc_test');
    const appel = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', appel);

    const mesurer = await chargerMesure();
    await mesurer('paiement_a_rattacher', null, { intention: '6941321' });

    const corps = JSON.parse(appel.mock.calls[0][1].body);
    expect(corps.distinct_id).toBe('systeme');
    // Pas de fiche « systeme » portant une adresse : il n'y en a pas à porter.
    expect(corps.properties.$set).toBeUndefined();
  });

  it('avale les pannes du tiers', async () => {
    vi.stubEnv('PUBLIC_POSTHOG_KEY', 'phc_test');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('réseau coupé')));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    /*
     * LE POINT CENTRAL. Cet appel est intercalé dans `provisionner`, appelé
     * lui-même par la notification HelloAsso : une exception levée ici ferait
     * réémettre pendant 48 h une commande pourtant déjà inscrite.
     */
    const mesurer = await chargerMesure();
    await expect(mesurer('achat_abouti', 'marie@exemple.fr')).resolves.toBeUndefined();
  });
});

describe('mesurer — le droit d’opposition', () => {
  it('n’envoie rien de nominatif sur quelqu’un qui s’y est opposé', async () => {
    vi.stubEnv('PUBLIC_POSTHOG_KEY', 'phc_test');
    base.refusant = ['marie@exemple.fr'];
    const appel = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', appel);

    const mesurer = await chargerMesure();
    // Y compris un achat : la promesse ne souffre pas d'exception pour les
    // événements qui nous arrangent.
    await mesurer('achat_abouti', 'Marie@exemple.fr', { montant_cents: 32400 });

    expect(appel).not.toHaveBeenCalled();
  });

  it('continue de mesurer tous les autres', async () => {
    vi.stubEnv('PUBLIC_POSTHOG_KEY', 'phc_test');
    base.refusant = ['marie@exemple.fr'];
    const appel = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', appel);

    const mesurer = await chargerMesure();
    await mesurer('achat_abouti', 'julien@exemple.fr');

    expect(appel).toHaveBeenCalledTimes(1);
  });

  it('laisse passer l’anonyme, qui ne désigne personne', async () => {
    vi.stubEnv('PUBLIC_POSTHOG_KEY', 'phc_test');
    base.refusant = ['marie@exemple.fr'];
    const appel = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', appel);

    /*
     * Un paiement qu'on n'a pas su rattacher n'a pas d'adresse : il ne désigne
     * personne, personne n'a pu s'y opposer, et l'écarter reviendrait à
     * s'aveugler sur des règlements en souffrance.
     */
    const mesurer = await chargerMesure();
    await mesurer('paiement_a_rattacher', null, { intention: '6941321' });

    expect(appel).toHaveBeenCalledTimes(1);
  });

  it('se tait plutôt que de risquer une mesure interdite', async () => {
    vi.stubEnv('PUBLIC_POSTHOG_KEY', 'phc_test');
    base.enPanne = true;
    const appel = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', appel);
    vi.spyOn(console, 'error').mockImplementation(() => {});

    /*
     * LA BASE EST INJOIGNABLE ET AUCUNE LISTE N'A JAMAIS ÉTÉ LUE. Entre perdre
     * une mesure et mesurer quelqu'un qui s'y est opposé, le choix n'appartient
     * pas au code. L'événement anonyme, lui, continue de partir.
     */
    const mesurer = await chargerMesure();
    await mesurer('achat_abouti', 'julien@exemple.fr');
    expect(appel).not.toHaveBeenCalled();

    await mesurer('paiement_a_rattacher', null, {});
    expect(appel).toHaveBeenCalledTimes(1);
  });

  it('ne relit pas la liste à chaque événement', async () => {
    vi.stubEnv('PUBLIC_POSTHOG_KEY', 'phc_test');
    const appel = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', appel);

    const mesurer = await chargerMesure();
    await mesurer('achat_abouti', 'julien@exemple.fr');

    /*
     * La liste est lue une fois, puis gardée. Une requête par événement
     * s'ajouterait au chemin de la notification HelloAsso, qui doit répondre
     * vite sous peine de réémission — c'est la raison d'être du cache, et donc
     * ce qu'il faut vérifier.
     */
    base.refusant = ['julien@exemple.fr'];
    await mesurer('place_reservee', 'julien@exemple.fr');

    expect(appel).toHaveBeenCalledTimes(2);
  });
});
