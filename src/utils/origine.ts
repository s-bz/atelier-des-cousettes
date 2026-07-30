/**
 * D'OÙ VIENT UNE DEMANDE — la question qu'Isabelle pose à chaque réponse.
 *
 * Tous les boutons de contact du site mènent à la même page et au même
 * formulaire. Une demande arrivait donc sans son contexte : impossible de
 * distinguer celle qui vient de la page des ateliers, où l'on a vu les
 * créneaux, de celle qui part de l'accueil sans rien avoir lu. Isabelle
 * redemandait par courriel ce que le clic savait déjà.
 *
 * Le chemin de la page voyage donc dans le lien, jusqu'au formulaire.
 *
 * POURQUOI PAS `document.referrer` : il est vide quand on arrive par un
 * signet, tronqué par certains navigateurs, et absent d'un lien ouvert dans un
 * nouvel onglet. Un paramètre que nous écrivons nous-mêmes dit toujours la
 * vérité, et se lit sans script.
 */

/** Ce qu'un paramètre `origine` a le droit d'être — rien d'autre n'est accepté. */
const FORME_ATTENDUE = /^[a-z0-9-]{1,64}$/;

/**
 * Le chemin d'une page, réduit à une étiquette.
 *
 * `/ateliers-reguliers/` → `ateliers-reguliers`
 * `/blog/ourlet-invisible/` → `blog-ourlet-invisible`
 * `/` → `accueil`
 *
 * L'accueil a besoin d'un nom : « / » ne se lit pas dans un tableau de bord, et
 * une chaîne vide s'y confondrait avec une demande sans origine — qui est une
 * information différente.
 */
export function origineDe(pathname: string): string {
  const etiquette = pathname
    .replace(/^\/+|\/+$/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9/-]+/g, '')
    .replace(/\//g, '-');

  return etiquette.slice(0, 64) || 'accueil';
}

/**
 * Le lien vers le formulaire, chargé de sa provenance.
 *
 * La barre oblique finale reste AVANT le point d'interrogation : Vercel
 * redirige en 308 les adresses sans elle, et une redirection sur un lien de
 * conversion coûte un aller-retour à celui qui a déjà cliqué.
 */
export function lienContact(pathname: string): string {
  return `/contact/?origine=${origineDe(pathname)}`;
}

/**
 * Filtre ce qui revient de la barre d'adresse.
 *
 * La valeur relue est réinjectée dans l'adresse de l'iframe Tally : elle vient
 * donc d'une source que n'importe qui peut écrire. Tout ce qui ne ressemble pas
 * à une étiquette produite ici est jeté plutôt que corrigé — une origine fausse
 * vaut mieux qu'une origine inventée par un tiers.
 */
export function origineSure(valeur: string | null | undefined): string | null {
  return valeur && FORME_ATTENDUE.test(valeur) ? valeur : null;
}
