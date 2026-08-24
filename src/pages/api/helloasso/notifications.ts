import type { APIRoute } from 'astro';
import { getAdminClient } from '../../../utils/supabase';
import { lireNotification, jetonValide, lireIntention } from '../../../utils/helloasso';
import { lireCommande, provisionner } from '../../../utils/provisionnement';
import { mesurer } from '../../../utils/mesure';

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

  const supabase = getAdminClient();
  const { type, identifiant, cle: cleBrute } = lireNotification(charge);
  const authentifie = jetonValide(request.url, env('HELLOASSO_WEBHOOK_SECRET'));

  /*
   * UNE NOTIFICATION NON AUTHENTIFIÉE NE PEUT PAS PRENDRE LA CLÉ D'UNE VRAIE.
   *
   * Cette route s'appelle sans preuve, et la clé se déduit de la charge utile.
   * Quiconque devinait l'identifiant d'une commande pouvait donc déposer sa
   * propre charge sous la clé que la vraie notification allait porter : arrivée
   * ensuite, celle-ci était écartée comme doublon par `ignoreDuplicates`, et la
   * ligne restait celle du falsificateur — déjà marquée traitée, donc absente
   * de la file « à traiter ». Exactement la commande payée qui n'apparaît
   * nulle part que ce fichier cherche à éviter.
   *
   * Le provisionnement, lui, n'a jamais été en cause : il relit l'intention
   * auprès de HelloAsso et ne croit pas un mot de ce qui arrive ici.
   */
  const cle = authentifie ? cleBrute : `na:${cleBrute}`;

  try {
    const { error } = await supabase
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

  /*
   * LE PROVISIONNEMENT VIENT APRÈS L'ENREGISTREMENT, JAMAIS AVANT.
   *
   * L'événement est en base : la notification ne peut plus se perdre, et le 200
   * est acquis quoi qu'il advienne ensuite. Ce qui suit peut donc échouer sans
   * conséquence — la ligne reste `traite_le is null` et ressort dans la file
   * « à traiter ». L'inverse, provisionner puis enregistrer, ferait réémettre
   * HelloAsso sur une commande déjà provisionnée.
   *
   * ON NE FAIT PAS CONFIANCE À LA CHARGE UTILE : elle n'est pas signée. C'est
   * l'intention relue par l'API qui fait foi, exactement comme au retour du
   * payeur, et par la même fonction.
   */
  await provisionnerSiPossible(supabase, cle, charge);

  return new Response(null, { status: 200 });
};

/**
 * Le back-office de HelloAsso peut appeler l'URL pour la valider à la saisie.
 * Une route muette en GET la ferait passer pour morte.
 */
export const GET: APIRoute = () => new Response('OK', { status: 200 });

/**
 * Provisionne ce qui peut l'être, et ne fait jamais échouer l'accusé de
 * réception.
 *
 * Seules les notifications de commande mènent quelque part : un paiement
 * d'échéance ou une campagne créée n'ont rien à provisionner, et rester
 * `traite_le is null` serait alors trompeur — la file « à traiter » doit ne
 * contenir que ce qui attend vraiment quelqu'un.
 */
async function provisionnerSiPossible(
  supabase: ReturnType<typeof getAdminClient>,
  cle: string,
  charge: unknown,
): Promise<void> {
  /*
   * LA CHARGE UTILE N'EST PAS SIGNÉE, ET CET IDENTIFIANT PART DANS UNE URL.
   *
   * Il sert de segment de chemin à un appel authentifié chez HelloAsso. Une
   * chaîne fantaisiste — `../../organizations/autre/orders` — y désignerait
   * une autre ressource, avec notre jeton. Seul un nombre est recevable ; tout
   * le reste est traité comme « rien à provisionner ».
   */
  const brut = (charge as { data?: { checkoutIntentId?: unknown } })?.data?.checkoutIntentId;
  const idIntention = typeof brut === 'number' || (typeof brut === 'string' && /^\d{1,20}$/.test(brut))
    ? String(brut)
    : null;

  try {
    if (idIntention === null) {
      // Rien à provisionner : on classe, sans encombrer la file.
      await supabase.from('helloasso_events')
        .update({ traite_le: new Date().toISOString() }).eq('cle', cle);
      return;
    }

    const intention = await lireIntention(idIntention);
    if (!intention.ok) {
      console.error(`[helloasso] ${cle} : relecture impossible — ${intention.erreur}`);
      return;
    }

    const commande = lireCommande(intention.valeur);
    if (!commande.ok) {
      console.error(`[helloasso] ${cle} : ${commande.erreur}`);
      /*
       * LA LIGNE RESTE `traite_le is null` — elle est dans la file d'Isabelle,
       * et c'est ce qui compte pour la commande elle-même. Le signal, lui, sert
       * à savoir que la file se remplit sans attendre que quelqu'un pense à la
       * regarder. « Le paiement n'est pas encore acquis » y passe aussi : une
       * notification arrive parfois avant l'autorisation, et se rattrape à la
       * réémission suivante.
       */
      await mesurer('paiement_a_rattacher', null, {
        contexte: 'notification',
        intention: idIntention,
        motif: commande.erreur,
      });
      return;
    }

    const fait = await provisionner(supabase, commande.valeur);
    if (!fait.ok) {
      console.error(`[helloasso] ${cle} : ${fait.erreur}`);
      await mesurer('paiement_a_rattacher', commande.valeur.email, {
        contexte: 'notification',
        intention: idIntention,
        motif: fait.erreur,
        produit: commande.valeur.produit,
      });
      return;
    }

    await supabase.from('helloasso_events')
      .update({ traite_le: new Date().toISOString() }).eq('cle', cle);
    console.info(`[helloasso] ${cle} provisionné (créé : ${fait.valeur.cree})`);
  } catch (e) {
    // Une exception ici ne doit pas empêcher le 200 : l'événement est stocké,
    // la file le rattrapera.
    console.error(`[helloasso] ${cle} : provisionnement interrompu`, e);
  }
}
