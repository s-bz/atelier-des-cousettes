import { describe, it, expect } from 'vitest';
import { ATELIER_GROUPS, ATELIER_GROUP_LABELS } from '../ateliers';

describe('ATELIER_GROUPS', () => {
  it('has unique ids', () => {
    const ids = ATELIER_GROUPS.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all entries have non-empty id and label', () => {
    ATELIER_GROUPS.forEach((g) => {
      expect(g.id.length).toBeGreaterThan(0);
      expect(g.label.length).toBeGreaterThan(0);
    });
  });
});

describe('ATELIER_GROUP_LABELS', () => {
  it('has one entry per group', () => {
    expect(Object.keys(ATELIER_GROUP_LABELS)).toHaveLength(ATELIER_GROUPS.length);
  });

  it('maps each id to its label', () => {
    ATELIER_GROUPS.forEach((g) => {
      expect(ATELIER_GROUP_LABELS[g.id]).toBe(g.label);
    });
  });
});
