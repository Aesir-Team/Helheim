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
import type { SaveReadingProgressUseCase } from '../../../progress/application/use-cases/save-reading-progress.use-case';

const DETAIL: ChapterDetailDto = {
  id: 'ch-2',
  mangaId: 'm1',
  number: '2',
  title: 'Dois',
  accessLevel: 'public',
  isLocked: false,
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
    findExistingNumbersByMangaId: jest.fn().mockResolvedValue([]),
    listByMangaSlug: jest.fn().mockResolvedValue({ data: [], total: 0 }),
    listPublishedSummariesFromMangaSlugFromNumberAsc: jest
      .fn()
      .mockResolvedValue(null),
    findById: jest.fn().mockResolvedValue(null),
    findNeighborChapterIds: jest
      .fn()
      .mockResolvedValue({ prevChapterId: null, nextChapterId: null }),
    upsertByMangaAndNumber: jest.fn().mockResolvedValue({ id: 'x' }),
    applyFreeTierAccessForManga: jest
      .fn()
      .mockResolvedValue({ publicCount: 0, coinCount: 0 }),
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
      const saveReadingProgress = {
        execute: jest.fn(),
      } as unknown as SaveReadingProgressUseCase;
      const sut = new GetChapterForReadingUseCase(
        repo,
        checkChapterAccess,
        saveReadingProgress,
      );

      await expect(
        sut.execute({
          chapterId: 'missing-id',
          user: { userId: 'u1', role: 'USER' },
        }),
      ).rejects.toThrow(NotFoundError);
      expect(repo.findNeighborChapterIds).not.toHaveBeenCalled();
      expect(checkChapterAccess.execute).not.toHaveBeenCalled();
      expect(saveReadingProgress.execute).not.toHaveBeenCalled();
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
          reasonCode: 'coin_chapter_not_unlocked',
          message: 'Desbloqueie antes de ler',
        }),
      } as unknown as CheckChapterAccessUseCase;
      const saveReadingProgress = {
        execute: jest.fn(),
      } as unknown as SaveReadingProgressUseCase;
      const sut = new GetChapterForReadingUseCase(
        repo,
        checkChapterAccess,
        saveReadingProgress,
      );

      await expect(
        sut.execute({
          chapterId: 'ch-2',
          user: { userId: 'u1', role: 'USER' },
        }),
      ).rejects.toThrow(ForbiddenError);

      try {
        await sut.execute({
          chapterId: 'ch-2',
          user: { userId: 'u1', role: 'USER' },
        });
        expect(true).toBe(false);
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(ForbiddenError);
        const fe = e as ForbiddenError;
        expect(fe.reasonCode).toBe('coin_chapter_not_unlocked');
        expect(fe.message).toBe('Desbloqueie antes de ler');
      }
      expect(saveReadingProgress.execute).not.toHaveBeenCalled();
    });
  });

  describe('Given capítulo publicado com páginas e acesso permitido', () => {
    it('should return detail with pages ordenadas e vizinhos e gravar progresso', async () => {
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
      const saveReadingProgress = {
        execute: jest.fn().mockResolvedValue({
          id: 'rp1',
          userId: 'u1',
          mangaId: 'm1',
          chapterId: 'ch-2',
          pageNumber: 1,
          chaptersReadCount: 1,
          lastReadAt: new Date(),
        }),
      } as unknown as SaveReadingProgressUseCase;
      const sut = new GetChapterForReadingUseCase(
        repo,
        checkChapterAccess,
        saveReadingProgress,
      );

      const out = await sut.execute({
        chapterId: 'ch-2',
        user: { userId: 'u1', role: 'USER' },
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
      expect(saveReadingProgress.execute).toHaveBeenCalledWith({
        userId: 'u1',
        mangaId: 'm1',
        chapterId: 'ch-2',
        pageNumber: 1,
      });
      expect(repo.findNeighborChapterIds).toHaveBeenCalledWith('ch-2');
    });
  });

  describe('Given visitante (sem usuário) e capítulo public', () => {
    it('should return páginas e vizinhos sem check, nem progresso', async () => {
      const repo = makeRepo({
        findById: jest.fn().mockResolvedValue(DETAIL),
        findNeighborChapterIds: jest.fn().mockResolvedValue({
          prevChapterId: 'ch-1',
          nextChapterId: 'ch-3',
        }),
      });
      const checkChapterAccess = {
        execute: jest.fn(),
      } as unknown as CheckChapterAccessUseCase;
      const saveReadingProgress = {
        execute: jest.fn(),
      } as unknown as SaveReadingProgressUseCase;
      const sut = new GetChapterForReadingUseCase(
        repo,
        checkChapterAccess,
        saveReadingProgress,
      );

      const out = await sut.execute({ chapterId: 'ch-2', user: null });

      expect(out.pages).toEqual([
        { pageNumber: 1, imageUrl: 'https://a.jpg' },
        { pageNumber: 2, imageUrl: 'https://b.jpg' },
      ]);
      expect(checkChapterAccess.execute).not.toHaveBeenCalled();
      expect(saveReadingProgress.execute).not.toHaveBeenCalled();
    });
  });

  describe('Given visitante e capítulo coin', () => {
    it('should throw ForbiddenError authentication_required', async () => {
      const coinDetail: ChapterDetailDto = {
        ...DETAIL,
        accessLevel: 'coin',
        isLocked: true,
        coinCost: 10,
      };
      const repo = makeRepo({
        findById: jest.fn().mockResolvedValue(coinDetail),
      });
      const checkChapterAccess = {
        execute: jest.fn(),
      } as unknown as CheckChapterAccessUseCase;
      const saveReadingProgress = {
        execute: jest.fn(),
      } as unknown as SaveReadingProgressUseCase;
      const sut = new GetChapterForReadingUseCase(
        repo,
        checkChapterAccess,
        saveReadingProgress,
      );

      await expect(
        sut.execute({ chapterId: 'ch-2', user: null }),
      ).rejects.toThrow(ForbiddenError);

      try {
        await sut.execute({ chapterId: 'ch-2', user: null });
        expect(true).toBe(false);
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(ForbiddenError);
        const fe = e as ForbiddenError;
        expect(fe.reasonCode).toBe('authentication_required');
      }
      expect(checkChapterAccess.execute).not.toHaveBeenCalled();
    });
  });
});
