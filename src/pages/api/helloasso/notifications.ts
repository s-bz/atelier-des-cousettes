import type { APIRoute } from 'astro';
import { getAdminClient } from '../../../utils/supabase';
import { lireNotification, jetonValide } from '../../../utils/helloasso';

export const prerender = false;

/** Au-delà, ce n'est pas une notification HelloAsso — les siennes font quelques Ko. */
const TAILLE_MAX = 512 * 1024;

const env = (nom: string) => import.meta.env?.[nom] ?? process.env[nom];

/**
 * Réception des notifications HelloAsso.
 *
 * CETTE ROUTE N'INTERPRÈTE RIEN. Elle enregistre la charge utile brute et
 * s'arrête là ; le provisionnement (compte, participant, abonnement) viendra
 * ensuite, en relisant la commande par l'API. Deux raisons :
 *
 *   1. HelloAsso ne signe pas ses notifications. Le contenu reçu ici n'est donc
 *      pas une source de vérité — seule une relecture authentifiée l'est.
 *   2. Une notification non acquittée est réémise pendant 48 h, puis
 *      abandonnée. Plus ce traitement est court, moins il peut échouer.
 *
 * L'URL DE RAPPEL PORTE UNE BARRE OBLIQUE FINALE :
 * `https://atelier-des-cousettes.fr/api/helloasso/notifications/`
 * `trailingSlash: true` vaut aussi pour les routes d'API, et un webhook qui ne
 * suit pas les redirections perdrait la notification avec la commande qu'elle
 * porte. Voir DOCS/RUNBOOK-campagne-helloasso.md §7.
 */
export const POST: APIRoute = async ({ request }) => {
  const texte = await request.text();

  if (texte.length > TAILLE_MAX) {
    // La route écrit en base sans authentification forte : sans cette borne,
    // n'importe qui pourrait y déverser ce qu'il veut.
    console.error(`[helloasso] charge utile refusée : ${texte.length} octets`);
    return new Response('Charge utile trop volumineuse', { status: 413 });
  }

  // Un JSON malformé ne se jette pas : il s'enveloppe et se stocke. C'est peut-
  // être la seule trace d'une commande payée.
  let charge: unknown;
  try {
    charge = JSON.parse(texte);
  } catch {
    charge = { illisible: true, brut: texte };
  }

  const { type, identifiant, cle } = lireNotification(charge);
  const authentifie = jetonValide(request.url, env('HELLOASSO_WEBHOOK_SECRET'));

  try {
    const { error } = await getAdminClient()
      .from('helloasso_events')
      .upsert(
        { cle, type, identifiant, authentifie, charge_utile: charge },
        // La réémission d'un événement déjà reçu n'est pas une erreur : c'est le
        // fonctionnement normal de HelloAsso, et la contrainte d'unicité sur
        // `cle` suffit à la rendre inoffensive.
        { onConflict: 'cle', ignoreDuplicates: true },
      );

    if (error) throw new Error(error.message);
  } catch (erreur) {
    /*
     * ÉCHEC D'ÉCRITURE : ON RÉPOND 500, ET C'EST DÉLIBÉRÉ.
     *
     * Répondre 200 sans avoir rien enregistré ferait cesser les réémissions et
     * perdrait la notification pour de bon. Un 500 fait revenir HelloAsso
     * pendant 48 h — c'est la seule chance de rattrapage qui existe.
     */
    console.error(`[helloasso] ${cle} non enregistré :`, erreur);
    return new Response('Enregistrement impossible', { status: 500 });
  }

  console.info(`[helloasso] ${cle} enregistré (authentifié : ${authentifie})`);
  return new Response(null, { status: 200 });
};

/**
 * Le back-office de HelloAsso peut appeler l'URL pour la valider à la saisie.
 * Une route muette en GET la ferait passer pour morte.
 */
export const GET: APIRoute = () => new Response('OK', { status: 200 });
