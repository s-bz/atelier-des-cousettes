import { describe, it, expect, vi, afterEach } from 'vitest';
import { filterPublishedPosts } from '../blog';

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
