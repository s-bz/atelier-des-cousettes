export const toSlug = (name: string) =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export function formatFrenchDate(dateString: string): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** Split text on double-newlines into trimmed, non-empty paragraphs. */
export function splitParagraphs(text: string): string[] {
  return text.split(/\r?\n\s*\r?\n/).map((p) => p.replace(/\r?\n/g, ' ').trim()).filter(Boolean);
}

/** Split text on single newlines into trimmed, non-empty lines. */
export function splitLines(text: string): string[] {
  return text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}
