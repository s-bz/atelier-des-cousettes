import { describe, it, expect, vi, afterEach } from 'vitest';
import { filterPublishedPosts, pickRelatedPosts } from '../blog';

const makePost = (publishDate: string | null | undefined) => ({
  slug: 'test',
  entry: { publishDate },
});

describe('filterPublishedPosts', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('includes posts with publishDate in the past', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-08'));
    const result = filterPublishedPosts([makePost('2026-04-01')]);
    expect(result).toHaveLength(1);
  });

  it('includes posts with publishDate equal to now', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-08T00:00:00.000Z'));
    const result = filterPublishedPosts([makePost('2026-04-08')]);
    expect(result).toHaveLength(1);
  });

  it('excludes posts with publishDate in the future', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-08'));
    const result = filterPublishedPosts([makePost('2026-12-25')]);
    expect(result).toHaveLength(0);
  });

  it('excludes posts with null publishDate', () => {
    const result = filterPublishedPosts([makePost(null)]);
    expect(result).toHaveLength(0);
  });

  it('excludes posts with undefined publishDate', () => {
    const result = filterPublishedPosts([makePost(undefined)]);
    expect(result).toHaveLength(0);
  });

  it('returns empty array for empty input', () => {
    expect(filterPublishedPosts([])).toEqual([]);
  });

  it('narrows the type to require publishDate as string', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-08'));
    const result = filterPublishedPosts([makePost('2026-04-01')]);
    // Type narrowing: publishDate should be string, not string | null | undefined
    const date: string = result[0].entry.publishDate;
    expect(date).toBe('2026-04-01');
  });
});

describe('pickRelatedPosts', () => {
  const post = (slug: string, publishDate: string) => ({ slug, entry: { publishDate } });
  const posts = [
    post('a', '2026-01-06'),
    post('b', '2026-01-13'),
    post('c', '2026-01-20'),
    post('d', '2026-01-27'),
    post('e', '2026-02-03'),
  ];

  it('picks the next posts in chronological order', () => {
    expect(pickRelatedPosts('a', posts).map((p) => p.slug)).toEqual(['b', 'c', 'd']);
  });

  it('wraps around at the end of the timeline', () => {
    expect(pickRelatedPosts('d', posts).map((p) => p.slug)).toEqual(['e', 'a', 'b']);
    expect(pickRelatedPosts('e', posts).map((p) => p.slug)).toEqual(['a', 'b', 'c']);
  });

  it('gives every post the same number of inbound links', () => {
    const inbound = new Map<string, number>();
    for (const p of posts) {
      for (const related of pickRelatedPosts(p.slug, posts)) {
        inbound.set(related.slug, (inbound.get(related.slug) ?? 0) + 1);
      }
    }
    expect([...inbound.values()]).toEqual([3, 3, 3, 3, 3]);
  });

  it('never includes the post itself', () => {
    for (const p of posts) {
      expect(pickRelatedPosts(p.slug, posts).map((r) => r.slug)).not.toContain(p.slug);
    }
  });

  it('caps at the number of other posts', () => {
    expect(pickRelatedPosts('a', posts.slice(0, 2)).map((p) => p.slug)).toEqual(['b']);
  });

  it('falls back to the oldest posts for an unknown slug', () => {
    expect(pickRelatedPosts('zz', posts).map((p) => p.slug)).toEqual(['a', 'b', 'c']);
  });
});
