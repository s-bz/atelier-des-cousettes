import { describe, it, expect } from 'vitest';
import { trouverOuCreerParticipant } from '../provisionnement';

/*
 * DEUX FOIS LA MÊME PERSONNE, DANS LE MÊME FOYER.
 *
 * Le retour du payeur et la notification HelloAsso provisionnent tous les deux
 * la même commande, et lisent avant d'écrire. Sur un stage réel ils se sont
 * croisés à 295 millisecondes d'écart : deux « John Deer » au même foyer, dont
 * un seul portait la place, le solde et l'historique.
 *
 * L'arbitre est l'index `participants_foyer_nom_unique`, éprouvé côté SQL. Ce
 * qui se joue ici est l'autre moitié : PERDRE LA COURSE PROPREMENT. Rendre une
 * erreur renverrait dans la file « à traiter » quelqu'un qui vient de payer.
 */

/** Une doublure qui sait refuser une insertion, comme le ferait l'index. */
function doublure(o: { existant?: Record<string, unknown>[]; refuseLInsertion?: boolean } = {}) {
  const lignes = [...(o.existant ?? [])];
  const inserts: Record<string, unknown>[] = [];
  const motifs: unknown[] = [];

  const requete = () => {
    const filtres: [string, unknown][] = [];
    const chaine: any = {
      select: () => chaine,
      eq: (c: string, v: unknown) => (filtres.push([c, v]), chaine),
      ilike: (c: string, v: unknown) => (motifs.push(v), filtres.push([c, v]), chaine),
      order: () => chaine,
      limit: () => chaine,
      maybeSingle: async () => ({
        data: lignes.find((l) => filtres.every(([c, v]) => l[c] === v)) ?? null,
        error: null,
      }),
    };
    return chaine;
  };

  const client = {
    from: () => ({
      select: () => requete(),
      insert: (ligne: Record<string, unknown>) => ({
        select: () => ({
          single: async () => {
            if (o.refuseLInsertion) {
              // L'autre passage a gagné : sa ligne existe maintenant.
              lignes.push({ ...ligne, id: 'celle-de-l-autre-passage' });
              return { data: null, error: { message: 'duplicate key value' } };
            }
            inserts.push(ligne);
            return { data: { id: 'nouvelle' }, error: null };
          },
        }),
      }),
    }),
  };

  return { client: client as never, inserts, motifs };
}

const audience = async () => ({ ok: true as const, valeur: 'adulte' });

describe('trouverOuCreerParticipant', () => {
  it('rend la personne du foyer qui porte ce nom, sans en créer une seconde', async () => {
    const d = doublure({
      existant: [{ id: 'john', account_id: 'c1', first_name: 'John', last_name: 'Deer' }],
    });

    const r = await trouverOuCreerParticipant(d.client, {
      compteId: 'c1', prenom: 'John', nom: 'Deer', audience,
    });

    expect(r).toEqual({ ok: true, valeur: 'john' });
    expect(d.inserts).toEqual([]);
  });

  it('perd la course proprement : la personne de l’autre passage, pas une erreur', async () => {
    /*
     * C'EST LE CAS RÉEL. Les deux passages lisent, ne trouvent rien, et
     * insèrent ; l'index en refuse un. Ce refus ne doit pas remonter — la place
     * est payée, et l'autre passage vient justement de créer la personne qu'il
     * fallait.
     */
    const d = doublure({ refuseLInsertion: true });

    const r = await trouverOuCreerParticipant(d.client, {
      compteId: 'c1', prenom: 'John', nom: 'Deer', audience,
    });

    expect(r).toEqual({ ok: true, valeur: 'celle-de-l-autre-passage' });
  });

  it('échappe les jokers d’un nom plutôt que de désigner quelqu’un d’autre', async () => {
    // `ilike` prend son argument pour un motif : « Anne_Marie » y désignerait
    // « AnneXMarie », et un nom contenant `%` n'importe qui du foyer. C'est la
    // lecture qui décide de l'identité d'un acheteur.
    const d = doublure();

    await trouverOuCreerParticipant(d.client, {
      compteId: 'c1', prenom: 'Anne_Marie', nom: '%', audience,
    });

    expect(d.motifs).toEqual(['Anne\\_Marie', '\\%']);
  });
});
