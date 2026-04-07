import { describe, it, expect } from 'vitest';
import { toSlug, formatFrenchDate, splitParagraphs, splitLines } from '../strings';

describe('toSlug', () => {
  it('lowercases and replaces spaces with hyphens', () => {
    expect(toSlug('Mon Stage Couture')).toBe('mon-stage-couture');
  });

  it('strips French diacritics', () => {
    expect(toSlug('Création été')).toBe('creation-ete');
  });

  it('strips combined unicode accents (NFD)', () => {
    expect(toSlug('café')).toBe('cafe');
  });

  it('collapses consecutive non-alphanumeric chars into a single hyphen', () => {
    expect(toSlug('a - - b')).toBe('a-b');
  });

  it('strips leading and trailing hyphens', () => {
    expect(toSlug(' -hello- ')).toBe('hello');
  });

  it('returns empty string for empty input', () => {
    expect(toSlug('')).toBe('');
  });

  it('handles special characters', () => {
    expect(toSlug("L'après-midi couture")).toBe('l-apres-midi-couture');
  });
});

describe('formatFrenchDate', () => {
  it('formats a valid ISO date in French', () => {
    const result = formatFrenchDate('2026-03-15');
    expect(result).toContain('mars');
    expect(result).toContain('2026');
    expect(result).toContain('15');
  });

  it('returns empty string for invalid date', () => {
    expect(formatFrenchDate('not-a-date')).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(formatFrenchDate('')).toBe('');
  });
});

describe('splitParagraphs', () => {
  it('splits on double newlines', () => {
    expect(splitParagraphs('Para 1\n\nPara 2')).toEqual(['Para 1', 'Para 2']);
  });

  it('splits on double newlines with extra whitespace', () => {
    expect(splitParagraphs('A\n  \nB')).toEqual(['A', 'B']);
  });

  it('collapses single newlines within a paragraph into spaces', () => {
    expect(splitParagraphs('line1\nline2\n\nline3')).toEqual(['line1 line2', 'line3']);
  });

  it('returns empty array for empty string', () => {
    expect(splitParagraphs('')).toEqual([]);
  });

  it('returns empty array for whitespace-only string', () => {
    expect(splitParagraphs('   ')).toEqual([]);
  });

  it('trims each paragraph', () => {
    expect(splitParagraphs('  hello  \n\n  world  ')).toEqual(['hello', 'world']);
  });

  it('handles single paragraph (no double newline)', () => {
    expect(splitParagraphs('Just one paragraph')).toEqual(['Just one paragraph']);
  });

  it('handles Windows line endings (\\r\\n)', () => {
    expect(splitParagraphs('Para 1\r\n\r\nPara 2')).toEqual(['Para 1', 'Para 2']);
  });

  it('collapses Windows single newlines within a paragraph', () => {
    expect(splitParagraphs('line1\r\nline2\r\n\r\nline3')).toEqual(['line1 line2', 'line3']);
  });
});

describe('splitLines', () => {
  it('splits on single newlines', () => {
    expect(splitLines('a\nb\nc')).toEqual(['a', 'b', 'c']);
  });

  it('trims each line', () => {
    expect(splitLines('  a  \n  b  ')).toEqual(['a', 'b']);
  });

  it('filters out empty lines', () => {
    expect(splitLines('a\n\n\nb')).toEqual(['a', 'b']);
  });

  it('returns empty array for empty string', () => {
    expect(splitLines('')).toEqual([]);
  });

  it('handles Windows line endings (\\r\\n)', () => {
    expect(splitLines('a\r\nb\r\nc')).toEqual(['a', 'b', 'c']);
  });
});
