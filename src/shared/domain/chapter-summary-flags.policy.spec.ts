import {
  isChapterNewByAge,
  isChapterReadUpToBookmark,
} from './chapter-summary-flags.policy';

describe('isChapterReadUpToBookmark', () => {
  it('should be false sem marcador', () => {
    expect(isChapterReadUpToBookmark('1', null)).toBe(false);
    expect(isChapterReadUpToBookmark('1', '')).toBe(false);
  });

  it('should mark até o marcador inclusive', () => {
    expect(isChapterReadUpToBookmark('1', '3')).toBe(true);
    expect(isChapterReadUpToBookmark('3', '3')).toBe(true);
    expect(isChapterReadUpToBookmark('4', '3')).toBe(false);
  });
});

describe('isChapterNewByAge', () => {
  const now = new Date('2026-03-24T12:00:00.000Z');

  it('should respect janela em dias', () => {
    const recent = new Date('2026-03-23T12:00:00.000Z');
    const old = new Date('2026-03-01T12:00:00.000Z');
    expect(isChapterNewByAge(recent, now, 2)).toBe(true);
    expect(isChapterNewByAge(old, now, 2)).toBe(false);
  });

  it('should return false para maxAgeDays inválido', () => {
    expect(isChapterNewByAge(now, now, 0)).toBe(false);
    expect(isChapterNewByAge(now, now, NaN)).toBe(false);
  });
});
