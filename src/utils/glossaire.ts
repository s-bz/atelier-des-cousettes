/**
 * Le glossaire : ses catégories, son ordre, et ses renvois.
 *
 * Deux pages le lisent — l'index et chaque fiche — et l'ordre des catégories
 * comme leur libellé doivent y être les mêmes. Écrits deux fois, ils auraient
 * fini par différer, et l'index aurait rangé sous « Finitions » ce qu'une fiche
 * annonce comme « Gestes ».
 */

export type CategorieGlossaire = 'gestes' | 'finitions' | 'patronage' | 'tissus' | 'machine';

/**
 * L'ordre est celui de l'apprentissage, non l'alphabet : on apprend le geste,
 * puis la finition, puis à tracer, et l'on regarde la machine en dernier parce
 * qu'elle fait peur. Un glossaire rangé de A à Z se lit comme un dictionnaire ;
 * rangé ainsi, il se lit comme une progression.
 */
export const CATEGORIES: { cle: CategorieGlossaire; label: string }[] = [
  { cle: 'gestes', label: 'Gestes et coutures' },
  { cle: 'finitions', label: 'Finitions' },
  { cle: 'patronage', label: 'Patronage et mesures' },
  { cle: 'tissus', label: 'Tissus et matières' },
  { cle: 'machine', label: 'Machine et réglages' },
];

export const labelCategorie = (cle: string) =>
  CATEGORIES.find((c) => c.cle === cle)?.label ?? 'Autres';

/** L'ordre alphabétique français : « éclair » se range à E, pas après Z. */
export const parOrdreAlphabetique = <T extends { entry: { terme: string } }>(a: T, b: T) =>
  a.entry.terme.localeCompare(b.entry.terme, 'fr', { sensitivity: 'base' });

/**
 * Les termes liés d'une fiche, complétés s'ils manquent.
 *
 * UNE FICHE SANS RENVOI EST UNE IMPASSE, et une impasse ne se fait pas indexer :
 * ce site l'a déjà vu sur ses articles les plus anciens, que Search Console
 * signalait « détectée, actuellement non indexée » faute de liens entrants. Le
 * remède avait été de faire tourner les articles liés en cycle plutôt que de
 * montrer les trois plus récents ; le glossaire applique la même règle.
 *
 * Les renvois choisis à la main passent d'abord — ce sont les seuls qui portent
 * du sens. Les suivants complètent avec les voisins de catégorie, en cycle, pour
 * qu'aucune fiche ne soit citée par personne.
 */
export function completerTermesLies<
  T extends { slug: string; entry: { categorie: string } },
>(slug: string, choisis: readonly string[], toutes: readonly T[], cible = 3): string[] {
  const retenus = choisis.filter((s) => s && s !== slug && toutes.some((t) => t.slug === s));
  if (retenus.length >= cible) return retenus.slice(0, cible);

  const courante = toutes.find((t) => t.slug === slug);
  const voisins = toutes.filter(
    (t) => t.slug !== slug && t.entry.categorie === courante?.entry.categorie,
  );
  const depart = Math.max(0, voisins.findIndex((t) => t.slug === slug));

  for (let i = 0; i < voisins.length && retenus.length < cible; i++) {
    const candidat = voisins[(depart + 1 + i) % voisins.length].slug;
    if (!retenus.includes(candidat)) retenus.push(candidat);
  }
  return retenus;
}
