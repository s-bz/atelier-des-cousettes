/**
 * Filters posts to only include published ones (with a publishDate in the past).
 */
export function filterPublishedPosts<
  T extends { entry: { publishDate?: string | null } },
>(posts: T[]): (T & { entry: { publishDate: string } })[] {
  const now = new Date();
  return posts.filter(
    (p): p is T & { entry: { publishDate: string } } =>
      Boolean(p.entry.publishDate) && new Date(p.entry.publishDate!) <= now,
  );
}
