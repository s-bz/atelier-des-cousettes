/**
 * LA MESURE CÔTÉ SERVEUR.
 *
 * Le navigateur mesure ce qu'il voit — des pages, des clics. Il ne voit pas ce
 * qui compte le plus ici : un paiement acquis. Entre le clic sur « Réserver ma
 * place » et l'encaissement, il y a HelloAsso, un onglet qu'on ferme et une
 * notification qui arrive une heure plus tard. Un événement émis depuis la page
 * de retour manquerait toutes les commandes dont personne n'a vu le retour.
 *
 * D'où cette voie serveur, empruntée aux endroits où la vérité est établie :
 * `provisionner` pour un achat abouti, `demarrerAchat` pour un achat engagé,
 * le planning pour une place posée.
 *
 * PAS DE `posthog-node`. Une dépendance de plus pour un POST JSON, avec sa file
 * d'envoi et son `flush()` à ne pas oublier dans une fonction sans état qui peut
 * être gelée à tout instant. Le même `fetch` que pour HelloAsso suffit, et ce
 * qui part est visible en clair dans ce fichier.
 *
 * RIEN ICI NE PEUT FAIRE ÉCHOUER CE QUI L'APPELLE. Une mesure perdue est une
 * ligne de moins dans un graphique ; une exception levée depuis une notification
 * HelloAsso ferait réémettre une commande déjà provisionnée.
 */

import { getAdminClient } from './supabase';

const env = (nom: string): string | undefined =>
  (import.meta.env as Record<string, string | undefined>)?.[nom] ?? process.env[nom];

/**
 * L'HÔTE N'EST PAS CELUI DU NAVIGATEUR.
 *
 * Les pages passent par `b.atelier-des-cousettes.fr`, un proxy inverse qui
 * existe pour que la mesure soit première partie et survive aux bloqueurs. Un
 * serveur n'a ni bloqueur ni origine à ménager : il s'adresse directement au
 * cloud UE, un intermédiaire de moins entre un paiement et son enregistrement.
 */
const hote = () => (env('POSTHOG_HOST_SERVEUR') ?? 'https://eu.i.posthog.com').replace(/\/+$/, '');

/**
 * Au-delà, on abandonne. Cet appel est intercalé dans des chemins qui doivent
 * répondre — le retour d'un payeur, un accusé de réception HelloAsso qui se
 * réémet pendant 48 h s'il tarde. Deux secondes de mesure ne valent pas une
 * commande réémise.
 */
const DELAI_MAX_MS = 2000;

/** Ce qu'on écrit comme identifiant quand l'événement n'appartient à personne. */
const SYSTEME = 'systeme';

// ─────────────────────────────────────────────────────────────────────────────
// L'opposition
// ─────────────────────────────────────────────────────────────────────────────

/**
 * LA POLITIQUE DE CONFIDENTIALITÉ PROMET « NOUS CESSERONS DE VOUS MESURER ».
 *
 * L'article 21 du RGPD impose d'honorer une opposition pour l'AVENIR, et non
 * seulement d'effacer le passé : supprimer une fiche chez PostHog après coup ne
 * suffit pas, il faut un filtre en amont. Le voici.
 *
 * ELLE SE LIT UNE FOIS PAR INSTANCE, PAS UNE FOIS PAR ÉVÉNEMENT. Cet appel est
 * intercalé dans le provisionnement, lui-même appelé par la notification
 * HelloAsso : une requête par paiement s'ajouterait à un chemin déjà long et
 * qui doit répondre. La liste, elle, tient dans une poignée de lignes et ne
 * bouge presque jamais — elle vit donc en mémoire, rafraîchie au quart d'heure.
 */
const TTL_LISTE_MS = 10 * 60 * 1000;

let opposition: Set<string> | null = null;
let oppositionLueLe = 0;

async function listeOpposition(): Promise<Set<string> | null> {
  const maintenant = Date.now();
  if (opposition && maintenant - oppositionLueLe < TTL_LISTE_MS) return opposition;

  try {
    const { data, error } = await getAdminClient()
      .from('accounts')
      .select('email')
      .eq('mesure_refusee', true);

    if (error) throw new Error(error.message);

    opposition = new Set(
      (data ?? []).map((l) => String((l as { email: unknown }).email).trim().toLowerCase()),
    );
    oppositionLueLe = maintenant;
    return opposition;
  } catch (e) {
    /*
     * ON REND LA LISTE PRÉCÉDENTE, MÊME PÉRIMÉE — et `null` si l'on n'en a
     * jamais eu. C'est ce `null` qui décide, plus bas, de ne rien envoyer de
     * nominatif : entre perdre une mesure et mesurer quelqu'un qui s'y est
     * opposé, le choix n'appartient pas au code.
     */
    console.error('[mesure] liste d’opposition illisible :', e);
    return opposition;
  }
}

/**
 * Enregistre un événement.
 *
 * `email` sert d'identifiant de personne, et c'est délibéré : c'est la seule
 * clé commune aux deux mondes. Une famille achète sans compte — elle n'a pas
 * d'identifiant chez nous à ce moment-là, seulement une adresse — puis se
 * connecte, et le navigateur s'identifie avec la même adresse. Les deux moitiés
 * du parcours se rejoignent alors sur la même personne. Un UUID de compte serait
 * plus discret, mais l'achat public resterait orphelin.
 */
export async function mesurer(
  evenement: string,
  email: string | null | undefined,
  proprietes: Record<string, unknown> = {},
): Promise<void> {
  const cle = env('PUBLIC_POSTHOG_KEY');
  // Ni en développement ni en test : sans clé, la mesure n'existe pas, et son
  // absence ne doit se voir nulle part.
  if (!cle) return;

  const identifiant = email?.trim().toLowerCase() || SYSTEME;

  /*
   * L'OPPOSITION NE VAUT QUE POUR CE QUI DÉSIGNE QUELQU'UN. Un événement
   * système — une commande qu'on n'a pas su lire, donc sans adresse — ne
   * concerne personne en particulier : il n'y a personne à en dispenser, et
   * l'écarter reviendrait à s'aveugler sur des paiements en souffrance.
   */
  if (identifiant !== SYSTEME) {
    const refusant = await listeOpposition();
    if (refusant === null || refusant.has(identifiant)) return;
  }

  try {
    const reponse = await fetch(`${hote()}/i/v0/e/`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: AbortSignal.timeout(DELAI_MAX_MS),
      body: JSON.stringify({
        api_key: cle,
        event: evenement,
        distinct_id: identifiant,
        timestamp: new Date().toISOString(),
        properties: {
          ...proprietes,
          // La source, pour distinguer d'un coup d'œil ce qui vient du serveur
          // — donc établi — de ce que le navigateur a bien voulu envoyer.
          source: 'serveur',
          /*
           * PAS DE GÉOLOCALISATION SUR CES ÉVÉNEMENTS-LÀ.
           *
           * Le mode sans cookie retire l'adresse IP des événements du
           * navigateur avant enrichissement — mais ceux-ci n'y passent pas :
           * ils arrivent d'un POST ordinaire, et PostHog géolocaliserait donc
           * l'IP de l'appel. Or c'est celle de notre serveur. Tous les
           * paiements de l'association se rangeraient sous la région Vercel qui
           * a répondu, et le tableau de bord affirmerait qu'on vend à Francfort.
           *
           * Une géographie fausse est pire qu'une géographie absente : la
           * seconde se remarque, la première se croit.
           */
          $geoip_disable: true,
          /*
           * L'ADRESSE EST POSÉE SUR LA PERSONNE, PAS SUR L'ÉVÉNEMENT.
           * `$set` alimente la fiche ; répétée sur chaque événement, elle
           * encombrerait chaque ligne sans rien apprendre de plus.
           */
          ...(identifiant === SYSTEME ? {} : { $set: { email: identifiant } }),
        },
      }),
    });

    if (!reponse.ok) {
      console.error(`[mesure] ${evenement} refusé : HTTP ${reponse.status}`);
    }
  } catch (e) {
    // Y compris le dépassement du délai. On le dit au journal et on continue.
    console.error(`[mesure] ${evenement} non enregistré :`, e);
  }
}
