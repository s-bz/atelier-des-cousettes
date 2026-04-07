import { describe, it, expect } from 'vitest';
import { resolveImagePath } from '../images';

const mockGlob = {
  '/src/assets/images/covers/homepage/hero.jpg': () => Promise.resolve({ default: {} as any }),
  '/src/assets/images/covers/blog/post1.webp': () => Promise.resolve({ default: {} as any }),
  '/src/assets/images/couturiere/photo.png': () => Promise.resolve({ default: {} as any }),
};

describe('resolveImagePath', () => {
  it('returns exact match when full path provided', () => {
    expect(resolveImagePath('/src/assets/images/covers/homepage/hero.jpg', mockGlob))
      .toBe('/src/assets/images/covers/homepage/hero.jpg');
  });

  it('resolves filename-only to full path via endsWith', () => {
    expect(resolveImagePath('hero.jpg', mockGlob))
      .toBe('/src/assets/images/covers/homepage/hero.jpg');
  });

  it('resolves partial path via endsWith', () => {
    expect(resolveImagePath('blog/post1.webp', mockGlob))
      .toBe('/src/assets/images/covers/blog/post1.webp');
  });

  it('returns undefined for non-existent image', () => {
    expect(resolveImagePath('nonexistent.jpg', mockGlob)).toBeUndefined();
  });

  it('returns undefined for null input', () => {
    expect(resolveImagePath(null, mockGlob)).toBeUndefined();
  });

  it('returns undefined for undefined input', () => {
    expect(resolveImagePath(undefined, mockGlob)).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    expect(resolveImagePath('', mockGlob)).toBeUndefined();
  });
});
