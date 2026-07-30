/**
 * Atelier group definitions — single source of truth.
 * Used in keystatic.config.ts, ateliers-reguliers.astro, and the admin screens.
 *
 * Les `id` sont figés : ils sont stockés dans le contenu Keystatic
 * (`group: verdalle`) et dans `creneaux.group_id` en base. Seuls les `label`
 * se modifient librement.
 */
export const ATELIER_GROUPS = [
  { id: 'revel-adultes', label: 'Revel — Adultes', location: 'Revel', audience: 'adultes' },
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
