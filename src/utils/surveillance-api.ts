/**
 * LE NAVIGATEUR SIGNALE LES PANNES DE NOS PROPRES ROUTES /api/*.
 *
 * Du 13 au 14 octobre 2026, la fonction serveur ne se chargeait plus
 * (FUNCTION_INVOCATION_FAILED, voir scripts/smoke-ssr-function.mjs) et rien
 * n'est arrivé dans PostHog. Le serveur n'exécutait pas une ligne de notre
 * code, donc rien ne pouvait y être capturé ; et les composants qui appellent
 * l'API (le devis en direct, le formulaire de réservation) attrapent leur
 * propre échec pour afficher un message — aucune exception ne remontait.
 *
 * Le navigateur est le seul endroit qui voit toujours ce genre de panne. Il la
 * signale donc ici, comme une exception `ErreurServeurApi`.
 *
 * LIMITE ASSUMÉE. Une PAGE à la demande qui plante renvoie la page d'erreur
 * brute de Vercel : notre gabarit ne se charge pas, PostHog non plus. Ce
 * module ne couvre que les appels faits depuis une page qui, elle, s'est
 * affichée. Le reste relève du contrôle planifié (.github/workflows/healthcheck.yml).
 *
 * Seules les réponses 5xx sont signalées. Une 4xx est attendue (formule
 * inconnue, saisie invalide), et un fetch rejeté vient presque toujours du
 * réseau du visiteur : les compter noierait le vrai signal.
 */

export type PanneApi = {
  method: string;
  /**
   * Route dont les segments dynamiques sont repliés, p. ex.
   * /api/calendrier/:param. Le chemin réel n'est JAMAIS transmis : celui du
   * calendrier porte un jeton secret.
   */
  route: string;
  status: number;
  /** Code d'erreur de Vercel (p. ex. FUNCTION_INVOCATION_FAILED), quand c'est la plateforme qui a répondu. */
  vercelError: string | null;
  /** Identifiant de requête Vercel : retrouve l'invocation dans les journaux. */
  vercelId: string | null;
};

export class ErreurServeurApi extends Error {
  readonly panne: PanneApi;
  constructor(panne: PanneApi) {
    super(`${panne.method} ${panne.route} → ${panne.status}` + (panne.vercelError ? ` (${panne.vercelError})` : ''));
    this.name = 'ErreurServeurApi';
    this.panne = panne;
  }
}

/**
 * Replie les segments dynamiques, pour qu'une route cassée fasse UNE issue et
 * non une par jeton. Les noms de route de src/pages/api sont en minuscules et
 * tirets, avec au plus une extension (`devis-unite.json`) ; tout autre segment
 * est un paramètre.
 */
export function cleDeRoute(chemin: string): string {
  return chemin
    .split('/')
    .map((segment, i) => (i >= 2 && segment !== '' && !/^[a-z][a-z-]*(\.[a-z]+)?$/.test(segment) ? ':param' : segment))
    .join('/');
}

/** Clé de regroupement : même route + même statut = même issue PostHog. */
export function empreinte(panne: PanneApi): string {
  return `erreur-serveur-api ${panne.method} ${panne.route} ${panne.status}`;
}

function urlDe(entree: RequestInfo | URL): string {
  if (typeof entree === 'string') return entree;
  if (entree instanceof URL) return entree.href;
  return entree.url;
}

function methodeDe(entree: RequestInfo | URL, init?: RequestInit): string {
  const methode = init?.method ?? (typeof entree === 'object' && 'method' in entree ? entree.method : 'GET');
  return methode.toUpperCase();
}

/** La panne à signaler, ou null si cette réponse n'en est pas une. */
export function classerReponse(
  entree: RequestInfo | URL,
  init: RequestInit | undefined,
  reponse: Pick<Response, 'status' | 'headers'>,
  urlPage: string,
): PanneApi | null {
  if (reponse.status < 500) return null;
  let url: URL;
  try {
    url = new URL(urlDe(entree), urlPage);
  } catch {
    return null;
  }
  if (url.origin !== new URL(urlPage).origin) return null;
  if (!url.pathname.startsWith('/api/')) return null;
  return {
    method: methodeDe(entree, init),
    route: cleDeRoute(url.pathname),
    status: reponse.status,
    vercelError: reponse.headers.get('x-vercel-error'),
    vercelId: reponse.headers.get('x-vercel-id'),
  };
}

const INSTALLEE = Symbol.for('atelier.surveillanceApi');

/**
 * Enveloppe `win.fetch`, une seule fois. La réponse est rendue intacte (son
 * corps n'est jamais lu) et un fetch rejeté se propage exactement comme avant.
 * Chaque empreinte est signalée au plus une fois par chargement de page : un
 * composant qui relance sa requête à chaque frappe ne peut pas inonder PostHog.
 */
export function installerSurveillanceApi(
  win: { fetch: typeof fetch; location: { href: string } },
  signaler: (panne: PanneApi) => void,
): void {
  const marque = win as unknown as Record<symbol, boolean>;
  if (marque[INSTALLEE]) return;
  marque[INSTALLEE] = true;

  const fetchOrigine = win.fetch;
  const dejaSignalees = new Set<string>();

  win.fetch = async (entree: RequestInfo | URL, init?: RequestInit) => {
    const reponse = await fetchOrigine.call(win, entree, init);
    try {
      const panne = classerReponse(entree, init, reponse, win.location.href);
      if (panne) {
        const cle = empreinte(panne);
        if (!dejaSignalees.has(cle)) {
          dejaSignalees.add(cle);
          signaler(panne);
        }
      }
    } catch {
      // La surveillance ne doit jamais casser la requête qu'elle observe.
    }
    return reponse;
  };
}
