import { resolveMangaChaptersDisplayCount } from './manga-chapter-display-count.policy';

describe('resolveMangaChaptersDisplayCount', () => {
  it('should use max entre BD e reportado', () => {
    expect(resolveMangaChaptersDisplayCount(5, 180)).toBe(180);
    expect(resolveMangaChaptersDisplayCount(200, 180)).toBe(200);
    expect(resolveMangaChaptersDisplayCount(10, null)).toBe(10);
  });
});
