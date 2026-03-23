import {
  CheckChapterAccessUseCase,
  CHAPTER_ACCESS_REASON_COIN_NOT_AVAILABLE,
  CHAPTER_ACCESS_REASON_WEEKLY_LIMIT,
} from './check-chapter-access.use-case';
import type { GetEffectivePlanUseCase } from './get-effective-plan.use-case';
import type { EffectivePlanOutput } from './get-effective-plan.use-case';
import type { WeeklyChapterAccessRepositoryPort } from '../ports/weekly-chapter-access.repository.port';

describe('CheckChapterAccessUseCase', () => {
  const chapterId = 'ch-1';
  const userId = 'user-1';

  function makeSut(overrides?: {
    plan?: Partial<EffectivePlanOutput>;
    week?: Partial<WeeklyChapterAccessRepositoryPort>;
  }) {
    const planResult = {
      planSlug: 'gratuito',
      planName: 'Gratuito',
      freeChaptersPerWeek: 2,
      isUnlimited: false,
      ...overrides?.plan,
    };

    const getEffectivePlan = {
      execute: jest.fn().mockResolvedValue(planResult),
    } as unknown as GetEffectivePlanUseCase;

    const weekAccessRepo: WeeklyChapterAccessRepositoryPort = {
      existsForUserChapterWeek: jest.fn().mockResolvedValue(false),
      countDistinctChaptersForWeek: jest.fn().mockResolvedValue(0),
      createIfNotExists: jest.fn(),
      ...overrides?.week,
    };

    const sut = new CheckChapterAccessUseCase(getEffectivePlan, weekAccessRepo);
    return { sut, getEffectivePlan, weekAccessRepo };
  }

  describe('Given role privilegiada (VIP)', () => {
    it('should allow without consultar plano ou contagem', async () => {
      const { sut, getEffectivePlan, weekAccessRepo } = makeSut();

      const out = await sut.execute({
        userId,
        role: 'VIP',
        chapterId,
        accessLevel: 'public',
      });

      expect(out).toEqual({ allowed: true });
      expect(getEffectivePlan.execute).not.toHaveBeenCalled();
      expect(weekAccessRepo.existsForUserChapterWeek).not.toHaveBeenCalled();
    });
  });

  describe('Given capítulo coin (MVP bloqueado)', () => {
    it('should deny with coin_chapter_not_available', async () => {
      const { sut, getEffectivePlan } = makeSut();

      const out = await sut.execute({
        userId,
        role: 'USER',
        chapterId,
        accessLevel: 'coin',
      });

      expect(out).toMatchObject({
        allowed: false,
        reasonCode: CHAPTER_ACCESS_REASON_COIN_NOT_AVAILABLE,
      });
      if (!out.allowed) {
        expect(out.message.length).toBeGreaterThan(0);
      }
      expect(getEffectivePlan.execute).not.toHaveBeenCalled();
    });
  });

  describe('Given plano ilimitado', () => {
    it('should allow capítulo public', async () => {
      const { sut, weekAccessRepo } = makeSut({
        plan: {
          freeChaptersPerWeek: null,
          isUnlimited: true,
        },
      });

      const out = await sut.execute({
        userId,
        role: 'USER',
        chapterId,
        accessLevel: 'public',
      });

      expect(out).toEqual({ allowed: true });
      expect(
        weekAccessRepo.countDistinctChaptersForWeek,
      ).not.toHaveBeenCalled();
    });
  });

  describe('Given usuário já abriu o mesmo capítulo na semana atual', () => {
    it('should allow mesmo se cota semanal cheia', async () => {
      const { sut, weekAccessRepo } = makeSut({
        plan: { freeChaptersPerWeek: 1, isUnlimited: false },
        week: {
          existsForUserChapterWeek: jest.fn().mockResolvedValue(true),
          countDistinctChaptersForWeek: jest.fn().mockResolvedValue(99),
        },
      });

      const out = await sut.execute({
        userId,
        role: 'USER',
        chapterId,
        accessLevel: 'public',
      });

      expect(out).toEqual({ allowed: true });
      expect(
        weekAccessRepo.countDistinctChaptersForWeek,
      ).not.toHaveBeenCalled();
    });
  });

  describe('Given cota semanal e capítulo public novo na semana', () => {
    it('should allow quando uso < limite', async () => {
      const { sut, weekAccessRepo } = makeSut({
        plan: { freeChaptersPerWeek: 3, isUnlimited: false },
        week: {
          existsForUserChapterWeek: jest.fn().mockResolvedValue(false),
          countDistinctChaptersForWeek: jest.fn().mockResolvedValue(2),
        },
      });

      const out = await sut.execute({
        userId,
        role: 'USER',
        chapterId,
        accessLevel: 'public',
      });

      expect(out).toEqual({ allowed: true });
      expect(weekAccessRepo.countDistinctChaptersForWeek).toHaveBeenCalled();
    });

    it('should deny quando uso >= limite', async () => {
      const { sut } = makeSut({
        plan: { freeChaptersPerWeek: 3, isUnlimited: false },
        week: {
          existsForUserChapterWeek: jest.fn().mockResolvedValue(false),
          countDistinctChaptersForWeek: jest.fn().mockResolvedValue(3),
        },
      });

      const out = await sut.execute({
        userId,
        role: 'USER',
        chapterId,
        accessLevel: 'public',
      });

      expect(out).toMatchObject({
        allowed: false,
        reasonCode: CHAPTER_ACCESS_REASON_WEEKLY_LIMIT,
      });
      if (!out.allowed) {
        expect(out.message).toContain('3');
      }
    });
  });
});
