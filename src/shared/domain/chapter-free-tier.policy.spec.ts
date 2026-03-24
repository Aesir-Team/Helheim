import {
  compareChapterNumberAsc,
  freePublicChapterCount,
  parseCoinChapterCost,
  parseFreeChapterFraction,
} from './chapter-free-tier.policy';

describe('chapter-free-tier.policy', () => {
  describe('compareChapterNumberAsc', () => {
    it('should order numeric-like strings naturally', () => {
      const nums = ['10', '2', '1', '3'];
      const sorted = [...nums].sort(compareChapterNumberAsc);
      expect(sorted).toEqual(['1', '2', '3', '10']);
    });
  });

  describe('freePublicChapterCount', () => {
    it('should return 0 when no chapters', () => {
      expect(freePublicChapterCount(0, 0.1)).toBe(0);
    });

    it('should use ceil of fraction * total', () => {
      expect(freePublicChapterCount(201, 0.1)).toBe(21);
      expect(freePublicChapterCount(10, 0.1)).toBe(1);
      expect(freePublicChapterCount(9, 0.1)).toBe(1);
      expect(freePublicChapterCount(100, 0.1)).toBe(10);
    });
  });

  describe('parseCoinChapterCost', () => {
    it('should default to 1', () => {
      expect(parseCoinChapterCost(undefined)).toBe(1);
    });
  });

  describe('parseFreeChapterFraction', () => {
    it('should default to 0.1', () => {
      expect(parseFreeChapterFraction(undefined)).toBe(0.1);
      expect(parseFreeChapterFraction('')).toBe(0.1);
    });

    it('should cap at 1', () => {
      expect(parseFreeChapterFraction(2)).toBe(1);
    });
  });
});
