import {
  CheckChapterAccessUseCase,
  CHAPTER_ACCESS_REASON_COIN_NOT_UNLOCKED,
} from './check-chapter-access.use-case';
import type { ChapterCoinUnlockRepositoryPort } from '../ports/chapter-coin-unlock.repository.port';

describe('CheckChapterAccessUseCase', () => {
  const chapterId = 'ch-1';
  const userId = 'user-1';

  function makeSut(overrides?: {
    coin?: Partial<ChapterCoinUnlockRepositoryPort>;
  }) {
    const coinUnlockRepo: ChapterCoinUnlockRepositoryPort = {
      hasUnlock: jest.fn().mockResolvedValue(false),
      ...overrides?.coin,
    };

    const sut = new CheckChapterAccessUseCase(coinUnlockRepo);
    return { sut, coinUnlockRepo };
  }

  describe('Given role privilegiada (VIP)', () => {
    it('should allow without consultar desbloqueio', async () => {
      const { sut, coinUnlockRepo } = makeSut();

      const out = await sut.execute({
        userId,
        role: 'VIP',
        chapterId,
        accessLevel: 'coin',
      });

      expect(out).toEqual({ allowed: true });
      expect(coinUnlockRepo.hasUnlock).not.toHaveBeenCalled();
    });
  });

  describe('Given capítulo public', () => {
    it('should allow USER sem limite semanal nem plano', async () => {
      const { sut, coinUnlockRepo } = makeSut();

      const out = await sut.execute({
        userId,
        role: 'USER',
        chapterId,
        accessLevel: 'public',
      });

      expect(out).toEqual({ allowed: true });
      expect(coinUnlockRepo.hasUnlock).not.toHaveBeenCalled();
    });
  });

  describe('Given capítulo coin', () => {
    it('should deny com coin_chapter_not_unlocked quando não há desbloqueio', async () => {
      const { sut, coinUnlockRepo } = makeSut({
        coin: { hasUnlock: jest.fn().mockResolvedValue(false) },
      });

      const out = await sut.execute({
        userId,
        role: 'USER',
        chapterId,
        accessLevel: 'coin',
      });

      expect(out).toMatchObject({
        allowed: false,
        reasonCode: CHAPTER_ACCESS_REASON_COIN_NOT_UNLOCKED,
      });
      if (!out.allowed) {
        expect(out.message.length).toBeGreaterThan(0);
      }
      expect(coinUnlockRepo.hasUnlock).toHaveBeenCalledWith(userId, chapterId);
    });

    it('should allow quando existe UserChapterCoinUnlock', async () => {
      const { sut } = makeSut({
        coin: { hasUnlock: jest.fn().mockResolvedValue(true) },
      });

      const out = await sut.execute({
        userId,
        role: 'USER',
        chapterId,
        accessLevel: 'coin',
      });

      expect(out).toEqual({ allowed: true });
    });
  });
});
