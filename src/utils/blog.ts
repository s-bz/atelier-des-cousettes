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

/**
 * Picks related posts for a given post: the next `count` posts in
 * chronological order, wrapping around. The cycle guarantees every post
 * receives exactly `count` inbound links across the blog, so older posts
 * are never orphaned (picking "most recent" for every post starves them,
 * which showed up in Search Console as "Crawled - currently not indexed").
 */
export function pickRelatedPosts<
  T extends { slug: string; entry: { publishDate: string } },
>(slug: string, posts: T[], count = 3): T[] {
  const sorted = [...posts].sort(
    (a, b) => new Date(a.entry.publishDate).getTime() - new Date(b.entry.publishDate).getTime()
      || a.slug.localeCompare(b.slug),
  );
  const index = sorted.findIndex((p) => p.slug === slug);
  if (index === -1) return sorted.slice(0, count);
  const others = sorted.length - 1;
  return Array.from({ length: Math.min(count, others) }, (_, i) => sorted[(index + 1 + i) % sorted.length]);
}
