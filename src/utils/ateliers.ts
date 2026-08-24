/**
 * Atelier group definitions — single source of truth.
 * Used in keystatic.config.ts, ateliers-reguliers.astro, and the admin screens.
 *
 * Les `id` sont figés : ils sont stockés dans le contenu Keystatic
 * (`group: verdalle`) et dans `creneaux.group_id` en base. Seuls les `label`
 * se modifient librement.
 */
/**
 * LES TROIS PUBLICS, et les deux mots qui désignent chacun.
 *
 * Un créneau accueille « les adultes » ; une personne « est adulte ». La base
 * porte les deux vocabulaires — `creneaux.audience` au pluriel,
 * `participants.audience` au singulier — et les rapproche en concaténant un
 * `s` (`p.audience || 's'`). Ce tableau est le même rapprochement côté code :
 * l'écrire une fois évite qu'un écran invente sa propre traduction, comme
 * l'écran des séances le faisait avec un ternaire qui ne connaissait que deux
 * valeurs et rangeait donc les ados chez les adultes.
 *
 * L'ORDRE EST CELUI DE L'AFFICHAGE, du plus âgé au plus jeune. Les cartes de
 * tarifs et les groupes de la page publique le suivent : l'adulte qui lit
 * trouve son prix en premier, ce qui est toute la raison d'être de cet ordre.
 */
export const AUDIENCES = [
  { creneau: 'adultes', personne: 'adulte', label: 'Adultes', titre: 'Pour les adultes' },
  { creneau: 'ados', personne: 'ado', label: 'Ados', titre: 'Pour les ados' },
  { creneau: 'enfants', personne: 'enfant', label: 'Enfants', titre: 'Pour les enfants' },
] as const;

/** Le public d'un créneau : « adultes », « ados », « enfants ». */
export type AudienceCreneau = (typeof AUDIENCES)[number]['creneau'];
/** Le public d'une personne : « adulte », « ado », « enfant ». */
export type AudiencePersonne = (typeof AUDIENCES)[number]['personne'];

const parCreneau = new Map(AUDIENCES.map((a) => [a.creneau, a]));
const parPersonne = new Map(AUDIENCES.map((a) => [a.personne, a]));

/**
 * « adultes » → « adulte ». Un public inconnu se rend tel quel plutôt que de
 * retomber sur « adulte » : mieux vaut une valeur que la base refusera qu'une
 * requête silencieusement adressée au mauvais public.
 */
export function personneDe(audience: string): string {
  return parCreneau.get(audience as AudienceCreneau)?.personne ?? audience;
}

/** « adulte » → « adultes ». Le chemin inverse, même prudence. */
export function creneauDe(audience: string): string {
  return parPersonne.get(audience as AudiencePersonne)?.creneau ?? audience;
}

/** « Adultes », « Ados », « Enfants » — pour un titre de colonne ou d'option. */
export function libelleAudience(audience: string): string {
  return (
    parCreneau.get(audience as AudienceCreneau)?.label ??
    parPersonne.get(audience as AudiencePersonne)?.label ??
    audience
  );
}

/** « Pour les adultes » — le titre d'une carte de tarifs. */
export function titreAudience(audience: string): string {
  return parCreneau.get(audience as AudienceCreneau)?.titre ?? `Pour les ${audience}`;
}

/**
 * Le tarif PROPOSÉ à la création d'un atelier, par public — un préremplissage.
 *
 * Ce n'est pas une règle : le champ reste saisissable, un atelier peut avoir
 * son tarif à lui. C'est le montant qu'on tape neuf fois sur dix, et dont
 * l'oubli produisait des ateliers enfants facturés au tarif adulte.
 *
 * IL EST ÉCRIT ICI, ET NON LU EN BASE, parce qu'on le propose au moment où le
 * créneau n'existe pas encore. Le corollaire est qu'il se périme en silence :
 * les écrans ont affiché 40 et 30 € pendant toute la saison où la base
 * facturait 45 et 35, l'adhésion ayant entre-temps été incluse. À rapprocher
 * de la grille quand elle bouge.
 */
export const PRIX_SEANCE_PAR_DEFAUT: Record<AudienceCreneau, string> = {
  adultes: '45.00',
  ados: '35.00',
  enfants: '35.00',
};

export const ATELIER_GROUPS = [
  { id: 'revel-adultes', label: 'Revel — Adultes', location: 'Revel', audience: 'adultes' },
  // Les ados ont leur créneau depuis la saison 2026-2027 : deux heures le
  // samedi matin, entre l'atelier adultes de 3 h et celui des enfants. Un
  // troisième public, et non une variante de l'un des deux — leur forfait ne
  // s'achète pas au même volume (9 ou 18 séances, contre 10 ou 20).
  { id: 'revel-ados', label: 'Revel — Ados', location: 'Revel', audience: 'ados' },
  { id: 'revel-enfants', label: 'Revel — Enfants', location: 'Revel', audience: 'enfants' },
  // « Verdalle » seul détonnait à côté de deux libellés précisant leur public.
  // L'identifiant reste `verdalle` : il est déjà écrit dans le contenu et en
  // base, et le renommer ferait disparaître le créneau existant de la page
  // publique sans rien signaler.
  { id: 'verdalle', label: 'Verdalle — Adultes', location: 'Verdalle', audience: 'adultes' },
  { id: 'verdalle-enfants', label: 'Verdalle — Enfants', location: 'Verdalle', audience: 'enfants' },
] as const;

export type AtelierGroupId = (typeof ATELIER_GROUPS)[number]['id'];

export const ATELIER_GROUP_LABELS = Object.fromEntries(
  ATELIER_GROUPS.map((g) => [g.id, g.label]),
) as Record<AtelierGroupId, string>;

/**
 * Groupe d'un atelier, DÉDUIT de son lieu et de son public.
 *
 * Le groupe est exactement le croisement des deux : « Revel — Enfants » n'est
 * pas une information de plus, c'est la reformulation de « Revel » et
 * « enfants ». Le demander en troisième champ permettait de le contredire —
 * groupe Revel-Enfants, public Adultes, lieu Verdalle passait sans un mot, et
 * la page publique classait alors le créneau à un endroit que les règles
 * d'inscription ignoraient.
 *
 * Un lieu inconnu — l'atelier s'installe ailleurs — produit un identifiant de
 * groupe inédit plutôt qu'une erreur. La page publique retombe alors sur le nom
 * du lieu, ce qu'elle sait déjà faire : mieux vaut un titre approximatif qu'un
 * créneau impossible à créer.
 */
export function groupeDe(lieu: string, audience: string): string {
  const connu = ATELIER_GROUPS.find(
    (g) => g.location.toLowerCase() === lieu.trim().toLowerCase() && g.audience === audience,
  );
  if (connu) return connu.id;

  const slug = lieu.trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  return `${slug || 'lieu'}-${audience}`;
}
