import { GetChapterSummaryByMangaSlugAndNumberUseCase } from './get-chapter-summary-by-manga-slug-and-number.use-case';
import type {
  ChapterRepositoryPort,
  ChapterSummaryDto,
} from '../ports/chapter.repository.port';
import { NotFoundError } from '../../../../shared/domain/errors';
import type { ChapterSummariesViewerLockApplier } from '../services/chapter-summaries-viewer-lock.applier';

function makeLockApplier(): ChapterSummariesViewerLockApplier {
  return {
    apply: jest.fn(async (_v, items) => [...items]),
  } as unknown as ChapterSummariesViewerLockApplier;
}

const S1: ChapterSummaryDto = {
  id: 'ch-1',
  mangaId: 'm1',
  number: '1',
  title: 'Um',
  accessLevel: 'public',
  isLocked: false,
  coinCost: 0,
  createdAt: new Date('2026-01-01'),
};

const S2: ChapterSummaryDto = {
  id: 'ch-2',
  mangaId: 'm1',
  number: '2',
  title: 'Dois',
  accessLevel: 'public',
  isLocked: false,
  coinCost: 0,
  createdAt: new Date('2026-01-02'),
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

describe('GetChapterSummaryByMangaSlugAndNumberUseCase', () => {
  describe('Given slug e número válidos no catálogo', () => {
    it('should return página em ordem asc a partir do capítulo', async () => {
      const repo = makeRepo({
        listPublishedSummariesFromMangaSlugFromNumberAsc: jest
          .fn()
          .mockResolvedValue({ data: [S1, S2], total: 2 }),
      });
      const sut = new GetChapterSummaryByMangaSlugAndNumberUseCase(
        repo,
        makeLockApplier(),
      );

      const out = await sut.execute({
        mangaSlug: 'solo-leveling',
        chapterNumber: '1',
      });

      expect(out).toEqual({
        data: [S1, S2],
        total: 2,
        page: 1,
        limit: 50,
      });
      expect(
        repo.listPublishedSummariesFromMangaSlugFromNumberAsc,
      ).toHaveBeenCalledWith('solo-leveling', '1', { page: 1, limit: 50 });
    });

    it('should trim slug e chapterNumber', async () => {
      const repo = makeRepo({
        listPublishedSummariesFromMangaSlugFromNumberAsc: jest
          .fn()
          .mockResolvedValue({ data: [S1], total: 1 }),
      });
      const sut = new GetChapterSummaryByMangaSlugAndNumberUseCase(
        repo,
        makeLockApplier(),
      );

      await sut.execute({
        mangaSlug: '  solo-leveling  ',
        chapterNumber: '  1  ',
        page: 2,
        limit: 10,
      });

      expect(
        repo.listPublishedSummariesFromMangaSlugFromNumberAsc,
      ).toHaveBeenCalledWith('solo-leveling', '1', { page: 2, limit: 10 });
    });

    it('should cap limit at 200', async () => {
      const repo = makeRepo({
        listPublishedSummariesFromMangaSlugFromNumberAsc: jest
          .fn()
          .mockResolvedValue({ data: [], total: 0 }),
      });
      const sut = new GetChapterSummaryByMangaSlugAndNumberUseCase(
        repo,
        makeLockApplier(),
      );

      await sut.execute({
        mangaSlug: 'solo',
        chapterNumber: '1',
        limit: 999,
      });

      expect(
        repo.listPublishedSummariesFromMangaSlugFromNumberAsc,
      ).toHaveBeenCalledWith('solo', '1', { page: 1, limit: 200 });
    });
  });

  describe('Given capítulo ou mangá inexistente', () => {
    it('should throw NotFoundError quando repo retorna null', async () => {
      const repo = makeRepo({
        listPublishedSummariesFromMangaSlugFromNumberAsc: jest
          .fn()
          .mockResolvedValue(null),
      });
      const sut = new GetChapterSummaryByMangaSlugAndNumberUseCase(
        repo,
        makeLockApplier(),
      );

      await expect(
        sut.execute({ mangaSlug: 'x', chapterNumber: '99' }),
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError quando número vazio após trim', async () => {
      const repo = makeRepo();
      const sut = new GetChapterSummaryByMangaSlugAndNumberUseCase(
        repo,
        makeLockApplier(),
      );

      await expect(
        sut.execute({ mangaSlug: 'solo', chapterNumber: '   ' }),
      ).rejects.toThrow(NotFoundError);
      expect(
        repo.listPublishedSummariesFromMangaSlugFromNumberAsc,
      ).not.toHaveBeenCalled();
    });
  });
});
