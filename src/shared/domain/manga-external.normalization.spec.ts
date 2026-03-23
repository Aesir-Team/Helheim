import {
  normalizeMangaStatusFromExternal,
  normalizeMangaTypeFromExternal,
} from './manga-external.normalization';

describe('normalizeMangaTypeFromExternal', () => {
  it('should pass through canonical Prisma types', () => {
    expect(normalizeMangaTypeFromExternal('manga')).toBe('manga');
    expect(normalizeMangaTypeFromExternal('MANHWA')).toBe('manhwa');
    expect(normalizeMangaTypeFromExternal('manhua')).toBe('manhua');
  });

  it('should map doujinshi and one-shot to manga', () => {
    expect(normalizeMangaTypeFromExternal('doujinshi')).toBe('manga');
    expect(normalizeMangaTypeFromExternal('one-shot')).toBe('manga');
  });

  it('should default unknown types to manhwa', () => {
    expect(normalizeMangaTypeFromExternal('webtoon')).toBe('manhwa');
    expect(normalizeMangaTypeFromExternal(null)).toBe('manhwa');
    expect(normalizeMangaTypeFromExternal('')).toBe('manhwa');
  });
});

describe('normalizeMangaStatusFromExternal', () => {
  it('should pass through canonical statuses', () => {
    expect(normalizeMangaStatusFromExternal('ongoing')).toBe('ongoing');
    expect(normalizeMangaStatusFromExternal('completed')).toBe('completed');
    expect(normalizeMangaStatusFromExternal('cancelled')).toBe('cancelled');
  });

  it('should map hiatus to ongoing', () => {
    expect(normalizeMangaStatusFromExternal('hiatus')).toBe('ongoing');
    expect(normalizeMangaStatusFromExternal('HIATUS')).toBe('ongoing');
  });

  it('should map dropped to cancelled', () => {
    expect(normalizeMangaStatusFromExternal('dropped')).toBe('cancelled');
  });

  it('should default unknown to ongoing', () => {
    expect(normalizeMangaStatusFromExternal('unknown')).toBe('ongoing');
    expect(normalizeMangaStatusFromExternal(null)).toBe('ongoing');
  });
});
