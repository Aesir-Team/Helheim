import { GetChapterForReadingUseCase } from './get-chapter-for-reading.use-case';
import type {
  ChapterRepositoryPort,
  ChapterDetailDto,
} from '../ports/chapter.repository.port';
import {
  NotFoundError,
  ForbiddenError,
} from '../../../../shared/domain/errors';
import type { CheckChapterAccessUseCase } from '../../../access/application/use-cases/check-chapter-access.use-case';
import type { ConsumeWeeklyChapterAccessUseCase } from '../../../access/application/use-cases/consume-weekly-chapter-access.use-case';

const DETAIL: ChapterDetailDto = {
  id: 'ch-2',
  mangaId: 'm1',
  number: '2',
  title: 'Dois',
  accessLevel: 'public',
  coinCost: 0,
  views: 10,
  createdAt: new Date('2026-01-02'),
  mangaSlug: 'solo',
  mangaTitle: 'Solo',
  pages: [
    { pageNumber: 2, imageUrl: 'https://b.jpg' },
    { pageNumber: 1, imageUrl: 'https://a.jpg' },
  ],
};

function makeRepo(
  overrides?: Partial<ChapterRepositoryPort>,
): ChapterRepositoryPort {
  return {
    listByMangaSlug: jest.fn().mockResolvedValue({ data: [], total: 0 }),
    findById: jest.fn().mockResolvedValue(null),
    findNeighborChapterIds: jest
      .fn()
      .mockResolvedValue({ prevChapterId: null, nextChapterId: null }),
    upsertByMangaAndNumber: jest.fn().mockResolvedValue({ id: 'x' }),
    ...overrides,
  };
}

describe('GetChapterForReadingUseCase', () => {
  describe('Given capítulo não existe ou não está publicado', () => {
    it('should throw NotFoundError', async () => {
      const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
      const checkChapterAccess = {
        execute: jest.fn(),
      } as unknown as CheckChapterAccessUseCase;
      const consumeWeeklyChapterAccess = {
        execute: jest.fn(),
      } as unknown as ConsumeWeeklyChapterAccessUseCase;
      const sut = new GetChapterForReadingUseCase(
        repo,
        checkChapterAccess,
        consumeWeeklyChapterAccess,
      );

      await expect(
        sut.execute({
          chapterId: 'missing-id',
          userId: 'u1',
          role: 'USER',
        }),
      ).rejects.toThrow(NotFoundError);
      expect(repo.findNeighborChapterIds).not.toHaveBeenCalled();
      expect(checkChapterAccess.execute).not.toHaveBeenCalled();
    });
  });

  describe('Given acesso negado pelo CheckChapterAccess', () => {
    it('should throw ForbiddenError com reasonCode', async () => {
      const repo = makeRepo({
        findById: jest.fn().mockResolvedValue(DETAIL),
      });
      const checkChapterAccess = {
        execute: jest.fn().mockResolvedValue({
          allowed: false,
          reasonCode: 'weekly_chapter_limit_exceeded',
          message: 'Limite atingido',
        }),
      } as unknown as CheckChapterAccessUseCase;
      const consumeWeeklyChapterAccess = {
        execute: jest.fn(),
      } as unknown as ConsumeWeeklyChapterAccessUseCase;
      const sut = new GetChapterForReadingUseCase(
        repo,
        checkChapterAccess,
        consumeWeeklyChapterAccess,
      );

      await expect(
        sut.execute({ chapterId: 'ch-2', userId: 'u1', role: 'USER' }),
      ).rejects.toThrow(ForbiddenError);

      try {
        await sut.execute({ chapterId: 'ch-2', userId: 'u1', role: 'USER' });
        expect(true).toBe(false);
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(ForbiddenError);
        const fe = e as ForbiddenError;
        expect(fe.reasonCode).toBe('weekly_chapter_limit_exceeded');
        expect(fe.message).toBe('Limite atingido');
      }
      expect(consumeWeeklyChapterAccess.execute).not.toHaveBeenCalled();
    });
  });

  describe('Given capítulo publicado com páginas e acesso permitido', () => {
    it('should consume, return detail with pages ordenadas e vizinhos', async () => {
      const repo = makeRepo({
        findById: jest.fn().mockResolvedValue(DETAIL),
        findNeighborChapterIds: jest.fn().mockResolvedValue({
          prevChapterId: 'ch-1',
          nextChapterId: 'ch-3',
        }),
      });
      const checkChapterAccess = {
        execute: jest.fn().mockResolvedValue({ allowed: true }),
      } as unknown as CheckChapterAccessUseCase;
      const consumeWeeklyChapterAccess = {
        execute: jest.fn().mockResolvedValue('created'),
      } as unknown as ConsumeWeeklyChapterAccessUseCase;
      const sut = new GetChapterForReadingUseCase(
        repo,
        checkChapterAccess,
        consumeWeeklyChapterAccess,
      );

      const out = await sut.execute({
        chapterId: 'ch-2',
        userId: 'u1',
        role: 'USER',
      });

      expect(out.id).toBe('ch-2');
      expect(out.pages).toEqual([
        { pageNumber: 1, imageUrl: 'https://a.jpg' },
        { pageNumber: 2, imageUrl: 'https://b.jpg' },
      ]);
      expect(out.prevChapterId).toBe('ch-1');
      expect(out.nextChapterId).toBe('ch-3');
      expect(checkChapterAccess.execute).toHaveBeenCalledWith({
        userId: 'u1',
        role: 'USER',
        chapterId: 'ch-2',
        accessLevel: 'public',
      });
      expect(consumeWeeklyChapterAccess.execute).toHaveBeenCalledWith({
        userId: 'u1',
        chapterId: 'ch-2',
        accessLevel: 'public',
      });
      expect(repo.findNeighborChapterIds).toHaveBeenCalledWith('ch-2');
    });
  });
});
