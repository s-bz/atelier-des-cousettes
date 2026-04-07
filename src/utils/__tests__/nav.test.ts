import { describe, it, expect } from 'vitest';
import { SERVICE_LINKS, getCrossLinks } from '../nav';

describe('SERVICE_LINKS', () => {
  it('contains 3 service links', () => {
    expect(SERVICE_LINKS).toHaveLength(3);
  });

  it('all links have href starting with /', () => {
    SERVICE_LINKS.forEach((link) => {
      expect(link.href).toMatch(/^\//);
    });
  });
});

describe('getCrossLinks', () => {
  it('excludes the specified href', () => {
    const links = getCrossLinks('/ateliers-reguliers');
    expect(links).toHaveLength(2);
    expect(links.every((l) => l.href !== '/ateliers-reguliers')).toBe(true);
  });

  it('returns all links when href does not match any', () => {
    const links = getCrossLinks('/nonexistent');
    expect(links).toHaveLength(3);
  });
});
