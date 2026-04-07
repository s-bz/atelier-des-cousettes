/**
 * Atelier group definitions — single source of truth.
 * Used in both keystatic.config.ts and ateliers-reguliers.astro.
 */
export const ATELIER_GROUPS = [
  { id: 'revel-adultes', label: 'Revel — Adultes' },
  { id: 'revel-enfants', label: 'Revel — Enfants' },
  { id: 'verdalle', label: 'Verdalle' },
] as const;

export type AtelierGroupId = (typeof ATELIER_GROUPS)[number]['id'];

export const ATELIER_GROUP_LABELS = Object.fromEntries(
  ATELIER_GROUPS.map((g) => [g.id, g.label]),
) as Record<AtelierGroupId, string>;
