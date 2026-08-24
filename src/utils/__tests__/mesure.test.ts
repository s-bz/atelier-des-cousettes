import { describe, it, expect, vi, afterEach } from 'vitest';
import { mesurer } from '../mesure';

/*
 * CE FICHIER DÉCIDE DE CE QUI SORT DE L'ASSOCIATION.
 *
 * Il envoie des adresses électroniques à un tiers. Ce qui se teste ici n'est
 * donc pas « la mesure fonctionne-t-elle » mais : rien ne part sans clé, rien
 * ne part que ce qu'on croit, et une panne du tiers ne remonte jamais dans un
 * parcours de paiement.
 */

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

    await mesurer('achat_abouti', 'marie@exemple.fr', { montant_cents: 32400 });

    // En développement et dans les tests, la mesure n'existe pas — et son
    // absence ne doit ni ralentir ni faire échouer quoi que ce soit.
    expect(appel).not.toHaveBeenCalled();
  });

  it('porte l’adresse en identifiant, et la pose sur la personne', async () => {
    vi.stubEnv('PUBLIC_POSTHOG_KEY', 'phc_test');
    const appel = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', appel);

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
  });

  it('n’identifie personne quand l’événement n’appartient à personne', async () => {
    vi.stubEnv('PUBLIC_POSTHOG_KEY', 'phc_test');
    const appel = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', appel);

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
    await expect(mesurer('achat_abouti', 'marie@exemple.fr')).resolves.toBeUndefined();
  });
});
