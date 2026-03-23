import { ConflictError, NotFoundError } from '../../../../shared/domain/errors';
import type { MangaRepositoryPort } from '../../../catalog/application/ports/manga.repository.port';
import type { ChapterRepositoryPort } from '../../../catalog/application/ports/chapter.repository.port';
import type { ReadingProgressRepositoryPort } from '../ports/reading-progress.repository.port';
import { SaveReadingProgressUseCase } from './save-reading-progress.use-case';
import { GetContinueReadingUseCase } from './get-continue-reading.use-case';

const MANGA = {
  id: 'm1',
  title: 'T',
  slug: 't',
  coverImage: 'c',
};

const CHAPTER = {
  id: 'ch1',
  mangaId: 'm1',
  number: '1',
  title: 'Cap 1',
  accessLevel: 'public',
  coinCost: 0,
  views: 0,
  createdAt: new Date(),
  mangaSlug: 't',
  mangaTitle: 'T',
  pages: [] as { pageNumber: number; imageUrl: string }[],
};

function makeProgressRepo(
  overrides?: Partial<ReadingProgressRepositoryPort>,
): ReadingProgressRepositoryPort {
  return {
    findByUserAndManga: jest.fn().mockResolvedValue(null),
    upsert: jest.fn().mockResolvedValue({
      id: 'p1',
      userId: 'u1',
      mangaId: 'm1',
      chapterId: 'ch1',
      pageNumber: 1,
      chaptersReadCount: 1,
      lastReadAt: new Date('2026-01-01'),
    }),
    listContinueReading: jest.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function makeMangaRepo(
  overrides?: Partial<MangaRepositoryPort>,
): MangaRepositoryPort {
  return {
    findBySlug: jest.fn(),
    findByIdForListItem: jest.fn().mockResolvedValue(MANGA),
    list: jest.fn(),
    upsertBySlug: jest.fn(),
    linkCategories: jest.fn(),
    getSyncStatus: jest.fn(),
    setSyncStatus: jest.fn(),
    ...overrides,
  };
}

function makeChapterRepo(
  overrides?: Partial<ChapterRepositoryPort>,
): ChapterRepositoryPort {
  return {
    listByMangaSlug: jest.fn(),
    findById: jest.fn().mockResolvedValue(CHAPTER),
    findNeighborChapterIds: jest.fn(),
    upsertByMangaAndNumber: jest.fn(),
    ...overrides,
  };
}

describe('Reading progress (PRODUTO §3.6)', () => {
  describe('SaveReadingProgressUseCase', () => {
    it('should throw NotFoundError when manga missing', async () => {
      const sut = new SaveReadingProgressUseCase(
        makeProgressRepo(),
        makeMangaRepo({
          findByIdForListItem: jest.fn().mockResolvedValue(null),
        }),
        makeChapterRepo(),
      );
      await expect(
        sut.execute({
          userId: 'u1',
          mangaId: 'm1',
          chapterId: 'ch1',
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when chapter missing', async () => {
      const sut = new SaveReadingProgressUseCase(
        makeProgressRepo(),
        makeMangaRepo(),
        makeChapterRepo({ findById: jest.fn().mockResolvedValue(null) }),
      );
      await expect(
        sut.execute({ userId: 'u1', mangaId: 'm1', chapterId: 'ch1' }),
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ConflictError when chapter belongs to another manga', async () => {
      const sut = new SaveReadingProgressUseCase(
        makeProgressRepo(),
        makeMangaRepo(),
        makeChapterRepo({
          findById: jest.fn().mockResolvedValue({
            ...CHAPTER,
            mangaId: 'other',
          }),
        }),
      );
      await expect(
        sut.execute({ userId: 'u1', mangaId: 'm1', chapterId: 'ch1' }),
      ).rejects.toThrow(ConflictError);
    });

    it('should return existing without upsert when data unchanged (idempotência)', async () => {
      const existing = {
        id: 'p1',
        userId: 'u1',
        mangaId: 'm1',
        chapterId: 'ch1',
        pageNumber: 2,
        chaptersReadCount: 3,
        lastReadAt: new Date('2026-01-05'),
      };
      const progressRepo = makeProgressRepo({
        findByUserAndManga: jest.fn().mockResolvedValue(existing),
      });
      const sut = new SaveReadingProgressUseCase(
        progressRepo,
        makeMangaRepo(),
        makeChapterRepo(),
      );
      const out = await sut.execute({
        userId: 'u1',
        mangaId: 'm1',
        chapterId: 'ch1',
        pageNumber: 2,
        chaptersReadCount: 3,
      });
      expect(out).toBe(existing);
      expect(progressRepo.upsert).not.toHaveBeenCalled();
    });

    it('should upsert when pageNumber changes', async () => {
      const existing = {
        id: 'p1',
        userId: 'u1',
        mangaId: 'm1',
        chapterId: 'ch1',
        pageNumber: 1,
        chaptersReadCount: 1,
        lastReadAt: new Date('2026-01-05'),
      };
      const upserted = { ...existing, pageNumber: 5, lastReadAt: new Date() };
      const progressRepo = makeProgressRepo({
        findByUserAndManga: jest.fn().mockResolvedValue(existing),
        upsert: jest.fn().mockResolvedValue(upserted),
      });
      const sut = new SaveReadingProgressUseCase(
        progressRepo,
        makeMangaRepo(),
        makeChapterRepo(),
      );
      const out = await sut.execute({
        userId: 'u1',
        mangaId: 'm1',
        chapterId: 'ch1',
        pageNumber: 5,
      });
      expect(out.pageNumber).toBe(5);
      expect(progressRepo.upsert).toHaveBeenCalled();
    });

    it('should increment chaptersReadCount when chapter changes and count omitted', async () => {
      const existing = {
        id: 'p1',
        userId: 'u1',
        mangaId: 'm1',
        chapterId: 'ch1',
        pageNumber: 1,
        chaptersReadCount: 2,
        lastReadAt: new Date('2026-01-05'),
      };
      const ch2 = { ...CHAPTER, id: 'ch2', mangaId: 'm1' };
      const progressRepo = makeProgressRepo({
        findByUserAndManga: jest.fn().mockResolvedValue(existing),
        upsert: jest
          .fn()
          .mockImplementation((_u, _m, d: { chaptersReadCount: number }) =>
            Promise.resolve({ ...existing, ...d, chapterId: 'ch2' }),
          ),
      });
      const sut = new SaveReadingProgressUseCase(
        progressRepo,
        makeMangaRepo(),
        makeChapterRepo({
          findById: jest.fn().mockResolvedValue(ch2),
        }),
      );
      await sut.execute({
        userId: 'u1',
        mangaId: 'm1',
        chapterId: 'ch2',
      });
      expect(progressRepo.upsert).toHaveBeenCalledWith(
        'u1',
        'm1',
        expect.objectContaining({ chaptersReadCount: 3 }) as Record<
          string,
          unknown
        >,
      );
    });
  });

  describe('GetContinueReadingUseCase', () => {
    it('should cap limit at 100', async () => {
      const progressRepo = makeProgressRepo();
      const sut = new GetContinueReadingUseCase(progressRepo);
      await sut.execute('u1', 9999);
      expect(progressRepo.listContinueReading).toHaveBeenCalledWith('u1', 100);
    });

    it('should use at least 1', async () => {
      const progressRepo = makeProgressRepo();
      const sut = new GetContinueReadingUseCase(progressRepo);
      await sut.execute('u1', 0);
      expect(progressRepo.listContinueReading).toHaveBeenCalledWith('u1', 1);
    });
  });
});
