import { describe, expect, it } from 'vitest';
import { adjFilter, lsEm, shapePath, SHAPES } from '../design/shapes';

describe('vector shapes', () => {
  it('every shape yields a closed path inside its box', () => {
    for (const s of SHAPES) {
      const d = shapePath(s.k, 200, 100);
      expect(d.startsWith('M')).toBe(true);
      expect(d.trim().endsWith('Z')).toBe(true);
      const nums = (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
      expect(Math.min(...nums)).toBeGreaterThanOrEqual(0);
      expect(Math.max(...nums)).toBeLessThanOrEqual(200);
    }
  });
});

describe('image adjustments', () => {
  it('builds a CSS/canvas filter string and skips neutral values', () => {
    expect(adjFilter(undefined, (px) => `${px}px`)).toBeUndefined();
    expect(adjFilter({ bri: 0 }, (px) => `${px}px`)).toBeUndefined();
    expect(adjFilter({ bri: 50, gray: 100, blur: 50 }, (px) => `${px}px`)).toBe('brightness(1.5) grayscale(1) blur(12px)');
  });
  it('letter spacing defaults to the previous -0.01em', () => {
    expect(lsEm(undefined)).toBe(-0.01);
    expect(lsEm(100)).toBe(0.1);
  });
});
